package notes

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"noteme/internal/components"
	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/http/validation"
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
	hub.Handle(messages.NamespaceNotes, messages.NotesCreate, n.createNote)
	hub.Handle(messages.NamespaceNotes, messages.NotesUpdate, n.updateNote)
	hub.Handle(messages.NamespaceNotes, messages.NotesDelete, n.deleteNote)
	hub.Handle(messages.NamespaceNotes, messages.NotesGet, n.getNote)
	hub.Handle(messages.NamespaceNotes, messages.NotesGetDetails, n.getNoteDetails)
	hub.Handle(messages.NamespaceNotes, messages.NotesGetRecentlyOpened, n.getRecentlyOpenedNotes)
	hub.Handle(messages.NamespaceNotes, messages.NotesSearch, n.searchNote)
	hub.Handle(messages.NamespaceNotes, messages.NotesFindDeleted, n.findDeletedNotes)
	hub.Handle(messages.NamespaceNotes, messages.NotesRestoreDeleted, n.restoreDeletedNote)
	hub.Handle(messages.NamespaceNotes, messages.NotesFullyDelete, n.fullyDeleteNote)
	hub.Handle(messages.NamespaceNotes, messages.NotesGetShared, n.getSharedNote)
	hub.Handle(messages.NamespaceNotes, messages.NotesGetShareData, n.getNoteShareData)
	hub.Handle(messages.NamespaceNotes, messages.NotesCreatePublicShare, n.createPublicShare)
	hub.Handle(messages.NamespaceNotes, messages.NotesRemovePublicShare, n.removePublicShare)
	hub.Handle(messages.NamespaceNotes, messages.NotesShareToUsers, n.shareToUsers)
	hub.Handle(messages.NamespaceNotes, messages.NotesFindShared, n.findSharedNotes)
	hub.Handle(messages.NamespaceNotes, messages.NotesSetReminder, n.setReminder)
	hub.Handle(messages.NamespaceNotes, messages.NotesRemoveReminder, n.removeReminder)
	hub.Handle(messages.NamespaceNotes, messages.NotesFindReminders, n.findNoteReminders)
	hub.Handle(messages.NamespaceNotes, messages.NotesGetReminderData, n.getNoteReminderData)
	hub.Handle(messages.NamespaceNotes, messages.NotesFindHistory, n.findNoteHistory)
	hub.Handle(messages.NamespaceNotes, messages.NotesGetHistoryData, n.getNoteHistoryData)
	hub.Handle(messages.NamespaceNotes, messages.NotesRevertToHistory, n.revertNoteToHistory)
	hub.Handle(messages.NamespaceNotes, messages.NotesDeleteHistoryRecord, n.deleteHistoryRecord)

	hub.HandleBackend(messages.NamespaceNotes, messages.NotesNotifyFullyDeleted, n.notifyFullyDeletedNote)
	n.bus.Subscribe(func(ctx context.Context, e eventbus.NoteFullyDeleted) {
		hub.PushBackend(ctx, &messages.NotifyFullyDeletedNote{
			Namespace: messages.NamespaceNotes,
			Type:      messages.NotesNotifyFullyDeleted,
			UserID:    int64(e.UserID),
			NoteID:    e.NoteID,
		})
	})
	n.bus.Subscribe(func(ctx context.Context, e eventbus.ReminderTriggered) {
		hub.PushBackend(ctx, &messages.NotifyDataChanged{
			Header:  messages.Header{Namespace: messages.NamespaceChanges, Type: messages.ChangesNotifyDataChanged},
			UserIDs: []int{e.UserID},
			Entity:  messages.EntityReminder,
			IDs:     []any{e.NoteID},
		})
	})
	n.bus.Subscribe(func(ctx context.Context, e eventbus.PublicShareExpired) {
		hub.PushBackend(ctx, &messages.NotifyDataChanged{
			Header:  messages.Header{Namespace: messages.NamespaceChanges, Type: messages.ChangesNotifyDataChanged},
			UserIDs: []int{e.OwnerID},
			Entity:  messages.EntityShare,
			IDs:     []any{e.NoteID},
		})
	})
}

