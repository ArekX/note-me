package eventbus

import (
	"context"
	"slices"
	"testing"
)

type otherEvent struct{}

func TestPublishReachesSubscribersOfTheType(t *testing.T) {
	bus := New()
	var got []string
	bus.Subscribe(func(_ context.Context, e NoteFullyDeleted) {
		got = append(got, "first")
		if e.NoteID != 7 || e.UserID != 2 {
			t.Errorf("event = %+v", e)
		}
	})
	bus.Subscribe(func(context.Context, NoteFullyDeleted) { got = append(got, "second") })
	bus.Subscribe(func(context.Context, otherEvent) { got = append(got, "other") })

	bus.Publish(context.Background(), NoteFullyDeleted{UserID: 2, NoteID: 7})

	if want := []string{"first", "second"}; !slices.Equal(got, want) {
		t.Errorf("handlers = %v, want %v", got, want)
	}
	New().Publish(context.Background(), otherEvent{})
}
