package storage

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

var ErrInvalidName = errors.New("invalid file name")

// Uploads in progress live in the temp folder as <prefix>-<target>; finished
// files live in the files folder under their identifier (decision 0.3).
type Storage struct {
	tempDir  string
	filesDir string
}

func New(tempDir, filesDir string) *Storage {
	return &Storage{tempDir: tempDir, filesDir: filesDir}
}

func (s *Storage) Init() error {
	for _, dir := range []string{s.tempDir, s.filesDir} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return fmt.Errorf("create %s: %w", dir, err)
		}
	}
	return nil
}

// Names come from clients, so anything that could leave the folder is
// rejected, as are Windows device names (CON, NUL, COM1, ...) and ":" streams.
func ValidName(name string) bool {
	if name == "" || name == "." || name == ".." || strings.ContainsAny(name, `/\:`) || filepath.Base(name) != name {
		return false
	}
	device, _, _ := strings.Cut(strings.ToUpper(name), ".")
	switch device {
	case "CON", "PRN", "AUX", "NUL":
		return false
	}
	if len(device) == 4 && (device[:3] == "COM" || device[:3] == "LPT") && device[3] >= '1' && device[3] <= '9' {
		return false
	}
	return true
}

func (s *Storage) tempPath(prefix, target string) (string, error) {
	name := prefix + "-" + target
	if !ValidName(name) {
		return "", ErrInvalidName
	}
	return filepath.Join(s.tempDir, name), nil
}

func (s *Storage) filePath(identifier string) (string, error) {
	if !ValidName(identifier) {
		return "", ErrInvalidName
	}
	return filepath.Join(s.filesDir, identifier), nil
}

func (s *Storage) CreateTempFile(prefix string) (string, error) {
	target := uuid.NewString()
	path, err := s.tempPath(prefix, target)
	if err != nil {
		return "", err
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	return target, file.Close()
}

func (s *Storage) AppendTempFile(prefix, target string, data []byte) error {
	path, err := s.tempPath(prefix, target)
	if err != nil {
		return err
	}
	file, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("open temp file: %w", err)
	}
	if _, err := file.Write(data); err != nil {
		file.Close()
		return fmt.Errorf("append temp file: %w", err)
	}
	return file.Close()
}

func (s *Storage) TempFileSize(prefix, target string) (int64, error) {
	path, err := s.tempPath(prefix, target)
	if err != nil {
		return 0, err
	}
	info, err := os.Stat(path)
	if err != nil {
		return 0, fmt.Errorf("stat temp file: %w", err)
	}
	return info.Size(), nil
}

func (s *Storage) RemoveTempFile(prefix, target string) error {
	path, err := s.tempPath(prefix, target)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove temp file: %w", err)
	}
	return nil
}

func (s *Storage) CleanupOldTempFiles(maxAge time.Duration) error {
	entries, err := os.ReadDir(s.tempDir)
	if err != nil {
		return fmt.Errorf("read temp folder: %w", err)
	}
	cutoff := time.Now().Add(-maxAge)
	for _, entry := range entries {
		if !entry.Type().IsRegular() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			if err := os.Remove(filepath.Join(s.tempDir, entry.Name())); err != nil && !errors.Is(err, os.ErrNotExist) {
				return fmt.Errorf("remove old temp file: %w", err)
			}
		}
	}
	return nil
}

// Moves a finished upload into the files folder. Rename fails across
// filesystems (a Docker volume for the files folder), so it falls back to a
// copy.
func (s *Storage) StoreTempFile(prefix, target, identifier string) error {
	from, err := s.tempPath(prefix, target)
	if err != nil {
		return err
	}
	to, err := s.filePath(identifier)
	if err != nil {
		return err
	}
	if err := os.Rename(from, to); err == nil {
		return nil
	}
	if err := copyFile(from, to); err != nil {
		return fmt.Errorf("store file: %w", err)
	}
	return os.Remove(from)
}

func copyFile(from, to string) error {
	source, err := os.Open(from)
	if err != nil {
		return err
	}
	defer source.Close()

	return writeFile(to, source)
}

func (s *Storage) OpenFile(identifier string) (*os.File, error) {
	path, err := s.filePath(identifier)
	if err != nil {
		return nil, err
	}
	return os.Open(path)
}

