package users

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"noteme/internal/components/jobs"
	"noteme/internal/eventbus"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	invalidPasswordMessage = "Invalid password."
	exportBusyMessage      = "Too many exports are running, please try again later."
	notExportOwnerMessage  = "You do not own this export job."
)

func (n *Namespace) registerExport(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceUsers, messages.UsersExportOwnData, n.exportOwnData)
	hub.Handle(messages.NamespaceUsers, messages.UsersCancelExportOwnData, n.cancelExportOwnData)

	hub.HandleBackend(messages.NamespaceUsers, messages.UsersNotifyExportUpdated, notifyExportUpdated)
	hub.HandleBackend(messages.NamespaceUsers, messages.UsersNotifyExportFinished, notifyExportFinished)
	hub.HandleBackend(messages.NamespaceUsers, messages.UsersNotifyExportFailed, notifyExportFailed)

	n.bus.Subscribe(func(ctx context.Context, e eventbus.DataExportUpdated) {
		hub.PushBackend(ctx, &messages.NotifyUserExportUpdated{
			Namespace:  messages.NamespaceUsers,
			Type:       messages.UsersNotifyExportUpdated,
			ExportID:   e.ExportID,
			UserID:     int64(e.UserID),
			Percentage: e.Percentage,
		})
	})
	n.bus.Subscribe(func(ctx context.Context, e eventbus.DataExportFinished) {
		hub.PushBackend(ctx, &messages.NotifyUserExportFinished{
			Namespace: messages.NamespaceUsers,
			Type:      messages.UsersNotifyExportFinished,
			ExportID:  e.ExportID,
			UserID:    int64(e.UserID),
		})
	})
	n.bus.Subscribe(func(ctx context.Context, e eventbus.DataExportFailed) {
		hub.PushBackend(ctx, &messages.NotifyUserExportFailed{
			Namespace: messages.NamespaceUsers,
			Type:      messages.UsersNotifyExportFailed,
			ExportID:  e.ExportID,
			Message:   e.Message,
			UserID:    int64(e.UserID),
		})
	})
}

// Not in the original, which queued the export with any password and only
// failed at the first protected note.
func (n *Namespace) exportOwnData(ctx context.Context, req *websocket.Request) error {
	var msg messages.ExportOwnData
	if err := req.Decode(&msg); err != nil {
		return err
	}

	valid, err := n.validatePassword(ctx, req, msg.UserPassword)
	if err != nil {
		return err
	}
	if !valid {
		return websocket.NewClientError(invalidPasswordMessage)
	}

	exportID := uuid.NewString()
	jobID, err := n.jobs.Enqueue(jobs.CreateDataExport, req.Client.UserID, jobs.DataExport{
		ExportID: exportID,
		Password: msg.UserPassword,
	})
	if errors.Is(err, jobs.ErrQueueFull) {
		return websocket.NewClientError(exportBusyMessage)
	}
	if err != nil {
		return err
	}

	return req.Respond(ctx, &messages.ExportOwnDataResponse{
		Type:     messages.UsersExportOwnDataResponse,
		ExportID: exportID,
		JobID:    jobID,
	})
}

func (n *Namespace) cancelExportOwnData(ctx context.Context, req *websocket.Request) error {
	var msg messages.CancelExportOwnData
	if err := req.Decode(&msg); err != nil {
		return err
	}

	if err := n.jobs.Abort(msg.JobID, req.Client.UserID); err != nil {
		return websocket.NewClientError(notExportOwnerMessage)
	}

	return req.Respond(ctx, &messages.CancelExportOwnDataResponse{
		Type:  messages.UsersCancelExportOwnDataResponse,
		JobID: msg.JobID,
	})
}

func notifyExportUpdated(ctx context.Context, req *websocket.Request) error {
	var msg messages.NotifyUserExportUpdated
	if err := req.Decode(&msg); err != nil {
		return err
	}
	req.Hub.SendToUser(ctx, int(msg.UserID), &messages.ExportOwnDataPercentageUpdate{
		Namespace:  messages.NamespaceUsers,
		Type:       messages.UsersExportOwnDataPercentage,
		ExportID:   msg.ExportID,
		Percentage: msg.Percentage,
	})
	return nil
}

func notifyExportFinished(ctx context.Context, req *websocket.Request) error {
	var msg messages.NotifyUserExportFinished
	if err := req.Decode(&msg); err != nil {
		return err
	}
	req.Hub.SendToUser(ctx, int(msg.UserID), &messages.ExportOwnDataFinished{
		Namespace: messages.NamespaceUsers,
		Type:      messages.UsersExportOwnDataFinished,
		ExportID:  msg.ExportID,
	})
	return nil
}

func notifyExportFailed(ctx context.Context, req *websocket.Request) error {
	var msg messages.NotifyUserExportFailed
	if err := req.Decode(&msg); err != nil {
		return err
	}
	req.Hub.SendToUser(ctx, int(msg.UserID), &messages.ExportOwnDataFailed{
		Namespace: messages.NamespaceUsers,
		Type:      messages.UsersExportOwnDataFailed,
		ExportID:  msg.ExportID,
		Message:   msg.Message,
	})
	return nil
}
