package aitools

import "noteme/internal/http/websocket/messages"

type noteIDArgs struct {
	NoteID int64 `json:"note_id" desc:"Note id"`
}

type setReminderArgs struct {
	NoteID      int64  `json:"note_id" desc:"Note id"`
	Type        string `json:"type" enum:"once,repeat" desc:"once fires at next_at; repeat fires every interval × unit_value seconds, repeat_count times, starting one period from now"`
	NextAt      int64  `json:"next_at,omitempty" desc:"For once: unix time in seconds, in the future"`
	Interval    int64  `json:"interval,omitempty" desc:"For repeat: number of units between reminders, 1 to 1000"`
	UnitValue   int64  `json:"unit_value,omitempty" desc:"For repeat: seconds in one unit, for example 60 (minute), 3600 (hour), 86400 (day), 604800 (week)"`
	RepeatCount int64  `json:"repeat_count,omitempty" desc:"For repeat: how many times it fires, 1 to 10000"`
}

var reminderTools = []Tool{
	define(Tool{
		Name:        "find_reminders",
		Title:       "List reminders",
		Description: "Lists the user's upcoming reminders, soonest first; times are unix seconds.",
		ReadOnly:    true,
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesFindReminders, messages.NotesFindRemindersResponse, map[string]any{"filters": map[string]any{}})
	}),
	define(Tool{
		Name:        "get_reminder",
		Title:       "Get reminder",
		Description: "Gets the user's reminder on a note, null when there is none.",
		ReadOnly:    true,
	}, func(_ Env, args noteIDArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesGetReminderData, messages.NotesGetReminderDataResponse, map[string]any{"note_id": args.NoteID})
	}),
	define(Tool{
		Name:        "set_reminder",
		Title:       "Set reminder",
		Description: "Sets or replaces the user's reminder on one of their notes or a note shared with them.",
	}, func(_ Env, args setReminderArgs) (*Call, error) {
		reminder := map[string]any{"type": args.Type}
		if args.Type == "once" {
			reminder["next_at"] = args.NextAt
		} else {
			reminder["interval"] = args.Interval
			reminder["unit_value"] = args.UnitValue
			reminder["repeat_count"] = args.RepeatCount
		}
		return message(messages.NamespaceNotes, messages.NotesSetReminder, messages.NotesSetReminderResponse, map[string]any{"note_id": args.NoteID, "reminder": reminder})
	}),
	define(Tool{
		Name:        "remove_reminder",
		Title:       "Remove reminder",
		Description: "Removes the user's reminder on a note.",
	}, func(_ Env, args noteIDArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesRemoveReminder, messages.NotesRemoveReminderResponse, map[string]any{"note_id": args.NoteID})
	}),
}
