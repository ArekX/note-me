package repository

import "context"

type NewFileRecord struct {
	Identifier string
	Name       string
	UserId     int
	MimeType   string
	Size       int64
}

type FileUpload struct {
	Size    int64
	IsReady bool
}

type FileMetaRecord struct {
	Identifier string
	Name       string
	MimeType   string
	Size       int64
	IsPublic   bool
	CreatedAt  int64
	CreatedBy  string
}

type FileKind string

const (
	FileKindImage    FileKind = "image"
	FileKindDocument FileKind = "document"
	FileKindOther    FileKind = "other"
)

type FileVisibility string

const (
	FileVisibilityPublic  FileVisibility = "public"
	FileVisibilityPrivate FileVisibility = "private"
)

// Empty fields do not filter. Owner matches the owner's name or username
// and only applies together with AllFiles.
type FileFilters struct {
	Name       string
	AllFiles   bool
	Owner      string
	Kind       FileKind
	Visibility FileVisibility
}

type FileData struct {
	Name     string
	Size     int64
	MimeType string
	UserId   int
	IsPublic bool
}

type Files interface {
	CreateFileRecord(ctx context.Context, file NewFileRecord) error
	MarkFileReady(ctx context.Context, identifier string) error
	GetFileUploadForUser(ctx context.Context, userId int, identifier string) (*FileUpload, error)
	DeleteFileRecord(ctx context.Context, identifier string) (bool, error)
	DeleteFileByUser(ctx context.Context, userId int, identifier string) (bool, error)
	FindFiles(ctx context.Context, userId int, filters FileFilters, page int) (*Paged[FileMetaRecord], error)
	GetFileData(ctx context.Context, identifier string) (*FileData, error)
	UpdateFileRecord(ctx context.Context, identifier string, isPublic bool, scopeUserId *int) error
	GetFileDetailsForUser(ctx context.Context, userId int, identifiers []string) ([]FileMetaRecord, error)
	UpdateMultipleFiles(ctx context.Context, userId int, identifiers []string, isPublic *bool) error
	GetUserFileCount(ctx context.Context, userId int) (int, error)
	// Bytes of every file record of the user, uploads in progress included.
	GetUserStorageSize(ctx context.Context, userId int) (int64, error)
	// Removes records of uploads that never finished; their temp files are
	// cleaned by age too.
	DeleteStaleUploads(ctx context.Context, createdBefore int64) error
}
