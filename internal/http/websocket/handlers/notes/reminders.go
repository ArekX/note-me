package notes

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"noteme/internal/components/repository"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	reminderNoteMissing = "Note does not exist or not shared with this user."
	reminderNotFuture   = "Reminder must be set in the future"
	reminderTooFar      = "Reminder must be within 100 years"
	maxReminderSpan     = 100 * 365 * 24 * 60 * 60
)

var reminderLimits = map[string]float64{"interval": 1000, "unit_value": 365 * 24 * 60 * 60, "repeat_count": 10000}

func jsonNumber(object map[string]json.RawMessage, key string) (float64, bool) {
	var number float64
	raw, ok := object[key]
	if !ok || json.Unmarshal(raw, &number) != nil {
		return 0, false
	}
	return number, true
}

// setReminderSchema's reminder is a zod union of two non-strict objects:
// when neither branch matches zod reports one invalid_union issue on
// "reminder"; the repeat branch then checks its minimums.
func parseReminder(object map[string]json.RawMessage, now int64) (repository.Reminder, validation.Issues) {
	var reminderType string
	json.Unmarshal(object["type"], &reminderType)

	invalid := validation.Issues{{Code: "invalid_union", Path: []any{"reminder"}, Message: "Invalid input"}}

	if reminderType == "once" {
		nextAt, ok := jsonNumber(object, "next_at")
		if !ok {
			return repository.Reminder{}, invalid
		}
		if nextAt <= float64(now) {
			return repository.Reminder{}, validation.Issues{{Code: "too_small", Path: []any{"reminder", "next_at"}, Message: reminderNotFuture}}
		}
		if nextAt > float64(now+maxReminderSpan) {
			return repository.Reminder{}, validation.Issues{{Code: "too_big", Path: []any{"reminder", "next_at"}, Message: reminderTooFar}}
		}
		return repository.Reminder{Once: true, NextAt: int64(nextAt)}, nil
	}

	if reminderType != "repeat" {
		return repository.Reminder{}, invalid
	}

	values := map[string]float64{}
	for _, key := range []string{"interval", "unit_value", "repeat_count"} {
		value, ok := jsonNumber(object, key)
		if !ok {
			return repository.Reminder{}, invalid
		}
		values[key] = value
	}

	var issues validation.Issues
	for _, key := range []string{"interval", "unit_value", "repeat_count"} {
		if values[key] < 1 {
			issues = append(issues, validation.Issue{Code: "too_small", Path: []any{"reminder", key}, Message: "Too small: expected number to be >=1"})
		} else if values[key] > reminderLimits[key] {
			issues = append(issues, validation.Issue{Code: "too_big", Path: []any{"reminder", key}, Message: fmt.Sprintf("Too big: expected number to be <=%.0f", reminderLimits[key])})
		}
	}
	if len(issues) > 0 {
		return repository.Reminder{}, issues
	}

	reminder := repository.Reminder{
		Interval:    int64(math.Floor(values["interval"])),
		UnitValue:   int64(math.Floor(values["unit_value"])),
		RepeatCount: int64(math.Floor(values["repeat_count"])),
	}
	if reminder.Interval*reminder.UnitValue > maxReminderSpan {
		return repository.Reminder{}, validation.Issues{{Code: "too_big", Path: []any{"reminder"}, Message: reminderTooFar}}
	}
	return reminder, nil
}

