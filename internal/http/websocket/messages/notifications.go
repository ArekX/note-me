package messages

const (
	NotificationsGetMy          = "getMyNotifications"
	NotificationsDeleteAll      = "deleteAll"
	NotificationsMarkAllRead    = "markAllRead"
	NotificationsMarkSingleRead = "markSingleRead"
	NotificationsDeleteSingle   = "deleteSingle"

	NotificationsList             = "notificationsList"
	NotificationsAdded            = "notificationAdded"
	NotificationsDeletedAll       = "deletedAll"
	NotificationsMarkedAllRead    = "markedAllRead"
	NotificationsMarkedSingleRead = "markedSingleRead"
	NotificationsDeletedSingle    = "deletedSingle"

	NotificationsAdd = "addNotification" // backend
)

type GetMyNotifications struct{ Header }
type DeleteAllNotifications struct{ Header }
type MarkAllNotificationsRead struct{ Header }

type MarkSingleNotificationRead struct {
	Header
	ID int64 `json:"id"`
}

type DeleteSingleNotification struct {
	Header
	ID int64 `json:"id"`
}

type NotificationListResponse struct {
	Header
	Records []NotificationRecord `json:"records"`
}

type NotificationAddedResponse struct {
	Header
	Record NotificationRecord `json:"record"`
}

type DeletedAllResponse struct{ Header }
type MarkedAllReadResponse struct{ Header }

type MarkedSingleReadResponse struct {
	Header
	ID int64 `json:"id"`
}

type DeletedSingleResponse struct {
	Header
	ID int64 `json:"id"`
}

type AddNotification struct {
	Header
	ToUserID int64              `json:"toUserId"`
	Data     NotificationRecord `json:"data"`
}
