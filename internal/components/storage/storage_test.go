package storage

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newStorage(t *testing.T) (*Storage, string, string) {
	t.Helper()
	root := t.TempDir()
	tempDir, filesDir := filepath.Join(root, "temp"), filepath.Join(root, "nested", "files")
	s := New(tempDir, filesDir)
	if err := s.Init(); err != nil {
		t.Fatal(err)
	}
	return s, tempDir, filesDir
}

func TestUploadLifecycle(t *testing.T) {
	s, tempDir, filesDir := newStorage(t)

	target, err := s.CreateTempFile("7")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, "7-"+target)); err != nil {
		t.Fatalf("temp file: %v", err)
	}

	for _, chunk := range []string{"hello ", "world"} {
		if err := s.AppendTempFile("7", target, []byte(chunk)); err != nil {
			t.Fatal(err)
		}
	}
	if size, err := s.TempFileSize("7", target); err != nil || size != 11 {
		t.Errorf("size = %d, %v", size, err)
	}

	if err := s.StoreTempFile("7", target, target); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, "7-"+target)); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("temp file left behind: %v", err)
	}
	file, err := s.OpenFile(target)
	if err != nil {
		t.Fatal(err)
	}
	data, _ := io.ReadAll(file)
	file.Close()
	if string(data) != "hello world" || filepath.Dir(file.Name()) != filesDir {
		t.Errorf("stored %q at %s", data, file.Name())
	}

	if err := s.RemoveFile(target); err != nil {
		t.Fatal(err)
	}
	if err := s.RemoveFile(target); err != nil {
		t.Errorf("removing a missing file = %v", err)
	}
}

