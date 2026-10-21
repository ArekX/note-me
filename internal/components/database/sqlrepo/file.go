package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"noteme/internal/components/repository"
)

func (r *Repository) CreateFileRecord(ctx context.Context, file repository.NewFileRecord) error {
	_, err := r.q.ExecContext(
		ctx,
		`INSERT INTO "file" ("identifier", "name", "user_id", "size", "mime_type", "created_at", "is_ready", "is_public") VALUES (?, ?, ?, ?, ?, ?, false, false)`,
		file.Identifier, file.Name, file.UserId, file.Size, file.MimeType, now(),
	)
	if err != nil {
		return fmt.Errorf("create file record: %w", err)
	}
	return nil
}

// The bytes are already on disk; only an unfinished upload can be marked.
func (r *Repository) MarkFileReady(ctx context.Context, identifier string) error {
	if _, err := r.q.ExecContext(ctx, `UPDATE "file" SET "is_ready" = true WHERE "identifier" = ? AND "is_ready" = false`, identifier); err != nil {
		return fmt.Errorf("mark file ready: %w", err)
	}
	return nil
}

// The original's fileExistsForUser compared with null and always passed
// (0.9.i); nil here means the user has no such file.
func (r *Repository) GetFileUploadForUser(ctx context.Context, userId int, identifier string) (*repository.FileUpload, error) {
	var upload repository.FileUpload
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "size", "is_ready" FROM "file" WHERE "identifier" = ? AND "user_id" = ?`,
		identifier, userId,
	).Scan(&upload.Size, &upload.IsReady)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get file upload: %w", err)
	}
	return &upload, nil
}

func (r *Repository) DeleteFileRecord(ctx context.Context, identifier string) (bool, error) {
	return r.deleteFile(ctx, `DELETE FROM "file" WHERE "identifier" = ?`, identifier)
}

func (r *Repository) DeleteFileByUser(ctx context.Context, userId int, identifier string) (bool, error) {
	return r.deleteFile(ctx, `DELETE FROM "file" WHERE "identifier" = ? AND "user_id" = ?`, identifier, userId)
}

func (r *Repository) deleteFile(ctx context.Context, query string, args ...any) (bool, error) {
	result, err := r.q.ExecContext(ctx, query, args...)
	if err != nil {
		return false, fmt.Errorf("delete file record: %w", err)
	}
	count, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("delete file record: %w", err)
	}
	return count > 0, nil
}

const fileMetaColumns = `"file"."identifier", "file"."name", "file"."mime_type", "file"."size", "file"."is_public", "file"."created_at", "user"."name"`

func scanFileMeta(rows *sql.Rows) (repository.FileMetaRecord, error) {
	var record repository.FileMetaRecord
	err := rows.Scan(&record.Identifier, &record.Name, &record.MimeType, &record.Size, &record.IsPublic, &record.CreatedAt, &record.CreatedBy)
	return record, err
}

const imageMimeCondition = `"file"."mime_type" LIKE 'image/%'`

const documentMimeCondition = `("file"."mime_type" LIKE 'text/%'
	OR "file"."mime_type" IN ('application/pdf', 'application/msword', 'application/rtf', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/json')
	OR "file"."mime_type" LIKE 'application/vnd.openxmlformats-officedocument.%'
	OR "file"."mime_type" LIKE 'application/vnd.oasis.opendocument.%')`

func (r *Repository) FindFiles(ctx context.Context, userId int, filters repository.FileFilters, page int) (*repository.Paged[repository.FileMetaRecord], error) {
	from := `"file" INNER JOIN "user" ON "user"."id" = "file"."user_id" WHERE "file"."is_ready" = true`
	args := []any{}
	if !filters.AllFiles {
		from += ` AND "file"."user_id" = ?`
		args = append(args, userId)
	}
	if filters.Name != "" {
		from += ` AND ` + r.dialect.likeCondition(`"file"."name"`)
		args = append(args, likeContains(filters.Name))
	}
	if filters.AllFiles && filters.Owner != "" {
		from += ` AND (` + r.dialect.likeCondition(`"user"."name"`) + ` OR ` + r.dialect.likeCondition(`"user"."username"`) + `)`
		args = append(args, likeContains(filters.Owner), likeContains(filters.Owner))
	}
	switch filters.Kind {
	case repository.FileKindImage:
		from += ` AND ` + imageMimeCondition
	case repository.FileKindDocument:
		from += ` AND NOT ` + imageMimeCondition + ` AND ` + documentMimeCondition
	case repository.FileKindOther:
		from += ` AND NOT ` + imageMimeCondition + ` AND NOT ` + documentMimeCondition
	}
	switch filters.Visibility {
	case repository.FileVisibilityPublic:
		from += ` AND "file"."is_public" = true`
	case repository.FileVisibilityPrivate:
		from += ` AND "file"."is_public" = false`
	}

	records, err := pageResults(ctx, r.q, pageQuery{
		Columns: fileMetaColumns,
		From:    from,
		OrderBy: `"file"."created_at" DESC, "file"."id" DESC`,
		Args:    args,
		Page:    page,
	}, scanFileMeta)
	if err != nil {
		return nil, fmt.Errorf("find files: %w", err)
	}
	return records, nil
}

// Only finished uploads can be served.
func (r *Repository) GetFileData(ctx context.Context, identifier string) (*repository.FileData, error) {
	var file repository.FileData
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "name", "size", "mime_type", "user_id", "is_public" FROM "file" WHERE "identifier" = ? AND "is_ready" = true`,
		identifier,
	).Scan(&file.Name, &file.Size, &file.MimeType, &file.UserId, &file.IsPublic)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get file data: %w", err)
	}
	return &file, nil
}

