package messages

const (
	ChangesDataChanged = "dataChanged"

	ChangesNotifyDataChanged = "notifyDataChanged" // backend
)

const (
	EntityNote         = "note"
	EntityGroup        = "group"
	EntityReminder     = "reminder"
	EntityShare        = "share"
	EntityTag          = "tag"
	EntityFile         = "file"
	EntityNotification = "notification"
	EntityUser         = "user"
	EntityBackup       = "backup"
	EntityBackupTarget = "backupTarget"
	EntityPeriodicTask = "periodicTask"
	EntityAiProvider   = "aiProvider"
)

// IDs are numbers, or strings for entities keyed by an identifier (files,
// backups, periodic tasks).
type DataChanged struct {
	Header
	Entity string `json:"entity"`
	IDs    []any  `json:"ids"`
}

func NewDataChanged[T int64 | string](entity string, ids ...T) *DataChanged {
	values := make([]any, 0, len(ids))
	for _, id := range ids {
		values = append(values, id)
	}
	return &DataChanged{
		Header: Header{Namespace: NamespaceChanges, Type: ChangesDataChanged},
		Entity: entity,
		IDs:    values,
	}
}

// Either UserIDs or Permission picks the recipients.
type NotifyDataChanged struct {
	Header
	UserIDs    []int  `json:"userIds"`
	Permission string `json:"permission"`
	Entity     string `json:"entity"`
	IDs        []any  `json:"ids"`
}
