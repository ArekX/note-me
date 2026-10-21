package loginguard

import (
	"sync"
	"time"
)

const (
	PasswordLockedMessage = "Too many failed password attempts, password checks are locked for 24 hours."
	passwordLockout       = 24 * time.Hour
)

type passwordEntry struct {
	failures    int
	lockedUntil time.Time
}

// Counts wrong passwords entered by a signed in user (own password checks,
// protected notes, exports, passkey registration). After maxFailures in a
// row the user is locked out of every such check for a day; signing in is
// not affected. A correct password clears the count.
type PasswordGuard struct {
	mu          sync.Mutex
	maxFailures int
	entries     map[int]*passwordEntry
	now         func() time.Time
}

func NewPasswordGuard(maxFailures int) *PasswordGuard {
	return &PasswordGuard{maxFailures: maxFailures, entries: map[int]*passwordEntry{}, now: time.Now}
}

func (g *PasswordGuard) Locked(userID int) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	e, ok := g.entries[userID]
	if !ok {
		return false
	}
	if !e.lockedUntil.IsZero() && !g.now().Before(e.lockedUntil) {
		delete(g.entries, userID)
		return false
	}
	return !e.lockedUntil.IsZero()
}

// Reports whether this failure locked the user.
func (g *PasswordGuard) Fail(userID int) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	e, ok := g.entries[userID]
	if !ok {
		e = &passwordEntry{}
		g.entries[userID] = e
	}
	if !e.lockedUntil.IsZero() {
		return false
	}
	e.failures++
	if e.failures >= g.maxFailures {
		e.lockedUntil = g.now().Add(passwordLockout)
		return true
	}
	return false
}

func (g *PasswordGuard) Succeed(userID int) {
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.entries, userID)
}
