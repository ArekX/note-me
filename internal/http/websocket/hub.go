package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/google/uuid"

	"noteme/internal/components"
	"noteme/internal/http/rbac"
	"noteme/internal/http/websocket/messages"
)

type Handler func(ctx context.Context, req *Request) error

type Outgoing interface {
	MessageHeader() *messages.Header
}

type Request struct {
	Message
	Client *Client
	Hub    *Hub
}

func (r *Request) Respond(ctx context.Context, msg Outgoing) error {
	return r.send(ctx, msg, r.RequestID)
}

func (r *Request) Send(ctx context.Context, msg Outgoing) error {
	return r.send(ctx, msg, uuid.NewString())
}

// Sends the response to every connection of the user; only the requesting
// one is waiting for its request id.
func (r *Request) RespondToUser(ctx context.Context, msg Outgoing) {
	if r.Client == nil {
		return
	}

	header := msg.MessageHeader()
	header.RequestID = r.RequestID
	if header.Namespace == "" {
		header.Namespace = r.Namespace
	}
	r.Hub.SendToUser(ctx, r.Client.UserID, msg)
	if r.Client.deliver != nil {
		_ = r.send(ctx, msg, r.RequestID)
	}
}

func (r *Request) send(_ context.Context, msg Outgoing, requestID string) error {
	// Backend messages have no client; respond and send are no-ops as in the original.
	if r.Client == nil {
		return nil
	}

	header := msg.MessageHeader()
	header.RequestID = requestID
	if header.Namespace == "" {
		header.Namespace = r.Namespace
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("encode %s/%s: %w", header.Namespace, header.Type, err)
	}
	return r.Client.send(data)
}

type ClientError struct {
	message string
}

func NewClientError(message string) error {
	return &ClientError{message: message}
}

func (e *ClientError) Error() string {
	return e.message
}

type Hub struct {
	c                    *components.Components
	pingInterval         time.Duration
	pingTimeout          time.Duration
	sessionCheckInterval time.Duration

	// Filled before the server starts, read without locking.
	handlers        map[string]map[string]Handler
	backendHandlers map[string]map[string]Handler

	mu      sync.Mutex
	clients map[int]map[string]*Client

	// Connections and their dispatch goroutines, waited for at shutdown.
	running sync.WaitGroup
}

func NewHub(c *components.Components) *Hub {
	return &Hub{
		c: c,
		// Below the 60 s idle timeout of common reverse proxies (nginx proxy_read_timeout).
		pingInterval:         30 * time.Second,
		pingTimeout:          10 * time.Second,
		sessionCheckInterval: time.Minute,
		handlers:             map[string]map[string]Handler{},
		backendHandlers:      map[string]map[string]Handler{},
		clients:              map[int]map[string]*Client{},
	}
}

func (h *Hub) Handle(namespace, typ string, fn Handler) {
	register(h.handlers, namespace, typ, fn)
}

type Namespace interface {
	Register(hub *Hub)
}

func (h *Hub) RegisterNamespaces(namespaces ...Namespace) {
	for _, namespace := range namespaces {
		namespace.Register(h)
	}
}

func (h *Hub) HandleBackend(namespace, typ string, fn Handler) {
	register(h.backendHandlers, namespace, typ, fn)
}

func register(handlers map[string]map[string]Handler, namespace, typ string, fn Handler) {
	if handlers[namespace] == nil {
		handlers[namespace] = map[string]Handler{}
	}
	if _, exists := handlers[namespace][typ]; exists {
		panic(fmt.Sprintf("websocket: handler for %s/%s registered twice", namespace, typ))
	}
	handlers[namespace][typ] = fn
}

func (h *Hub) SendToUser(_ context.Context, userID int, msg Outgoing) {
	data, ok := h.encode(msg)
	if !ok {
		return
	}
	for _, client := range h.userClients(userID) {
		if err := client.send(data); err != nil {
			h.c.Log.Debug("Could not send websocket message", "client", client.ID, "error", err)
		}
	}
}

func (h *Hub) SendToUsers(_ context.Context, userIDs []int, msg Outgoing) {
	ids := map[int]bool{}
	for _, id := range userIDs {
		ids[id] = true
	}
	h.sendToClients(msg, func(client *Client) bool { return ids[client.UserID] })
}

// The role is read from each connection's session, so a role change reaches
// open tabs through RefreshUserSession. except skips the acting user, who
// gets the response instead.
func (h *Hub) SendToPermission(_ context.Context, permission rbac.Permission, except int, msg Outgoing) {
	h.sendToClients(msg, func(client *Client) bool {
		return client.UserID != except && client.Can(permission)
	})
}

