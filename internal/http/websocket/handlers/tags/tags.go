package tags

import (
	"context"
	"encoding/json"
	"errors"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/http/rbac"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

type Namespace struct {
	repo  repository.Repository
	audit *audit.Log
}

func New(c *components.Components) *Namespace {
	return &Namespace{repo: c.Repository, audit: c.Audit}
}

func (n *Namespace) Register(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceTags, messages.TagsFind, n.findTags)
	hub.Handle(messages.NamespaceTags, messages.TagsCreate, n.createTag)
	hub.Handle(messages.NamespaceTags, messages.TagsUpdate, n.updateTag)
	hub.Handle(messages.NamespaceTags, messages.TagsDelete, n.deleteTag)
}

const (
	nameTooShort = "Name must have at least one character"
	nameTooLong  = "Name must have at most 255 characters"
)

func validateTagName(name string) validation.Issues {
	var issues validation.Issues
	issues.MinLength("name", name, 1, nameTooShort)
	issues.MaxLength("name", name, 255, nameTooLong)
	return issues
}

func tagError(err error) error {
	if errors.Is(err, repository.ErrTagExists) {
		return websocket.NewClientError(err.Error())
	}
	return err
}

func actor(req *websocket.Request) audit.Actor {
	return audit.Actor{UserID: req.Client.UserID, Username: req.Client.Session().Username, Address: req.Client.IP}
}

// findTags and createTag check no permission, as in the original (0.9.l).

func (n *Namespace) findTags(ctx context.Context, req *websocket.Request) error {
	var msg messages.FindTags
	if err := req.Decode(&msg); err != nil {
		return err
	}

	records, err := n.repo.Tags().FindTags(ctx, msg.Filters.Name, msg.Page)
	if err != nil {
		return err
	}

	return req.Respond(ctx, &messages.FindTagsResponse{
		Type: messages.TagsFindResponse,
		Records: messages.Paged[messages.TagRecord]{
			Results: tagRecords(records.Results),
			Total:   records.Total,
			Page:    records.Page,
			PerPage: records.PerPage,
		},
	})
}

func (n *Namespace) createTag(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var data messages.TagRequest
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	if issues := validateTagName(data.Name); len(issues) > 0 {
		return issues
	}

	record, err := n.repo.Tags().CreateTagRecord(ctx, req.Client.UserID, data.Name)
	if err != nil {
		return tagError(err)
	}

	req.RespondToUser(ctx, &messages.CreateTagResponse{
		Type:   messages.TagsCreateResponse,
		Record: messages.TagRecord{ID: record.Id, Name: record.Name},
	})
	notifyOthers(ctx, req, record.Id)
	return nil
}

// Validates before the permission check, as the original did.
func (n *Namespace) updateTag(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		ID   int64           `json:"id"`
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	var data messages.UpdateTagRequest
	if issues := validation.Decode(msg.Data, &data); len(issues) > 0 {
		return issues
	}
	if data.Name != nil {
		if issues := validateTagName(*data.Name); len(issues) > 0 {
			return issues
		}
	}

	if err := req.Client.Require(rbac.CanUpdateTags); err != nil {
		return err
	}

	if data.Name != nil {
		if err := n.repo.Tags().UpdateTagRecord(ctx, msg.ID, *data.Name); err != nil {
			return tagError(err)
		}
		n.audit.Record(ctx, audit.TagUpdated, actor(req), map[string]any{"id": msg.ID, "name": *data.Name})
	}

	req.RespondToUser(ctx, &messages.UpdateTagResponse{
		Type:        messages.TagsUpdateResponse,
		UpdatedID:   msg.ID,
		UpdatedData: data,
	})
	notifyOthers(ctx, req, msg.ID)
	return nil
}

func (n *Namespace) deleteTag(ctx context.Context, req *websocket.Request) error {
	var msg messages.DeleteTag
	if err := req.Decode(&msg); err != nil {
		return err
	}

	if err := req.Client.Require(rbac.CanUpdateTags); err != nil {
		return err
	}
	record, err := n.repo.Tags().GetTagRecord(ctx, msg.ID)
	if err != nil {
		return err
	}
	if err := n.repo.Tags().DeleteTagRecord(ctx, msg.ID); err != nil {
		return err
	}
	if record != nil {
		n.audit.Record(ctx, audit.TagDeleted, actor(req), map[string]any{"id": record.Id, "name": record.Name})
	}

	req.RespondToUser(ctx, &messages.DeleteTagResponse{
		Type:      messages.TagsDeleteResponse,
		DeletedID: msg.ID,
	})
	notifyOthers(ctx, req, msg.ID)
	return nil
}

// Tags show on every user's notes.
func notifyOthers(ctx context.Context, req *websocket.Request, tagID int64) {
	req.Hub.SendToEveryone(ctx, req.Client.UserID, messages.NewDataChanged(messages.EntityTag, tagID))
}

func tagRecords(records []repository.TagRecord) []messages.TagRecord {
	result := make([]messages.TagRecord, 0, len(records))
	for _, record := range records {
		result = append(result, messages.TagRecord{ID: record.Id, Name: record.Name})
	}
	return result
}
