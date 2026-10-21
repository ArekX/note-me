package config

import (
	"fmt"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	EnvDatabaseDsn             = "DATABASE_DSN"
	EnvCookieSecure            = "COOKIE_SECURE"
	EnvCookieMaxAgeSeconds     = "COOKIE_MAX_AGE_SECONDS"
	EnvServerAddress           = "SERVER_ADDRESS"
	EnvWebserverPort           = "WEBSERVER_PORT"
	EnvLoggingLevel            = "LOGGING_LEVEL"
	EnvShowLogColors           = "SHOW_LOG_COLORS"
	EnvMaxFileSize             = "MAX_FILE_SIZE"
	EnvMaxUserStorageSize      = "MAX_USER_STORAGE_SIZE"
	EnvMaxAllowedBackupCount   = "MAX_ALLOWED_BACKUP_COUNT"
	EnvAppURL                  = "APP_URL"
	EnvFilesLocation           = "FILES_LOCATION"
	EnvLocalBackupRootLocation = "LOCAL_BACKUP_ROOT_LOCATION"
	EnvBackupEncryptionKey     = "BACKUP_ENCRYPTION_KEY"
	EnvAIEncryptionKey         = "AI_ENCRYPTION_KEY"
	EnvTrustedProxies          = "TRUSTED_PROXIES"
	EnvMaxPasswordAttempts     = "MAX_PASSWORD_ATTEMPTS"
	EnvMaxConnectionsPerUser   = "MAX_CONNECTIONS_PER_USER"
	EnvPeriodicTaskHistoryDays = "PERIODIC_TASK_HISTORY_DAYS"
)

const (
	DefaultDatabaseDsn             = "sqlite://:memory:"
	DefaultCookieSecure            = true
	DefaultCookieMaxAgeSeconds     = 2592000 // 30 days
	DefaultServerAddress           = "127.0.0.1"
	DefaultWebserverPort           = 8000
	DefaultLoggingLevel            = "INFO"
	DefaultShowLogColors           = true
	DefaultMaxFileSize             = 52428800 // 50MB
	DefaultMaxUserStorageSize      = 0        // unlimited
	DefaultMaxAllowedBackupCount   = 5
	DefaultMaxPasswordAttempts     = 10
	DefaultMaxConnectionsPerUser   = 0 // unlimited
	DefaultPeriodicTaskHistoryDays = 30
	DefaultTempDirName             = "temp"
	DefaultFilesDirName            = "files"
	DefaultBackupDirName           = "backup"
)

type Config struct {
	DatabaseType            string
	DatabaseDsn             string
	CookieSecure            bool
	CookieMaxAge            time.Duration
	ServerAddress           string
	WebserverPort           int
	LoggingLevel            string
	ShowLogColors           bool
	MaxFileSize             int64
	MaxUserStorageSize      int64
	MaxAllowedBackupCount   int
	MaxPasswordAttempts     int
	MaxConnectionsPerUser   int
	PeriodicTaskHistoryDays int
	AppURL                  *url.URL
	TrustedProxies          []netip.Prefix
	BackupEncryptionKey     string
	AIEncryptionKey         string

	TempDir   string
	FilesDir  string
	BackupDir string

	// Settings that work but deserve a log line at start.
	Warnings []string
}

