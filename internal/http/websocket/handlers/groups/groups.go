package groups

import (
	"context"
	"encoding/json"
	"errors"

	"noteme/internal/components"
	"noteme/internal/components/repository"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

type Namespace struct {
	repo repository.Repository
}

func New(c *components.Components) *Namespace {
	return &Namespace{repo: c.Repository}
}

func (n *Namespace) Register(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceGroups, messages.GroupsCreate, n.createGroup)
	hub.Handle(messages.NamespaceGroups, messages.GroupsUpdate, n.updateGroup)
	hub.Handle(messages.NamespaceGroups, messages.GroupsDelete, n.deleteGroup)
	hub.Handle(messages.NamespaceGroups, messages.GroupsGetSingle, n.getSingleGroup)
}

func validateGroupName(issues *validation.Issues, name string) {
	issues.MinLength("name", name, 1, "Group name must be at least 1 character long")
	issues.MaxLength("name", name, 255, "Group name must be at most 255 characters long")
}

func groupError(err error) error {
	for _, clientErr := range []error{
		repository.ErrGroupNotFound,
		repository.ErrGroupOwnParent,
		repository.ErrGroupIntoDescendant,
	} {
		if errors.Is(err, clientErr) {
			return websocket.NewClientError(clientErr.Error())
		}
	}
	return err
}

func (n *Namespace) createGroup(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var data messages.AddGroupRequest
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	var issues validation.Issues
	if validateGroupName(&issues, data.Name); len(issues) > 0 {
		return issues
	}

	record, err := n.repo.Groups().CreateGroup(ctx, repository.NewGroupRecord{
		Name:     data.Name,
		ParentId: data.ParentID,
		UserId:   req.Client.UserID,
	})
	if err != nil {
		return groupError(err)
	}

	req.RespondToUser(ctx, &messages.CreateGroupResponse{
		Type:   messages.GroupsCreateResponse,
		Record: groupRecord(record),
	})
	return nil
}

func (n *Namespace) updateGroup(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		ID   int64           `json:"id"`
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var data messages.UpdateGroupRequest
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	if data.Name != nil {
		var issues validation.Issues
		if validateGroupName(&issues, *data.Name); len(issues) > 0 {
			return issues
		}
	}

	err := n.repo.Groups().UpdateGroup(ctx, req.Client.UserID, msg.ID, repository.GroupUpdate{
		Name:      data.Name,
		SetParent: data.ParentID.Set,
		ParentId:  data.ParentID.Value,
	})
	if err != nil {
		return groupError(err)
	}

	req.RespondToUser(ctx, &messages.UpdateGroupResponse{
		Type:        messages.GroupsUpdateResponse,
		UpdatedID:   msg.ID,
		UpdatedData: data,
	})
	return nil
}

func (n *Namespace) deleteGroup(ctx context.Context, req *websocket.Request) error {
	var msg messages.DeleteGroup
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID

	exists, err := n.repo.Groups().GroupExists(ctx, userID, msg.ID)
	if err != nil {
		return err
	}
	if !exists {
		return websocket.NewClientError(repository.ErrGroupNotFound.Error())
	}

	deletedCount := 0
	pending := []int64{msg.ID}

	for len(pending) > 0 {
		parentID := pending[0]
		pending = pending[1:]

		deleted, err := n.repo.Groups().DeleteGroupChildren(ctx, userID, parentID)
		if err != nil {
			return err
		}

		for _, noteID := range deleted.NoteIds {
			req.Hub.SendToUser(ctx, userID, &messages.DeleteNoteResponse{
				Namespace: messages.NamespaceNotes,
				Type:      messages.NotesDeleteResponse,
				DeletedID: noteID,
			})
		}
		// Per note, so recipients learn nothing about the owner's other notes.
		for _, noteID := range deleted.NoteIds {
			recipients, err := n.repo.Shares().FindNoteShareUserIds(ctx, []int64{noteID})
			if err != nil {
				return err
			}
			if len(recipients) > 0 {
				req.Hub.SendToUsers(ctx, recipients, messages.NewDataChanged(messages.EntityNote, noteID))
			}
		}
		for _, groupID := range deleted.GroupIds {
			req.Hub.SendToUser(ctx, userID, &messages.DeleteGroupResponse{
				Namespace: messages.NamespaceGroups,
				Type:      messages.GroupsDeleteResponse,
				DeletedID: groupID,
			})
		}

		deletedCount += len(deleted.GroupIds) + len(deleted.NoteIds)
		if err := req.Send(ctx, &messages.DeleteGroupProgress{
			Type:         messages.GroupsDeleteProgress,
			DeletedID:    msg.ID,
			DeletedCount: deletedCount,
		}); err != nil {
			return err
		}

		pending = append(pending, deleted.GroupIds...)
	}

	if err := n.repo.Groups().DeleteGroup(ctx, userID, msg.ID); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.DeleteGroupResponse{
		Type:      messages.GroupsDeleteResponse,
		DeletedID: msg.ID,
	})
	return nil
}

func (n *Namespace) getSingleGroup(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetSingleGroup
	if err := req.Decode(&msg); err != nil {
		return err
	}

	record, err := n.repo.Groups().GetGroupById(ctx, req.Client.UserID, msg.ID)
	if err != nil {
		return err
	}

	response := &messages.GetSingleGroupResponse{Type: messages.GroupsGetSingleResponse}
	if record != nil {
		group := groupRecord(record)
		response.Record = &group
	}

	return req.Respond(ctx, response)
}

func groupRecord(record *repository.GroupRecord) messages.GroupRecord {
	return messages.GroupRecord{
		ID:           record.Id,
		Name:         record.Name,
		ParentID:     record.ParentId,
		CreatedAt:    record.CreatedAt,
		HasSubgroups: record.HasSubgroups,
		HasNotes:     record.HasNotes,
	}
}