// Recipients are looked up before a change that can remove their shares
// (protecting, deleting for good).
func (n *Namespace) shareRecipients(ctx context.Context, noteIDs ...int64) ([]int, error) {
	return n.repo.Shares().FindNoteShareUserIds(ctx, noteIDs)
}

func notifyRecipients(ctx context.Context, req *websocket.Request, recipients []int, entity string, noteIDs ...int64) {
	if len(recipients) > 0 {
		req.Hub.SendToUsers(ctx, recipients, messages.NewDataChanged(entity, noteIDs...))
	}
}

func noteError(err error) error {
	for _, clientErr := range []error{repository.ErrGroupNotFound, repository.ErrNoteNotFound} {
		if errors.Is(err, clientErr) {
			return websocket.NewClientError(clientErr.Error())
		}
	}
	return err
}

const maxNoteTags = 20

func validateNoteTitle(issues *validation.Issues, title string) {
	issues.MinLength("title", title, 1, "Title must have at least one character")
	issues.MaxLength("title", title, 255, "Title must have at most 255 characters")
}

func validateNoteTags(issues *validation.Issues, tags []string) {
	issues.MaxItems("tags", len(tags), maxNoteTags, "Note can have at most 20 tags")
}

func (n *Namespace) requireNote(ctx context.Context, userID int, noteID int64) error {
	exists, err := n.repo.Notes().NoteExists(ctx, userID, noteID, false)
	if err != nil {
		return err
	}
	if !exists {
		return websocket.NewClientError(repository.ErrNoteNotFound.Error())
	}
	return nil
}

func (n *Namespace) createNote(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var data messages.AddNoteRequest
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	var issues validation.Issues
	validateNoteTitle(&issues, data.Title)
	validateNoteTags(&issues, data.Tags)
	if len(issues) > 0 {
		return issues
	}

	userID := req.Client.UserID
	isWide := data.IsWide != nil && *data.IsWide
	var record *repository.NoteRecord
	err := n.repo.RunInTransaction(ctx, func(tx repository.Repository) error {
		var err error
		record, err = tx.Notes().CreateNote(ctx, repository.NewNoteRecord{
			Title:       data.Title,
			Note:        data.Text,
			IsEncrypted: data.IsEncrypted,
			IsWide:      isWide,
			UserId:      userID,
		})
		if err != nil {
			return err
		}
		if err := tx.Tags().LinkNoteWithTags(ctx, userID, record.Id, data.Tags); err != nil {
			return err
		}
		return tx.Notes().AssignNoteToGroup(ctx, userID, record.Id, data.GroupID)
	})
	if err != nil {
		return noteError(err)
	}

	req.RespondToUser(ctx, &messages.CreateNoteResponse{
		Type:    messages.NotesCreateResponse,
		Record:  noteRecord(record),
		GroupID: data.GroupID,
	})
	return nil
}

func (n *Namespace) updateNote(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		ID   int64           `json:"id"`
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var data messages.UpdateNoteRequest
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	var issues validation.Issues
	if data.Title != nil {
		validateNoteTitle(&issues, *data.Title)
	}
	if data.Tags != nil {
		validateNoteTags(&issues, *data.Tags)
	}
	if len(issues) > 0 {
		return issues
	}

	userID := req.Client.UserID
	if err := n.requireNote(ctx, userID, msg.ID); err != nil {
		return err
	}

	recipients, err := n.shareRecipients(ctx, msg.ID)
	if err != nil {
		return err
	}
	err = n.repo.RunInTransaction(ctx, func(tx repository.Repository) error {
		return applyNoteUpdate(ctx, tx, userID, msg.ID, data, false)
	})
	if err != nil {
		return noteError(err)
	}

	req.RespondToUser(ctx, &messages.UpdateNoteResponse{
		Type:        messages.NotesUpdateResponse,
		UpdatedID:   msg.ID,
		UpdatedData: data,
	})
	notifyRecipients(ctx, req, recipients, messages.EntityNote, msg.ID)
	return nil
}

