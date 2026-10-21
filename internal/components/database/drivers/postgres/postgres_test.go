package postgres

import "testing"

func TestRebind(t *testing.T) {
	tests := map[string]string{
		`SELECT 1`:                                   `SELECT 1`,
		`WHERE "a" = ? AND "b" IN (?, ?)`:            `WHERE "a" = $1 AND "b" IN ($2, $3)`,
		`WHERE "a?" = '?' AND "b" = ?`:               `WHERE "a?" = '?' AND "b" = $1`,
		`WHERE "a" = 'it''s ?' AND "b" = ?`:          `WHERE "a" = 'it''s ?' AND "b" = $1`,
		"-- what?\nSELECT ?":                         "-- what?\nSELECT $1",
		`SET "x" = (? :: jsonb || ?::jsonb)::text`:   `SET "x" = ($1 :: jsonb || $2::jsonb)::text`,
		`LIKE ? ESCAPE '\' OR "b" LIKE ? ESCAPE '\'`: `LIKE $1 ESCAPE '\' OR "b" LIKE $2 ESCAPE '\'`,
	}
	for query, want := range tests {
		if got := rebind(query); got != want {
			t.Errorf("rebind(%q) = %q, want %q", query, got, want)
		}
	}
}
