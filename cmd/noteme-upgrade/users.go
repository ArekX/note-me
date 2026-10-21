package main

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"noteme/internal/components/database/drivers"
	"noteme/internal/components/database/sqlrepo"
	"noteme/internal/components/storage"
	"noteme/internal/encryption"
)

const maxPasswordAttempts = 3

type legacyUser struct {
	id            int
	name          string
	username      string
	passwordHash  string
	encryptionKey string
}

func (u legacyUser) hasLegacyKey() bool {
	return !strings.HasPrefix(u.encryptionKey, "v2:")
}

func (u legacyUser) hasLegacyPassword() bool {
	return !encryption.IsPasswordHash(u.passwordHash)
}

type encryptedRow struct {
	table string
	id    int
	value string
}

type userEncryptionResult struct {
	converted  int
	unreadable int
}

// Tags of a deleted user that other notes still use go to the first administrator.
func removeDeletedUsers(ctx context.Context, db drivers.DB, filesDir string, out io.Writer) error {
	deleted, err := queryInts(ctx, db, `SELECT "id" FROM "user" WHERE "is_deleted" = true ORDER BY "id"`)
	if err != nil {
		return fmt.Errorf("read deleted users: %w", err)
	}
	if len(deleted) == 0 {
		return nil
	}
	owners, err := queryInts(ctx, db, `SELECT "id" FROM "user" WHERE "is_deleted" = false ORDER BY CASE WHEN "role" = 'admin' THEN 0 ELSE 1 END, "id" LIMIT 1`)
	if err != nil {
		return fmt.Errorf("read users: %w", err)
	}
	if len(owners) == 0 {
		return errors.New("every user is deleted; add a user before the upgrade so tags still in use have an owner")
	}

	repo := sqlrepo.New(db, "sqlite")
	files := 0
	for _, id := range deleted {
		result, err := repo.UserManagement().DeleteUserRecord(ctx, id, owners[0])
		if err != nil {
			return fmt.Errorf("remove deleted user %d: %w", id, err)
		}
		if result == nil {
			continue
		}
		for _, identifier := range result.FileIdentifiers {
			if !storage.ValidName(identifier) {
				continue
			}
			if err := os.Remove(filepath.Join(filesDir, identifier)); err != nil && !errors.Is(err, os.ErrNotExist) {
				return fmt.Errorf("remove file %s: %w", identifier, err)
			}
			files++
		}
	}
	fmt.Fprintf(out, "Removed %d deleted users with %d of their files.\n", len(deleted), files)
	return nil
}

func queryInts(ctx context.Context, db drivers.DB, query string) ([]int, error) {
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var values []int
	for rows.Next() {
		var value int
		if err := rows.Scan(&value); err != nil {
			return nil, err
		}
		values = append(values, value)
	}
	return values, rows.Err()
}

// bcrypt hashes become Argon2id and old note keys are re-encrypted; both
// need the user's password, so each user is asked once.
func upgradeUsers(ctx context.Context, db drivers.DB, in *bufio.Reader, out io.Writer) error {
	users, err := legacyUsers(ctx, db)
	if err != nil {
		return err
	}
	if len(users) == 0 {
		fmt.Fprintln(out, "Passwords and note encryption are already in the new format.")
		return nil
	}

	fmt.Fprintf(out, "%d users have a password hash or a note encryption key in the old format.\n", len(users))
	fmt.Fprintln(out, "Enter each user's password to convert them (input is visible). Leaving it empty skips the user:")
	fmt.Fprintln(out, "the password is then cleared and an administrator must set a new one in Settings → Users.")

	skipped := 0
	for _, user := range users {
		notes, history, err := countLegacyRows(ctx, db, user.id)
		if err != nil {
			return err
		}
		fmt.Fprintf(out, "\nUser %q (%s): %d protected notes, %d protected history entries.\n", user.username, user.name, notes, history)
		if user.passwordHash == "" {
			fmt.Fprintln(out, "The password was cleared by an earlier run; an administrator must set a new one in Settings → Users.")
			skipped++
			continue
		}

		password, err := askPassword(in, out, user)
		if err != nil {
			return err
		}
		if password == "" {
			if err := clearPassword(ctx, db, user.id); err != nil {
				return err
			}
			fmt.Fprintln(out, "Skipped: the password was cleared, an administrator must set a new one in Settings → Users.")
			if user.hasLegacyKey() && notes+history > 0 {
				fmt.Fprintln(out, "The protected notes of this user cannot be converted without the password and stay unreadable.")
			}
			skipped++
			continue
		}

		if user.hasLegacyPassword() {
			if err := rehashPassword(ctx, db, user.id, password); err != nil {
				return fmt.Errorf("re-hash password of %s: %w", user.username, err)
			}
			fmt.Fprintln(out, "Re-hashed the password.")
		}
		if !user.hasLegacyKey() {
			continue
		}
		result, err := upgradeUserEncryption(ctx, db, user, password)
		if errors.Is(err, errLegacyKey) {
			fmt.Fprintf(out, "%v; the protected notes of this user stay unreadable.\n", err)
			continue
		}
		if err != nil {
			return fmt.Errorf("re-encrypt user %s: %w", user.username, err)
		}
		fmt.Fprintf(out, "Re-encrypted the note key and %d protected entries.\n", result.converted)
		if result.unreadable > 0 {
			fmt.Fprintf(out, "%d protected entries could not be decrypted with the user's key (older than an admin password reset?) and were left unchanged.\n", result.unreadable)
		}
	}

	if skipped > 0 {
		fmt.Fprintf(out, "\n%d users were skipped; an administrator must set their password in Settings → Users.\n", skipped)
	}
	return nil
}

