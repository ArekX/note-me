package settings

import (
	"context"
	"encoding/json"
	"log/slog"
	"slices"
	"time"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/backups"
	"noteme/internal/components/repository"
	"noteme/internal/config"
	"noteme/internal/eventbus"
	"noteme/internal/http/rbac"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
	"noteme/internal/logger"
)

type Namespace struct {
	repo      repository.Repository
	bus       *eventbus.Bus
	backups   *backups.Backups
	audit     *audit.Log
	logBuffer *logger.Buffer
	log       *slog.Logger
	config    *config.Config
}

func New(c *components.Components) *Namespace {
	return &Namespace{repo: c.Repository, bus: c.Bus, backups: c.Backups, audit: c.Audit, logBuffer: c.LogBuffer, log: c.Log, config: c.Config}
}

func (n *Namespace) Register(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceSettings, messages.SettingsGetPeriodicTasks, n.getPeriodicTasks)
	hub.Handle(messages.NamespaceSettings, messages.SettingsGetPeriodicTaskRuns, n.getPeriodicTaskRuns)
	hub.Handle(messages.NamespaceSettings, messages.SettingsRunPeriodicTask, n.runPeriodicTask)
	hub.Handle(messages.NamespaceSettings, messages.SettingsGetAuditLog, n.getAuditLog)
	hub.Handle(messages.NamespaceSettings, messages.SettingsGetServerLog, n.getServerLog)
	n.registerBackups(hub)

	n.bus.Subscribe(func(ctx context.Context, e eventbus.PeriodicTaskRan) {
		hub.PushBackend(ctx, notifyPermission(rbac.CanViewPeriodicTasks, messages.EntityPeriodicTask, e.Task))
	})
}

func notifyPermission(permission rbac.Permission, entity string, ids ...any) *messages.NotifyDataChanged {
	return &messages.NotifyDataChanged{
		Header:     messages.Header{Namespace: messages.NamespaceChanges, Type: messages.ChangesNotifyDataChanged},
		Permission: string(permission),
		Entity:     entity,
		IDs:        ids,
	}
}

func (n *Namespace) getPeriodicTasks(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanViewPeriodicTasks); err != nil {
		return err
	}

	records, err := n.repo.PeriodicTasks().GetAllPeriodicTasks(ctx)
	if err != nil {
		return err
	}

	tasks := make([]messages.PeriodicTaskRecord, 0, len(records))
	for _, record := range records {
		task := messages.PeriodicTaskRecord{
			TaskIdentifier:      record.TaskIdentifier,
			LastSuccessfulRunAt: record.LastSuccessfulRunAt,
			LastFailReason:      record.LastFailReason,
			LastFailRunAt:       record.LastFailRunAt,
			IsLastRunSuccessful: record.IsLastRunSuccessful,
		}
		if record.NextRunAt != nil {
			task.NextRunAt = *record.NextRunAt
		}
		tasks = append(tasks, task)
	}

	return req.Respond(ctx, &messages.GetPeriodicTasksResponse{
		Type:  messages.SettingsGetPeriodicTasksResponse,
		Tasks: tasks,
	})
}

func (n *Namespace) getPeriodicTaskRuns(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanViewPeriodicTasks); err != nil {
		return err
	}
	var msg messages.GetPeriodicTaskRuns
	if err := req.Decode(&msg); err != nil {
		return err
	}

	historyDays := n.config.PeriodicTaskHistoryDays
	filters := repository.PeriodicTaskRunFilters{
		TaskIdentifier: msg.TaskIdentifier,
		RanFrom:        time.Now().AddDate(0, 0, -historyDays).Unix(),
	}
	switch msg.Outcome {
	case "":
	case "success", "failed":
		successful := msg.Outcome == "success"
		filters.Successful = &successful
	default:
		return websocket.NewClientError("Unknown run outcome.")
	}

	runs, err := n.repo.PeriodicTasks().FindPeriodicTaskRuns(ctx, filters, msg.Page)
	if err != nil {
		return err
	}

	results := make([]messages.PeriodicTaskRunRecord, 0, len(runs.Results))
	for _, run := range runs.Results {
		results = append(results, messages.PeriodicTaskRunRecord{
			ID:             run.Id,
			TaskIdentifier: run.TaskIdentifier,
			RanAt:          run.RanAt,
			DurationMs:     run.DurationMs,
			IsSuccessful:   run.IsSuccessful,
			FailReason:     run.FailReason,
		})
	}
	return req.Respond(ctx, &messages.GetPeriodicTaskRunsResponse{
		Type: messages.SettingsGetPeriodicTaskRunsResponse,
		Runs: messages.Paged[messages.PeriodicTaskRunRecord]{
			Results: results,
			Total:   runs.Total,
			Page:    runs.Page,
			PerPage: runs.PerPage,
		},
		HistoryDays: historyDays,
	})
}

