package jobprocessor

import (
	"archive/zip"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"testing"

	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/database/migrate"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/jobs"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/encryption"
	"noteme/internal/eventbus"
	"noteme/internal/logger"
)

const password = "password123"

type exportFixture struct {
	export  *dataExport
	repo    repository.Repository
	tempDir string
	userID  int

	mu       sync.Mutex
	progress []float64
	finished []string
	failed   []eventbus.DataExportFailed
}

func setupExport(t *testing.T) *exportFixture {
	t.Helper()
	ctx := context.Background()
	db, err := sqlite.Open(ctx, filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err := migrate.New(sqlite.NewMigrations(db)).Up(ctx); err != nil {
		t.Fatal(err)
	}

	root := t.TempDir()
	f := &exportFixture{repo: sqlrepo.New(db, "sqlite"), tempDir: filepath.Join(root, "temp")}
	files := storage.New(f.tempDir, filepath.Join(root, "files"))
	if err := files.Init(); err != nil {
		t.Fatal(err)
	}

	bus := eventbus.New()
	bus.Subscribe(func(_ context.Context, e eventbus.DataExportUpdated) {
		f.mu.Lock()
		defer f.mu.Unlock()
		f.progress = append(f.progress, e.Percentage)
	})
	bus.Subscribe(func(_ context.Context, e eventbus.DataExportFinished) {
		f.mu.Lock()
		defer f.mu.Unlock()
		f.finished = append(f.finished, e.ExportID)
	})
	bus.Subscribe(func(_ context.Context, e eventbus.DataExportFailed) {
		f.mu.Lock()
		defer f.mu.Unlock()
		f.failed = append(f.failed, e)
	})

	f.export = &dataExport{repo: f.repo, storage: files, bus: bus, log: logger.New(logger.Options{Level: "ERROR", Output: io.Discard})}
	f.userID, err = f.repo.Users().CreateUserRecord(ctx, repository.NewUserRecord{Name: "User", Username: "user", Password: password, Role: "user", Timezone: "UTC"})
	if err != nil {
		t.Fatal(err)
	}
	return f
}

func (f *exportFixture) note(t *testing.T, title, text string, groupID *int64, protected bool) {
	t.Helper()
	ctx := context.Background()
	if protected {
		encryptedKey, err := f.repo.Users().GetNoteEncryptionKey(ctx, f.userID)
		if err != nil {
			t.Fatal(err)
		}
		key, err := encryption.OpenNoteKey(encryptedKey, password)
		if err != nil {
			t.Fatal(err)
		}
		if text, err = encryption.EncryptNote(key, text); err != nil {
			t.Fatal(err)
		}
	}
	note, err := f.repo.Notes().CreateNote(ctx, repository.NewNoteRecord{Title: title, Note: text, IsEncrypted: protected, UserId: f.userID})
	if err != nil {
		t.Fatal(err)
	}
	if err := f.repo.Notes().AssignNoteToGroup(ctx, f.userID, note.Id, groupID); err != nil {
		t.Fatal(err)
	}
}

func (f *exportFixture) group(t *testing.T, name string, parentID *int64) *int64 {
	t.Helper()
	group, err := f.repo.Groups().CreateGroup(context.Background(), repository.NewGroupRecord{Name: name, ParentId: parentID, UserId: f.userID})
	if err != nil {
		t.Fatal(err)
	}
	return &group.Id
}

func (f *exportFixture) file(t *testing.T, identifier, name, data string) {
	t.Helper()
	ctx := context.Background()
	if err := f.repo.Files().CreateFileRecord(ctx, repository.NewFileRecord{Identifier: identifier, Name: name, UserId: f.userID, MimeType: "image/png", Size: int64(len(data))}); err != nil {
		t.Fatal(err)
	}
	if data != "" {
		target, err := f.export.storage.CreateTempFile("upload")
		if err != nil {
			t.Fatal(err)
		}
		if err := f.export.storage.AppendTempFile("upload", target, []byte(data)); err != nil {
			t.Fatal(err)
		}
		if err := f.export.storage.StoreTempFile("upload", target, identifier); err != nil {
			t.Fatal(err)
		}
	}
	if err := f.repo.Files().MarkFileReady(ctx, identifier); err != nil {
		t.Fatal(err)
	}
}

func (f *exportFixture) run(ctx context.Context, exportID, password string) error {
	return f.export.run(ctx, &jobs.Job{
		ID:      "job",
		Name:    jobs.CreateDataExport,
		UserID:  f.userID,
		Payload: jobs.DataExport{ExportID: exportID, Password: password},
	})
}

func readZip(t *testing.T, path string) map[string]string {
	t.Helper()
	reader, err := zip.OpenReader(path)
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	entries := map[string]string{}
	for _, file := range reader.File {
		r, err := file.Open()
		if err != nil {
			t.Fatal(err)
		}
		data, _ := io.ReadAll(r)
		r.Close()
		entries[file.Name] = string(data)
	}
	return entries
}

func TestDataExportZipContents(t *testing.T) {
	f := setupExport(t)
	f.file(t, "11111111-aaaa", "photo.png", "PNG")
	f.file(t, "22222222-bbbb", "missing.pdf", "")

	f.note(t, "Top note", "Top", nil, false)
	work := f.group(t, "Work stuff", nil)
	f.note(t, "Plan: Q1", "See ![photo](/file/11111111-aaaa) and [x](/file/11111111-aaaa?download) and /file/unknown", work, false)
	secret := f.group(t, "Secret", work)
	f.note(t, "Diary", "Dear diary ![photo](/file/11111111-aaaa)", secret, true)

	if err := f.run(context.Background(), "export-1", password); err != nil {
		t.Fatalf("run() = %v", err)
	}

	entries := readZip(t, filepath.Join(f.tempDir, "data-export-1-export-1.zip"))
	names := make([]string, 0, len(entries))
	for name := range entries {
		names = append(names, name)
	}
	sort.Strings(names)
	want := []string{
		"file/11111111-aaaa.png",
		"notes/Top-note.md",
		"notes/Work-stuff/Plan--Q1.md",
		"notes/Work-stuff/Secret/Diary.md",
	}
	if len(names) != len(want) {
		t.Fatalf("entries = %v, want %v", names, want)
	}
	for i := range want {
		if names[i] != want[i] {
			t.Fatalf("entries = %v, want %v", names, want)
		}
	}
	if entries["file/11111111-aaaa.png"] != "PNG" {
		t.Errorf("file data = %q", entries["file/11111111-aaaa.png"])
	}
	if got := entries["notes/Work-stuff/Plan--Q1.md"]; got != "See ![photo](/file/11111111-aaaa.png) and [x](/file/11111111-aaaa.png?download) and /file/unknown" {
		t.Errorf("rewritten links = %q", got)
	}
	if got := entries["notes/Work-stuff/Secret/Diary.md"]; got != "Dear diary ![photo](/file/11111111-aaaa.png)" {
		t.Errorf("decrypted note = %q", got)
	}

	if len(f.finished) != 1 || f.finished[0] != "export-1" || len(f.failed) != 0 {
		t.Errorf("finished = %v, failed = %v", f.finished, f.failed)
	}
	for i := 1; i < len(f.progress); i++ {
		if f.progress[i] < f.progress[i-1] {
			t.Errorf("progress went backwards: %v", f.progress)
		}
	}
	if len(f.progress) == 0 || f.progress[len(f.progress)-1] != 100 {
		t.Errorf("progress = %v, want to end at 100", f.progress)
	}
	if _, err := os.Stat(filepath.Join(f.tempDir, "data-export-1-export-1.zip.partial")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("partial file left behind: %v", err)
	}
}

func TestDataExportWrongPasswordFails(t *testing.T) {
	f := setupExport(t)
	f.note(t, "Diary", "Dear diary", nil, true)

	if err := f.run(context.Background(), "export-1", "wrong"); err == nil {
		t.Fatal("run() succeeded with a wrong password")
	}
	if len(f.failed) != 1 || f.failed[0].Message != decryptMessage || f.failed[0].ExportID != "export-1" {
		t.Errorf("failed = %+v", f.failed)
	}
	if entries, _ := os.ReadDir(f.tempDir); len(entries) != 0 {
		t.Errorf("temp folder after failure = %v", entries)
	}
}

// A note the upgrade could not convert keeps its old format under a current
// key, which is not the same failure as an old key.
func TestDataExportUnconvertedNoteFails(t *testing.T) {
	f := setupExport(t)
	f.note(t, "Diary", "Dear diary", nil, true)
	note, err := f.repo.Notes().CreateNote(context.Background(), repository.NewNoteRecord{Title: "Legacy", Note: "not-v2", IsEncrypted: true, UserId: f.userID})
	if err != nil {
		t.Fatal(err)
	}
	if err := f.repo.Notes().AssignNoteToGroup(context.Background(), f.userID, note.Id, nil); err != nil {
		t.Fatal(err)
	}

	if err := f.run(context.Background(), "export-1", password); err == nil {
		t.Fatal("run() succeeded with an unconverted note")
	}
	if len(f.failed) != 1 || f.failed[0].Message != unconvertedMessage {
		t.Errorf("failed = %+v", f.failed)
	}
}

func TestDataExportAbortRemovesFile(t *testing.T) {
	f := setupExport(t)
	f.note(t, "Note", "text", nil, false)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := f.run(ctx, "export-1", password); !errors.Is(err, context.Canceled) {
		t.Fatalf("run() = %v", err)
	}
	if entries, _ := os.ReadDir(f.tempDir); len(entries) != 0 {
		t.Errorf("temp folder after abort = %v", entries)
	}
	if len(f.finished) != 0 || len(f.failed) != 0 {
		t.Errorf("finished = %v, failed = %v", f.finished, f.failed)
	}
}

func TestDataExportEmptyAccount(t *testing.T) {
	f := setupExport(t)
	if err := f.run(context.Background(), "export-1", password); err != nil {
		t.Fatal(err)
	}
	if entries := readZip(t, filepath.Join(f.tempDir, "data-export-1-export-1.zip")); len(entries) != 0 {
		t.Errorf("entries = %v", entries)
	}
	if len(f.progress) != 0 || len(f.finished) != 1 {
		t.Errorf("progress = %v, finished = %v", f.progress, f.finished)
	}
}
