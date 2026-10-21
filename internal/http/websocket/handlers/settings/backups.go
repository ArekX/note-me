package settings

import (
	"context"
	"errors"

	"noteme/internal/components/audit"
	"noteme/internal/components/backups"
	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/http/rbac"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	targetNotFoundMessage   = "Target not found"
	updateInProgressMessage = "Backup is in progress. Cannot update target"
	deleteInProgressMessage = "Backup is in progress. Cannot delete target"
	backupInProgressMessage = "Backup is already in progress"
	setupFailedMessage      = "Could not set up the backup target."
	listFailedMessage       = "Could not list backups."
	backupFailedMessage     = "Backup failed."
	deleteFailedMessage     = "Could not delete backup."
)

func (n *Namespace) registerBackups(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceSettings, messages.SettingsGetBackupTargets, n.getBackupTargets)
	hub.Handle(messages.NamespaceSettings, messages.SettingsCreateBackupTarget, n.createBackupTarget)
	hub.Handle(messages.NamespaceSettings, messages.SettingsUpdateBackupTarget, n.updateBackupTarget)
	hub.Handle(messages.NamespaceSettings, messages.SettingsDeleteBackupTarget, n.deleteBackupTarget)
	hub.Handle(messages.NamespaceSettings, messages.SettingsGetBackups, n.getBackups)
	hub.Handle(messages.NamespaceSettings, messages.SettingsCreateBackupNow, n.createBackupNow)
	hub.Handle(messages.NamespaceSettings, messages.SettingsDeleteBackup, n.deleteBackup)

	n.bus.Subscribe(func(ctx context.Context, _ eventbus.AutomaticBackupFinished) {
		hub.PushBackend(ctx, notifyPermission(rbac.CanManageBackups, messages.EntityBackup))
		hub.PushBackend(ctx, notifyPermission(rbac.CanManageBackups, messages.EntityBackupTarget))
	})
}

// The acting admin's tabs get the response.
func notifyOtherAdmins(ctx context.Context, req *websocket.Request, changed *messages.DataChanged) {
	req.Hub.SendToPermission(ctx, rbac.CanManageBackups, req.Client.UserID, changed)
}

func targetRecord(target repository.BackupTarget) messages.BackupTargetRecord {
	return messages.BackupTargetRecord{
		ID:           int64(target.Id),
		Name:         target.Name,
		Type:         target.Type,
		Settings:     maskedSettings(target.Type, target.Settings),
		CreatedAt:    target.CreatedAt,
		UpdatedAt:    target.UpdatedAt,
		LastBackupAt: target.LastBackupAt,
	}
}

func backupItem(item backups.Item) messages.BackupItem {
	return messages.BackupItem{Identifier: item.Identifier, Name: item.Name, CreatedAt: item.CreatedAt, Size: item.Size}
}

func (n *Namespace) target(ctx context.Context, id int64) (*repository.BackupTarget, error) {
	target, err := n.repo.BackupTargets().GetBackupTarget(ctx, int(id))
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, websocket.NewClientError(targetNotFoundMessage)
	}
	return target, nil
}

// Target errors carry paths and provider responses, so the admin gets a
// fixed text and the log the cause (SF-24).
func (n *Namespace) setupTarget(ctx context.Context, data repository.BackupTargetData) error {
	handler, err := n.backups.NewTarget(data.Type, data.Settings)
	if err != nil {
		n.log.Warn("Backup target could not be created", "name", data.Name, "type", data.Type, "error", err)
		return websocket.NewClientError(setupFailedMessage)
	}
	if err := handler.Setup(ctx); err != nil {
		n.log.Warn("Backup target setup failed", "name", data.Name, "type", data.Type, "error", err)
		return websocket.NewClientError(setupFailedMessage)
	}
	return nil
}

func (n *Namespace) listBackups(ctx context.Context, target repository.BackupTarget) ([]backups.Item, error) {
	handler, err := n.backups.Target(target)
	if err != nil {
		return nil, err
	}
	return handler.List(ctx)
}

func (n *Namespace) removeBackup(ctx context.Context, target repository.BackupTarget, identifier string) error {
	handler, err := n.backups.Target(target)
	if err != nil {
		return err
	}
	return handler.Delete(ctx, identifier)
}

func targetDetails(id int, data repository.BackupTargetData) map[string]any {
	return map[string]any{"target_id": id, "name": data.Name, "type": data.Type}
}