// An empty update changes nothing and adds no version, as in the original;
// neither does a width change on its own.
func applyNoteUpdate(ctx context.Context, tx repository.Repository, userID int, noteID int64, data messages.UpdateNoteRequest, isReversal bool) error {
	changesNote := data.Title != nil || data.Text != nil || data.IsEncrypted != nil
	addsVersion := changesNote || data.GroupID.Set || data.Tags != nil
	if !addsVersion && data.IsWide == nil {
		return nil
	}

	if addsVersion {
		if err := tx.NoteHistory().AddHistory(ctx, userID, noteID, isReversal); err != nil {
			return err
		}
	}

	if data.GroupID.Set {
		if err := tx.Notes().UpdateNoteParent(ctx, userID, noteID, data.GroupID.Value); err != nil {
			return err
		}
	}

	if changesNote || data.IsWide != nil {
		if err := tx.Notes().UpdateNote(ctx, userID, noteID, repository.NoteUpdate{
			Title:       data.Title,
			Note:        data.Text,
			IsEncrypted: data.IsEncrypted,
			IsWide:      data.IsWide,
		}); err != nil {
			return err
		}
	}

	if data.IsEncrypted != nil && *data.IsEncrypted {
		if err := tx.Shares().RemoveNoteShares(ctx, noteID); err != nil {
			return err
		}
	}

	if data.Tags != nil {
		return tx.Tags().LinkNoteWithTags(ctx, userID, noteID, *data.Tags)
	}
	return nil
}

func (n *Namespace) deleteNote(ctx context.Context, req *websocket.Request) error {
	var msg messages.DeleteNote
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	if err := n.requireNote(ctx, userID, msg.ID); err != nil {
		return err
	}

	if err := n.repo.Reminders().RemoveReminder(ctx, userID, msg.ID); err != nil {
		return err
	}
	if err := n.repo.Notes().DeleteNote(ctx, userID, msg.ID); err != nil {
		return err
	}
	recipients, err := n.shareRecipients(ctx, msg.ID)
	if err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.DeleteNoteResponse{
		Type:      messages.NotesDeleteResponse,
		DeletedID: msg.ID,
	})
	notifyRecipients(ctx, req, recipients, messages.EntityNote, msg.ID)
	return nil
}

func (n *Namespace) getNote(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetNote
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	record, err := n.repo.Notes().GetNote(ctx, userID, msg.ID)
	if err != nil {
		return err
	}
	if record == nil {
		return websocket.NewClientError("Requested note not found.")
	}

	if msg.MarkOpened {
		if err := n.repo.Notes().UpdateLastOpenAt(ctx, userID, msg.ID); err != nil {
			return err
		}
	}

	return req.Respond(ctx, &messages.GetNoteResponse{
		Type:   messages.NotesGetResponse,
		Record: viewNoteRecord(record),
	})
}

func (n *Namespace) getNoteDetails(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetNoteDetails
	if err := req.Decode(&msg); err != nil {
		return err
	}

	record, err := n.repo.Notes().GetNoteDetails(ctx, req.Client.UserID, msg.ID, repository.NoteDetailsOptions{
		IncludeGroup:     msg.Options.IncludeGroup,
		IncludeTimestamp: msg.Options.IncludeTimestamp,
		IncludeUser:      msg.Options.IncludeUser,
		IncludeTitle:     msg.Options.IncludeTitle,
		IncludeNote:      msg.Options.IncludeNote,
		IncludeDeleted:   msg.Options.IncludeDeleted,
	})
	if err != nil {
		return err
	}
	if record == nil {
		return websocket.NewClientError(repository.ErrNoteNotFound.Error())
	}
	if record.IsEncrypted && record.UserId != req.Client.UserID {
		record.Note = ""
	}

	return req.Respond(ctx, &messages.GetNoteDetailsResponse{
		Type: messages.NotesGetDetailsResponse,
		Record: messages.NoteDetailsRecord{
			GroupID:     record.GroupId,
			GroupName:   record.GroupName,
			CreatedAt:   record.CreatedAt,
			UpdatedAt:   record.UpdatedAt,
			UserName:    record.UserName,
			IsEncrypted: record.IsEncrypted,
			Note:        record.Note,
			Title:       record.Title,
			IsDeleted:   record.IsDeleted,
		},
	})
}

