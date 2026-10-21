package changes

import (
	"context"

	"noteme/internal/components"
	"noteme/internal/http/rbac"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

type Namespace struct{}

func New(_ *components.Components) *Namespace {
	return &Namespace{}
}

func (n *Namespace) Register(hub *websocket.Hub) {
	hub.HandleBackend(messages.NamespaceChanges, messages.ChangesNotifyDataChanged, notifyDataChanged)
}

func notifyDataChanged(ctx context.Context, req *websocket.Request) error {
	var msg messages.NotifyDataChanged
	if err := req.Decode(&msg); err != nil {
		return err
	}

	changed := &messages.DataChanged{
		Header: messages.Header{Namespace: messages.NamespaceChanges, Type: messages.ChangesDataChanged},
		Entity: msg.Entity,
		IDs:    msg.IDs,
	}
	if changed.IDs == nil {
		changed.IDs = []any{}
	}
	if msg.Permission != "" {
		req.Hub.SendToPermission(ctx, rbac.Permission(msg.Permission), 0, changed)
		return nil
	}
	req.Hub.SendToUsers(ctx, msg.UserIDs, changed)
	return nil
}
