package users

import (
	"context"
	"testing"

	"noteme/internal/http/websocket/handlers/handlerstest"
)

func TestUpdateOnboarding(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "user")
	conn := s.Dial(t, user)
	otherTab := s.DialSession(t, user, "other-tab")
	handlerstest.Request(t, otherTab, `{"requestId":"r","namespace":"users","type":"verifyOwnPassword","password":"x"}`)

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateOnboarding","onboarding_state":{"unknown_dismissed":true}}`); response["message"] != `[{"code":"unrecognized_keys","path":["onboarding_state"],"message":"Unrecognized key: \"unknown_dismissed\""}]` {
		t.Errorf("unknown key = %v", response)
	}

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateOnboarding","onboarding_state":{"introduction_dismissed":true}}`)
	// The requesting tab gets the session push before the response.
	response := handlerstest.Read(t, conn)
	if response["type"] == "sessionUpdated" {
		response = handlerstest.Read(t, conn)
	}
	state, _ := response["onboarding_state"].(map[string]any)
	if response["type"] != "updateOnboardingResponse" || state["introduction_dismissed"] != true {
		t.Fatalf("response = %v", response)
	}

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateOnboarding","onboarding_state":{"view_note_introduction_dismissed":true}}`)
	record, _ := s.C.Repository.Users().GetUserById(context.Background(), user)
	if !record.OnboardingState["introduction_dismissed"] || !record.OnboardingState["view_note_introduction_dismissed"] {
		t.Errorf("stored state = %v", record.OnboardingState)
	}

	pushed := handlerstest.Read(t, otherTab)
	pushedUser, _ := pushed["user"].(map[string]any)
	if pushed["type"] != "sessionUpdated" || pushedUser["onboarding_state"].(map[string]any)["introduction_dismissed"] != true {
		t.Errorf("other tab = %v", pushed)
	}
}
