package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"noteme/internal/components/repository"
	"noteme/internal/encryption"
)

// A new password always comes with a new note key: protected notes encrypted
// with the old one can no longer be opened (0.9.t), and the user has to
// change the password at the next login.
func passwordColumns(password string) ([]string, []any, error) {
	hash, err := encryption.HashPassword(password)
	if err != nil {
		return nil, nil, fmt.Errorf("hash password: %w", err)
	}
	key, err := encryption.GenerateNoteEncryptionKey(password)
	if err != nil {
		return nil, nil, fmt.Errorf("generate note encryption key: %w", err)
	}
	return []string{`"password" = ?`, `"encryption_key" = ?`, `"is_password_reset_required" = true`},
		[]any{hash, key}, nil
}

// Reports false when the user does not exist.
func (r *Repository) UpdateUserRecord(ctx context.Context, id int, update repository.UserUpdate) (bool, error) {
	sets := []string{`"name" = ?`, `"role" = ?`, `"timezone" = ?`, `"updated_at" = ?`}
	args := []any{update.Name, update.Role, update.Timezone, now()}
	if update.NewPassword != "" {
		passwordSets, passwordArgs, err := passwordColumns(update.NewPassword)
		if err != nil {
			return false, err
		}
		sets = append(sets, passwordSets...)
		args = append(args, passwordArgs...)
	}
	args = append(args, id)

	result, err := r.q.ExecContext(ctx, `UPDATE "user" SET `+strings.Join(sets, ", ")+` WHERE "id" = ?`, args...)
	if err != nil {
		return false, fmt.Errorf("update user: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) FindUsers(ctx context.Context, filters repository.UserFilters, page int) (*repository.Paged[repository.UserRecord], error) {
	from := `"user" WHERE 1 = 1`
	args := []any{}
	if filters.Name != "" {
		from += ` AND ` + r.dialect.likeCondition(`"name"`)
		args = append(args, likeContains(filters.Name))
	}
	if filters.Username != "" {
		from += ` AND ` + r.dialect.likeCondition(`"username"`)
		args = append(args, likeContains(filters.Username))
	}
	if filters.Role != "" {
		from += ` AND "role" = ?`
		args = append(args, filters.Role)
	}

	records, err := pageResults(ctx, r.q, pageQuery{
		Columns: `"id", "name", "username", "timezone", "role", "is_password_reset_required", "created_at", "updated_at"`,
		From:    from,
		OrderBy: `"id"`,
		Args:    args,
		Page:    page,
	}, func(rows *sql.Rows) (repository.UserRecord, error) {
		var record repository.UserRecord
		var timezone sql.NullString
		var resetRequired sql.NullBool
		err := rows.Scan(&record.Id, &record.Name, &record.Username, &timezone, &record.Role, &resetRequired, &record.CreatedAt, &record.UpdatedAt)
		record.Timezone = timezone.String
		record.IsPasswordResetRequired = resetRequired.Bool
		return record, err
	})
	if err != nil {
		return nil, fmt.Errorf("find users: %w", err)
	}
	return records, nil
}

func (r *Repository) CountUsersWithRole(ctx context.Context, role string) (int, error) {
	var count int
	if err := r.q.QueryRowContext(ctx, `SELECT COUNT(*) FROM "user" WHERE "role" = ?`, role).Scan(&count); err != nil {
		return 0, fmt.Errorf("count users: %w", err)
	}
	return count, nil
}

// Everything the user owns goes: notes with their history, shares, reminders
// and the notifications they caused, groups, file records, notifications,
// sessions and passkeys. Tags are shared by everyone, so the ones they made
// stay with the notes that use them and change owner.
func (r *Repository) DeleteUserRecord(ctx context.Context, id int, tagOwnerId int) (*repository.DeletedUser, error) {
	var deleted *repository.DeletedUser
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		var exists int
		err := tx.q.QueryRowContext(ctx, `SELECT 1 FROM "user" WHERE "id" = ?`, id).Scan(&exists)
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}

		noteIds, err := queryIds(ctx, tx.q, `SELECT "id" FROM "note" WHERE "user_id" = ? ORDER BY "id"`, id)
		if err != nil {
			return err
		}
		if err := tx.FullyDeleteNotes(ctx, noteIds); err != nil {
			return err
		}

		rows, err := tx.q.QueryContext(ctx, `SELECT "identifier" FROM "file" WHERE "user_id" = ? ORDER BY "id"`, id)
		if err != nil {
			return err
		}
		deleted = &repository.DeletedUser{FileIdentifiers: []string{}}
		for rows.Next() {
			var identifier string
			if err := rows.Scan(&identifier); err != nil {
				rows.Close()
				return err
			}
			deleted.FileIdentifiers = append(deleted.FileIdentifiers, identifier)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}

		// Groups reference each other, so the links go before the rows.
		for _, statement := range []string{
			`DELETE FROM "note_reminder" WHERE "user_id" = ?`,
			`DELETE FROM "note_share_user" WHERE "user_id" = ?`,
			`DELETE FROM "group_note" WHERE "user_id" = ?`,
			`UPDATE "group" SET "parent_id" = NULL WHERE "user_id" = ?`,
			`DELETE FROM "group" WHERE "user_id" = ?`,
			`DELETE FROM "file" WHERE "user_id" = ?`,
			`DELETE FROM "notification" WHERE "user_id" = ?`,
			`DELETE FROM "session" WHERE "user_id" = ?`,
			`DELETE FROM "user_passkey" WHERE "user_id" = ?`,
			`DELETE FROM "ai_message" WHERE "conversation_id" IN (SELECT "id" FROM "ai_conversation" WHERE "user_id" = ?)`,
			`DELETE FROM "ai_conversation" WHERE "user_id" = ?`,
			`DELETE FROM "ai_user_access" WHERE "user_id" = ?`,
			`DELETE FROM "mcp_token" WHERE "client_id" IN (SELECT "id" FROM "mcp_client" WHERE "user_id" = ?)`,
			`DELETE FROM "mcp_client" WHERE "user_id" = ?`,
			`DELETE FROM "note_tag" WHERE "user_id" = ? AND "id" NOT IN (SELECT "tag_id" FROM "note_tag_note")`,
		} {
			if _, err := tx.q.ExecContext(ctx, statement, id); err != nil {
				return err
			}
		}
		if _, err := tx.q.ExecContext(ctx, `UPDATE "note_tag" SET "user_id" = ? WHERE "user_id" = ?`, tagOwnerId, id); err != nil {
			return err
		}
		_, err = tx.q.ExecContext(ctx, `DELETE FROM "user" WHERE "id" = ?`, id)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("delete user: %w", err)
	}
	return deleted, nil
}