func (s *Storage) RemoveFile(identifier string) error {
	path, err := s.filePath(identifier)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove file: %w", err)
	}
	return nil
}

// Exports are zip files in the temp folder, so the hourly cleanup expires
// them. They are written under a .partial name and renamed when complete, so
// a download never sees a half written zip.
func (s *Storage) exportPath(userID int, exportID string) (string, error) {
	name := fmt.Sprintf("data-export-%d-%s.zip", userID, exportID)
	if !ValidName(exportID) || !ValidName(name) {
		return "", ErrInvalidName
	}
	return filepath.Join(s.tempDir, name), nil
}

func (s *Storage) CreateExportFile(userID int, exportID string) (*os.File, error) {
	path, err := s.exportPath(userID, exportID)
	if err != nil {
		return nil, err
	}
	file, err := os.OpenFile(path+".partial", os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return nil, fmt.Errorf("create export file: %w", err)
	}
	return file, nil
}

func (s *Storage) FinishExportFile(userID int, exportID string) error {
	path, err := s.exportPath(userID, exportID)
	if err != nil {
		return err
	}
	if err := os.Rename(path+".partial", path); err != nil {
		return fmt.Errorf("finish export file: %w", err)
	}
	return nil
}

func (s *Storage) RemoveExportFile(userID int, exportID string) error {
	path, err := s.exportPath(userID, exportID)
	if err != nil {
		return err
	}
	for _, name := range []string{path + ".partial", path} {
		if err := os.Remove(name); err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("remove export file: %w", err)
		}
	}
	return nil
}

// Only finished exports can be opened.
func (s *Storage) OpenExportFile(userID int, exportID string) (*os.File, error) {
	path, err := s.exportPath(userID, exportID)
	if err != nil {
		return nil, err
	}
	return os.Open(path)
}

// Stored files, without copies still being written (.partial).
func (s *Storage) FileNames() ([]string, error) {
	entries, err := os.ReadDir(s.filesDir)
	if err != nil {
		return nil, fmt.Errorf("read files folder: %w", err)
	}
	names := []string{}
	for _, entry := range entries {
		if entry.Type().IsRegular() && !strings.HasSuffix(entry.Name(), ".partial") {
			names = append(names, entry.Name())
		}
	}
	return names, nil
}

// Written under a .partial name first, so an interrupted write never leaves
// a truncated file under the identifier.
func (s *Storage) WriteFile(identifier string, data io.Reader) error {
	path, err := s.filePath(identifier)
	if err != nil {
		return err
	}
	if err := writeFile(path, data); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	return nil
}

func writeFile(path string, data io.Reader) error {
	partial := path + ".partial"
	target, err := os.OpenFile(partial, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	if _, err := io.Copy(target, data); err != nil {
		target.Close()
		os.Remove(partial)
		return err
	}
	if err := target.Close(); err != nil {
		os.Remove(partial)
		return err
	}
	return os.Rename(partial, path)
}

// Files of a restore wait here, inside the files folder so the final move
// is a rename; FileNames skips the folder as it lists regular files only.
type Stage struct {
	dir      string
	filesDir string
}

func (s *Storage) NewStage() (*Stage, error) {
	dir, err := os.MkdirTemp(s.filesDir, ".restore-")
	if err != nil {
		return nil, fmt.Errorf("create stage folder: %w", err)
	}
	return &Stage{dir: dir, filesDir: s.filesDir}, nil
}

func (st *Stage) WriteFile(identifier string, data io.Reader) error {
	if !ValidName(identifier) {
		return ErrInvalidName
	}
	if err := writeFile(filepath.Join(st.dir, identifier), data); err != nil {
		return fmt.Errorf("write staged file: %w", err)
	}
	return nil
}

func (st *Stage) Commit() error {
	entries, err := os.ReadDir(st.dir)
	if err != nil {
		return fmt.Errorf("read stage folder: %w", err)
	}
	for _, entry := range entries {
		if err := os.Rename(filepath.Join(st.dir, entry.Name()), filepath.Join(st.filesDir, entry.Name())); err != nil {
			return fmt.Errorf("move staged file: %w", err)
		}
	}
	return st.Remove()
}

func (st *Stage) Remove() error {
	return os.RemoveAll(st.dir)
}
