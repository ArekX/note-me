package repository

import "context"

// Data is the JSON {"type", "payload"} the original stored; its payload "id"
// is always a note id.
type NotificationRecord struct {
	Id        int64
	Data      string
	CreatedAt int64
	IsRead    bool
	UserId    int
}

type Notifications interface {
	CreateNotification(ctx context.Context, userId int, data string) (*NotificationRecord, error)
	GetUserNotifications(ctx context.Context, userId int) ([]NotificationRecord, error)
	DeleteUserNotifications(ctx context.Context, userId int) error
	DeleteSingleNotification(ctx context.Context, userId int, id int64) error
	MarkReadUserNotifications(ctx context.Context, userId int) error
	MarkSingleNotificationRead(ctx context.Context, userId int, id int64) error
}
