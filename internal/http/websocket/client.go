package websocket

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/coder/websocket"

	"noteme/internal/components/audit"
	"noteme/internal/http/rbac"
	"noteme/internal/http/requeststate"
)

const (
	writeTimeout      = 10 * time.Second
	outboundQueueSize = 64
)

var errSlowConsumer = errors.New("outbound queue is full")

// A close item (data nil) is queued behind the messages before it, so a
// forceLogoutResponse reaches the browser before the close frame.
type outbound struct {
	data   []byte
	status websocket.StatusCode
	reason string
}

type Client struct {
	ID     string
	UserID int
	// Per browser session, shared by its tabs.
	SessionKey string
	IP         string

	conn *websocket.Conn
	out  chan outbound
	// Set instead of conn for a client of Hub.Call.
	deliver func(data []byte)

	mu      sync.RWMutex
	session requeststate.Session
}

func newClient(id string, state *requeststate.RequestState, ip string, conn *websocket.Conn) *Client {
	return &Client{
		ID:         id,
		UserID:     state.Session.UserId,
		SessionKey: state.SessionKey,
		IP:         ip,
		conn:       conn,
		out:        make(chan outbound, outboundQueueSize),
		session:    *state.Session,
	}
}

func (c *Client) Session() requeststate.Session {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.session
}

func (c *Client) setSession(session requeststate.Session) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.session = session
}

func (c *Client) Can(permission rbac.Permission) bool {
	return rbac.Can(rbac.Role(c.Session().Role), permission)
}

func (c *Client) Require(permission rbac.Permission) error {
	if !c.Can(permission) {
		return NewClientError(fmt.Sprintf("User does not have the required permission: %s", permission))
	}
	return nil
}

func (c *Client) Actor() audit.Actor {
	return audit.Actor{UserID: c.UserID, Username: c.Session().Username, Address: c.IP}
}

// Never blocks: a client that does not read its queue is dropped.
func (c *Client) send(data []byte) error {
	if c.deliver != nil {
		c.deliver(data)
		return nil
	}
	select {
	case c.out <- outbound{data: data}:
		return nil
	default:
		c.conn.CloseNow()
		return errSlowConsumer
	}
}

func (c *Client) close(status websocket.StatusCode, reason string) {
	if c.conn == nil {
		return
	}
	select {
	case c.out <- outbound{status: status, reason: reason}:
	default:
		c.conn.CloseNow()
	}
}

func (c *Client) writeLoop(ctx context.Context) {
	for {
		var item outbound
		select {
		case <-ctx.Done():
			return
		case item = <-c.out:
		}

		if item.data == nil {
			c.conn.Close(item.status, item.reason)
			return
		}
		if err := c.write(ctx, item.data); err != nil {
			c.conn.CloseNow()
			return
		}
	}
}

// coder/websocket allows concurrent writes, so the heartbeat and the direct
// write before a dropped connection need no lock.
func (c *Client) write(ctx context.Context, data []byte) error {
	ctx, cancel := context.WithTimeout(ctx, writeTimeout)
	defer cancel()
	return c.conn.Write(ctx, websocket.MessageText, data)
}
