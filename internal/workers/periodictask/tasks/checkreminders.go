package tasks

import (
	"context"
	"encoding/json"
	"log/slog"

	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/workers/periodictask"
)

// JSON shape of a "reminder-received" notification, the contract with
// NotificationNoteReminderData in the browser.
type reminderNotification struct {
	Type    string                      `json:"type"`
	Payload reminderNotificationPayload `json:"payload"`
}

type reminderNotificationPayload struct {
	ID          int64  `json:"id"`
	ReminderID  int64  `json:"reminder_id"`
	Title       string `json:"title"`
	IsEncrypted bool   `json:"is_encrypted"`
	UserID      int    `json:"user_id"`
	UserName    string `json:"user_name"`
	Type        string `json:"type"`
}

type checkReminders struct {
	repo repository.Repository
	log  *slog.Logger
	bus  *eventbus.Bus
}

func (checkReminders) Name() string {
	return CheckReminders
}

func (checkReminders) NextAt(now int64) int64 {
	return periodictask.NextMinute(now)
}

func (t checkReminders) Trigger(ctx context.Context) error {
	reminders, err := t.repo.Reminders().GetReadyReminders(ctx)
	if err != nil {
		return err
	}

	for _, reminder := range reminders {
		if err := t.notify(ctx, reminder); err != nil {
			t.log.Error("Error while processing note reminder", "reminder_id", reminder.Id, "error", err)
		}
	}
	return nil
}

func (t checkReminders) notify(ctx context.Context, reminder repository.ReadyReminder) error {
	note, err := t.repo.Reminders().GetNoteInfo(ctx, reminder.NoteId)
	if err != nil || note == nil {
		return err
	}

	reminderType := "shared"
	if note.UserId == reminder.UserId {
		reminderType = "own"
	}
	data, err := json.Marshal(reminderNotification{
		Type: "reminder-received",
		Payload: reminderNotificationPayload{
			ID:          note.Id,
			ReminderID:  reminder.Id,
			Title:       note.Title,
			IsEncrypted: note.IsEncrypted,
			UserID:      note.UserId,
			UserName:    note.UserName,
			Type:        reminderType,
		},
	})
	if err != nil {
		return err
	}

	var record *repository.NotificationRecord
	err = t.repo.RunInTransaction(ctx, func(tx repository.Repository) error {
		var err error
		if record, err = tx.Notifications().CreateNotification(ctx, reminder.UserId, string(data)); err != nil {
			return err
		}
		return tx.Reminders().ResolveReminderNextOccurrence(ctx, reminder.Id)
	})
	if err != nil {
		return err
	}

	t.bus.Publish(ctx, eventbus.NotificationCreated{
		ID:        record.Id,
		UserID:    record.UserId,
		Data:      record.Data,
		CreatedAt: record.CreatedAt,
	})
	t.bus.Publish(ctx, eventbus.ReminderTriggered{UserID: reminder.UserId, NoteID: reminder.NoteId})
	return nil
}
