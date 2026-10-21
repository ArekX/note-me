package backups

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"

	"noteme/internal/components/storage"
)

// What reaches an administrator is the fixed text of these; the cause is
// wrapped behind it for the log.
var (
	ErrNotFound   = errors.New("Backup not found")
	ErrInProgress = errors.New("backup is in progress")
	ErrSettings   = errors.New("backup target settings are invalid")
	ErrSetup      = errors.New("backup target could not be set up")
	ErrCreate     = errors.New("backup could not be created")
	ErrSave       = errors.New("backup could not be saved to the target")
	ErrList       = errors.New("backups could not be listed")
	ErrOpen       = errors.New("backup could not be opened")
	ErrDelete     = errors.New("backup could not be deleted")
)

const (
	TypeLocal = "local"
	TypeS3    = "s3"
)

type Item struct {
	Identifier string
	Name       string
	CreatedAt  int64
	Size       int64
}

type Target interface {
	Setup(ctx context.Context) error
	// Copies the archive at source into the target under identifier.
	Save(ctx context.Context, identifier, source string) (Item, error)
	Delete(ctx context.Context, identifier string) error
	Open(ctx context.Context, identifier string) (io.ReadCloser, int64, error)
	// Newest first.
	List(ctx context.Context) ([]Item, error)
}

type LocalSettings struct {
	Location string `json:"location"`
}

type S3Credentials struct {
	Type            string `json:"type"`
	AccessKeyID     string `json:"access_key_id,omitempty"`
	SecretAccessKey string `json:"secret_access_key,omitempty"`
}

type S3Settings struct {
	Bucket      string        `json:"bucket"`
	Region      string        `json:"region"`
	Prefix      string        `json:"prefix"`
	Credentials S3Credentials `json:"credentials"`
}

var identifierPattern = regexp.MustCompile(`^[a-zA-Z0-9.-]+$`)

// backupNameSchema of the original, which also let "." and ".." through.
func ValidIdentifier(identifier string) bool {
	return identifierPattern.MatchString(identifier) && identifier != "." && identifier != ".."
}

func ValidLocalLocation(location string) bool {
	if location == "" || strings.HasPrefix(location, "/") {
		return false
	}
	for _, segment := range strings.Split(location, "/") {
		if !storage.ValidName(segment) {
			return false
		}
	}
	return true
}

func (b *Backups) NewTarget(targetType, settings string) (Target, error) {
	return b.newTarget(targetType, settings)
}

func newTarget(root, targetType, settings string) (Target, error) {
	switch targetType {
	case TypeLocal:
		var local LocalSettings
		if err := json.Unmarshal([]byte(settings), &local); err != nil {
			return nil, fmt.Errorf("%w: decode local backup settings: %w", ErrSettings, err)
		}
		if !ValidLocalLocation(local.Location) {
			return nil, fmt.Errorf("%w: location %q is not a relative path under the backup root", ErrSettings, local.Location)
		}
		return newLocalTarget(root, local.Location)
	case TypeS3:
		var s3Settings S3Settings
		if err := json.Unmarshal([]byte(settings), &s3Settings); err != nil {
			return nil, fmt.Errorf("%w: decode s3 backup settings: %w", ErrSettings, err)
		}
		return &s3Target{settings: s3Settings}, nil
	}
	return nil, fmt.Errorf("%w: unknown backup target type %q", ErrSettings, targetType)
}