// scopeUserId nil updates any user's file (canManageAllFiles).
func (r *Repository) UpdateFileRecord(ctx context.Context, identifier string, isPublic bool, scopeUserId *int) error {
	query := `UPDATE "file" SET "is_public" = ? WHERE "identifier" = ?`
	args := []any{isPublic, identifier}
	if scopeUserId != nil {
		query += ` AND "user_id" = ?`
		args = append(args, *scopeUserId)
	}
	if _, err := r.q.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("update file record: %w", err)
	}
	return nil
}

func (r *Repository) GetFileDetailsForUser(ctx context.Context, userId int, identifiers []string) ([]repository.FileMetaRecord, error) {
	records := []repository.FileMetaRecord{}
	if len(identifiers) == 0 {
		return records, nil
	}

	args := []any{userId}
	for _, identifier := range identifiers {
		args = append(args, identifier)
	}
	rows, err := r.q.QueryContext(
		ctx,
		`SELECT `+fileMetaColumns+` FROM "file" INNER JOIN "user" ON "user"."id" = "file"."user_id"
		 WHERE "file"."is_ready" = true AND "file"."user_id" = ? AND "file"."identifier" IN (`+placeholders(len(identifiers))+`)
		 ORDER BY "file"."id"`,
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("get file details: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		record, err := scanFileMeta(rows)
		if err != nil {
			return nil, fmt.Errorf("scan file details: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read file details: %w", err)
	}
	return records, nil
}

func (r *Repository) UpdateMultipleFiles(ctx context.Context, userId int, identifiers []string, isPublic *bool) error {
	if isPublic == nil || len(identifiers) == 0 {
		return nil
	}

	args := []any{*isPublic, userId}
	for _, identifier := range identifiers {
		args = append(args, identifier)
	}
	_, err := r.q.ExecContext(
		ctx,
		`UPDATE "file" SET "is_public" = ? WHERE "user_id" = ? AND "identifier" IN (`+placeholders(len(identifiers))+`)`,
		args...,
	)
	if err != nil {
		return fmt.Errorf("update multiple files: %w", err)
	}
	return nil
}

func (r *Repository) GetUserFileCount(ctx context.Context, userId int) (int, error) {
	var count int
	err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "file" WHERE "user_id" = ? AND "is_ready" = true`, userId).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get user file count: %w", err)
	}
	return count, nil
}

func (r *Repository) GetUserStorageSize(ctx context.Context, userId int) (int64, error) {
	var size int64
	err := r.q.QueryRowContext(ctx, `SELECT COALESCE(SUM("size"), 0) FROM "file" WHERE "user_id" = ?`, userId).Scan(&size)
	if err != nil {
		return 0, fmt.Errorf("get user storage size: %w", err)
	}
	return size, nil
}

func (r *Repository) DeleteStaleUploads(ctx context.Context, createdBefore int64) error {
	if _, err := r.q.ExecContext(ctx, `DELETE FROM "file" WHERE "is_ready" = false AND "created_at" < ?`, createdBefore); err != nil {
		return fmt.Errorf("delete stale uploads: %w", err)
	}
	return nil
}
