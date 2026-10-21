package loginguard

import (
	"sync"
	"time"
)

const LockedMessage = "Too many login requests, please try again later."

const (
	maxAttempts   = 30
	cooldown      = 60 * time.Second
	lockout       = 900 * time.Second
	sweepInterval = time.Minute
)

type entry struct {
	attempts      int
	lastAttemptAt time.Time
	lockedUntil   time.Time
}

type Guard struct {
	mu        sync.Mutex
	entries   map[string]*entry
	lastSweep time.Time
	now       func() time.Time
}

func New() *Guard {
	return &Guard{entries: map[string]*entry{}, now: time.Now}
}

// Records an attempt for the key and reports whether it may go ahead. Trying
// while locked out extends the lockout.
func (g *Guard) Attempt(key string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := g.now()
	g.sweep(now)

	e, ok := g.entries[key]
	if !ok {
		e = &entry{}
		g.entries[key] = e
	}

	if now.Before(e.lockedUntil) {
		e.lockedUntil = now.Add(lockout)
		return false
	}

	if now.Sub(e.lastAttemptAt) < cooldown {
		e.attempts++
	} else {
		e.attempts = 1
	}
	e.lastAttemptAt = now

	if e.attempts > maxAttempts {
		e.lockedUntil = now.Add(lockout)
		return false
	}
	return true
}

func (g *Guard) Reset(key string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.entries, key)
}

func (g *Guard) sweep(now time.Time) {
	if now.Sub(g.lastSweep) < sweepInterval {
		return
	}
	g.lastSweep = now
	for key, e := range g.entries {
		if !now.Before(e.lockedUntil) && now.Sub(e.lastAttemptAt) >= cooldown {
			delete(g.entries, key)
		}
	}
}
