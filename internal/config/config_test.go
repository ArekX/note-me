package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func clearEnv(t *testing.T) {
	t.Helper()
	for _, key := range []string{
		EnvDatabaseDsn, EnvCookieSecure, EnvCookieMaxAgeSeconds,
		EnvServerAddress, EnvWebserverPort, EnvLoggingLevel,
		EnvShowLogColors, EnvMaxFileSize, EnvMaxUserStorageSize,
		EnvMaxAllowedBackupCount, EnvAppURL, EnvFilesLocation, EnvLocalBackupRootLocation,
		EnvBackupEncryptionKey, EnvAIEncryptionKey, EnvTrustedProxies, EnvMaxPasswordAttempts, EnvMaxConnectionsPerUser,
		EnvPeriodicTaskHistoryDays, "SKIP_ENV",
	} {
		t.Setenv(key, "")
		os.Unsetenv(key)
	}
}

func TestLoadDefaults(t *testing.T) {
	clearEnv(t)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	checks := []struct {
		name string
		got  any
		want any
	}{
		{"DatabaseType", cfg.DatabaseType, "sqlite"},
		{"DatabaseDsn", cfg.DatabaseDsn, ":memory:"},
		{"CookieSecure", cfg.CookieSecure, true},
		{"CookieMaxAge", cfg.CookieMaxAge, 30 * 24 * time.Hour},
		{"ServerAddress", cfg.ServerAddress, "127.0.0.1"},
		{"WebserverPort", cfg.WebserverPort, 8000},
		{"LoggingLevel", cfg.LoggingLevel, "INFO"},
		{"ShowLogColors", cfg.ShowLogColors, true},
		{"MaxFileSize", cfg.MaxFileSize, int64(52428800)},
		{"MaxAllowedBackupCount", cfg.MaxAllowedBackupCount, 5},
		{"MaxUserStorageSize", cfg.MaxUserStorageSize, int64(0)},
		{"MaxPasswordAttempts", cfg.MaxPasswordAttempts, 10},
		{"MaxConnectionsPerUser", cfg.MaxConnectionsPerUser, 0},
		{"PeriodicTaskHistoryDays", cfg.PeriodicTaskHistoryDays, 30},
		{"BackupEncryptionKey", cfg.BackupEncryptionKey, ""},
		{"AppURL", cfg.AppURL.String(), "http://localhost:8000"},
		{"Warnings", len(cfg.Warnings), 1},
	}

	for _, c := range checks {
		if c.got != c.want {
			t.Errorf("%s = %v, want %v", c.name, c.got, c.want)
		}
	}
}

func TestLoadOverrides(t *testing.T) {
	clearEnv(t)
	t.Setenv(EnvCookieSecure, "0")
	t.Setenv(EnvWebserverPort, "9000")
	t.Setenv(EnvLoggingLevel, "debug")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.CookieSecure {
		t.Error("CookieSecure should be false when COOKIE_SECURE=0")
	}
	if cfg.WebserverPort != 9000 {
		t.Errorf("WebserverPort = %d, want 9000", cfg.WebserverPort)
	}
	if cfg.LoggingLevel != "DEBUG" {
		t.Errorf("LoggingLevel = %q, want DEBUG", cfg.LoggingLevel)
	}
	if got := cfg.AppURL.String(); got != "http://localhost:9000" {
		t.Errorf("AppURL derived from port = %q", got)
	}
}

func TestLoadTrustedProxies(t *testing.T) {
	clearEnv(t)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if len(cfg.TrustedProxies) != 0 {
		t.Errorf("TrustedProxies = %v, want none by default", cfg.TrustedProxies)
	}

	t.Setenv(EnvTrustedProxies, " 10.0.0.1, 172.16.5.0/12 ,::1,")
	cfg, err = Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	got := make([]string, 0, len(cfg.TrustedProxies))
	for _, prefix := range cfg.TrustedProxies {
		got = append(got, prefix.String())
	}
	want := []string{"10.0.0.1/32", "172.16.0.0/12", "::1/128"}
	if strings.Join(got, " ") != strings.Join(want, " ") {
		t.Errorf("TrustedProxies = %v, want %v", got, want)
	}

	t.Setenv(EnvTrustedProxies, "proxy.local")
	if _, err := Load(); err == nil {
		t.Error("Load() accepted a host name in TRUSTED_PROXIES")
	}
}

func TestLoadDatabaseTypes(t *testing.T) {
	tests := map[string][2]string{
		"sqlite://data/noteme.sqlite":          {"sqlite", "data/noteme.sqlite"},
		"postgres://user:pass@db/noteme":       {"postgres", "user:pass@db/noteme"},
		"postgresql://user:pass@db/noteme":     {"postgres", "user:pass@db/noteme"},
		"mysql://user:pass@db:3306/noteme?tls": {"mysql", "user:pass@db:3306/noteme?tls"},
	}
	for dsn, want := range tests {
		clearEnv(t)
		t.Setenv(EnvDatabaseDsn, dsn)
		cfg, err := Load()
		if err != nil || cfg.DatabaseType != want[0] || cfg.DatabaseDsn != want[1] {
			t.Errorf("Load(%s) = %+v, %v", dsn, cfg, err)
		}
	}

	clearEnv(t)
	t.Setenv(EnvDatabaseDsn, "mssql://user:pass@localhost/noteme")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "expected sqlite, postgres or mysql") {
		t.Errorf("Load() = %v", err)
	}
}