// Ownership is checked before the schema, as in the original.
func (n *Namespace) setReminder(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		NoteID   json.RawMessage `json:"note_id"`
		Reminder json.RawMessage `json:"reminder"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	var noteID int64
	json.Unmarshal(msg.NoteID, &noteID)
	exists, err := n.repo.Notes().NoteExists(ctx, userID, noteID, false)
	if err != nil {
		return err
	}
	if !exists {
		if exists, err = n.repo.Shares().SharedNoteWithUser(ctx, userID, noteID); err != nil {
			return err
		}
	}
	if !exists {
		return websocket.NewClientError(reminderNoteMissing)
	}

	var shape struct {
		NoteID   int64                      `json:"note_id"`
		Reminder map[string]json.RawMessage `json:"reminder"`
	}
	request := map[string]json.RawMessage{}
	for key, value := range map[string]json.RawMessage{"note_id": msg.NoteID, "reminder": msg.Reminder} {
		if value != nil {
			request[key] = value
		}
	}
	data, _ := json.Marshal(request)
	if issues := validation.Decode(data, &shape); len(issues) > 0 {
		return issues
	}
	reminder, issues := parseReminder(shape.Reminder, time.Now().Unix())
	if len(issues) > 0 {
		return issues
	}

	result, err := n.repo.Reminders().SetReminder(ctx, userID, noteID, reminder)
	if err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.SetReminderResponse{
		Type:   messages.NotesSetReminderResponse,
		NoteID: noteID,
		Data: messages.SetReminderResult{
			NextAt:      result.NextAt,
			Interval:    result.Interval,
			UnitValue:   result.UnitValue,
			RepeatCount: result.RepeatCount,
		},
	})
	return nil
}

func (n *Namespace) removeReminder(ctx context.Context, req *websocket.Request) error {
	var msg messages.RemoveReminder
	if err := req.Decode(&msg); err != nil {
		return err
	}

	if err := n.repo.Reminders().RemoveReminder(ctx, req.Client.UserID, msg.NoteID); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.RemoveReminderResponse{
		Type:   messages.NotesRemoveReminderResponse,
		NoteID: msg.NoteID,
	})
	return nil
}

func (n *Namespace) findNoteReminders(ctx context.Context, req *websocket.Request) error {
	var msg messages.FindNoteReminders
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var filters repository.ReminderFilters
	if msg.Filters.FromNextAt != nil {
		filters.FromNextAt = *msg.Filters.FromNextAt
	}
	if msg.Filters.FromID != nil {
		filters.FromId = *msg.Filters.FromID
	}
	if msg.Filters.Limit != nil {
		filters.Limit = *msg.Filters.Limit
	}

	records, err := n.repo.Reminders().FindUserReminderNotes(ctx, req.Client.UserID, filters)
	if err != nil {
		return err
	}

	response := &messages.FindNoteRemindersResponse{
		Type:    messages.NotesFindRemindersResponse,
		Records: make([]messages.ReminderNoteRecord, 0, len(records)),
	}
	for _, record := range records {
		response.Records = append(response.Records, reminderNoteRecord(record))
	}
	return req.Respond(ctx, response)
}

func (n *Namespace) getNoteReminderData(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetNoteReminderData
	if err := req.Decode(&msg); err != nil {
		return err
	}

	record, err := n.repo.Reminders().GetNoteReminderData(ctx, req.Client.UserID, msg.NoteID)
	if err != nil {
		return err
	}

	response := &messages.GetNoteReminderDataResponse{Type: messages.NotesGetReminderDataResponse}
	if record != nil {
		response.Data = &messages.NoteReminderData{
			ID:          record.Id,
			NextAt:      record.NextAt,
			Interval:    record.Interval,
			UnitValue:   record.UnitValue,
			RepeatCount: record.RepeatCount,
			DoneCount:   record.DoneCount,
		}
	}
	return req.Respond(ctx, response)
}

func reminderNoteRecord(record repository.ReminderNoteRecord) messages.ReminderNoteRecord {
	return messages.ReminderNoteRecord{
		ID:          record.Id,
		NoteID:      record.NoteId,
		DoneCount:   record.DoneCount,
		Interval:    record.Interval,
		UnitValue:   record.UnitValue,
		RepeatCount: record.RepeatCount,
		NextAt:      record.NextAt,
		Title:       record.Title,
		IsEncrypted: record.IsEncrypted,
		AuthorID:    record.AuthorId,
		AuthorName:  record.AuthorName,
		Type:        record.Type,
	}
}
