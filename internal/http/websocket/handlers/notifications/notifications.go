package notifications

import (
	"context"
	"encoding/json"
	"fmt"

	"noteme/internal/components"
	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

type Namespace struct {
	repo repository.Repository
	bus  *eventbus.Bus
}

func New(c *components.Components) *Namespace {
	return &Namespace{repo: c.Repository, bus: c.Bus}
}

func (n *Namespace) Register(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceNotifications, messages.NotificationsGetMy, n.getMyNotifications)
	hub.Handle(messages.NamespaceNotifications, messages.NotificationsDeleteAll, n.deleteAll)
	hub.Handle(messages.NamespaceNotifications, messages.NotificationsMarkAllRead, n.markAllRead)
	hub.Handle(messages.NamespaceNotifications, messages.NotificationsMarkSingleRead, n.markSingleRead)
	hub.Handle(messages.NamespaceNotifications, messages.NotificationsDeleteSingle, n.deleteSingle)

	hub.HandleBackend(messages.NamespaceNotifications, messages.NotificationsAdd, n.addNotification)
	n.bus.Subscribe(func(ctx context.Context, e eventbus.NotificationCreated) {
		var data messages.NotificationData
		if err := json.Unmarshal([]byte(e.Data), &data); err != nil {
			return
		}
		hub.PushBackend(ctx, &messages.AddNotification{
			Namespace: messages.NamespaceNotifications,
			Type:      messages.NotificationsAdd,
			ToUserID:  int64(e.UserID),
			Data: messages.NotificationRecord{
				ID:        e.ID,
				Data:      data,
				CreatedAt: e.CreatedAt,
				UserID:    int64(e.UserID),
			},
		})
	})
}

func notificationRecord(record repository.NotificationRecord) (messages.NotificationRecord, error) {
	result := messages.NotificationRecord{
		ID:        record.Id,
		CreatedAt: record.CreatedAt,
		IsRead:    record.IsRead,
		UserID:    int64(record.UserId),
	}
	if err := json.Unmarshal([]byte(record.Data), &result.Data); err != nil {
		return result, fmt.Errorf("decode notification %d: %w", record.Id, err)
	}
	return result, nil
}

func (n *Namespace) getMyNotifications(ctx context.Context, req *websocket.Request) error {
	records, err := n.repo.Notifications().GetUserNotifications(ctx, req.Client.UserID)
	if err != nil {
		return err
	}

	response := &messages.NotificationListResponse{
		Type:    messages.NotificationsList,
		Records: make([]messages.NotificationRecord, 0, len(records)),
	}
	for _, record := range records {
		notification, err := notificationRecord(record)
		if err != nil {
			return err
		}
		response.Records = append(response.Records, notification)
	}
	return req.Respond(ctx, response)
}

func (n *Namespace) deleteAll(ctx context.Context, req *websocket.Request) error {
	if err := n.repo.Notifications().DeleteUserNotifications(ctx, req.Client.UserID); err != nil {
		return err
	}
	req.RespondToUser(ctx, &messages.DeletedAllResponse{Type: messages.NotificationsDeletedAll})
	return nil
}

func (n *Namespace) markAllRead(ctx context.Context, req *websocket.Request) error {
	if err := n.repo.Notifications().MarkReadUserNotifications(ctx, req.Client.UserID); err != nil {
		return err
	}
	req.RespondToUser(ctx, &messages.MarkedAllReadResponse{Type: messages.NotificationsMarkedAllRead})
	return nil
}

func (n *Namespace) markSingleRead(ctx context.Context, req *websocket.Request) error {
	var msg messages.MarkSingleNotificationRead
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if err := n.repo.Notifications().MarkSingleNotificationRead(ctx, req.Client.UserID, msg.ID); err != nil {
		return err
	}
	req.RespondToUser(ctx, &messages.MarkedSingleReadResponse{Type: messages.NotificationsMarkedSingleRead, ID: msg.ID})
	return nil
}

func (n *Namespace) deleteSingle(ctx context.Context, req *websocket.Request) error {
	var msg messages.DeleteSingleNotification
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if err := n.repo.Notifications().DeleteSingleNotification(ctx, req.Client.UserID, msg.ID); err != nil {
		return err
	}
	req.RespondToUser(ctx, &messages.DeletedSingleResponse{Type: messages.NotificationsDeletedSingle, ID: msg.ID})
	return nil
}

func (n *Namespace) addNotification(ctx context.Context, req *websocket.Request) error {
	var msg messages.AddNotification
	if err := req.Decode(&msg); err != nil {
		return err
	}

	req.Hub.SendToUser(ctx, int(msg.ToUserID), &messages.NotificationAddedResponse{
		Namespace: messages.NamespaceNotifications,
		Type:      messages.NotificationsAdded,
		Record:    msg.Data,
	})
	return nil
}
