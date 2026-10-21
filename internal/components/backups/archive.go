package backups

import (
	"archive/zip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/drivers/sqlite"
	"noteme/internal/components/storage"
	"noteme/internal/encryption"
	"noteme/internal/version"
)

// One backup is a zip: manifest.json, database.sqlite (a consistent copy
// made with VACUUM INTO, 0.9.q, or a sqlite snapshot of PostgreSQL and
// MySQL, both without session rows) and files/<identifier> for every
// uploaded file, since files live on disk since 0.3. The zip is encrypted
// with BACKUP_ENCRYPTION_KEY (encryption.EncryptFile) before it leaves the
// temp folder; a plain zip from before that still restores.
const (
	archiveFormat     = 1
	manifestEntry     = "manifest.json"
	databaseEntry     = "database.sqlite"
	filesEntryDir     = "files/"
	archiveFileMode   = 0o600
	maxArchiveEntries = 100000
	sqliteHeader      = "SQLite format 3\x00"
)

var ErrWrongKey = errors.New("backup could not be decrypted, check BACKUP_ENCRYPTION_KEY")

type manifest struct {
	Format    int    `json:"format"`
	CreatedAt int64  `json:"created_at"`
	Version   string `json:"version"`
	Files     int    `json:"files"`
}

func createArchive(ctx context.Context, db drivers.DB, databaseType string, files *storage.Storage, path string) (err error) {
	snapshot := path + ".sqlite"
	defer removeSqliteFiles(snapshot)
	// Created here with 0600 before SQLite opens it (it would use 0644);
	// SQLite gives -wal and -shm the database file's mode.
	if err := os.WriteFile(snapshot, nil, archiveFileMode); err != nil {
		return fmt.Errorf("create snapshot: %w", err)
	}
	if databaseType == "sqlite" {
		if _, err := db.ExecContext(ctx, `VACUUM INTO ?`, snapshot); err != nil {
			return fmt.Errorf("snapshot database: %w", err)
		}
		if err := removeSessions(ctx, snapshot); err != nil {
			return fmt.Errorf("snapshot database: %w", err)
		}
	} else if err := exportSnapshot(ctx, db, snapshot); err != nil {
		return fmt.Errorf("snapshot database: %w", err)
	}

	names, err := files.FileNames()
	if err != nil {
		return err
	}

	out, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, archiveFileMode)
	if err != nil {
		return fmt.Errorf("create backup archive: %w", err)
	}
	defer func() {
		if closeErr := out.Close(); err == nil {
			err = closeErr
		}
		if err != nil {
			os.Remove(path)
		}
	}()

	archive := zip.NewWriter(out)
	entry, err := archive.Create(manifestEntry)
	if err != nil {
		return err
	}
	if err := json.NewEncoder(entry).Encode(manifest{Format: archiveFormat, CreatedAt: time.Now().Unix(), Version: version.String(), Files: len(names)}); err != nil {
		return err
	}

	if err := addArchiveFile(archive, databaseEntry, zip.Deflate, func() (*os.File, error) { return os.Open(snapshot) }); err != nil {
		return err
	}
	// Uploads are mostly compressed already (images, PDFs), so they are
	// stored as they are.
	for _, name := range names {
		if err := ctx.Err(); err != nil {
			return err
		}
		err := addArchiveFile(archive, filesEntryDir+name, zip.Store, func() (*os.File, error) { return files.OpenFile(name) })
		// Deleted after it was listed.
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err != nil {
			return err
		}
	}
	return archive.Close()
}

// Session keys must never leave the database (SF-11); VACUUM makes sure the
// deleted rows are gone from the file.
func removeSessions(ctx context.Context, path string) error {
	snapshot, err := sqlite.Open(ctx, path)
	if err != nil {
		return err
	}
	defer snapshot.Close()
	for _, statement := range []string{`DELETE FROM "session"`, `VACUUM`} {
		if _, err := snapshot.ExecContext(ctx, statement); err != nil {
			return err
		}
	}
	return nil
}

