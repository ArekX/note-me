package logger

import (
	"strings"
	"sync"
)

const BufferLines = 1000

// Keeps the last BufferLines log lines in memory for the server log page.
type Buffer struct {
	mu    sync.Mutex
	lines []string
	next  int
	full  bool
}

func NewBuffer() *Buffer {
	return &Buffer{lines: make([]string, BufferLines)}
}

func (b *Buffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.lines[b.next] = strings.TrimRight(string(p), "\n")
	b.next = (b.next + 1) % len(b.lines)
	if b.next == 0 {
		b.full = true
	}
	return len(p), nil
}

// Oldest first.
func (b *Buffer) Lines() []string {
	b.mu.Lock()
	defer b.mu.Unlock()
	if !b.full {
		return append([]string{}, b.lines[:b.next]...)
	}
	return append(append([]string{}, b.lines[b.next:]...), b.lines[:b.next]...)
}
