package notes

import (
	"context"
	"encoding/json"

	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	sharedNoteNotFound  = "Requested note not found."
	sharedNoteProtected = "This note is protected by its owner and cannot be viewed."
	protectedNoteShare  = "Protected notes cannot be shared."
	maxShareRecipients  = 100
)

// Protected text never leaves its owner (decision 0.46), so a protected note
// cannot be shared at all.
func (n *Namespace) requireShareableNote(ctx context.Context, userID int, noteID int64) error {
	if err := n.requireNote(ctx, userID, noteID); err != nil {
		return err
	}
	record, err := n.repo.Notes().GetNoteDetails(ctx, userID, noteID, repository.NoteDetailsOptions{})
	if err != nil {
		return err
	}
	if record == nil {
		return websocket.NewClientError(repository.ErrNoteNotFound.Error())
	}
	if record.IsEncrypted {
		return websocket.NewClientError(protectedNoteShare)
	}
	return nil
}

func publicShareRecord(record repository.PublicShareRecord) messages.PublicNoteShareRecord {
	return messages.PublicNoteShareRecord{
		ID:         record.Id,
		NoteID:     record.NoteId,
		Identifier: record.Identifier,
		CreatedAt:  record.CreatedAt,
		ExpiresAt:  record.ExpiresAt,
	}
}

func userSharedNoteMeta(record repository.UserSharedNoteRecord) messages.UserSharedNoteMeta {
	return messages.UserSharedNoteMeta{
		ID:          record.Id,
		ShareID:     record.ShareId,
		Title:       record.Title,
		IsEncrypted: record.IsEncrypted,
		UserName:    record.UserName,
		CreatedAt:   record.CreatedAt,
	}
}

func publicSharedNote(record *repository.SharedNoteRecord) messages.PublicSharedNote {
	return messages.PublicSharedNote{
		ID:          record.Id,
		Title:       record.Title,
		Note:        record.Note,
		IsEncrypted: record.IsEncrypted,
		IsWide:      record.IsWide,
		Tags:        record.Tags,
		UpdatedAt:   record.UpdatedAt,
		UserName:    record.UserName,
	}
}

// A protected note's text needs its owner's key, so it is never sent to
// anyone else, as in the original.
func (n *Namespace) getSharedNote(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetSharedNote
	if err := req.Decode(&msg); err != nil {
		return err
	}

	record, err := n.repo.Shares().GetUserShareNote(ctx, req.Client.UserID, msg.ID)
	if err != nil {
		return err
	}
	if record == nil {
		return websocket.NewClientError(sharedNoteNotFound)
	}
	if record.IsEncrypted {
		return websocket.NewClientError(sharedNoteProtected)
	}

	return req.Respond(ctx, &messages.GetSharedNoteResponse{
		Type:   messages.NotesGetSharedResponse,
		Record: publicSharedNote(record),
	})
}

func (n *Namespace) getNoteShareData(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetNoteShareData
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if err := n.requireNote(ctx, req.Client.UserID, msg.NoteID); err != nil {
		return err
	}

	data, err := n.repo.Shares().GetNoteShareData(ctx, msg.NoteID)
	if err != nil {
		return err
	}

	response := &messages.GetNoteShareDataResponse{Type: messages.NotesGetShareDataResponse}
	response.Users = make([]messages.PickUserRecord, 0, len(data.Users))
	for _, user := range data.Users {
		response.Users = append(response.Users, messages.PickUserRecord{ID: user.Id, Name: user.Name, Username: user.Username})
	}
	response.Links = make([]messages.PublicNoteShareRecord, 0, len(data.Links))
	for _, link := range data.Links {
		response.Links = append(response.Links, publicShareRecord(link))
	}
	return req.Respond(ctx, response)
}

func (n *Namespace) createPublicShare(ctx context.Context, req *websocket.Request) error {
	var msg messages.CreatePublicShare
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if err := n.requireShareableNote(ctx, req.Client.UserID, msg.NoteID); err != nil {
		return err
	}

	record, err := n.repo.Shares().CreatePublicShare(ctx, msg.NoteID, msg.ExpiresAt)
	if err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.CreatePublicShareResponse{
		Type:   messages.NotesCreatePublicShareResponse,
		Record: publicShareRecord(*record),
	})
	return nil
}

func (n *Namespace) removePublicShare(ctx context.Context, req *websocket.Request) error {
	var msg messages.RemovePublicShare
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if err := n.requireNote(ctx, req.Client.UserID, msg.NoteID); err != nil {
		return err
	}
	if err := n.repo.Shares().RemovePublicShare(ctx, msg.NoteID, msg.ID); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.RemovePublicShareResponse{
		Type:      messages.NotesRemovePublicShareResponse,
		RemovedID: msg.ID,
	})
	return nil
}

func (n *Namespace) shareToUsers(ctx context.Context, req *websocket.Request) error {
	var msg messages.ShareToUsers
	if err := req.Decode(&msg); err != nil {
		return err
	}
	var issues validation.Issues
	if issues.MaxItems("user_ids", len(msg.UserIDs), maxShareRecipients, ""); len(issues) > 0 {
		return issues
	}

	userID := req.Client.UserID
	if err := n.requireShareableNote(ctx, userID, msg.NoteID); err != nil {
		return err
	}

	before, err := n.shareRecipients(ctx, msg.NoteID)
	if err != nil {
		return err
	}
	added, err := n.repo.Shares().SetUserShare(ctx, userID, msg.NoteID, msg.UserIDs)
	if err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.ShareToUsersResponse{Type: messages.NotesShareToUsersResponse})
	recipients := before
	for _, id := range added {
		recipients = append(recipients, int(id))
	}
	notifyRecipients(ctx, req, recipients, messages.EntityShare, msg.NoteID)
	if len(added) == 0 {
		return nil
	}

	note, err := n.repo.Reminders().GetNoteInfo(ctx, msg.NoteID)
	if err != nil || note == nil {
		return err
	}
	payload, err := json.Marshal(messages.NoteSharedData{ID: note.Id, Title: note.Title, UserName: note.UserName})
	if err != nil {
		return err
	}
	data, err := json.Marshal(messages.NotificationData{Type: "note-shared", Payload: payload})
	if err != nil {
		return err
	}

	for _, recipient := range added {
		record, err := n.repo.Notifications().CreateNotification(ctx, int(recipient), string(data))
		if err != nil {
			return err
		}
		n.bus.Publish(ctx, eventbus.NotificationCreated{
			ID:        record.Id,
			UserID:    record.UserId,
			Data:      record.Data,
			CreatedAt: record.CreatedAt,
		})
	}
	return nil
}

func (n *Namespace) findSharedNotes(ctx context.Context, req *websocket.Request) error {
	var msg messages.FindSharedNotes
	if err := req.Decode(&msg); err != nil {
		return err
	}

	filters := repository.SharedNotesFilters{
		FromCreatedAt: msg.Filters.FromCreatedAt,
		FromShareId:   msg.Filters.FromShareID,
	}
	if msg.Filters.Limit != nil {
		filters.Limit = *msg.Filters.Limit
	}

	records, err := n.repo.Shares().FindUserSharedNotes(ctx, req.Client.UserID, filters)
	if err != nil {
		return err
	}

	response := &messages.FindSharedNotesResponse{
		Type:    messages.NotesFindSharedResponse,
		Records: make([]messages.UserSharedNoteMeta, 0, len(records)),
	}
	for _, record := range records {
		response.Records = append(response.Records, userSharedNoteMeta(record))
	}
	return req.Respond(ctx, response)
}
