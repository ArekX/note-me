package aitools

import (
	"noteme/internal/http/rbac"
	"noteme/internal/http/websocket/messages"
)

type auditLogArgs struct {
	Event    string `json:"event,omitempty" desc:"Only this event, for example login_failed"`
	Username string `json:"username,omitempty"`
	From     int64  `json:"from,omitempty" desc:"Unix time in seconds"`
	To       int64  `json:"to,omitempty" desc:"Unix time in seconds"`
	Page     int    `json:"page,omitempty" desc:"Page of 20 entries, newest first, from 1"`
}

type taskArgs struct {
	Task string `json:"task" desc:"Task identifier from get_periodic_tasks"`
}

type taskRunsArgs struct {
	Task    string `json:"task" desc:"Task identifier from get_periodic_tasks"`
	Outcome string `json:"outcome,omitempty" enum:"success,failed"`
	Page    int    `json:"page,omitempty" desc:"Page of 20 runs, newest first, from 1"`
}

var logTools = []Tool{
	define(Tool{
		Name:        "get_audit_log",
		Title:       "Audit log",
		Description: "Lists security events: sign ins, failed passwords, user and backup changes.",
		ReadOnly:    true,
		Permission:  rbac.CanViewAuditLog,
	}, func(_ Env, args auditLogArgs) (*Call, error) {
		filters := map[string]any{}
		if args.Event != "" {
			filters["event"] = args.Event
		}
		if args.Username != "" {
			filters["username"] = args.Username
		}
		if args.From != 0 {
			filters["from"] = args.From
		}
		if args.To != 0 {
			filters["to"] = args.To
		}
		return message(messages.NamespaceSettings, messages.SettingsGetAuditLog, messages.SettingsGetAuditLogResponse, map[string]any{"filters": filters, "page": max(args.Page, 1)})
	}),
	define(Tool{
		Name:        "get_periodic_tasks",
		Title:       "Periodic tasks",
		Description: "Lists the background tasks with their next run and last result.",
		ReadOnly:    true,
		Permission:  rbac.CanViewPeriodicTasks,
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceSettings, messages.SettingsGetPeriodicTasks, messages.SettingsGetPeriodicTasksResponse, map[string]any{})
	}),
	define(Tool{
		Name:        "get_periodic_task_runs",
		Title:       "Task runs",
		Description: "Lists the recent runs of a background task.",
		ReadOnly:    true,
		Permission:  rbac.CanViewPeriodicTasks,
	}, func(_ Env, args taskRunsArgs) (*Call, error) {
		payload := map[string]any{"task_identifier": args.Task, "page": max(args.Page, 1)}
		if args.Outcome != "" {
			payload["outcome"] = args.Outcome
		}
		return message(messages.NamespaceSettings, messages.SettingsGetPeriodicTaskRuns, messages.SettingsGetPeriodicTaskRunsResponse, payload)
	}),
	define(Tool{
		Name:        "run_periodic_task",
		Title:       "Run task now",
		Description: "Runs a background task a second from now instead of at its next scheduled time; the run is recorded like a scheduled one.",
		Permission:  rbac.CanRunPeriodicTasks,
		Confirm:     true,
	}, func(_ Env, args taskArgs) (*Call, error) {
		return message(messages.NamespaceSettings, messages.SettingsRunPeriodicTask, messages.SettingsRunPeriodicTaskResponse, map[string]any{"task_identifier": args.Task})
	}),
}