func (n *Namespace) getRecentlyOpenedNotes(ctx context.Context, req *websocket.Request) error {
	records, err := n.repo.Notes().FindRecentlyOpenedNotes(ctx, req.Client.UserID)
	if err != nil {
		return err
	}

	response := &messages.GetRecentlyOpenedNotesResponse{
		Type:    messages.NotesGetRecentlyOpenedResponse,
		Records: make([]messages.RecentNoteRecord, 0, len(records)),
	}
	for _, record := range records {
		response.Records = append(response.Records, messages.RecentNoteRecord{
			ID:          record.Id,
			Title:       record.Title,
			GroupID:     record.GroupId,
			GroupName:   record.GroupName,
			UpdatedAt:   record.UpdatedAt,
			LastOpenAt:  record.LastOpenAt,
			IsEncrypted: record.IsEncrypted,
		})
	}

	return req.Respond(ctx, response)
}

func (n *Namespace) searchNote(ctx context.Context, req *websocket.Request) error {
	var msg messages.SearchNote
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if len(msg.Filters.Tags) > maxNoteTags {
		return validation.Issues{{Code: "too_big", Path: []any{"filters", "tags"}, Message: "Too big: expected array to have <=20 items"}}
	}

	filters := repository.SearchFilters{
		FromId:  msg.Filters.FromID,
		Query:   msg.Filters.Query,
		GroupId: msg.Filters.GroupID,
		Tags:    msg.Filters.Tags,
	}

	results := []messages.NoteSearchResult{}
	switch msg.Filters.Type {
	case "general":
		records, err := n.repo.Search().SearchGeneral(ctx, req.Client.UserID, filters)
		if err != nil {
			return err
		}
		for _, record := range records {
			results = append(results, messages.NoteSearchRecord{
				ID:          record.Id,
				Title:       record.Title,
				Note:        record.Note,
				GroupName:   record.GroupName,
				IsEncrypted: record.IsEncrypted,
				UpdatedAt:   record.UpdatedAt,
				UserName:    record.UserName,
			})
		}
	case "shared":
		records, err := n.repo.Shares().SearchSharedNotes(ctx, req.Client.UserID, filters)
		if err != nil {
			return err
		}
		for _, record := range records {
			results = append(results, userSharedNoteMeta(record))
		}
	case "reminders":
		records, err := n.repo.Reminders().SearchReminderNotes(ctx, req.Client.UserID, filters)
		if err != nil {
			return err
		}
		for _, record := range records {
			results = append(results, reminderNoteRecord(record))
		}
	case "recycleBin":
		records, err := n.repo.Search().SearchDeletedNotes(ctx, req.Client.UserID, filters)
		if err != nil {
			return err
		}
		for _, record := range records {
			results = append(results, deletedNoteRecord(record))
		}
	}

	return req.Respond(ctx, &messages.SearchNoteResponse{
		Type:    messages.NotesSearchResponse,
		Results: results,
	})
}

func (n *Namespace) findDeletedNotes(ctx context.Context, req *websocket.Request) error {
	var msg messages.FindDeletedNotes
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var fromID int64
	if msg.Filters.FromID != nil {
		fromID = *msg.Filters.FromID
	}

	records, err := n.repo.Notes().FindDeletedNotes(ctx, req.Client.UserID, fromID)
	if err != nil {
		return err
	}

	response := &messages.FindDeletedNotesResponse{
		Type:    messages.NotesFindDeletedResponse,
		Records: make([]messages.DeletedNoteRecord, 0, len(records)),
	}
	for _, record := range records {
		response.Records = append(response.Records, deletedNoteRecord(record))
	}
	return req.Respond(ctx, response)
}