func (h *Hub) SendToEveryone(_ context.Context, except int, msg Outgoing) {
	h.sendToClients(msg, func(client *Client) bool { return client.UserID != except })
}

func (h *Hub) sendToClients(msg Outgoing, include func(*Client) bool) {
	var clients []*Client
	h.mu.Lock()
	for _, userClients := range h.clients {
		for _, client := range userClients {
			if include(client) {
				clients = append(clients, client)
			}
		}
	}
	h.mu.Unlock()
	if len(clients) == 0 {
		return
	}

	data, ok := h.encode(msg)
	if !ok {
		return
	}
	for _, client := range clients {
		if err := client.send(data); err != nil {
			h.c.Log.Debug("Could not send websocket message", "client", client.ID, "error", err)
		}
	}
}

func (h *Hub) encode(msg Outgoing) ([]byte, bool) {
	header := msg.MessageHeader()
	if header.RequestID == "" {
		header.RequestID = uuid.NewString()
	}

	data, err := json.Marshal(msg)
	if err != nil {
		h.c.Log.Error("Could not encode websocket message", "namespace", header.Namespace, "type", header.Type, "error", err)
		return nil, false
	}
	return data, true
}

func (h *Hub) PushBackend(ctx context.Context, msg Outgoing) {
	header := msg.MessageHeader()
	header.RequestID = uuid.NewString()

	fn := h.backendHandlers[header.Namespace][header.Type]
	if fn == nil {
		h.c.Log.Error("No handler for backend message was found", "namespace", header.Namespace, "type", header.Type)
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		h.c.Log.Error("Could not encode backend message", "namespace", header.Namespace, "type", header.Type, "error", err)
		return
	}

	if err := fn(ctx, &Request{Message: Message{Header: *header, JSON: data}, Hub: h}); err != nil {
		h.c.Log.Error("Error while handling backend message", "namespace", header.Namespace, "type", header.Type, "error", err)
	}
}

func (h *Hub) Shutdown() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, clients := range h.clients {
		for _, client := range clients {
			h.forceLogout(client, websocket.StatusGoingAway, "Server is shutting down")
		}
	}
}

// Bounded: a handler stuck in a request does not hold the stop.
func (h *Hub) Wait(timeout time.Duration) {
	done := make(chan struct{})
	go func() {
		h.running.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(timeout):
		h.c.Log.Warn("Websocket connections did not finish before the shutdown timeout")
	}
}

// Every connection of the user gets forceLogoutResponse and is then closed,
// so a tab that ignores the message keeps no access.
func (h *Hub) LogoutUser(_ context.Context, userID int) {
	for _, client := range h.userClients(userID) {
		h.forceLogout(client, websocket.StatusPolicyViolation, "Logged out")
	}
}

func (h *Hub) LogoutOtherSessions(_ context.Context, userID int, keepSessionKey string) {
	for _, client := range h.userClients(userID) {
		if client.SessionKey != keepSessionKey {
			h.forceLogout(client, websocket.StatusPolicyViolation, "Logged out")
		}
	}
}

func (h *Hub) forceLogout(client *Client, status websocket.StatusCode, reason string) {
	data, ok := h.encode(&messages.ForceLogoutResponse{
		Header: messages.Header{Namespace: messages.NamespaceUsers, Type: messages.UsersForceLogoutResponse},
	})
	if ok {
		_ = client.send(data)
	}
	client.close(status, reason)
}

func (h *Hub) add(client *Client) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	limit := h.c.Config.MaxConnectionsPerUser
	if limit > 0 && len(h.clients[client.UserID]) >= limit {
		return false
	}
	if h.clients[client.UserID] == nil {
		h.clients[client.UserID] = map[string]*Client{}
	}
	h.clients[client.UserID][client.ID] = client
	return true
}

func (h *Hub) remove(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients[client.UserID], client.ID)
	if len(h.clients[client.UserID]) == 0 {
		delete(h.clients, client.UserID)
	}
}

func (h *Hub) ClientCount(userID int) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.clients[userID])
}

func (h *Hub) userClients(userID int) []*Client {
	h.mu.Lock()
	defer h.mu.Unlock()
	clients := make([]*Client, 0, len(h.clients[userID]))
	for _, client := range h.clients[userID] {
		clients = append(clients, client)
	}
	return clients
}
