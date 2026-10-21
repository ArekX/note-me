package aitools

import "noteme/internal/http/websocket/messages"

type notificationID struct {
	ID int64 `json:"id" desc:"Notification id"`
}

var notificationTools = []Tool{
	define(Tool{
		Name:        "get_notifications",
		Title:       "Notifications",
		Description: "Lists the user's notifications: fired reminders and notes shared with them.",
		ReadOnly:    true,
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceNotifications, messages.NotificationsGetMy, messages.NotificationsList, map[string]any{})
	}),
	define(Tool{
		Name:        "mark_notification_read",
		Title:       "Mark notification read",
		Description: "Marks one notification as read.",
	}, func(_ Env, args notificationID) (*Call, error) {
		return message(messages.NamespaceNotifications, messages.NotificationsMarkSingleRead, messages.NotificationsMarkedSingleRead, map[string]any{"id": args.ID})
	}),
	define(Tool{
		Name:        "mark_all_notifications_read",
		Title:       "Mark all notifications read",
		Description: "Marks every notification as read.",
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceNotifications, messages.NotificationsMarkAllRead, messages.NotificationsMarkedAllRead, map[string]any{})
	}),
	define(Tool{
		Name:        "delete_notification",
		Title:       "Delete notification",
		Description: "Deletes one notification.",
	}, func(_ Env, args notificationID) (*Call, error) {
		return message(messages.NamespaceNotifications, messages.NotificationsDeleteSingle, messages.NotificationsDeletedSingle, map[string]any{"id": args.ID})
	}),
	define(Tool{
		Name:        "delete_all_notifications",
		Title:       "Delete all notifications",
		Description: "Deletes every notification of the user.",
		Confirm:     true,
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceNotifications, messages.NotificationsDeleteAll, messages.NotificationsDeletedAll, map[string]any{})
	}),
}