func (n *Namespace) restoreDeletedNote(ctx context.Context, req *websocket.Request) error {
	var msg messages.RestoreDeletedNote
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	restored, err := n.repo.Notes().RestoreDeletedNote(ctx, userID, msg.ID)
	if err != nil {
		return err
	}
	response := &messages.RestoreDeletedNoteResponse{Type: messages.NotesRestoreDeletedResponse}
	if !restored {
		return req.Respond(ctx, response)
	}

	record, err := n.repo.Notes().GetNote(ctx, userID, msg.ID)
	if err != nil {
		return err
	}
	if record != nil {
		note := viewNoteRecord(record)
		response.RestoredNote = &note
	}
	recipients, err := n.shareRecipients(ctx, msg.ID)
	if err != nil {
		return err
	}
	req.RespondToUser(ctx, response)
	notifyRecipients(ctx, req, recipients, messages.EntityNote, msg.ID)
	return nil
}

func (n *Namespace) fullyDeleteNote(ctx context.Context, req *websocket.Request) error {
	var msg messages.FullyDeleteNote
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	exists, err := n.repo.Notes().NoteExists(ctx, userID, msg.ID, true)
	if err != nil {
		return err
	}
	if !exists {
		return websocket.NewClientError(repository.ErrNoteNotFound.Error())
	}

	recipients, err := n.shareRecipients(ctx, msg.ID)
	if err != nil {
		return err
	}
	if err := n.repo.Notes().FullyDeleteNotes(ctx, []int64{msg.ID}); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.FullyDeleteNoteResponse{
		Type:      messages.NotesFullyDeleteResponse,
		DeletedID: msg.ID,
	})
	notifyRecipients(ctx, req, recipients, messages.EntityNote, msg.ID)
	return nil
}

func (n *Namespace) notifyFullyDeletedNote(ctx context.Context, req *websocket.Request) error {
	var msg messages.NotifyFullyDeletedNote
	if err := req.Decode(&msg); err != nil {
		return err
	}

	req.Hub.SendToUser(ctx, int(msg.UserID), &messages.FullyDeleteNoteResponse{
		Namespace: messages.NamespaceNotes,
		Type:      messages.NotesFullyDeleteResponse,
		DeletedID: msg.NoteID,
	})
	return nil
}

const historyNotFound = "Note history data does not exist."

func (n *Namespace) findNoteHistory(ctx context.Context, req *websocket.Request) error {
	var msg messages.FindNoteHistory
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	if err := n.requireNote(ctx, userID, msg.NoteID); err != nil {
		return err
	}

	records, err := n.repo.NoteHistory().FindHistory(ctx, userID, msg.NoteID, msg.Page)
	if err != nil {
		return err
	}

	results := make([]messages.NoteHistoryMetaRecord, 0, len(records.Results))
	for _, record := range records.Results {
		results = append(results, messages.NoteHistoryMetaRecord{
			ID:          record.Id,
			Version:     record.Version,
			CreatedAt:   record.CreatedAt,
			IsEncrypted: record.IsEncrypted,
		})
	}

	return req.Respond(ctx, &messages.FindNoteHistoryResponse{
		Type: messages.NotesFindHistoryResponse,
		Records: messages.Paged[messages.NoteHistoryMetaRecord]{
			Results: results,
			Total:   records.Total,
			Page:    records.Page,
			PerPage: records.PerPage,
		},
	})
}

