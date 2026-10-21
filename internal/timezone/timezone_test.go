package timezone

import "testing"

func TestIsValid(t *testing.T) {
	tests := map[string]bool{
		"UTC":              true,
		"Europe/Belgrade":  true,
		"America/New_York": true,
		"":                 false,
		"Local":            false,
		"Mars/Olympus":     false,
	}
	for name, want := range tests {
		if got := IsValid(name); got != want {
			t.Errorf("IsValid(%q) = %v, want %v", name, got, want)
		}
	}
}
