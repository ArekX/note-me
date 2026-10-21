package loginguard

import (
	"testing"
	"time"
)

func TestPasswordGuardLocksAfterMaxFailures(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	g := NewPasswordGuard(3)
	g.now = func() time.Time { return now }

	if g.Locked(1) {
		t.Fatal("locked before any failure")
	}
	for range 2 {
		if g.Fail(1) {
			t.Fatal("locked too early")
		}
	}
	g.Succeed(1)
	for range 2 {
		if g.Fail(1) {
			t.Fatal("success did not clear the failures")
		}
	}
	if !g.Fail(1) {
		t.Fatal("third failure in a row did not lock")
	}
	if !g.Locked(1) || g.Locked(2) {
		t.Fatal("lock state is wrong")
	}
	if g.Fail(1) {
		t.Fatal("a failure while locked reported a new lock")
	}

	now = now.Add(passwordLockout - time.Minute)
	if !g.Locked(1) {
		t.Fatal("lock ended early")
	}
	now = now.Add(2 * time.Minute)
	if g.Locked(1) {
		t.Fatal("lock did not expire")
	}
	if g.Fail(1) {
		t.Fatal("failures were not reset after the lock expired")
	}
}