func (n *Namespace) getNoteHistoryData(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetNoteHistoryData
	if err := req.Decode(&msg); err != nil {
		return err
	}

	record, err := n.repo.NoteHistory().GetHistoryRecordData(ctx, req.Client.UserID, msg.ID)
	if err != nil {
		return err
	}
	if record == nil {
		return websocket.NewClientError(historyNotFound)
	}

	return req.Respond(ctx, &messages.GetNoteHistoryDataResponse{
		Type: messages.NotesGetHistoryDataResponse,
		Data: messages.NoteHistoryDataRecord{
			Version:     record.Version,
			Note:        record.Note,
			Title:       record.Title,
			IsEncrypted: record.IsEncrypted,
			Tags:        record.Tags,
		},
	})
}

func (n *Namespace) revertNoteToHistory(ctx context.Context, req *websocket.Request) error {
	var msg messages.RevertNoteToHistory
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	if err := n.requireNote(ctx, userID, msg.NoteID); err != nil {
		return err
	}

	record, err := n.repo.NoteHistory().GetHistoryRecordData(ctx, userID, msg.ToHistoryID)
	if err != nil {
		return err
	}
	if record == nil || record.NoteId != msg.NoteID {
		return websocket.NewClientError(historyNotFound)
	}

	tags := []string{}
	if record.Tags != "" {
		tags = strings.Split(record.Tags, ",")
	}

	recipients, err := n.shareRecipients(ctx, msg.NoteID)
	if err != nil {
		return err
	}
	err = n.repo.RunInTransaction(ctx, func(tx repository.Repository) error {
		return applyNoteUpdate(ctx, tx, userID, msg.NoteID, messages.UpdateNoteRequest{
			Title:       &record.Title,
			Text:        &record.Note,
			Tags:        &tags,
			IsEncrypted: &record.IsEncrypted,
		}, true)
	})
	if err != nil {
		return noteError(err)
	}

	req.RespondToUser(ctx, &messages.RevertNoteToHistoryResponse{
		Type:        messages.NotesRevertToHistoryResponse,
		NoteID:      msg.NoteID,
		IsEncrypted: record.IsEncrypted,
		Title:       record.Title,
		Note:        record.Note,
		Tags:        tags,
	})
	notifyRecipients(ctx, req, recipients, messages.EntityNote, msg.NoteID)
	return nil
}

func (n *Namespace) deleteHistoryRecord(ctx context.Context, req *websocket.Request) error {
	var msg messages.DeleteHistoryRecord
	if err := req.Decode(&msg); err != nil {
		return err
	}

	if err := n.requireNote(ctx, req.Client.UserID, msg.NoteID); err != nil {
		return err
	}
	if err := n.repo.NoteHistory().DeleteHistoryRecord(ctx, msg.NoteID, msg.ID); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.DeleteHistoryRecordResponse{
		Type: messages.NotesDeleteHistoryRecordResponse,
		ID:   msg.ID,
	})
	return nil
}

func viewNoteRecord(record *repository.ViewNoteRecord) messages.ViewNoteRecord {
	return messages.ViewNoteRecord{
		ID:          record.Id,
		Title:       record.Title,
		Note:        record.Note,
		IsEncrypted: record.IsEncrypted,
		IsWide:      record.IsWide,
		GroupID:     record.GroupId,
		GroupName:   record.GroupName,
		Tags:        record.Tags,
		UpdatedAt:   record.UpdatedAt,
	}
}

func deletedNoteRecord(record repository.DeletedNoteRecord) messages.DeletedNoteRecord {
	return messages.DeletedNoteRecord{
		ID:          record.Id,
		Title:       record.Title,
		IsEncrypted: record.IsEncrypted,
		DeletedAt:   record.DeletedAt,
	}
}

func noteRecord(record *repository.NoteRecord) messages.NoteRecord {
	return messages.NoteRecord{
		ID:          record.Id,
		Title:       record.Title,
		Note:        record.Note,
		IsEncrypted: record.IsEncrypted,
		IsWide:      record.IsWide,
		UserID:      int64(record.UserId),
		CreatedAt:   record.CreatedAt,
		UpdatedAt:   record.UpdatedAt,
		LastOpenAt:  record.LastOpenAt,
	}
}
