package migrate

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	migrationsDir = "migrations"
	upSuffix      = ".up.sql"
	downSuffix    = ".down.sql"
)

type Migration struct {
	Name string
	Up   string
	Down string
}

// Files keeps the SQL files under migrations/.
type Driver interface {
	Files() fs.FS
	Applied(ctx context.Context) ([]string, error)
	Apply(ctx context.Context, name, script string) error
	Revert(ctx context.Context, name, script string) error
	UpgradeReason(ctx context.Context) (string, error)
}

type Migrator struct {
	driver Driver
	fsys   fs.FS
}

func New(driver Driver) *Migrator {
	return &Migrator{driver: driver, fsys: driver.Files()}
}

func NewWithFS(driver Driver, fsys fs.FS) *Migrator {
	return &Migrator{driver: driver, fsys: fsys}
}

func (m *Migrator) All() ([]Migration, error) {
	entries, err := fs.ReadDir(m.fsys, migrationsDir)
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}

	byName := map[string]*Migration{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		fileName := entry.Name()
		var name string
		var isUp bool
		switch {
		case strings.HasSuffix(fileName, upSuffix):
			name, isUp = strings.TrimSuffix(fileName, upSuffix), true
		case strings.HasSuffix(fileName, downSuffix):
			name, isUp = strings.TrimSuffix(fileName, downSuffix), false
		default:
			continue
		}

		content, err := fs.ReadFile(m.fsys, filepath.ToSlash(filepath.Join(migrationsDir, fileName)))
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", fileName, err)
		}

		mig := byName[name]
		if mig == nil {
			mig = &Migration{Name: name}
			byName[name] = mig
		}
		if isUp {
			mig.Up = string(content)
		} else {
			mig.Down = string(content)
		}
	}

	result := make([]Migration, 0, len(byName))
	for _, mig := range byName {
		if mig.Up == "" {
			return nil, fmt.Errorf("migration %s has no %s file", mig.Name, upSuffix)
		}
		result = append(result, *mig)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })

	return result, nil
}

func (m *Migrator) IsFirstRun(ctx context.Context) (bool, error) {
	applied, err := m.Applied(ctx)
	if err != nil {
		return false, err
	}
	return len(applied) == 0, nil
}

func (m *Migrator) Applied(ctx context.Context) ([]string, error) {
	return m.driver.Applied(ctx)
}

func (m *Migrator) Pending(ctx context.Context) ([]Migration, error) {
	all, err := m.All()
	if err != nil {
		return nil, err
	}
	applied, err := m.Applied(ctx)
	if err != nil {
		return nil, err
	}

	appliedSet := make(map[string]struct{}, len(applied))
	for _, name := range applied {
		appliedSet[name] = struct{}{}
	}

	var pending []Migration
	for _, mig := range all {
		if _, ok := appliedSet[mig.Name]; !ok {
			pending = append(pending, mig)
		}
	}

	return pending, nil
}

func (m *Migrator) Up(ctx context.Context) ([]string, error) {
	pending, err := m.Pending(ctx)
	if err != nil {
		return nil, err
	}

	var applied []string
	for _, mig := range pending {
		if err := m.driver.Apply(ctx, mig.Name, mig.Up); err != nil {
			return applied, fmt.Errorf("apply migration %s: %w", mig.Name, err)
		}
		applied = append(applied, mig.Name)
	}

	return applied, nil
}

func (m *Migrator) Down(ctx context.Context) (string, error) {
	applied, err := m.Applied(ctx)
	if err != nil {
		return "", err
	}
	if len(applied) == 0 {
		return "", nil
	}

	last := applied[len(applied)-1]

	all, err := m.All()
	if err != nil {
		return "", err
	}

	var target *Migration
	for i := range all {
		if all[i].Name == last {
			target = &all[i]
			break
		}
	}
	if target == nil {
		return "", fmt.Errorf("applied migration %s not found in migration files", last)
	}
	if target.Down == "" {
		return "", fmt.Errorf("migration %s has no %s file", last, downSuffix)
	}

	if err := m.driver.Revert(ctx, last, target.Down); err != nil {
		return "", fmt.Errorf("revert migration %s: %w", last, err)
	}

	return last, nil
}

// Every driver keeps its own copy of a migration under the same name.
func Create(name string, dirs ...string) ([]string, error) {
	name = strings.ToLower(strings.TrimSpace(name))
	name = strings.NewReplacer(" ", "_", "-", "_").Replace(name)
	if name == "" {
		return nil, fmt.Errorf("migration name is required")
	}

	base := time.Now().Format("20060102_150405") + "_" + name
	var paths []string
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return paths, err
		}
		for _, file := range [][2]string{{upSuffix, "up"}, {downSuffix, "down"}} {
			path := filepath.Join(dir, base+file[0])
			if err := os.WriteFile(path, []byte("-- "+base+": "+file[1]+"\n"), 0o644); err != nil {
				return paths, err
			}
			paths = append(paths, path)
		}
	}

	return paths, nil
}

// Reports why the database must go through noteme-upgrade before the app can
// use it, or "" when it does not.
func (m *Migrator) UpgradeReason(ctx context.Context) (string, error) {
	reason, err := m.driver.UpgradeReason(ctx)
	if err != nil || reason != "" {
		return reason, err
	}

	all, err := m.All()
	if err != nil {
		return "", err
	}
	applied, err := m.Applied(ctx)
	if err != nil {
		return "", err
	}
	known := make(map[string]bool, len(all))
	for _, mig := range all {
		known[mig.Name] = true
	}
	for _, name := range applied {
		if !known[name] {
			return fmt.Sprintf("migration %s is recorded but no longer exists", name), nil
		}
	}
	return "", nil
}
