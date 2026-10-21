package logger

import (
	"bytes"
	"strings"
	"testing"
)

func TestLevelFiltering(t *testing.T) {
	var buf bytes.Buffer
	log := New(Options{Level: "WARN", Output: &buf})

	log.Info("hidden")
	log.Warn("shown")

	if strings.Contains(buf.String(), "hidden") || !strings.Contains(buf.String(), "shown") {
		t.Errorf("unexpected output: %q", buf.String())
	}
}

func TestControlCharactersAreQuoted(t *testing.T) {
	var buf bytes.Buffer
	log := New(Options{Level: "INFO", Output: &buf})

	log.Warn("No websocket handler found", "namespace", "notes\n2026-01-01 00:00:00 ERROR forged", "type", "\x1b[31mred")

	line := buf.String()
	if strings.Count(line, "\n") != 1 || strings.Contains(line, "\x1b") {
		t.Fatalf("output = %q", line)
	}
	if !strings.Contains(line, `namespace:"notes\n2026-01-01 00:00:00 ERROR forged"`) || !strings.Contains(line, `type:"\x1b[31mred"`) {
		t.Errorf("output = %q", line)
	}
	if !strings.HasPrefix(line, "20") || len(strings.Fields(line)[0]) != 10 {
		t.Errorf("line does not start with a date: %q", line)
	}

	buf.Reset()
	log.Info("long", "value", strings.Repeat("x", maxValueLength+50))
	if !strings.Contains(buf.String(), strings.Repeat("x", maxValueLength)+"...") || strings.Contains(buf.String(), strings.Repeat("x", maxValueLength+1)) {
		t.Error("long value was not cut")
	}
}

func TestBufferKeepsTheLastLines(t *testing.T) {
	buffer := NewBuffer()
	log := New(Options{Level: "INFO", Output: &bytes.Buffer{}, Buffer: buffer})

	for i := range BufferLines + 5 {
		log.Info("line", "n", i)
	}

	lines := buffer.Lines()
	if len(lines) != BufferLines || !strings.HasSuffix(lines[0], "n:5") || !strings.HasSuffix(lines[len(lines)-1], "n:1004") {
		t.Fatalf("lines = %d, first %q, last %q", len(lines), lines[0], lines[len(lines)-1])
	}
	if !strings.HasPrefix(lines[0], greenColor) || !strings.Contains(lines[0], resetColor) {
		t.Errorf("buffer line is not coloured although the terminal output is: %q", lines[0])
	}
}
