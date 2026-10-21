package loginguard

import (
	"testing"
	"time"
)

func newTestGuard() (*Guard, *time.Time) {
	now := time.Unix(1_700_000_000, 0)
	g := New()
	g.now = func() time.Time { return now }
	return g, &now
}

func TestLocksAfterMaxAttempts(t *testing.T) {
	g, now := newTestGuard()

	for i := range maxAttempts {
		if !g.Attempt("1.2.3.4") {
			t.Fatalf("attempt %d was refused", i+1)
		}
	}
	if g.Attempt("1.2.3.4") {
		t.Fatal("attempt over the limit was allowed")
	}
	if !g.Attempt("5.6.7.8") {
		t.Fatal("another address was refused")
	}

	*now = now.Add(lockout - time.Second)
	if g.Attempt("1.2.3.4") {
		t.Fatal("attempt during the lockout was allowed")
	}
	// The refused attempt above extended the lockout.
	*now = now.Add(lockout - time.Second)
	if g.Attempt("1.2.3.4") {
		t.Fatal("lockout was not extended")
	}
	*now = now.Add(lockout)
	if !g.Attempt("1.2.3.4") {
		t.Fatal("attempt after the lockout was refused")
	}
}

func TestAttemptsSpreadOverCooldownStartOver(t *testing.T) {
	g, now := newTestGuard()

	for range maxAttempts * 3 {
		if !g.Attempt("1.2.3.4") {
			t.Fatal("attempts a cooldown apart were refused")
		}
		*now = now.Add(cooldown)
	}
}

func TestResetClearsAttempts(t *testing.T) {
	g, _ := newTestGuard()

	for range maxAttempts {
		g.Attempt("1.2.3.4")
	}
	g.Reset("1.2.3.4")
	if !g.Attempt("1.2.3.4") {
		t.Fatal("attempt after reset was refused")
	}
}

func TestSweepDropsIdleEntries(t *testing.T) {
	g, now := newTestGuard()

	g.Attempt("1.2.3.4")
	for range maxAttempts + 1 {
		g.Attempt("5.6.7.8")
	}

	*now = now.Add(2 * cooldown)
	g.Attempt("9.9.9.9")

	if _, ok := g.entries["1.2.3.4"]; ok {
		t.Error("idle entry was kept")
	}
	if _, ok := g.entries["5.6.7.8"]; !ok {
		t.Error("locked entry was dropped")
	}
}
