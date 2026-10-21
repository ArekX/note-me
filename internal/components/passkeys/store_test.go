package passkeys

import (
	"errors"
	"fmt"
	"testing"
	"time"
)

func newTestStore(limit int) (*store[int], *time.Time) {
	now := time.Unix(1_700_000_000, 0)
	s := newStore[int](time.Minute, limit)
	s.now = func() time.Time { return now }
	return s, &now
}

func TestStoreExpiry(t *testing.T) {
	s, now := newTestStore(10)
	if err := s.put("a", 1); err != nil {
		t.Fatal(err)
	}

	if value, ok := s.get("a"); !ok || value != 1 {
		t.Fatalf("get = %d, %v", value, ok)
	}
	*now = now.Add(time.Minute)
	if _, ok := s.get("a"); ok {
		t.Error("expired value returned")
	}
	if len(s.items) != 0 {
		t.Error("expired value kept")
	}
}

func TestStoreTakeIsSingleUse(t *testing.T) {
	s, _ := newTestStore(10)
	if err := s.put("a", 1); err != nil {
		t.Fatal(err)
	}
	if _, ok := s.take("a"); !ok {
		t.Fatal("take failed")
	}
	if _, ok := s.take("a"); ok {
		t.Error("value taken twice")
	}
}

func TestStoreFullKeepsLiveValues(t *testing.T) {
	s, now := newTestStore(3)
	for i := range 3 {
		if err := s.put(fmt.Sprint(i), i); err != nil {
			t.Fatal(err)
		}
		*now = now.Add(time.Second)
	}

	if err := s.put("3", 3); !errors.Is(err, ErrBusy) {
		t.Fatalf("put into a full store = %v, want ErrBusy", err)
	}
	for i := range 3 {
		if _, ok := s.get(fmt.Sprint(i)); !ok {
			t.Errorf("live value %d was dropped", i)
		}
	}
	if err := s.put("0", 10); err != nil {
		t.Errorf("replacing a stored value = %v", err)
	}

	*now = now.Add(time.Minute - 2*time.Second)
	if err := s.put("4", 4); err != nil {
		t.Fatalf("put after expiry = %v", err)
	}
	if _, ok := s.get("1"); ok {
		t.Error("expired value was kept")
	}
	if _, ok := s.get("4"); !ok {
		t.Error("new value was not stored")
	}
}
