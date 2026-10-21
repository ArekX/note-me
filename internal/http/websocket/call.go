package websocket

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"

	"noteme/internal/http/requeststate"
	"noteme/internal/http/websocket/messages"
)

type Caller struct {
	Session requeststate.Session
	IP      string
}

// Runs a message's handler as the caller without a connection (decision
// 0.84): the client holds no connection slot, and only the response to this
// request comes back. Some handlers answer from a goroutine after they
// return, so the wait ends with ctx.
func (h *Hub) Call(ctx context.Context, caller Caller, namespace, typ string, payload any) (json.RawMessage, error) {
	requestID := uuid.NewString()
	data, err := callMessage(requestID, namespace, typ, payload)
	if err != nil {
		return nil, err
	}

	responses := make(chan []byte, 1)
	client := &Client{
		ID:      uuid.NewString(),
		UserID:  caller.Session.UserId,
		IP:      caller.IP,
		session: caller.Session,
		deliver: func(data []byte) {
			var header messages.Header
			if json.Unmarshal(data, &header) != nil || header.RequestID != requestID {
				return
			}
			select {
			case responses <- data:
			default:
			}
		},
	}
	h.dispatch(ctx, client, Message{Header: messages.Header{RequestID: requestID, Namespace: namespace, Type: typ}, JSON: data})

	select {
	case data := <-responses:
		var response messages.Error
		if err := json.Unmarshal(data, &response); err != nil {
			return nil, fmt.Errorf("decode %s/%s response: %w", namespace, typ, err)
		}
		if response.Namespace == messages.NamespaceSystem && response.Type == messages.SystemError {
			return nil, NewClientError(response.Message)
		}
		return data, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func callMessage(requestID, namespace, typ string, payload any) (json.RawMessage, error) {
	fields := map[string]json.RawMessage{}
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("encode %s/%s: %w", namespace, typ, err)
		}
		if err := json.Unmarshal(data, &fields); err != nil {
			return nil, fmt.Errorf("payload of %s/%s is not an object: %w", namespace, typ, err)
		}
	}
	for key, value := range map[string]string{"requestId": requestID, "namespace": namespace, "type": typ} {
		encoded, _ := json.Marshal(value)
		fields[key] = encoded
	}
	return json.Marshal(fields)
}
