package users

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/coder/websocket"

	"noteme/internal/components/audit"
	"noteme/internal/components/passkeys/passkeystest"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

const passwordIssue = `[{"code":"custom","path":["password"],"message":"Invalid password."}]`

func registrationOptions(t *testing.T, conn *websocket.Conn, password string) map[string]any {
	t.Helper()
	data := ""
	if password != "" {
		data = `,"password":` + handlerstest.Encode(t, password)
	}
	return handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"getPasskeyRegistrationOptions"`+data+`}`)
}

func verifyRegistration(t *testing.T, conn *websocket.Conn, response json.RawMessage) map[string]any {
	t.Helper()
	return handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"verifyPasskeyRegistration","response":`+string(response)+`}`)
}

func TestPasskeyRegistrationAsksForPasswordOncePerSession(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "user")
	conn := s.DialSession(t, user, "browser")

	response := registrationOptions(t, conn, "")
	if response["type"] != "getPasskeyRegistrationOptionsResponse" || response["password_required"] != true || response["options"] != nil {
		t.Fatalf("without password = %v", response)
	}

	response = registrationOptions(t, conn, "wrong")
	if response["type"] != "error" || response["message"] != passwordIssue {
		t.Fatalf("wrong password = %v", response)
	}

	response = registrationOptions(t, conn, "password123")
	options, _ := response["options"].(map[string]any)
	if response["password_required"] != false || options == nil || options["challenge"] == "" {
		t.Fatalf("with password = %v", response)
	}

	// Another tab of the same session needs no password, another session does.
	if response := registrationOptions(t, s.DialSession(t, user, "browser"), ""); response["options"] == nil {
		t.Errorf("same session = %v", response)
	}
	if response := registrationOptions(t, s.DialSession(t, user, "other-browser"), ""); response["password_required"] != true {
		t.Errorf("other session = %v", response)
	}
}

func TestRegisterAndManagePasskeys(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "user")
	conn := s.Dial(t, user)
	otherConn := s.Dial(t, s.AddUser(t, "other"))
	origin := s.C.Config.AppURL.String()

	if response := verifyRegistration(t, conn, json.RawMessage(`{}`)); response["success"] != false || response["fail_reason"] != passkeyExpiredMessage {
		t.Errorf("verify without options = %v", response)
	}

	phone := passkeystest.New(origin)
	options := registrationOptions(t, conn, "password123")["options"]
	registration, err := phone.Register(options)
	if err != nil {
		t.Fatal(err)
	}
	if response := verifyRegistration(t, conn, registration); response["type"] != "verifyPasskeyRegistrationResponse" || response["success"] != true {
		t.Fatalf("verify = %v", response)
	}
	if entries := auditEvents(t, s, audit.PasskeyRegistered); len(entries) != 1 || entries[0].Username != "user" {
		t.Errorf("registration audit entries = %+v", entries)
	}

	notStored := passkeystest.New(origin)
	stored := false
	notStored.Discoverable = &stored
	registration, _ = notStored.Register(registrationOptions(t, conn, "")["options"])
	if response := verifyRegistration(t, conn, registration); response["fail_reason"] != passkeyNotStoredMessage {
		t.Errorf("not stored = %v", response)
	}

	registration, _ = phone.Register(registrationOptions(t, otherConn, "password123")["options"])
	if response := verifyRegistration(t, otherConn, registration); response["fail_reason"] != passkeyExistsMessage {
		t.Errorf("registered to another account = %v", response)
	}

	evil := passkeystest.New("https://evil.example.com")
	registration, _ = evil.Register(registrationOptions(t, conn, "")["options"])
	if response := verifyRegistration(t, conn, registration); response["fail_reason"] != passkeyFailedMessage {
		t.Errorf("wrong origin = %v", response)
	}

	list := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"getOwnPasskeys","page":1}`)
	records, _ := list["records"].(map[string]any)
	results, _ := records["results"].([]any)
	if len(results) != 1 {
		t.Fatalf("own passkeys = %v", list)
	}
	passkey := results[0].(map[string]any)
	if passkey["name"] != "Platform authenticator (built-in into OS)" || passkey["transports"] != "internal,hybrid" {
		t.Errorf("passkey = %v", passkey)
	}
	id := handlerstest.Encode(t, passkey["id"])

	if response := handlerstest.Request(t, otherConn, `{"requestId":"r","namespace":"users","type":"getOwnPasskeys","page":1}`); response["records"].(map[string]any)["total"] != float64(0) {
		t.Errorf("other user's passkeys = %v", response)
	}

	for name, want := range map[string]string{
		`""`:  `[{"code":"too_small","path":["name"],"message":"Name must have at least one character"}]`,
		`" "`: `[{"code":"too_small","path":["name"],"message":"Name must have at least one character"}]`,
	} {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateOwnPasskey","id":`+id+`,"name":`+name+`}`)
		if response["type"] != "error" || response["message"] != want {
			t.Errorf("name %s: response = %v", name, response)
		}
	}
	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateOwnPasskey","id":`+id+`,"name":" My phone "}`)
	if response["type"] != "updateOwnPasskeyResponse" || response["name"] != "My phone" {
		t.Errorf("rename = %v", response)
	}

	handlerstest.Request(t, otherConn, `{"requestId":"r","namespace":"users","type":"deleteOwnPasskey","id":`+id+`}`)
	if page, _ := s.C.Repository.Passkeys().FindUserPasskeys(context.Background(), user, 1); page.Total != 1 || page.Results[0].Name != "My phone" {
		t.Errorf("after other user's delete = %+v", page)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"deleteOwnPasskey","id":`+id+`}`)
	if response["type"] != "deleteOwnPasskeyResponse" {
		t.Errorf("delete = %v", response)
	}
	if page, _ := s.C.Repository.Passkeys().FindUserPasskeys(context.Background(), user, 1); page.Total != 0 {
		t.Errorf("after delete = %+v", page)
	}
	if entries := auditEvents(t, s, audit.PasskeyDeleted); len(entries) != 1 || entries[0].Details != `{"passkey_id":`+id+`}` {
		t.Errorf("delete audit entries = %+v", entries)
	}
}