func Load() (*Config, error) {
	cfg := &Config{
		BackupEncryptionKey: envString(EnvBackupEncryptionKey, ""),
		AIEncryptionKey:     envString(EnvAIEncryptionKey, ""),
	}

	var err error
	if cfg.CookieSecure, err = envBool(EnvCookieSecure, DefaultCookieSecure); err != nil {
		return nil, err
	}
	cookieMaxAge, err := envInt(EnvCookieMaxAgeSeconds, DefaultCookieMaxAgeSeconds, 1)
	if err != nil {
		return nil, err
	}
	cfg.CookieMaxAge = time.Duration(cookieMaxAge) * time.Second
	cfg.ServerAddress = envString(EnvServerAddress, DefaultServerAddress)
	if cfg.WebserverPort, err = envInt(EnvWebserverPort, DefaultWebserverPort, 1); err != nil {
		return nil, err
	}
	if cfg.WebserverPort > 65535 {
		return nil, fmt.Errorf("invalid %s %d, expected a port up to 65535", EnvWebserverPort, cfg.WebserverPort)
	}
	cfg.LoggingLevel = strings.ToUpper(envString(EnvLoggingLevel, DefaultLoggingLevel))
	if cfg.ShowLogColors, err = envBool(EnvShowLogColors, DefaultShowLogColors); err != nil {
		return nil, err
	}
	maxFileSize, err := envInt(EnvMaxFileSize, DefaultMaxFileSize, 1)
	if err != nil {
		return nil, err
	}
	cfg.MaxFileSize = int64(maxFileSize)
	maxUserStorage, err := envInt(EnvMaxUserStorageSize, DefaultMaxUserStorageSize, 0)
	if err != nil {
		return nil, err
	}
	cfg.MaxUserStorageSize = int64(maxUserStorage)
	if cfg.MaxAllowedBackupCount, err = envInt(EnvMaxAllowedBackupCount, DefaultMaxAllowedBackupCount, 0); err != nil {
		return nil, err
	}
	if cfg.MaxPasswordAttempts, err = envInt(EnvMaxPasswordAttempts, DefaultMaxPasswordAttempts, 1); err != nil {
		return nil, err
	}
	if cfg.MaxConnectionsPerUser, err = envInt(EnvMaxConnectionsPerUser, DefaultMaxConnectionsPerUser, 0); err != nil {
		return nil, err
	}
	if cfg.PeriodicTaskHistoryDays, err = envInt(EnvPeriodicTaskHistoryDays, DefaultPeriodicTaskHistoryDays, 1); err != nil {
		return nil, err
	}

	wd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("resolve working directory: %w", err)
	}
	cfg.TempDir = filepath.Join(wd, DefaultTempDirName)

	cfg.FilesDir, err = resolveDir(wd, envString(EnvFilesLocation, ""), DefaultFilesDirName)
	if err != nil {
		return nil, err
	}
	cfg.BackupDir, err = resolveDir(wd, envString(EnvLocalBackupRootLocation, ""), DefaultBackupDirName)
	if err != nil {
		return nil, err
	}

	rawAppURL := envString(EnvAppURL, fmt.Sprintf("http://localhost:%d", cfg.WebserverPort))
	appURL, err := url.Parse(rawAppURL)
	if err != nil {
		return nil, fmt.Errorf("parse %s: %w", EnvAppURL, err)
	}
	if (appURL.Scheme != "http" && appURL.Scheme != "https") || appURL.Host == "" {
		return nil, fmt.Errorf("invalid %s %q, expected http://host[:port] or https://host[:port]", EnvAppURL, rawAppURL)
	}
	cfg.AppURL = appURL
	if appURL.Scheme == "http" && cfg.CookieSecure {
		cfg.Warnings = append(cfg.Warnings, fmt.Sprintf("%s uses http while %s is 1: browsers will not send the secure session cookie over plain http", EnvAppURL, EnvCookieSecure))
	}

	cfg.TrustedProxies, err = parseTrustedProxies(envString(EnvTrustedProxies, ""))
	if err != nil {
		return nil, err
	}

	switch cfg.LoggingLevel {
	case "DEBUG", "INFO", "WARN", "ERROR":
	default:
		return nil, fmt.Errorf("invalid %s %q, expected DEBUG, INFO, WARN or ERROR", EnvLoggingLevel, cfg.LoggingLevel)
	}

	databaseType, databaseDsn, found := strings.Cut(envString(EnvDatabaseDsn, DefaultDatabaseDsn), "://")

	if !found {
		return nil, fmt.Errorf("invalid %s, expected <type>://<dsn>", EnvDatabaseDsn)
	}

	switch databaseType {
	case "sqlite", "postgres", "mysql":
	case "postgresql":
		databaseType = "postgres"
	default:
		return nil, fmt.Errorf("unsupported database type %q in %s, expected sqlite, postgres or mysql", databaseType, EnvDatabaseDsn)
	}

	cfg.DatabaseDsn = databaseDsn
	cfg.DatabaseType = databaseType

	return cfg, nil
}