func addArchiveFile(archive *zip.Writer, name string, method uint16, open func() (*os.File, error)) error {
	file, err := open()
	if err != nil {
		return err
	}
	defer file.Close()
	entry, err := archive.CreateHeader(&zip.FileHeader{Name: name, Method: method, Modified: time.Now()})
	if err != nil {
		return err
	}
	_, err = io.Copy(entry, file)
	return err
}

type RestoreResult struct {
	CreatedAt int64
	Version   string
	Files     int
}

// Puts the database of a backup at databasePath and its files into the files
// folder. The server must be stopped; files that are not in the backup are
// left in place.
func Restore(ctx context.Context, archivePath, key, databasePath string, files *storage.Storage) (*RestoreResult, error) {
	return restore(ctx, archivePath, key, files, func(database string) error {
		return restoreDatabase(database, databasePath)
	})
}

// Replaces every row of a migrated database of any type with the backup's,
// then restores the files like Restore.
func RestoreInto(ctx context.Context, archivePath, key string, db drivers.DB, databaseType string, files *storage.Storage) (*RestoreResult, error) {
	return restore(ctx, archivePath, key, files, func(database string) error {
		if err := importSnapshot(ctx, database, db, databaseType); err != nil {
			return fmt.Errorf("restore database: %w", err)
		}
		return nil
	})
}

// Nothing is written before the database entry passed its checks (SF-26).
func restore(ctx context.Context, archivePath, key string, files *storage.Storage, applyDatabase func(database string) error) (*RestoreResult, error) {
	archive, cleanup, err := openArchive(archivePath, key)
	if err != nil {
		return nil, err
	}
	defer cleanup()
	if len(archive.File) > maxArchiveEntries {
		return nil, fmt.Errorf("backup has more than %d entries", maxArchiveEntries)
	}

	entries := map[string]*zip.File{}
	for _, file := range archive.File {
		entries[file.Name] = file
	}

	var info manifest
	if err := readManifest(entries[manifestEntry], &info); err != nil {
		return nil, err
	}
	if info.Format != archiveFormat {
		return nil, fmt.Errorf("backup format %d is not supported", info.Format)
	}
	if entries[databaseEntry] == nil {
		return nil, fmt.Errorf("backup has no %s", databaseEntry)
	}

	database, err := extractDatabase(ctx, entries[databaseEntry])
	if err != nil {
		return nil, fmt.Errorf("restore database: %w", err)
	}
	defer removeSqliteFiles(database)

	stage, err := files.NewStage()
	if err != nil {
		return nil, err
	}
	defer stage.Remove()

	result := &RestoreResult{CreatedAt: info.CreatedAt, Version: info.Version}
	for _, file := range archive.File {
		name, ok := strings.CutPrefix(file.Name, filesEntryDir)
		if !ok || name == "" {
			continue
		}
		if err := copyEntry(file, func(r io.Reader) error { return stage.WriteFile(name, r) }); err != nil {
			return nil, fmt.Errorf("restore file %s: %w", name, err)
		}
		result.Files++
	}

	if err := applyDatabase(database); err != nil {
		return nil, err
	}
	if err := stage.Commit(); err != nil {
		return nil, fmt.Errorf("restore files: %w", err)
	}
	return result, nil
}