func TestLoadFilesDir(t *testing.T) {
	clearEnv(t)
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		t.Fatal(err)
	}
	abs := filepath.Join(t.TempDir(), "stored")

	for _, c := range []struct {
		env  string
		want string
	}{
		{"", filepath.Join(filepath.Dir(exe), "files")},
		{"data/files", filepath.Join(wd, "data", "files")},
		{abs, abs},
	} {
		t.Setenv(EnvFilesLocation, c.env)
		cfg, err := Load()
		if err != nil {
			t.Fatalf("Load() error = %v", err)
		}
		if cfg.FilesDir != c.want {
			t.Errorf("FILES_LOCATION=%q: FilesDir = %q, want %q", c.env, cfg.FilesDir, c.want)
		}
	}
}

func TestLoadEnvironmentDoesNotOverride(t *testing.T) {
	dir := t.TempDir()
	content := "# comment\nexport FOO_TEST_KEY=\"from file\"\nBAR_TEST_KEY=bar\n"
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, ".env.defaults"), []byte("BAR_TEST_KEY=default\nBAZ_TEST_KEY=baz\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Chdir(dir)

	t.Setenv("FOO_TEST_KEY", "from env")
	t.Setenv("SKIP_ENV", "")
	for _, key := range []string{"BAR_TEST_KEY", "BAZ_TEST_KEY"} {
		os.Unsetenv(key)
		t.Cleanup(func() { os.Unsetenv(key) })
	}

	if err := LoadEnvironment(); err != nil {
		t.Fatal(err)
	}

	if got := os.Getenv("FOO_TEST_KEY"); got != "from env" {
		t.Errorf("existing variable overridden: %q", got)
	}
	if got := os.Getenv("BAR_TEST_KEY"); got != "bar" {
		t.Errorf("BAR_TEST_KEY = %q, want bar (.env beats .env.defaults)", got)
	}
	if got := os.Getenv("BAZ_TEST_KEY"); got != "baz" {
		t.Errorf("BAZ_TEST_KEY = %q, want baz", got)
	}
}

func TestLoadRejectsBadValues(t *testing.T) {
	for key, value := range map[string]string{
		EnvCookieSecure:            "yes",
		EnvWebserverPort:           "eighty",
		EnvWebserverPort + "x":     "70000",
		EnvMaxFileSize:             "-1",
		EnvMaxFileSize + "x":       "0",
		EnvCookieMaxAgeSeconds:     "0",
		EnvMaxPasswordAttempts:     "0",
		EnvMaxConnectionsPerUser:   "-2",
		EnvPeriodicTaskHistoryDays: "0",
		EnvAppURL:                  "localhost:8000",
		EnvAppURL + "x":            "ftp://files.example.com",
	} {
		clearEnv(t)
		t.Setenv(strings.TrimSuffix(key, "x"), value)
		if _, err := Load(); err == nil {
			t.Errorf("%s=%q was accepted", strings.TrimSuffix(key, "x"), value)
		}
	}

	clearEnv(t)
	t.Setenv(EnvAppURL, "https://notes.example.com")
	t.Setenv(EnvBackupEncryptionKey, " ")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.Warnings) != 0 {
		t.Errorf("warnings = %v", cfg.Warnings)
	}
	if err := cfg.RequireBackupEncryptionKey(); err == nil {
		t.Error("blank backup key was accepted")
	}
	t.Setenv(EnvBackupEncryptionKey, "secret")
	if cfg, _ = Load(); cfg.RequireBackupEncryptionKey() != nil {
		t.Error("backup key was refused")
	}

	if err := cfg.RequireAIEncryptionKey(); err == nil {
		t.Error("missing AI key was accepted")
	}
	t.Setenv(EnvAIEncryptionKey, " ")
	if cfg, _ = Load(); cfg.RequireAIEncryptionKey() == nil {
		t.Error("blank AI key was accepted")
	}
	t.Setenv(EnvAIEncryptionKey, "secret")
	if cfg, _ = Load(); cfg.RequireAIEncryptionKey() != nil || cfg.AIEncryptionKey != "secret" {
		t.Error("AI key was refused")
	}
}

func TestLoadBackupDir(t *testing.T) {
	clearEnv(t)
	wd, _ := os.Getwd()
	t.Setenv(EnvLocalBackupRootLocation, "data/backup")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.BackupDir != filepath.Join(wd, "data", "backup") {
		t.Errorf("BackupDir = %q", cfg.BackupDir)
	}
}
