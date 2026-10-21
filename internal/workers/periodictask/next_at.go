package periodictask

import "time"

func StartOfNextDay(now int64) int64 {
	t := time.Unix(now, 0).UTC()
	next := time.Date(t.Year(), t.Month(), t.Day()+1, 0, 0, 0, 0, time.UTC)
	return next.Unix()
}

func NextMinute(now int64) int64 {
	t := time.Unix(now, 0).UTC()
	return t.Truncate(time.Minute).Add(time.Minute).Unix()
}

func NextHour(now int64) int64 {
	t := time.Unix(now, 0).UTC()
	next := time.Date(t.Year(), t.Month(), t.Day(), t.Hour()+1, 0, 0, 0, time.UTC)
	return next.Unix()
}