func openArchive(archivePath, key string) (*zip.ReadCloser, func(), error) {
	file, err := os.Open(archivePath)
	if err != nil {
		return nil, nil, fmt.Errorf("open backup: %w", err)
	}
	defer file.Close()
	head := make([]byte, len(encryption.FileMagic))
	n, _ := io.ReadFull(file, head)
	if !encryption.IsEncryptedFile(head[:n]) {
		archive, err := zip.OpenReader(archivePath)
		if err != nil {
			return nil, nil, fmt.Errorf("open backup: %w", err)
		}
		return archive, func() { archive.Close() }, nil
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return nil, nil, err
	}

	temp, err := os.CreateTemp("", "noteme-backup-*.zip")
	if err != nil {
		return nil, nil, err
	}
	err = encryption.DecryptFile(temp, file, key)
	temp.Close()
	if errors.Is(err, encryption.ErrDecrypt) {
		os.Remove(temp.Name())
		return nil, nil, ErrWrongKey
	}
	if err != nil {
		os.Remove(temp.Name())
		return nil, nil, fmt.Errorf("decrypt backup: %w", err)
	}
	archive, err := zip.OpenReader(temp.Name())
	if err != nil {
		os.Remove(temp.Name())
		return nil, nil, fmt.Errorf("open backup: %w", err)
	}
	return archive, func() {
		archive.Close()
		os.Remove(temp.Name())
	}, nil
}

func readManifest(file *zip.File, info *manifest) error {
	if file == nil {
		return errors.New("not a NoteMe backup: manifest.json is missing")
	}
	reader, err := file.Open()
	if err != nil {
		return err
	}
	defer reader.Close()
	if err := json.NewDecoder(io.LimitReader(reader, 1<<20)).Decode(info); err != nil {
		return fmt.Errorf("read manifest.json: %w", err)
	}
	return nil
}

// Bounded by the size the entry's header declares.
func copyEntry(file *zip.File, write func(io.Reader) error) error {
	reader, err := file.Open()
	if err != nil {
		return err
	}
	defer reader.Close()
	limited := &io.LimitedReader{R: reader, N: int64(file.UncompressedSize64) + 1}
	if err := write(limited); err != nil {
		return err
	}
	if limited.N == 0 {
		return fmt.Errorf("entry is larger than its declared size %d", file.UncompressedSize64)
	}
	return nil
}

func extractDatabase(ctx context.Context, file *zip.File) (string, error) {
	temp, err := os.CreateTemp("", "noteme-restore-*.sqlite")
	if err != nil {
		return "", err
	}
	path := temp.Name()
	err = copyEntry(file, func(r io.Reader) error {
		_, err := io.Copy(temp, r)
		return err
	})
	if closeErr := temp.Close(); err == nil {
		err = closeErr
	}
	if err == nil {
		err = validateDatabase(ctx, path)
	}
	if err != nil {
		removeSqliteFiles(path)
		return "", err
	}
	return path, nil
}

// Sessions of the backed up server never come back (SF-11).
func validateDatabase(ctx context.Context, path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	head := make([]byte, len(sqliteHeader))
	_, readErr := io.ReadFull(file, head)
	file.Close()
	if readErr != nil || string(head) != sqliteHeader {
		return errors.New("the backup's database.sqlite is not a SQLite database")
	}

	db, err := sqlite.Open(ctx, path)
	if err != nil {
		return err
	}
	defer db.Close()
	var check string
	if err := db.QueryRowContext(ctx, `PRAGMA integrity_check`).Scan(&check); err != nil {
		return fmt.Errorf("check database: %w", err)
	}
	if check != "ok" {
		return fmt.Errorf("the backup's database.sqlite is damaged: %s", check)
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM "session"`); err != nil {
		return fmt.Errorf("the backup's database.sqlite is not a NoteMe database: %w", err)
	}
	return nil
}

// SQLite keeps recent writes in the -wal file next to the database; the old
// one would be replayed onto the restored database, so it goes first.
func restoreDatabase(database, databasePath string) error {
	partial := databasePath + ".restore"
	if err := copyToFile(database, partial); err != nil {
		os.Remove(partial)
		return fmt.Errorf("restore database: %w", err)
	}
	for _, suffix := range []string{"-wal", "-shm"} {
		if err := os.Remove(databasePath + suffix); err != nil && !errors.Is(err, os.ErrNotExist) {
			os.Remove(partial)
			return fmt.Errorf("remove old database journal: %w", err)
		}
	}
	if err := os.Rename(partial, databasePath); err != nil {
		os.Remove(partial)
		return fmt.Errorf("restore database: %w", err)
	}
	return nil
}