func TestCopyFallback(t *testing.T) {
	_, tempDir, filesDir := newStorage(t)
	if err := os.WriteFile(filepath.Join(tempDir, "1-abc"), []byte("data"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := copyFile(filepath.Join(tempDir, "1-abc"), filepath.Join(filesDir, "abc")); err != nil {
		t.Fatal(err)
	}
	if data, _ := os.ReadFile(filepath.Join(filesDir, "abc")); string(data) != "data" {
		t.Errorf("copied %q", data)
	}
	if _, err := os.Stat(filepath.Join(filesDir, "abc.partial")); !errors.Is(err, os.ErrNotExist) {
		t.Error("partial file left behind")
	}
}

func TestRejectsPathsOutsideTheFolders(t *testing.T) {
	s, _, _ := newStorage(t)
	for _, identifier := range []string{"", ".", "..", "../x", `a\b`, "a/b", "a:b", "nul", "COM1.txt"} {
		if _, err := s.OpenFile(identifier); !errors.Is(err, ErrInvalidName) {
			t.Errorf("OpenFile(%q) = %v", identifier, err)
		}
	}
	if err := s.AppendTempFile("1", "../../etc", []byte("x")); !errors.Is(err, ErrInvalidName) {
		t.Errorf("append outside temp = %v", err)
	}
}

func TestValidName(t *testing.T) {
	for _, name := range []string{"a", "photo.png", "907e3159-4039-4041-8c8d-0f03fc69cedf", "CONSOLE", "COM0", "LPT10", "console.txt", "..."} {
		if !ValidName(name) {
			t.Errorf("ValidName(%q) = false", name)
		}
	}
	for _, name := range []string{"", ".", "..", "a/b", `a\b`, "a:b", "CON", "con", "Prn.txt", "AUX.tar.gz", "nul", "COM1", "com9.log", "LPT1", "lpt9"} {
		if ValidName(name) {
			t.Errorf("ValidName(%q) = true", name)
		}
	}
}

func TestFileModes(t *testing.T) {
	s, tempDir, filesDir := newStorage(t)
	if err := s.WriteFile("a", strings.NewReader("data")); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tempDir, "1-abc"), []byte("data"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := copyFile(filepath.Join(tempDir, "1-abc"), filepath.Join(filesDir, "b")); err != nil {
		t.Fatal(err)
	}
	for path, want := range map[string]os.FileMode{tempDir: 0o700, filesDir: 0o700, filepath.Join(filesDir, "a"): 0o600, filepath.Join(filesDir, "b"): 0o600} {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if got := info.Mode().Perm(); got != want {
			t.Errorf("%s mode = %o, want %o", path, got, want)
		}
	}
}

func TestStage(t *testing.T) {
	s, _, filesDir := newStorage(t)
	if err := s.WriteFile("kept", strings.NewReader("old")); err != nil {
		t.Fatal(err)
	}

	dropped, err := s.NewStage()
	if err != nil {
		t.Fatal(err)
	}
	if err := dropped.WriteFile("new", strings.NewReader("never")); err != nil {
		t.Fatal(err)
	}
	if err := dropped.WriteFile("../escape", strings.NewReader("x")); !errors.Is(err, ErrInvalidName) {
		t.Errorf("unsafe staged name = %v", err)
	}
	if names, _ := s.FileNames(); len(names) != 1 || names[0] != "kept" {
		t.Errorf("names while staging = %v", names)
	}
	if err := dropped.Remove(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(filesDir, "new")); !errors.Is(err, os.ErrNotExist) {
		t.Error("dropped stage left a file")
	}

	stage, err := s.NewStage()
	if err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(stage.dir)
	if err != nil || info.Mode().Perm() != 0o700 {
		t.Errorf("stage folder = %v, %v", info, err)
	}
	for name, data := range map[string]string{"kept": "replaced", "new": "added"} {
		if err := stage.WriteFile(name, strings.NewReader(data)); err != nil {
			t.Fatal(err)
		}
	}
	if err := stage.Commit(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(stage.dir); !errors.Is(err, os.ErrNotExist) {
		t.Error("stage folder kept after commit")
	}
	for name, want := range map[string]string{"kept": "replaced", "new": "added"} {
		if data, _ := os.ReadFile(filepath.Join(filesDir, name)); string(data) != want {
			t.Errorf("%s = %q", name, data)
		}
	}
}

func TestCleanupOldTempFiles(t *testing.T) {
	s, tempDir, _ := newStorage(t)
	old := filepath.Join(tempDir, "1-old")
	fresh := filepath.Join(tempDir, "1-fresh")
	for _, path := range []string{old, fresh} {
		if err := os.WriteFile(path, nil, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	past := time.Now().Add(-7 * time.Hour)
	if err := os.Chtimes(old, past, past); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(tempDir, "folder"), 0o755); err != nil {
		t.Fatal(err)
	}

	if err := s.CleanupOldTempFiles(6 * time.Hour); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(old); !errors.Is(err, os.ErrNotExist) {
		t.Error("old temp file kept")
	}
	for _, path := range []string{fresh, filepath.Join(tempDir, "folder")} {
		if _, err := os.Stat(path); err != nil {
			t.Errorf("%s removed: %v", path, err)
		}
	}
}

func TestExportLifecycle(t *testing.T) {
	s, tempDir, _ := newStorage(t)

	file, err := s.CreateExportFile(3, "abc")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := file.WriteString("zip"); err != nil {
		t.Fatal(err)
	}
	file.Close()

	if _, err := s.OpenExportFile(3, "abc"); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("unfinished export opened: %v", err)
	}
	if _, err := s.CreateExportFile(3, "abc"); err == nil {
		t.Error("export created twice")
	}
	if err := s.FinishExportFile(3, "abc"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, "data-export-3-abc.zip")); err != nil {
		t.Fatalf("finished export: %v", err)
	}
	if _, err := s.OpenExportFile(4, "abc"); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("another user's export opened: %v", err)
	}
	opened, err := s.OpenExportFile(3, "abc")
	if err != nil {
		t.Fatal(err)
	}
	data, _ := io.ReadAll(opened)
	opened.Close()
	if string(data) != "zip" {
		t.Errorf("export data = %q", data)
	}

	if err := s.RemoveExportFile(3, "abc"); err != nil {
		t.Fatal(err)
	}
	if entries, _ := os.ReadDir(tempDir); len(entries) != 0 {
		t.Errorf("temp folder after remove = %v", entries)
	}

	for _, id := range []string{"", "..", "../x", `a\b`} {
		if _, err := s.OpenExportFile(3, id); !errors.Is(err, ErrInvalidName) {
			t.Errorf("export id %q: %v", id, err)
		}
	}
}

func TestWriteFileAndFileNames(t *testing.T) {
	s, _, filesDir := newStorage(t)

	if err := s.WriteFile("a", strings.NewReader("first")); err != nil {
		t.Fatal(err)
	}
	if err := s.WriteFile("a", strings.NewReader("second")); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(filesDir, "b.partial"), nil, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(filesDir, "dir"), 0o755); err != nil {
		t.Fatal(err)
	}

	names, err := s.FileNames()
	if err != nil || len(names) != 1 || names[0] != "a" {
		t.Errorf("names = %v, %v", names, err)
	}
	data, _ := os.ReadFile(filepath.Join(filesDir, "a"))
	if string(data) != "second" {
		t.Errorf("data = %q", data)
	}
	if err := s.WriteFile("../x", strings.NewReader("")); !errors.Is(err, ErrInvalidName) {
		t.Errorf("unsafe name = %v", err)
	}
}