func (n *Namespace) getBackupTargets(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageBackups); err != nil {
		return err
	}
	targets, err := n.repo.BackupTargets().GetBackupTargets(ctx)
	if err != nil {
		return err
	}
	records := make([]messages.BackupTargetRecord, 0, len(targets))
	for _, target := range targets {
		records = append(records, targetRecord(target))
	}
	return req.Respond(ctx, &messages.GetBackupTargetsResponse{
		Type:           messages.SettingsGetBackupTargetsResponse,
		Targets:        records,
		MaxBackupCount: n.backups.MaxCount(),
	})
}

// The target is set up (local folder created) before it is stored; the
// original stored it first and failed afterwards.
func (n *Namespace) createBackupTarget(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageBackups); err != nil {
		return err
	}
	var msg messages.CreateBackupTarget
	if err := req.Decode(&msg); err != nil {
		return err
	}
	data, issues := parseBackupTarget(msg.Target)
	if len(issues) > 0 {
		return issues
	}
	if err := n.setupTarget(ctx, data); err != nil {
		return err
	}
	target, err := n.repo.BackupTargets().CreateBackupTarget(ctx, data)
	if err != nil {
		return err
	}
	n.audit.Record(ctx, audit.BackupTargetCreated, req.Client.Actor(), targetDetails(target.Id, data))
	req.RespondToUser(ctx, &messages.CreateBackupTargetResponse{
		Type:   messages.SettingsCreateBackupTargetResponse,
		Record: targetRecord(*target),
	})
	notifyOtherAdmins(ctx, req, messages.NewDataChanged(messages.EntityBackupTarget, int64(target.Id)))
	return nil
}

func (n *Namespace) updateBackupTarget(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageBackups); err != nil {
		return err
	}
	var msg messages.UpdateBackupTarget
	if err := req.Decode(&msg); err != nil {
		return err
	}
	existing, err := n.target(ctx, msg.TargetID)
	if err != nil {
		return err
	}
	data, issues := parseBackupTarget(keepStoredSecret(msg.Data, *existing))
	if len(issues) > 0 {
		return issues
	}
	inProgress, err := n.repo.BackupTargets().IsBackupInProgress(ctx, existing.Id)
	if err != nil {
		return err
	}
	if inProgress {
		return websocket.NewClientError(updateInProgressMessage)
	}
	if err := n.setupTarget(ctx, data); err != nil {
		return err
	}
	if _, err := n.repo.BackupTargets().UpdateBackupTarget(ctx, existing.Id, data); err != nil {
		return err
	}
	n.audit.Record(ctx, audit.BackupTargetUpdated, req.Client.Actor(), targetDetails(existing.Id, data))
	req.RespondToUser(ctx, &messages.UpdateBackupTargetResponse{
		Type:     messages.SettingsUpdateBackupTargetResponse,
		TargetID: msg.TargetID,
		Data:     messages.BackupTargetRequest{Name: data.Name, Type: data.Type, Settings: maskedSettings(data.Type, data.Settings)},
	})
	notifyOtherAdmins(ctx, req, messages.NewDataChanged(messages.EntityBackupTarget, msg.TargetID))
	return nil
}

// The backups stored in the target are not removed.
func (n *Namespace) deleteBackupTarget(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageBackups); err != nil {
		return err
	}
	var msg messages.DeleteBackupTarget
	if err := req.Decode(&msg); err != nil {
		return err
	}
	existing, err := n.target(ctx, msg.TargetID)
	if err != nil {
		return err
	}
	deleted, err := n.repo.BackupTargets().DeleteBackupTarget(ctx, int(msg.TargetID))
	if err != nil {
		return err
	}
	if !deleted {
		return websocket.NewClientError(deleteInProgressMessage)
	}
	n.audit.Record(ctx, audit.BackupTargetDeleted, req.Client.Actor(), map[string]any{"target_id": existing.Id, "name": existing.Name, "type": existing.Type})
	req.RespondToUser(ctx, &messages.DeleteBackupTargetResponse{
		Type:     messages.SettingsDeleteBackupTargetResponse,
		TargetID: msg.TargetID,
	})
	notifyOtherAdmins(ctx, req, messages.NewDataChanged(messages.EntityBackupTarget, msg.TargetID))
	return nil
}

