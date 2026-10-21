package repository

import "context"

type Reminder struct {
	Once        bool
	NextAt      int64
	Interval    int64
	UnitValue   int64
	RepeatCount int64
}

type SetReminderResult struct {
	NextAt      int64
	Interval    *int64
	UnitValue   *int64
	RepeatCount int64
}

type ReminderNoteRecord struct {
	Id          int64
	NoteId      int64
	Title       string
	IsEncrypted bool
	AuthorId    int64
	AuthorName  string
	Type        string
	DoneCount   int64
	Interval    *int64
	UnitValue   *int64
	RepeatCount int64
	NextAt      int64
}

type ReminderFilters struct {
	FromNextAt int64
	FromId     int64
	Limit      int
}

type NoteReminderData struct {
	Id          int64
	NextAt      int64
	Interval    *int64
	UnitValue   *int64
	RepeatCount int64
	DoneCount   int64
}

type ReadyReminder struct {
	Id     int64
	NoteId int64
	UserId int
}

type NoteInfoRecord struct {
	Id          int64
	Title       string
	IsEncrypted bool
	UserName    string
	UserId      int
}

type Reminders interface {
	SetReminder(ctx context.Context, userId int, noteId int64, reminder Reminder) (*SetReminderResult, error)
	RemoveReminder(ctx context.Context, userId int, noteId int64) error
	FindUserReminderNotes(ctx context.Context, userId int, filters ReminderFilters) ([]ReminderNoteRecord, error)
	GetNoteReminderData(ctx context.Context, userId int, noteId int64) (*NoteReminderData, error)
	GetReadyReminders(ctx context.Context) ([]ReadyReminder, error)
	ResolveReminderNextOccurrence(ctx context.Context, id int64) error
	SearchReminderNotes(ctx context.Context, userId int, filters SearchFilters) ([]ReminderNoteRecord, error)
	GetNoteInfo(ctx context.Context, noteId int64) (*NoteInfoRecord, error)
}
