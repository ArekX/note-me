package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"slices"
	"testing"

	"noteme/internal/components/database/databasetest"
	"noteme/internal/components/repository"
)

func openTestRepository(t *testing.T) *Repository {
	t.Helper()
	return New(databasetest.Open(t))
}

func insertUser(t *testing.T, r *Repository, username string) {
	t.Helper()
	_, err := r.q.ExecContext(
		context.Background(),
		`INSERT INTO "user" ("name", "username", "password", "role", "created_at", "updated_at", "encryption_key")
		 VALUES (?, ?, '', 'user', ?, ?, '')`,
		username, username, now(), now(),
	)
	if err != nil {
		t.Fatal(err)
	}
}

func countUsers(t *testing.T, r *Repository) int {
	t.Helper()
	var count int
	if err := r.q.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM "user"`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	return count
}

func TestRunInTransactionCommits(t *testing.T) {
	r := openTestRepository(t)

	err := r.runInTransaction(context.Background(), func(tx *Repository) error {
		insertUser(t, tx, "a")
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	if got := countUsers(t, r); got != 1 {
		t.Fatalf("users = %d, want 1", got)
	}
}

func TestRunInTransactionRollsBackOnError(t *testing.T) {
	r := openTestRepository(t)
	errFailed := errors.New("failed")

	err := r.runInTransaction(context.Background(), func(tx *Repository) error {
		insertUser(t, tx, "a")
		return errFailed
	})
	if !errors.Is(err, errFailed) {
		t.Fatalf("err = %v, want %v", err, errFailed)
	}

	if got := countUsers(t, r); got != 0 {
		t.Fatalf("users = %d, want 0", got)
	}
}

func TestRunInTransactionJoinsOuter(t *testing.T) {
	r := openTestRepository(t)
	errFailed := errors.New("failed")

	err := r.runInTransaction(context.Background(), func(tx *Repository) error {
		insertUser(t, tx, "a")
		err := tx.runInTransaction(context.Background(), func(inner *Repository) error {
			if inner != tx {
				t.Error("nested call did not reuse the outer transaction")
			}
			insertUser(t, inner, "b")
			return nil
		})
		if err != nil {
			return err
		}
		return errFailed
	})
	if !errors.Is(err, errFailed) {
		t.Fatalf("err = %v, want %v", err, errFailed)
	}

	if got := countUsers(t, r); got != 0 {
		t.Fatalf("users = %d, want 0 (inner insert must roll back with the outer)", got)
	}
}

func TestRunInTransactionThroughInterface(t *testing.T) {
	var repo repository.Repository = openTestRepository(t)
	ctx := context.Background()
	errFailed := errors.New("failed")

	err := repo.RunInTransaction(ctx, func(tx repository.Repository) error {
		if _, err := tx.Users().GetUserIdByUsername(ctx, "a"); err != nil {
			return err
		}
		insertUser(t, tx.(*Repository), "a")
		return errFailed
	})
	if !errors.Is(err, errFailed) {
		t.Fatalf("err = %v, want %v", err, errFailed)
	}
	if exists, err := repo.Users().UserExists(ctx, "a"); err != nil || exists {
		t.Fatalf("UserExists after rollback = %v, %v", exists, err)
	}

	accessors := []any{
		repo.AuditLog(), repo.BackupTargets(), repo.Files(), repo.Groups(), repo.Notes(), repo.NoteHistory(), repo.Reminders(),
		repo.Search(), repo.Shares(), repo.Notifications(), repo.Passkeys(), repo.PeriodicTasks(), repo.Sessions(),
		repo.Tags(), repo.Tree(), repo.Users(), repo.UserManagement(),
	}
	for index, accessor := range accessors {
		if accessor != repo {
			t.Errorf("accessor %d returned another object", index)
		}
	}
}

func TestPageResults(t *testing.T) {
	r := openTestRepository(t)
	for _, name := range []string{"a1", "a2", "a3", "b1"} {
		insertUser(t, r, name)
	}

	query := pageQuery{
		Columns: `"username"`,
		From:    `"user" WHERE "username" LIKE ?`,
		OrderBy: `"id"`,
		Args:    []any{"a%"},
		PerPage: 2,
	}
	scan := func(rows *sql.Rows) (string, error) {
		var username string
		err := rows.Scan(&username)
		return username, err
	}

	tests := []struct {
		page     int
		wantPage int
		want     []string
	}{
		{0, 1, []string{"a1", "a2"}},
		{-5, 1, []string{"a1", "a2"}},
		{1, 1, []string{"a1", "a2"}},
		{2, 2, []string{"a3"}},
		{3, 3, []string{}},
		{math.MaxInt, 3, []string{}},
	}
	for _, tt := range tests {
		query.Page = tt.page
		got, err := pageResults(context.Background(), r.q, query, scan)
		if err != nil {
			t.Fatal(err)
		}
		if got.Total != 3 || got.Page != tt.wantPage || got.PerPage != 2 || !slices.Equal(got.Results, tt.want) {
			t.Errorf("page %d = %+v, want page %d results %v", tt.page, got, tt.wantPage, tt.want)
		}
	}
}

func TestLikeContainsEscapesWildcards(t *testing.T) {
	r := openTestRepository(t)
	for _, name := range []string{"100%", "1000", "a_b", "axb", `c\d`, "MiXed"} {
		insertUser(t, r, name)
	}

	tests := map[string][]string{
		"0%":  {"100%"},
		"a_b": {"a_b"},
		`c\d`: {`c\d`},
		"0":   {"100%", "1000"},
		"mix": {"MiXed"},
	}
	for search, want := range tests {
		rows, err := r.q.QueryContext(
			context.Background(),
			`SELECT "username" FROM "user" WHERE `+r.dialect.likeCondition(`"username"`)+` ORDER BY "id"`,
			likeContains(search),
		)
		if err != nil {
			t.Fatal(err)
		}
		got := []string{}
		for rows.Next() {
			var username string
			if err := rows.Scan(&username); err != nil {
				t.Fatal(err)
			}
			got = append(got, username)
		}
		rows.Close()
		if !slices.Equal(got, want) {
			t.Errorf("search %q = %v, want %v", search, got, want)
		}
	}
}

func TestBooleanColumnsScanIntoBool(t *testing.T) {
	r := openTestRepository(t)
	insertUser(t, r, "a")

	if _, err := r.q.ExecContext(context.Background(), `UPDATE "user" SET "is_deleted" = ?`, true); err != nil {
		t.Fatal(err)
	}

	var deleted bool
	var resetRequired sql.NullBool
	err := r.q.QueryRowContext(
		context.Background(),
		`SELECT "is_deleted", "is_password_reset_required" FROM "user"`,
	).Scan(&deleted, &resetRequired)
	if err != nil {
		t.Fatal(err)
	}
	if !deleted || resetRequired.Valid {
		t.Fatalf("deleted = %v, resetRequired = %+v", deleted, resetRequired)
	}
}

func TestSplitTags(t *testing.T) {
	tests := []struct {
		in   sql.NullString
		want []string
	}{
		{sql.NullString{}, []string{}},
		{sql.NullString{String: "a", Valid: true}, []string{"a"}},
		{sql.NullString{String: "a,b,", Valid: true}, []string{"a", "b"}},
	}
	for _, tt := range tests {
		if got := splitTags(tt.in); !slices.Equal(got, tt.want) {
			t.Errorf("splitTags(%+v) = %v, want %v", tt.in, got, tt.want)
		}
	}
}