// The task is due a second from now; the scheduler runs and records it like
// any scheduled run.
func (n *Namespace) runPeriodicTask(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanRunPeriodicTasks); err != nil {
		return err
	}
	var msg messages.RunPeriodicTask
	if err := req.Decode(&msg); err != nil {
		return err
	}

	schedules, err := n.repo.PeriodicTasks().GetPeriodicTaskSchedules(ctx)
	if err != nil {
		return err
	}
	known := slices.ContainsFunc(schedules, func(schedule repository.PeriodicTaskSchedule) bool {
		return schedule.TaskIdentifier == msg.TaskIdentifier
	})
	if !known {
		return websocket.NewClientError("Periodic task not found.")
	}

	nextRunAt := time.Now().Add(time.Second).Unix()
	if err := n.repo.PeriodicTasks().SchedulePeriodicTask(ctx, msg.TaskIdentifier, nextRunAt); err != nil {
		return err
	}
	n.bus.Publish(ctx, eventbus.PeriodicTaskRunRequested{Task: msg.TaskIdentifier, NextRunAt: nextRunAt})
	n.audit.Record(ctx, audit.PeriodicTaskRunRequested, req.Client.Actor(), map[string]any{"task": msg.TaskIdentifier})

	req.RespondToUser(ctx, &messages.RunPeriodicTaskResponse{
		Type:           messages.SettingsRunPeriodicTaskResponse,
		TaskIdentifier: msg.TaskIdentifier,
		NextRunAt:      nextRunAt,
	})
	req.Hub.SendToPermission(ctx, rbac.CanViewPeriodicTasks, req.Client.UserID, messages.NewDataChanged(messages.EntityPeriodicTask, msg.TaskIdentifier))
	return nil
}

func (n *Namespace) getAuditLog(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanViewAuditLog); err != nil {
		return err
	}
	var msg messages.GetAuditLog
	if err := req.Decode(&msg); err != nil {
		return err
	}

	records, err := n.repo.AuditLog().FindAuditEntries(ctx, repository.AuditFilters{
		Event:    msg.Filters.Event,
		Username: msg.Filters.Username,
		From:     msg.Filters.From,
		To:       msg.Filters.To,
	}, msg.Page)
	if err != nil {
		return err
	}
	events, err := n.repo.AuditLog().FindAuditEvents(ctx)
	if err != nil {
		return err
	}

	results := make([]messages.AuditLogRecord, 0, len(records.Results))
	for _, record := range records.Results {
		results = append(results, auditLogRecord(record))
	}
	return req.Respond(ctx, &messages.GetAuditLogResponse{
		Type: messages.SettingsGetAuditLogResponse,
		Records: messages.Paged[messages.AuditLogRecord]{
			Results: results,
			Total:   records.Total,
			Page:    records.Page,
			PerPage: records.PerPage,
		},
		Events: events,
	})
}

func auditLogRecord(record repository.AuditRecord) messages.AuditLogRecord {
	result := messages.AuditLogRecord{
		ID:        record.Id,
		CreatedAt: record.CreatedAt,
		Event:     record.Event,
		Details:   json.RawMessage("{}"),
	}
	if record.UserId != nil {
		id := int64(*record.UserId)
		result.UserID = &id
	}
	if record.Username != "" {
		result.Username = &record.Username
	}
	if record.Address != "" {
		result.Address = &record.Address
	}
	if json.Valid([]byte(record.Details)) {
		result.Details = json.RawMessage(record.Details)
	}
	return result
}

// The buffer is nil when the process keeps no log in memory.
func (n *Namespace) getServerLog(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanViewServerLog); err != nil {
		return err
	}
	lines := []string{}
	if n.logBuffer != nil {
		lines = n.logBuffer.Lines()
	}
	return req.Respond(ctx, &messages.GetServerLogResponse{
		Type:  messages.SettingsGetServerLogResponse,
		Lines: lines,
	})
}