func (n *Namespace) getBackups(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageBackups); err != nil {
		return err
	}
	var msg messages.GetBackups
	if err := req.Decode(&msg); err != nil {
		return err
	}
	target, err := n.target(ctx, msg.TargetID)
	if err != nil {
		return err
	}
	items, err := n.listBackups(ctx, *target)
	if err != nil {
		n.log.Warn("Could not list backups", "target", target.Name, "error", err)
		return websocket.NewClientError(listFailedMessage)
	}
	result := make([]messages.BackupItem, 0, len(items))
	for _, item := range items {
		result = append(result, backupItem(item))
	}
	return req.Respond(ctx, &messages.GetBackupsResponse{
		Type:    messages.SettingsGetBackupsResponse,
		Backups: result,
	})
}

// A backup can take minutes, so it runs outside the connection's message
// queue and answers when done; the page listens for the response (as the
// original's dispatchMessage did). Failures come back in the result.
func (n *Namespace) createBackupNow(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageBackups); err != nil {
		return err
	}
	var msg messages.CreateBackupNow
	if err := req.Decode(&msg); err != nil {
		return err
	}

	respond := func(ctx context.Context, result messages.CreateBackupNowResult) {
		response := &messages.CreateBackupNowResponse{
			Type:   messages.SettingsCreateBackupNowResponse,
			Result: result,
		}
		if result.Success {
			req.RespondToUser(ctx, response)
			notifyOtherAdmins(ctx, req, messages.NewDataChanged(messages.EntityBackup, result.Backup.Identifier))
			notifyOtherAdmins(ctx, req, messages.NewDataChanged(messages.EntityBackupTarget, result.TargetID))
			return
		}
		if err := req.Respond(ctx, response); err != nil {
			n.log.Debug("Could not send the manual backup result", "error", err)
		}
	}

	target, err := n.repo.BackupTargets().GetBackupTarget(ctx, int(msg.TargetID))
	if err != nil {
		return err
	}
	if target == nil {
		respond(ctx, messages.CreateBackupNowResult{Message: targetNotFoundMessage})
		return nil
	}

	backgroundCtx := context.WithoutCancel(ctx)
	actor := req.Client.Actor()
	go func() {
		item, err := n.backups.CreateManual(backgroundCtx, *target)
		switch {
		case errors.Is(err, backups.ErrInProgress):
			respond(backgroundCtx, messages.CreateBackupNowResult{Message: backupInProgressMessage})
		case err != nil:
			n.log.Error("Manual backup failed", "target", target.Name, "error", err)
			respond(backgroundCtx, messages.CreateBackupNowResult{Message: backupFailedMessage})
		default:
			n.audit.Record(backgroundCtx, audit.BackupCreated, actor, map[string]any{"target_id": target.Id, "identifier": item.Identifier})
			result := backupItem(item)
			respond(backgroundCtx, messages.CreateBackupNowResult{Success: true, TargetID: msg.TargetID, Backup: &result})
		}
	}()
	return nil
}

func (n *Namespace) deleteBackup(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageBackups); err != nil {
		return err
	}
	var msg messages.DeleteBackup
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if issues := validateBackupName(msg.Identifier); len(issues) > 0 {
		return issues
	}
	target, err := n.target(ctx, msg.TargetID)
	if err != nil {
		return err
	}
	err = n.removeBackup(ctx, *target, msg.Identifier)
	switch {
	case errors.Is(err, backups.ErrNotFound):
		return websocket.NewClientError(err.Error())
	case err != nil:
		n.log.Warn("Could not delete backup", "target", target.Name, "identifier", msg.Identifier, "error", err)
		return websocket.NewClientError(deleteFailedMessage)
	}
	n.audit.Record(ctx, audit.BackupDeleted, req.Client.Actor(), map[string]any{"target_id": target.Id, "identifier": msg.Identifier})
	req.RespondToUser(ctx, &messages.DeleteBackupResponse{
		Type:       messages.SettingsDeleteBackupResponse,
		TargetID:   msg.TargetID,
		Identifier: msg.Identifier,
	})
	notifyOtherAdmins(ctx, req, messages.NewDataChanged(messages.EntityBackup, msg.Identifier))
	return nil
}

// backupNameSchema of the original checks {name: identifier}.
func validateBackupName(identifier string) validation.Issues {
	if backups.ValidIdentifier(identifier) {
		return nil
	}
	return validation.Issues{{Code: "invalid_format", Path: []any{"name"}, Message: "Invalid string: must match pattern /^[a-zA-Z0-9.-]+$/"}}
}
