package eventbus

import (
	"context"
	"reflect"
	"sync"
)

// Handlers run synchronously on the publisher's goroutine, in subscription
// order; an event without subscribers is dropped.
type Bus struct {
	mu       sync.RWMutex
	handlers map[reflect.Type][]func(ctx context.Context, event any)
}

func New() *Bus {
	return &Bus{handlers: map[reflect.Type][]func(context.Context, any){}}
}

func (b *Bus) Subscribe[T any](fn func(ctx context.Context, event T)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	key := reflect.TypeFor[T]()
	b.handlers[key] = append(b.handlers[key], func(ctx context.Context, event any) {
		fn(ctx, event.(T))
	})
}

func (b *Bus) Publish[T any](ctx context.Context, event T) {
	b.mu.RLock()
	handlers := b.handlers[reflect.TypeFor[T]()]
	b.mu.RUnlock()
	for _, fn := range handlers {
		fn(ctx, event)
	}
}
