package sqlrepo

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"noteme/internal/components/repository"
	"noteme/internal/encryption"
)

func (r *Repository) UserExists(ctx context.Context, username string) (bool, error) {
	id, err := r.GetUserIdByUsername(ctx, username)
	return id != 0, err
}

// 0 when there is no such user.
func (r *Repository) GetUserIdByUsername(ctx context.Context, username string) (int, error) {
	var id int
	err := r.q.QueryRowContext(ctx, `SELECT "id" FROM "user" WHERE "username" = ?`, username).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("get user by username: %w", err)
	}
	return id, nil
}

const userLoginColumns = `"id", "name", "username", "password", "timezone", "role",
	"onboarding_state", "is_password_reset_required", "preferred_editor", "profile_picture",
	"created_at", "updated_at"`

func scanUserLogin(row *sql.Row) (*repository.UserLoginRecord, string, error) {
	var (
		record        repository.UserLoginRecord
		passwordHash  string
		timezone      sql.NullString
		resetRequired sql.NullBool
		onboarding    string
		picture       sql.NullString
	)

	err := row.Scan(
		&record.Id,
		&record.Name,
		&record.Username,
		&passwordHash,
		&timezone,
		&record.Role,
		&onboarding,
		&resetRequired,
		&record.PreferredEditor,
		&picture,
		&record.CreatedAt,
		&record.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, "", nil
	}

	if err != nil {
		return nil, "", err
	}

	record.Timezone = timezone.String
	record.IsPasswordResetRequired = resetRequired.Bool
	record.ProfilePicture = picture.String

	if err := json.Unmarshal([]byte(onboarding), &record.OnboardingState); err != nil {
		return nil, "", fmt.Errorf("decode onboarding state of user %d: %w", record.Id, err)
	}
	if record.OnboardingState == nil {
		record.OnboardingState = map[string]bool{}
	}

	return &record, passwordHash, nil
}

// The password is checked even for an unknown username, so both answers
// take the same time.
func (r *Repository) GetUserByLogin(ctx context.Context, username, password string) (*repository.UserLoginRecord, error) {
	record, passwordHash, err := scanUserLogin(r.q.QueryRowContext(
		ctx,
		`SELECT `+userLoginColumns+` FROM "user" WHERE "username" = ?`,
		username,
	))

	if err != nil {
		return nil, fmt.Errorf("get user by login: %w", err)
	}

	if !encryption.VerifyPassword(passwordHash, password) || record == nil {
		return nil, nil
	}

	return record, nil
}

func (r *Repository) GetUserById(ctx context.Context, id int) (*repository.UserLoginRecord, error) {
	record, _, err := scanUserLogin(r.q.QueryRowContext(
		ctx,
		`SELECT `+userLoginColumns+` FROM "user" WHERE "id" = ?`,
		id,
	))

	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	return record, nil
}

func (r *Repository) CreateUserRecord(ctx context.Context, user repository.NewUserRecord) (int, error) {
	hash, err := encryption.HashPassword(user.Password)
	if err != nil {
		return 0, fmt.Errorf("hash password: %w", err)
	}

	encryptionKey, err := encryption.GenerateNoteEncryptionKey(user.Password)
	if err != nil {
		return 0, fmt.Errorf("generate note encryption key: %w", err)
	}

	createdAt := now()

	id, err := r.insert(
		ctx,
		`INSERT INTO "user" ("name", "username", "password", "role", "timezone",
			"is_password_reset_required", "encryption_key", "created_at", "updated_at")
		 VALUES (?, ?, ?, ?, ?, true, ?, ?, ?)`,
		user.Name,
		user.Username,
		hash,
		user.Role,
		user.Timezone,
		encryptionKey,
		createdAt,
		createdAt,
	)
	if err != nil {
		return 0, fmt.Errorf("create user: %w", err)
	}

	return int(id), nil
}

