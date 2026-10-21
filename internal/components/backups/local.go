package backups

import (
	"cmp"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

type localTarget struct {
	dir string
}

func newLocalTarget(root, location string) (*localTarget, error) {
	root, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrSettings, err)
	}
	dir := filepath.Join(root, filepath.FromSlash(location))
	relative, err := filepath.Rel(root, dir)
	if err != nil || strings.HasPrefix(location, "/") || filepath.IsAbs(location) ||
		relative == "." || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return nil, fmt.Errorf("%w: location %q leaves the backup root", ErrSettings, location)
	}
	return &localTarget{dir: dir}, nil
}

func (t *localTarget) path(identifier string) (string, error) {
	if !ValidIdentifier(identifier) {
		return "", ErrNotFound
	}
	return filepath.Join(t.dir, identifier), nil
}

func (t *localTarget) Setup(context.Context) error {
	if err := os.MkdirAll(t.dir, 0o700); err != nil {
		return fmt.Errorf("%w: %w", ErrSetup, err)
	}
	return nil
}

func (t *localTarget) Save(ctx context.Context, identifier, source string) (Item, error) {
	path, err := t.path(identifier)
	if err != nil {
		return Item{}, err
	}
	if err := t.Setup(ctx); err != nil {
		return Item{}, err
	}
	if err := copyToFile(source, path); err != nil {
		return Item{}, fmt.Errorf("%w: %w", ErrSave, err)
	}
	info, err := os.Stat(path)
	if err != nil {
		return Item{}, fmt.Errorf("%w: %w", ErrSave, err)
	}
	return localItem(identifier, info), nil
}

func copyToFile(source, path string) error {
	from, err := os.Open(source)
	if err != nil {
		return err
	}
	defer from.Close()

	partial := path + ".partial"
	to, err := os.OpenFile(partial, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	if _, err := io.Copy(to, from); err != nil {
		to.Close()
		os.Remove(partial)
		return err
	}
	if err := to.Close(); err != nil {
		os.Remove(partial)
		return err
	}
	if err := os.Rename(partial, path); err != nil {
		os.Remove(partial)
		return err
	}
	return nil
}

func (t *localTarget) Delete(_ context.Context, identifier string) error {
	path, err := t.path(identifier)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("%w: %w", ErrDelete, err)
	}
	return nil
}

func (t *localTarget) Open(_ context.Context, identifier string) (io.ReadCloser, int64, error) {
	path, err := t.path(identifier)
	if err != nil {
		return nil, 0, err
	}
	file, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, 0, ErrNotFound
	}
	if err != nil {
		return nil, 0, fmt.Errorf("%w: %w", ErrOpen, err)
	}
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		file.Close()
		return nil, 0, ErrNotFound
	}
	return file, info.Size(), nil
}

func (t *localTarget) List(context.Context) ([]Item, error) {
	entries, err := os.ReadDir(t.dir)
	if errors.Is(err, os.ErrNotExist) {
		return []Item{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrList, err)
	}

	items := []Item{}
	for _, entry := range entries {
		if !entry.Type().IsRegular() || strings.HasSuffix(entry.Name(), ".partial") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		items = append(items, localItem(entry.Name(), info))
	}
	sortNewestFirst(items)
	return items, nil
}

func localItem(identifier string, info os.FileInfo) Item {
	return Item{Identifier: identifier, Name: identifier, CreatedAt: info.ModTime().Unix(), Size: info.Size()}
}

func sortNewestFirst(items []Item) {
	slices.SortFunc(items, func(a, b Item) int {
		return cmp.Or(cmp.Compare(b.CreatedAt, a.CreatedAt), strings.Compare(b.Identifier, a.Identifier))
	})
}