func legacyUsers(ctx context.Context, db drivers.DB) ([]legacyUser, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT "id", "name", "username", "password", "encryption_key" FROM "user"
		 WHERE "password" NOT LIKE '$argon2id$%' OR "encryption_key" NOT LIKE 'v2:%'
		 ORDER BY "id"`)
	if err != nil {
		return nil, fmt.Errorf("read users: %w", err)
	}
	defer rows.Close()

	var users []legacyUser
	for rows.Next() {
		var user legacyUser
		if err := rows.Scan(&user.id, &user.name, &user.username, &user.passwordHash, &user.encryptionKey); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

const (
	legacyNotesQuery = `SELECT 'note', "id", "note" FROM "note"
		WHERE "user_id" = ? AND "is_encrypted" = true AND "note" != '' AND "note" NOT LIKE 'v2:%'`
	legacyHistoryQuery = `SELECT 'note_history', h."id", h."note" FROM "note_history" h
		INNER JOIN "note" n ON n."id" = h."note_id"
		WHERE n."user_id" = ? AND h."is_encrypted" = true AND h."note" != '' AND h."note" NOT LIKE 'v2:%'`
)

func countLegacyRows(ctx context.Context, db drivers.DB, userId int) (notes, history int, err error) {
	err = db.QueryRowContext(ctx,
		`SELECT (SELECT count(*) FROM (`+legacyNotesQuery+`)), (SELECT count(*) FROM (`+legacyHistoryQuery+`))`,
		userId, userId,
	).Scan(&notes, &history)
	if err != nil {
		return 0, 0, fmt.Errorf("count protected notes: %w", err)
	}
	return notes, history, nil
}

func askPassword(in *bufio.Reader, out io.Writer, user legacyUser) (string, error) {
	for range maxPasswordAttempts {
		fmt.Fprint(out, "Password (empty to skip): ")

		line, err := in.ReadString('\n')
		if err != nil && !errors.Is(err, io.EOF) {
			return "", fmt.Errorf("read password: %w", err)
		}
		atEOF := err != nil
		if atEOF {
			fmt.Fprintln(out)
		}

		password := strings.TrimRight(line, "\r\n")
		if password == "" {
			return "", nil
		}
		if verifyPassword(user.passwordHash, password) {
			return password, nil
		}

		fmt.Fprintln(out, "Incorrect password.")
		if atEOF {
			return "", nil
		}
	}
	return "", nil
}

func verifyPassword(hash, password string) bool {
	if encryption.IsPasswordHash(hash) {
		return encryption.VerifyPassword(hash, password)
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func rehashPassword(ctx context.Context, db drivers.DB, userId int, password string) error {
	hash, err := encryption.HashPassword(password)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, `UPDATE "user" SET "password" = ? WHERE "id" = ?`, hash, userId)
	return err
}

// An empty hash never verifies, so the account is locked until an
// administrator sets a password.
func clearPassword(ctx context.Context, db drivers.DB, userId int) error {
	if _, err := db.ExecContext(ctx, `UPDATE "user" SET "password" = '', "is_password_reset_required" = true WHERE "id" = ?`, userId); err != nil {
		return fmt.Errorf("clear password: %w", err)
	}
	return nil
}

var errLegacyKey = errors.New("the old note key could not be decrypted with this password")

func upgradeUserEncryption(ctx context.Context, db drivers.DB, user legacyUser, password string) (userEncryptionResult, error) {
	var result userEncryptionResult

	legacyKey, err := legacyDecrypt(user.encryptionKey, []byte(password))
	if err != nil {
		return result, errLegacyKey
	}

	encryptionKey, err := encryption.GenerateNoteEncryptionKey(password)
	if err != nil {
		return result, err
	}
	noteKey, err := encryption.OpenNoteKey(encryptionKey, password)
	if err != nil {
		return result, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return result, err
	}
	defer func() { _ = tx.Rollback() }()

	rows, err := tx.QueryContext(ctx, legacyNotesQuery+` UNION ALL `+legacyHistoryQuery, user.id, user.id)
	if err != nil {
		return result, fmt.Errorf("read protected notes: %w", err)
	}
	var encrypted []encryptedRow
	for rows.Next() {
		var row encryptedRow
		if err := rows.Scan(&row.table, &row.id, &row.value); err != nil {
			rows.Close()
			return result, err
		}
		encrypted = append(encrypted, row)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return result, err
	}

	for _, row := range encrypted {
		text, err := legacyDecrypt(row.value, legacyKey)
		if err != nil {
			result.unreadable++
			continue
		}

		value, err := encryption.EncryptNote(noteKey, string(text))
		if err != nil {
			return result, err
		}

		// row.table comes from the constant queries above, never from data.
		if _, err := tx.ExecContext(ctx, `UPDATE "`+row.table+`" SET "note" = ? WHERE "id" = ?`, value, row.id); err != nil {
			return result, fmt.Errorf("update %s %d: %w", row.table, row.id, err)
		}
		result.converted++
	}

	if _, err := tx.ExecContext(ctx, `UPDATE "user" SET "encryption_key" = ? WHERE "id" = ?`, encryptionKey, user.id); err != nil {
		return result, fmt.Errorf("update encryption key: %w", err)
	}

	return result, tx.Commit()
}
