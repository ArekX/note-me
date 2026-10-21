package notes

import (
	"context"
	"testing"

	"noteme/internal/http/websocket/handlers/handlerstest"
)

func TestSetReminderValidation(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)
	theirs := s.CreateNote(t, s.AddUser(t, "other"), "Theirs", nil)

	invalidUnion := `[{"code":"invalid_union","path":["reminder"],"message":"Invalid input"}]`
	tests := map[string]string{
		`"note_id":` + handlerstest.Encode(t, theirs) + `,"reminder":{"type":"once","next_at":1}`: "Note does not exist or not shared with this user.",
		`"note_id":1,"reminder":{"type":"once"}`:                                                  invalidUnion,
		`"note_id":1,"reminder":{"type":"weekly"}`:                                                invalidUnion,
		`"note_id":1,"reminder":{"type":"repeat","interval":1,"unit_value":60}`:                   invalidUnion,
		`"note_id":1,"reminder":{"type":"repeat","interval":0,"unit_value":0,"repeat_count":1}`:   `[{"code":"too_small","path":["reminder","interval"],"message":"Too small: expected number to be >=1"},{"code":"too_small","path":["reminder","unit_value"],"message":"Too small: expected number to be >=1"}]`,
		`"note_id":1`: `[{"code":"invalid_type","path":["reminder"],"message":"Invalid input: expected object, received undefined"}]`,
		`"note_id":1,"reminder":{"type":"once","next_at":1}`:                                                  `[{"code":"too_small","path":["reminder","next_at"],"message":"Reminder must be set in the future"}]`,
		`"note_id":1,"reminder":{"type":"once","next_at":1e30}`:                                               `[{"code":"too_big","path":["reminder","next_at"],"message":"Reminder must be within 100 years"}]`,
		`"note_id":1,"reminder":{"type":"repeat","interval":1001,"unit_value":31536001,"repeat_count":10001}`: `[{"code":"too_big","path":["reminder","interval"],"message":"Too big: expected number to be <=1000"},{"code":"too_big","path":["reminder","unit_value"],"message":"Too big: expected number to be <=31536000"},{"code":"too_big","path":["reminder","repeat_count"],"message":"Too big: expected number to be <=10000"}]`,
		`"note_id":1,"reminder":{"type":"repeat","interval":1000,"unit_value":31536000,"repeat_count":1}`:     `[{"code":"too_big","path":["reminder"],"message":"Reminder must be within 100 years"}]`,
	}
	for fields, want := range tests {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"setReminder",`+fields+`}`)
		if response["type"] != "error" || response["message"] != want {
			t.Errorf("%s: response = %v", fields, response)
		}
	}
}

func TestReminderFlow(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	otherTab := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"setReminder","note_id":1,"reminder":{"type":"once","next_at":1800000059,"extra":true}}`)
	if handlerstest.Encode(t, response["data"]) != `{"interval":null,"next_at":1800000000,"repeat_count":0,"unit_value":null}` || response["note_id"] != float64(1) {
		t.Errorf("set = %v", response)
	}
	if pushed := handlerstest.Read(t, otherTab); pushed["type"] != "setReminderResponse" {
		t.Errorf("other tab got %v", pushed)
	}

	data := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteReminderData","note_id":1}`)
	if handlerstest.Encode(t, data["data"]) != `{"done_count":0,"id":1,"interval":null,"next_at":1800000000,"repeat_count":0,"unit_value":null}` {
		t.Errorf("data = %v", data)
	}

	found := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"findNoteReminders","filters":{"limit":5}}`)
	records := found["records"].([]any)
	if len(records) != 1 || records[0].(map[string]any)["type"] != "once" || records[0].(map[string]any)["author_name"] != "Administrator" {
		t.Errorf("find = %v", found)
	}

	search := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"searchNote","filters":{"query":"plan","type":"reminders"}}`)
	if results := search["results"].([]any); len(results) != 1 || results[0].(map[string]any)["note_id"] != float64(1) {
		t.Errorf("search = %v", search)
	}

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"deleteNote","id":1}`)
	handlerstest.Read(t, otherTab)
	if data, _ := s.C.Repository.Reminders().GetNoteReminderData(context.Background(), handlerstest.AdminID, 1); data != nil {
		t.Errorf("reminder kept after delete: %+v", data)
	}

	removed := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"removeReminder","note_id":1}`)
	if removed["type"] != "removeReminderResponse" || removed["note_id"] != float64(1) {
		t.Errorf("remove = %v", removed)
	}
	if data := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteReminderData","note_id":1}`); data["data"] != nil {
		t.Errorf("data after remove = %v", data)
	}
}
