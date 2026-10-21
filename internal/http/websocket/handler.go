package websocket

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/coder/websocket"
	"github.com/google/uuid"

	"noteme/internal/components"
	"noteme/internal/http/clientip"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket/messages"
)

const (
	dispatchQueueSize = 16
	// Namespace and type come from the browser; the log line stays short.
	maxLoggedNameLength = 64
	stepRequiredMessage = "Required step must be completed first"
	internalMessage     = "Error while processing the request"
)

func (h *Hub) HandleRequest(_ *components.Components, w http.ResponseWriter, r *http.Request) {
	state, err := requeststate.FromCtx(r.Context())
	if err != nil || state.Session == nil {
		response.RespondJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{h.c.Config.AppURL.Host},
	})
	if err != nil {
		h.c.Log.Warn("Websocket accept failed", "error", err)
		return
	}
	defer conn.CloseNow()
	// readMessage reads at most limit+1 bytes, which this allows, so it sees an
	// oversized message first and can answer before the connection is closed.
	conn.SetReadLimit(maxBinaryMessageSize)

	client := newClient(uuid.NewString(), state, clientip.FromRequest(r, h.c.Config.TrustedProxies), conn)
	if !h.add(client) {
		conn.Close(websocket.StatusPolicyViolation, "Too many connections")
		return
	}
	defer h.remove(client)
	h.running.Add(1)
	defer h.running.Done()

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	go client.writeLoop(ctx)
	go h.heartbeat(ctx, client)
	go h.watchSession(ctx, client)

	// Handlers run in order on their own goroutine so the read loop keeps
	// reading pongs while a handler is busy.
	queue := make(chan Message, dispatchQueueSize)
	defer close(queue)
	h.running.Add(1)
	go func() {
		defer h.running.Done()
		for msg := range queue {
			h.dispatch(ctx, client, msg)
		}
	}()

	for {
		typ, reader, err := conn.Reader(ctx)
		if err != nil {
			return
		}

		msg, err := readMessage(typ, reader)
		// The rest of an oversized message cannot be skipped without reading it,
		// and Close would keep reading during its handshake, so the deferred
		// CloseNow drops the connection right after the error is written
		// directly, ahead of the queue.
		if errors.Is(err, errMessageTooLarge) {
			h.c.Log.Warn("Websocket client sent a message over the allowed size", "client", client.ID, "binary", typ == websocket.MessageBinary)
			if data, ok := h.encodeError(msg.RequestID, errInvalidFrame.Error()); ok {
				_ = client.write(ctx, data)
			}
			return
		}
		if errors.Is(err, errInvalidFrame) {
			h.c.Log.Warn("Websocket client sent an invalid message", "client", client.ID, "binary", typ == websocket.MessageBinary)
			h.sendError(client, msg.RequestID, err.Error())
			continue
		}
		if err != nil {
			return
		}

		select {
		case queue <- msg:
		case <-ctx.Done():
			return
		}
	}
}

// Browsers answer protocol pings without any JavaScript, so this only finds
// dead connections on the server side; the frontend needs no counterpart.
func (h *Hub) heartbeat(ctx context.Context, client *Client) {
	ticker := time.NewTicker(h.pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}

		pingCtx, cancel := context.WithTimeout(ctx, h.pingTimeout)
		err := client.conn.Ping(pingCtx)
		cancel()
		if err != nil {
			if ctx.Err() == nil {
				h.c.Log.Debug("Websocket client did not answer the ping", "client", client.ID, "error", err)
			}
			client.conn.CloseNow()
			return
		}
	}
}

// The session row was checked at the upgrade only; a logout elsewhere, an
// expiry or a password change deletes it while this connection stays open.
func (h *Hub) watchSession(ctx context.Context, client *Client) {
	ticker := time.NewTicker(h.sessionCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}

		exists, err := h.c.Repository.Sessions().SessionExists(ctx, client.SessionKey)
		if err != nil {
			if ctx.Err() == nil {
				h.c.Log.Error("Could not check the websocket session", "client", client.ID, "error", err)
			}
			continue
		}
		if !exists {
			h.forceLogout(client, websocket.StatusPolicyViolation, "Session ended")
			return
		}
	}
}

func (h *Hub) dispatch(ctx context.Context, client *Client, msg Message) {
	defer func() {
		if value := recover(); value != nil {
			h.c.Log.Error("Panic while handling websocket message", "namespace", cut(msg.Namespace), "type", cut(msg.Type), "panic", value, "stack", string(debug.Stack()))
			h.sendError(client, msg.RequestID, internalMessage)
			client.close(websocket.StatusInternalError, "Internal error")
		}
	}()

	session := client.Session()
	if len(session.RequiredSteps()) > 0 {
		h.sendError(client, msg.RequestID, stepRequiredMessage)
		return
	}

	fn := h.handlers[msg.Namespace][msg.Type]
	if fn == nil {
		h.c.Log.Warn("No websocket handler found", "namespace", cut(msg.Namespace), "type", cut(msg.Type))
		h.sendError(client, msg.RequestID, "No handler found")
		return
	}

	err := fn(ctx, &Request{Message: msg, Client: client, Hub: h})
	if err == nil {
		return
	}

	var clientErr *ClientError
	var issues validation.Issues
	if errors.As(err, &clientErr) || errors.As(err, &issues) {
		h.sendError(client, msg.RequestID, err.Error())
		return
	}

	h.c.Log.Error("Error while handling websocket message", "namespace", msg.Namespace, "type", msg.Type, "error", err)
	h.sendError(client, msg.RequestID, internalMessage)
}

func cut(value string) string {
	if len(value) <= maxLoggedNameLength {
		return value
	}
	return value[:maxLoggedNameLength] + "..."
}

func (h *Hub) sendError(client *Client, requestID, message string) {
	data, ok := h.encodeError(requestID, message)
	if !ok {
		return
	}
	if err := client.send(data); err != nil {
		h.c.Log.Debug("Could not send websocket error", "client", client.ID, "error", err)
	}
}

func (h *Hub) encodeError(requestID, message string) ([]byte, bool) {
	if requestID == "" {
		requestID = uuid.NewString()
	}

	data, err := json.Marshal(messages.Error{
		Header:  messages.Header{RequestID: requestID, Namespace: messages.NamespaceSystem, Type: messages.SystemError},
		Message: message,
	})
	if err != nil {
		h.c.Log.Error("Could not encode websocket error", "error", err)
		return nil, false
	}
	return data, true
}
