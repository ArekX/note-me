package tree

import (
	"context"

	"noteme/internal/components"
	"noteme/internal/components/repository"
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
	hub.Handle(messages.NamespaceTree, messages.TreeGet, n.getTree)
}

func (n *Namespace) getTree(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetTree
	if err := req.Decode(&msg); err != nil {
		return err
	}

	records, err := n.repo.Tree().GetTreeList(ctx, req.Client.UserID, msg.ParentID, msg.ItemType)
	if err != nil {
		return err
	}

	response := &messages.GetTreeResponse{
		Type:     messages.TreeGetResponse,
		ParentID: msg.ParentID,
		Records:  make([]messages.TreeRecord, 0, len(records)),
	}
	for _, record := range records {
		response.Records = append(response.Records, messages.TreeRecord{
			Type:        record.Type,
			ID:          record.Id,
			Name:        record.Name,
			IsEncrypted: record.IsEncrypted,
			HasChildren: record.HasChildren,
		})
	}

	return req.Respond(ctx, response)
}
