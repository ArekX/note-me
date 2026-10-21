package migrate

import (
	"path/filepath"
	"testing"
)

func TestCreate(t *testing.T) {
	root := t.TempDir()
	paths, err := Create("Add Something", filepath.Join(root, "a"), filepath.Join(root, "b"))
	if err != nil {
		t.Fatal(err)
	}
	if len(paths) != 4 || filepath.Base(paths[0]) != filepath.Base(paths[2]) || filepath.Base(paths[1]) != filepath.Base(paths[3]) {
		t.Fatalf("paths = %v", paths)
	}
	for _, p := range paths {
		if _, err := openFile(p); err != nil {
			t.Errorf("expected %s to exist: %v", p, err)
		}
	}
}
