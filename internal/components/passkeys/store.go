package passkeys

import (
	"sync"
	"time"
)

type storeItem[T any] struct {
	value   T
	expires time.Time
}

// In-memory values that expire. A full store drops expired values and then
// refuses new ones: a flood cannot push out a ceremony in progress (SF-21).
type store[T any] struct {
	mu    sync.Mutex
	items map[string]storeItem[T]
	ttl   time.Duration
	limit int
	now   func() time.Time
}

func newStore[T any](ttl time.Duration, limit int) *store[T] {
	return &store[T]{items: map[string]storeItem[T]{}, ttl: ttl, limit: limit, now: time.Now}
}

func (s *store[T]) put(key string, value T) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.now()
	if _, exists := s.items[key]; !exists && len(s.items) >= s.limit {
		s.dropExpired(now)
		if len(s.items) >= s.limit {
			return ErrBusy
		}
	}
	s.items[key] = storeItem[T]{value: value, expires: now.Add(s.ttl)}
	return nil
}

func (s *store[T]) get(key string) (T, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.lookup(key, false)
}

func (s *store[T]) take(key string) (T, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.lookup(key, true)
}

func (s *store[T]) lookup(key string, remove bool) (T, bool) {
	item, ok := s.items[key]
	if ok && (remove || !s.now().Before(item.expires)) {
		delete(s.items, key)
	}
	if !ok || !s.now().Before(item.expires) {
		var zero T
		return zero, false
	}
	return item.value, true
}

func (s *store[T]) dropExpired(now time.Time) {
	for key, item := range s.items {
		if !now.Before(item.expires) {
			delete(s.items, key)
		}
	}
}
