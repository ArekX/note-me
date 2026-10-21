package drivers

import (
	"slices"
	"testing"
)

func TestSplitStatements(t *testing.T) {
	script := `-- header; with a semicolon
CREATE TABLE "a" (
    "id" bigint, -- inline;
    "name" text
);

-- between
CREATE TABLE "b" ("id" bigint);
DROP TABLE "c"`
	want := []string{
		"CREATE TABLE \"a\" (\n    \"id\" bigint, -- inline;\n    \"name\" text\n);\n",
		"CREATE TABLE \"b\" (\"id\" bigint);\n",
		`DROP TABLE "c"`,
	}
	if got := splitStatements(script); !slices.Equal(got, want) {
		t.Errorf("splitStatements = %q, want %q", got, want)
	}
}
