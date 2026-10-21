package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"noteme/internal/components/repository"
)

const passkeyCredentialColumns = `"user_passkey"."credential_identifier", "user_passkey"."public_key", "user_passkey"."counter",
	"user_passkey"."is_backup_eligible", "user_passkey"."is_backed_up", "user_passkey"."transports"`

func passkeyCredentialTargets(c *repository.PasskeyCredential) []any {
	return []any{&c.CredentialId, &c.PublicKey, &c.Counter, &c.IsBackupEligible, &c.IsBackedUp, &c.Transports}
}

// Empty when the user has not registered a passkey yet.
func (r *Repository) GetPasskeyUserHandle(ctx context.Context, userId int) (string, error) {
	var handle sql.NullString
	err := r.q.QueryRowContext(ctx, `SELECT "passkey_user_handle" FROM "user" WHERE "id" = ?`, userId).Scan(&handle)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("get passkey user handle: %w", err)
	}
	return handle.String, nil
}

// Keeps an existing handle, so concurrent first registrations agree on one.
func (r *Repository) SetPasskeyUserHandle(ctx context.Context, userId int, handle string) error {
	_, err := r.q.ExecContext(ctx,
		`UPDATE "user" SET "passkey_user_handle" = ? WHERE "id" = ? AND "passkey_user_handle" IS NULL`,
		handle, userId)
	if err != nil {
		return fmt.Errorf("set passkey user handle: %w", err)
	}
	return nil
}

func (r *Repository) GetUserPasskeyCredentials(ctx context.Context, userId int) ([]repository.PasskeyCredential, error) {
	rows, err := r.q.QueryContext(ctx,
		`SELECT `+passkeyCredentialColumns+` FROM "user_passkey" WHERE "user_id" = ? ORDER BY "id"`, userId)
	if err != nil {
		return nil, fmt.Errorf("get user passkey credentials: %w", err)
	}
	defer rows.Close()

	credentials := []repository.PasskeyCredential{}
	for rows.Next() {
		var credential repository.PasskeyCredential
		if err := rows.Scan(passkeyCredentialTargets(&credential)...); err != nil {
			return nil, err
		}
		credentials = append(credentials, credential)
	}
	return credentials, rows.Err()
}

func (r *Repository) GetPasskeyLogin(ctx context.Context, credentialId string) (*repository.PasskeyLoginRecord, error) {
	var record repository.PasskeyLoginRecord
	var handle sql.NullString
	targets := append(passkeyCredentialTargets(&record.PasskeyCredential), &record.UserId, &handle)
	err := r.q.QueryRowContext(ctx,
		`SELECT `+passkeyCredentialColumns+`, "user"."id", "user"."passkey_user_handle"
		 FROM "user_passkey" INNER JOIN "user" ON "user"."id" = "user_passkey"."user_id"
		 WHERE "user_passkey"."credential_identifier" = ?`,
		credentialId).Scan(targets...)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get passkey login: %w", err)
	}
	record.UserHandle = handle.String
	return &record, nil
}

// Reports false when the credential is already registered to any account.
func (r *Repository) CreatePasskey(ctx context.Context, record repository.NewPasskeyRecord) (bool, error) {
	timestamp := now()
	created, err := r.insertIfAbsent(ctx,
		`INSERT INTO "user_passkey" ("name", "user_id", "credential_identifier", "public_key", "counter",
			"is_backup_eligible", "is_backed_up", "transports", "created_at", "last_used_at")
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, []string{"credential_identifier"},
		record.Name, record.UserId, record.CredentialId, record.PublicKey, record.Counter,
		record.IsBackupEligible, record.IsBackedUp, record.Transports, timestamp, timestamp)
	if err != nil {
		return false, fmt.Errorf("create passkey: %w", err)
	}
	return created, nil
}

func (r *Repository) UpdatePasskeyAfterUse(ctx context.Context, credentialId string, counter int64, isBackedUp bool) error {
	_, err := r.q.ExecContext(ctx,
		`UPDATE "user_passkey" SET "counter" = ?, "is_backed_up" = ?, "last_used_at" = ? WHERE "credential_identifier" = ?`,
		counter, isBackedUp, now(), credentialId)
	if err != nil {
		return fmt.Errorf("update passkey after use: %w", err)
	}
	return nil
}

func (r *Repository) FindUserPasskeys(ctx context.Context, userId, page int) (*repository.Paged[repository.UserPasskeyRecord], error) {
	records, err := pageResults(ctx, r.q, pageQuery{
		Columns: `"id", "name", "last_used_at", "created_at", "transports"`,
		From:    `"user_passkey" WHERE "user_id" = ?`,
		OrderBy: `"created_at" DESC, "id" DESC`,
		Args:    []any{userId},
		Page:    page,
	}, func(rows *sql.Rows) (repository.UserPasskeyRecord, error) {
		var record repository.UserPasskeyRecord
		err := rows.Scan(&record.Id, &record.Name, &record.LastUsedAt, &record.CreatedAt, &record.Transports)
		return record, err
	})
	if err != nil {
		return nil, fmt.Errorf("find user passkeys: %w", err)
	}
	return records, nil
}

func (r *Repository) UpdatePasskeyName(ctx context.Context, id, userId int, name string) (bool, error) {
	result, err := r.q.ExecContext(ctx,
		`UPDATE "user_passkey" SET "name" = ? WHERE "id" = ? AND "user_id" = ?`, name, id, userId)
	if err != nil {
		return false, fmt.Errorf("update passkey name: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) DeletePasskey(ctx context.Context, id, userId int) (bool, error) {
	result, err := r.q.ExecContext(ctx,
		`DELETE FROM "user_passkey" WHERE "id" = ? AND "user_id" = ?`, id, userId)
	if err != nil {
		return false, fmt.Errorf("delete passkey: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) DeleteUserPasskeys(ctx context.Context, userId int) error {
	if _, err := r.q.ExecContext(ctx, `DELETE FROM "user_passkey" WHERE "user_id" = ?`, userId); err != nil {
		return fmt.Errorf("delete user passkeys: %w", err)
	}
	return nil
}
