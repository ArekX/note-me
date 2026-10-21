package logger

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"slices"
	"strconv"
	"strings"
	"sync"
	"unicode"
)

const (
	resetColor  = "\x1b[0m"
	grayColor   = "\x1b[90m"
	greenColor  = "\x1b[32m"
	yellowColor = "\x1b[33m"
	redColor    = "\x1b[31m"

	timeFormat = "2006-01-02 15:04:05"
	// Values come from clients too (websocket message types, file names).
	maxValueLength = 1024
)

// The buffer always gets the coloured form: the server log page renders the
// colours whatever the terminal setting is.
type logHandler struct {
	mutex            *sync.Mutex
	writer           io.Writer
	buffer           io.Writer
	level            slog.Leveler
	areColorsAllowed bool
	withAttrs        []slog.Attr
}

func getLevelColor(l slog.Level) string {
	switch {
	case l >= slog.LevelError:
		return redColor
	case l >= slog.LevelWarn:
		return yellowColor
	case l >= slog.LevelInfo:
		return greenColor
	default:
		return grayColor
	}
}

func newLogHandler(target, buffer io.Writer, level slog.Leveler, areColorsAllowed bool) *logHandler {
	return &logHandler{
		mutex:            &sync.Mutex{},
		writer:           target,
		buffer:           buffer,
		level:            level,
		areColorsAllowed: areColorsAllowed,
	}
}

func (h *logHandler) Enabled(_ context.Context, l slog.Level) bool {
	return l >= h.level.Level()
}

func (h *logHandler) Handle(_ context.Context, r slog.Record) error {
	line := h.format(r, h.areColorsAllowed)

	h.mutex.Lock()
	defer h.mutex.Unlock()

	if h.buffer != nil {
		coloured := line
		if !h.areColorsAllowed {
			coloured = h.format(r, true)
		}
		if _, err := io.WriteString(h.buffer, coloured); err != nil {
			return err
		}
	}
	_, err := io.WriteString(h.writer, line)

	return err
}

func (h *logHandler) format(r slog.Record, colours bool) string {
	var sb strings.Builder

	if colours {
		levelColor := getLevelColor(r.Level)
		fmt.Fprintf(&sb, "%s %s %-5s", levelColor, r.Time.Format(timeFormat), r.Level)

		for _, attr := range h.withAttrs {
			fmt.Fprintf(&sb, " [%s|%s] ", attr.Key, clean(attr.Value.String()))
		}

		fmt.Fprintf(&sb, " %s%s", clean(r.Message), resetColor)
	} else {
		fmt.Fprintf(&sb, "%s %-5s %s", r.Time.Format(timeFormat), r.Level, clean(r.Message))
	}

	r.Attrs(func(a slog.Attr) bool {
		fmt.Fprintf(&sb, " %s:%s", clean(a.Key), clean(a.Value.String()))
		return true
	})

	sb.WriteByte('\n')
	return sb.String()
}

// A value with control characters (newlines, escape sequences) is quoted so
// nobody can forge log lines or colour the terminal; long values are cut.
func clean(value string) string {
	if len(value) > maxValueLength {
		value = value[:maxValueLength] + "..."
	}
	if strings.ContainsFunc(value, func(r rune) bool { return unicode.IsControl(r) }) {
		return strconv.Quote(value)
	}
	return value
}

func (h *logHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	if len(attrs) == 0 {
		return h
	}

	clone := *h

	clone.withAttrs = slices.Concat(h.withAttrs, attrs)

	return &clone
}

func (h *logHandler) WithGroup(string) slog.Handler {
	return h
}
