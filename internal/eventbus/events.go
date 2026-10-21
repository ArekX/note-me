package eventbus

type NoteFullyDeleted struct {
	UserID int
	NoteID int64
}

// Data is the stored JSON {"type", "payload"}.
type NotificationCreated struct {
	ID        int64
	UserID    int
	Data      string
	CreatedAt int64
}

// Percentage is 0–100, rounded to two decimals.
type DataExportUpdated struct {
	UserID     int
	ExportID   string
	Percentage float64
}

type DataExportFinished struct {
	UserID   int
	ExportID string
}

type DataExportFailed struct {
	UserID   int
	ExportID string
	Message  string
}

// A reminder fired and moved to its next occurrence or was removed.
type ReminderTriggered struct {
	UserID int
	NoteID int64
}

type PublicShareExpired struct {
	OwnerID int
	NoteID  int64
}

// Published whether or not every target succeeded.
type AutomaticBackupFinished struct{}

type PeriodicTaskRan struct {
	Task string
}

// The schedule row already holds NextRunAt; the scheduler only follows it.
type PeriodicTaskRunRequested struct {
	Task      string
	NextRunAt int64
}