// Backups are useless without the key that encrypted them, so the server and
// the restore command refuse to run without one.
func (c *Config) RequireBackupEncryptionKey() error {
	if strings.TrimSpace(c.BackupEncryptionKey) == "" {
		return fmt.Errorf("%s must be set to a secret used to encrypt backups", EnvBackupEncryptionKey)
	}
	return nil
}

// AI provider API keys are stored encrypted with it.
func (c *Config) RequireAIEncryptionKey() error {
	if strings.TrimSpace(c.AIEncryptionKey) == "" {
		return fmt.Errorf("%s must be set to a secret used to encrypt AI provider API keys", EnvAIEncryptionKey)
	}
	return nil
}

func (c *Config) WebserverAddr() string {
	return fmt.Sprintf("%s:%d", c.ServerAddress, c.WebserverPort)
}

func (c *Config) AssetURL(asset string) string {
	return strings.TrimRight(c.AppURL.String(), "/") + "/" + strings.Trim(asset, "/")
}

func (c *Config) IsInMemoryDatabase() bool {
	return c.DatabaseType == "sqlite" && c.DatabaseDsn == ":memory:"
}

// Accepts single addresses and CIDR ranges, comma separated.
func parseTrustedProxies(value string) ([]netip.Prefix, error) {
	var prefixes []netip.Prefix
	for entry := range strings.SplitSeq(value, ",") {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if strings.Contains(entry, "/") {
			prefix, err := netip.ParsePrefix(entry)
			if err != nil {
				return nil, fmt.Errorf("parse %s: %w", EnvTrustedProxies, err)
			}
			prefixes = append(prefixes, prefix.Masked())
			continue
		}
		addr, err := netip.ParseAddr(entry)
		if err != nil {
			return nil, fmt.Errorf("parse %s: %w", EnvTrustedProxies, err)
		}
		addr = addr.Unmap()
		prefixes = append(prefixes, netip.PrefixFrom(addr, addr.BitLen()))
	}
	return prefixes, nil
}

// An empty location is the folder next to the executable; a relative one
// resolves against the working directory.
func resolveDir(wd, location, defaultName string) (string, error) {
	if location == "" {
		exe, err := os.Executable()
		if err != nil {
			return "", fmt.Errorf("resolve executable path: %w", err)
		}
		exe, err = filepath.EvalSymlinks(exe)
		if err != nil {
			return "", fmt.Errorf("resolve executable path: %w", err)
		}
		return filepath.Join(filepath.Dir(exe), defaultName), nil
	}

	if filepath.IsAbs(location) {
		return filepath.Clean(location), nil
	}

	return filepath.Join(wd, location), nil
}

func envString(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}

func envInt(key string, def, minimum int) (int, error) {
	v, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(v) == "" {
		return def, nil
	}
	n, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil {
		return 0, fmt.Errorf("invalid %s %q, expected a whole number", key, v)
	}
	if n < minimum {
		return 0, fmt.Errorf("invalid %s %d, expected at least %d", key, n, minimum)
	}
	return n, nil
}

func envBool(key string, def bool) (bool, error) {
	v, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(v) == "" {
		return def, nil
	}

	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true":
		return true, nil
	case "0", "false":
		return false, nil
	}
	return false, fmt.Errorf("invalid %s %q, expected 1 or 0", key, v)
}
