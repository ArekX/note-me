package sqlrepo

import (
	"context"
	"testing"
	"time"

	"noteme/internal/components/repository"
)

func TestSessions(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	future := time.Now().Add(time.Hour).UnixMilli()

	for _, session := range []repository.NewSessionRecord{
		{Key: "live", UserId: owner, ExpiresAt: future, Data: []byte(`{"a":1}`)},
		{Key: "expired", UserId: owner, ExpiresAt: time.Now().Add(-time.Hour).UnixMilli(), Data: []byte(`{}`)},
		{Key: "other", UserId: other, ExpiresAt: future, Data: []byte(`{}`)},
	} {
		if id, err := r.CreateNewSession(ctx, session); err != nil || id == 0 {
			t.Fatalf("CreateNewSession(%s) = %d, %v", session.Key, id, err)
		}
	}

	for key, want := range map[string]bool{"live": true, "expired": false, "missing": false} {
		if exists, err := r.SessionExists(ctx, key); err != nil || exists != want {
			t.Errorf("SessionExists(%s) = %v, %v", key, exists, err)
		}
	}
	if session, err := r.GetSessionByKey(ctx, "expired"); err != nil || session != nil {
		t.Errorf("expired session = %+v, %v", session, err)
	}

	if err := r.UpdateSessionData(ctx, "live", []byte(`{"a":2}`)); err != nil {
		t.Fatal(err)
	}
	session, err := r.GetSessionByKey(ctx, "live")
	if err != nil || session == nil || session.Data != `{"a":2}` || session.UserId != owner {
		t.Fatalf("GetSessionByKey = %+v, %v", session, err)
	}

	if err := r.UpdateUserSessionsData(ctx, owner, []byte(`{"a":3}`)); err != nil {
		t.Fatal(err)
	}
	session, err = r.GetSessionByUserId(ctx, owner)
	if err != nil || session == nil || session.Key != "live" || session.Data != `{"a":3}` {
		t.Fatalf("GetSessionByUserId = %+v, %v", session, err)
	}
	if session, _ := r.GetSessionByKey(ctx, "other"); session == nil || session.Data != `{}` {
		t.Errorf("other user's session = %+v", session)
	}

	if err := r.DeleteExpiredSessions(ctx); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "session"`).Scan(&count); err != nil || count != 2 {
		t.Errorf("sessions after removing expired = %d, %v", count, err)
	}

	if err := r.DeleteSessionByUserId(ctx, owner); err != nil {
		t.Fatal(err)
	}
	if session, err := r.GetSessionByUserId(ctx, owner); err != nil || session != nil {
		t.Errorf("deleted session = %+v, %v", session, err)
	}
	if exists, _ := r.SessionExists(ctx, "other"); !exists {
		t.Error("deleting one user's sessions removed another's")
	}
}
