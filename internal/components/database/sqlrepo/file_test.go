package sqlrepo

import (
	"context"
	"slices"
	"testing"

	"noteme/internal/components/repository"
)

func createTestFile(t *testing.T, r *Repository, userId int, identifier, name string, ready bool) {
	t.Helper()
	ctx := context.Background()
	if err := r.CreateFileRecord(ctx, repository.NewFileRecord{Identifier: identifier, Name: name, UserId: userId, MimeType: "text/plain", Size: 4}); err != nil {
		t.Fatal(err)
	}
	if ready {
		if err := r.MarkFileReady(ctx, identifier); err != nil {
			t.Fatal(err)
		}
	}
}

func TestFileRecords(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	createTestFile(t, r, owner, "a", "report.txt", true)
	createTestFile(t, r, owner, "b", "photo.png", true)
	createTestFile(t, r, owner, "pending", "pending.txt", false)
	createTestFile(t, r, other, "c", "theirs.txt", true)

	if upload, _ := r.GetFileUploadForUser(ctx, other, "a"); upload != nil {
		t.Errorf("other user's upload = %+v", upload)
	}
	if upload, _ := r.GetFileUploadForUser(ctx, owner, "pending"); upload == nil || upload.IsReady || upload.Size != 4 {
		t.Errorf("pending upload = %+v", upload)
	}
	if data, _ := r.GetFileData(ctx, "pending"); data != nil {
		t.Errorf("unfinished file served: %+v", data)
	}

	own, err := r.FindFiles(ctx, owner, repository.FileFilters{}, 1)
	if err != nil || own.Total != 2 || own.Results[0].CreatedBy != "owner" {
		t.Fatalf("own files = %+v, %v", own, err)
	}
	if all, _ := r.FindFiles(ctx, owner, repository.FileFilters{AllFiles: true}, 1); all.Total != 3 {
		t.Errorf("all files = %d", all.Total)
	}
	if named, _ := r.FindFiles(ctx, owner, repository.FileFilters{Name: "rep"}, 1); named.Total != 1 || named.Results[0].Identifier != "a" {
		t.Errorf("named = %+v", named)
	}

	if err := r.UpdateFileRecord(ctx, "c", true, &owner); err != nil {
		t.Fatal(err)
	}
	if data, _ := r.GetFileData(ctx, "c"); data.IsPublic {
		t.Error("scoped update changed another user's file")
	}
	if err := r.UpdateFileRecord(ctx, "c", true, nil); err != nil {
		t.Fatal(err)
	}
	if data, _ := r.GetFileData(ctx, "c"); !data.IsPublic || data.UserId != other {
		t.Errorf("unscoped update = %+v", data)
	}

	public := true
	if err := r.UpdateMultipleFiles(ctx, owner, []string{"a", "b", "c"}, &public); err != nil {
		t.Fatal(err)
	}
	details, err := r.GetFileDetailsForUser(ctx, owner, []string{"a", "b", "c", "pending"})
	if err != nil || len(details) != 2 || !details[0].IsPublic || !details[1].IsPublic {
		t.Errorf("details = %+v, %v", details, err)
	}

	if deleted, _ := r.DeleteFileByUser(ctx, other, "a"); deleted {
		t.Error("other user deleted the file")
	}
	if deleted, _ := r.DeleteFileByUser(ctx, owner, "a"); !deleted {
		t.Error("owner could not delete the file")
	}
	if deleted, _ := r.DeleteFileRecord(ctx, "c"); !deleted {
		t.Error("admin delete failed")
	}
}

func TestFindFilesFilters(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")

	files := []struct {
		user                 int
		identifier, mimeType string
	}{
		{owner, "png", "image/png"},
		{owner, "pdf", "application/pdf"},
		{owner, "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
		{owner, "zip", "application/zip"},
		{other, "jpg", "image/jpeg"},
	}
	for _, file := range files {
		if err := r.CreateFileRecord(ctx, repository.NewFileRecord{Identifier: file.identifier, Name: file.identifier, UserId: file.user, MimeType: file.mimeType, Size: 1}); err != nil {
			t.Fatal(err)
		}
		if err := r.MarkFileReady(ctx, file.identifier); err != nil {
			t.Fatal(err)
		}
	}
	if err := r.UpdateFileRecord(ctx, "pdf", true, nil); err != nil {
		t.Fatal(err)
	}

	identifiers := func(filters repository.FileFilters) []string {
		t.Helper()
		page, err := r.FindFiles(ctx, owner, filters, 1)
		if err != nil {
			t.Fatal(err)
		}
		result := []string{}
		for _, record := range page.Results {
			result = append(result, record.Identifier)
		}
		slices.Sort(result)
		return result
	}

	cases := []struct {
		name    string
		filters repository.FileFilters
		want    []string
	}{
		{"images", repository.FileFilters{Kind: repository.FileKindImage}, []string{"png"}},
		{"documents", repository.FileFilters{Kind: repository.FileKindDocument}, []string{"docx", "pdf"}},
		{"other", repository.FileFilters{Kind: repository.FileKindOther}, []string{"zip"}},
		{"unknown kind", repository.FileFilters{Kind: "video"}, []string{"docx", "pdf", "png", "zip"}},
		{"public", repository.FileFilters{Visibility: repository.FileVisibilityPublic}, []string{"pdf"}},
		{"private", repository.FileFilters{Visibility: repository.FileVisibilityPrivate}, []string{"docx", "png", "zip"}},
		{"owner with all files", repository.FileFilters{AllFiles: true, Owner: "oth"}, []string{"jpg"}},
		{"owner without all files", repository.FileFilters{Owner: "oth"}, []string{"docx", "pdf", "png", "zip"}},
		{"all images", repository.FileFilters{AllFiles: true, Kind: repository.FileKindImage}, []string{"jpg", "png"}},
	}
	for _, tc := range cases {
		if got := identifiers(tc.filters); !slices.Equal(got, tc.want) {
			t.Errorf("%s: got %v, want %v", tc.name, got, tc.want)
		}
	}
}
