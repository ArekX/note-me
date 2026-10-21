package logger

import (
	"io"
	"log/slog"
	"os"
	"strings"
)

type Options struct {
	Level            string
	AreColorsAllowed bool
	Output           io.Writer
	// Also receives every line, for the server log page.
	Buffer *Buffer
}

func ParseLevel(level string) slog.Level {
	switch strings.ToUpper(strings.TrimSpace(level)) {
	case "DEBUG":
		return slog.LevelDebug
	case "WARN", "WARNING":
		return slog.LevelWarn
	case "ERROR":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func New(opts Options) *slog.Logger {
	if opts.Output == nil {
		opts.Output = os.Stderr
	}
	var buffer io.Writer
	if opts.Buffer != nil {
		buffer = opts.Buffer
	}

	return slog.New(newLogHandler(opts.Output, buffer, ParseLevel(opts.Level), opts.AreColorsAllowed))
}