func (r *Repository) UpdateUserProfile(ctx context.Context, userId int, data repository.UserProfileData) (bool, error) {
	sets := []string{`"updated_at" = ?`}
	args := []any{now()}

	if data.Name != "" {
		sets = append(sets, `"name" = ?`)
		args = append(args, data.Name)
	}

	if data.Timezone != "" {
		sets = append(sets, `"timezone" = ?`)
		args = append(args, data.Timezone)
	}

	if data.PreferredEditor != "" {
		sets = append(sets, `"preferred_editor" = ?`)
		args = append(args, data.PreferredEditor)
	}

	if data.OldPassword != "" && data.NewPassword != "" {
		var passwordHash, encryptionKey string
		err := r.q.QueryRowContext(
			ctx,
			`SELECT "password", "encryption_key" FROM "user" WHERE "id" = ?`,
			userId,
		).Scan(&passwordHash, &encryptionKey)
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		if err != nil {
			return false, fmt.Errorf("get user password: %w", err)
		}

		if !encryption.VerifyPassword(passwordHash, data.OldPassword) {
			return false, repository.ErrIncorrectOldPassword
		}

		hash, err := encryption.HashPassword(data.NewPassword)
		if err != nil {
			return false, fmt.Errorf("hash password: %w", err)
		}

		newEncryptionKey, err := encryption.ReEncryptNoteKey(data.OldPassword, data.NewPassword, encryptionKey)
		if err != nil {
			return false, fmt.Errorf("re-encrypt note encryption key: %w", err)
		}

		sets = append(sets, `"password" = ?`, `"encryption_key" = ?`, `"is_password_reset_required" = false`)
		args = append(args, hash, newEncryptionKey)
	}

	args = append(args, userId)

	result, err := r.q.ExecContext(
		ctx,
		`UPDATE "user" SET `+strings.Join(sets, ", ")+` WHERE "id" = ?`,
		args...,
	)
	if err != nil {
		return false, fmt.Errorf("update user profile: %w", err)
	}

	updated, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("update user profile: %w", err)
	}

	return updated > 0, nil
}

func (r *Repository) ValidateUserPassword(ctx context.Context, userId int, password string) (bool, error) {
	var passwordHash string
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "password" FROM "user" WHERE "id" = ?`,
		userId,
	).Scan(&passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("validate user password: %w", err)
	}

	return encryption.VerifyPassword(passwordHash, password), nil
}

func (r *Repository) GetNoteEncryptionKey(ctx context.Context, userId int) (string, error) {
	var key string
	err := r.q.QueryRowContext(
		ctx,
		`SELECT "encryption_key" FROM "user" WHERE "id" = ?`,
		userId,
	).Scan(&key)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("get note encryption key: %w", err)
	}

	return key, nil
}

// Merges the given keys into the stored state, so other keys and other tabs'
// changes are kept (the original replaced the whole object).
func (r *Repository) UpdateOnboardingState(ctx context.Context, userId int, changes map[string]bool) (map[string]bool, error) {
	patch, err := json.Marshal(changes)
	if err != nil {
		return nil, err
	}
	var merged string
	err = r.runInTransaction(ctx, func(tx *Repository) error {
		_, err := tx.q.ExecContext(ctx,
			`UPDATE "user" SET "onboarding_state" = `+fmt.Sprintf(r.dialect.jsonMerge, `COALESCE(NULLIF("onboarding_state", ''), '{}')`)+`, "updated_at" = ?
			 WHERE "id" = ?`,
			string(patch), now(), userId)
		if err != nil {
			return err
		}
		return tx.q.QueryRowContext(ctx,
			`SELECT "onboarding_state" FROM "user" WHERE "id" = ?`, userId).Scan(&merged)
	})
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("update onboarding state: %w", err)
	}
	state := map[string]bool{}
	if err := json.Unmarshal([]byte(merged), &state); err != nil {
		return nil, fmt.Errorf("decode onboarding state: %w", err)
	}
	return state, nil
}

func (r *Repository) UpdateProfilePicture(ctx context.Context, userId int, identifier string) error {
	_, err := r.q.ExecContext(ctx,
		`UPDATE "user" SET "profile_picture" = ?, "updated_at" = ? WHERE "id" = ?`,
		sql.NullString{String: identifier, Valid: identifier != ""}, now(), userId)
	if err != nil {
		return fmt.Errorf("update profile picture: %w", err)
	}
	return nil
}

func (r *Repository) ClearProfilePicture(ctx context.Context, identifier string) (bool, error) {
	result, err := r.q.ExecContext(ctx,
		`UPDATE "user" SET "profile_picture" = NULL, "updated_at" = ? WHERE "profile_picture" = ?`,
		now(), identifier)
	if err != nil {
		return false, fmt.Errorf("clear profile picture: %w", err)
	}
	cleared, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("clear profile picture: %w", err)
	}
	return cleared > 0, nil
}
