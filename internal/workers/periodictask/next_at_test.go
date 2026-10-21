package periodictask

import (
	"testing"
	"time"
)

func TestNextAt(t *testing.T) {
	now := time.Date(2024, 3, 10, 13, 42, 17, 0, time.UTC)
	ts := now.Unix()

	if got := time.Unix(NextMinute(ts), 0); !got.Equal(time.Date(2024, 3, 10, 13, 43, 0, 0, time.UTC)) {
		t.Errorf("NextMinute = %v", got)
	}
	if got := time.Unix(NextHour(ts), 0); !got.Equal(time.Date(2024, 3, 10, 14, 0, 0, 0, time.UTC)) {
		t.Errorf("NextHour = %v", got)
	}
	if got := time.Unix(StartOfNextDay(ts), 0); !got.Equal(time.Date(2024, 3, 11, 0, 0, 0, 0, time.UTC)) {
		t.Errorf("StartOfNextDay = %v", got)
	}
}
