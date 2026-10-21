package backups

import (
	"context"
	"encoding/xml"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

// Path-style subset of the S3 API the target uses: PUT, GET and DELETE of an
// object and ListObjectsV2.
type fakeS3 struct {
	mu      sync.Mutex
	objects map[string]string
}

func (f *fakeS3) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()

	path := strings.TrimPrefix(r.URL.EscapedPath(), "/bucket")
	if path == "" || path == "/" {
		type object struct {
			Key          string
			Size         int
			LastModified string
		}
		var result struct {
			XMLName     xml.Name `xml:"ListBucketResult"`
			IsTruncated bool
			Contents    []object
		}
		for key, body := range f.objects {
			if strings.HasPrefix(key, r.URL.Query().Get("prefix")) {
				result.Contents = append(result.Contents, object{key, len(body), time.Unix(int64(len(key)), 0).UTC().Format(time.RFC3339)})
			}
		}
		xml.NewEncoder(w).Encode(result)
		return
	}

	key, err := url.PathUnescape(path[1:])
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPut:
		body, _ := io.ReadAll(r.Body)
		f.objects[key] = string(body)
	case http.MethodDelete:
		delete(f.objects, key)
		w.WriteHeader(http.StatusNoContent)
	case http.MethodGet:
		body, ok := f.objects[key]
		if !ok {
			w.WriteHeader(http.StatusNotFound)
			io.WriteString(w, `<Error><Code>NoSuchKey</Code></Error>`)
			return
		}
		io.WriteString(w, body)
	}
}

func newS3Target(t *testing.T, prefix string, objects map[string]string) (*s3Target, *fakeS3) {
	t.Helper()
	fake := &fakeS3{objects: objects}
	server := httptest.NewServer(fake)
	t.Cleanup(server.Close)
	t.Setenv("AWS_ENDPOINT_URL_S3", server.URL)
	t.Setenv("AWS_CONFIG_FILE", filepath.Join(t.TempDir(), "config"))
	t.Setenv("AWS_SHARED_CREDENTIALS_FILE", filepath.Join(t.TempDir(), "credentials"))
	return &s3Target{settings: S3Settings{
		Bucket: "bucket",
		Region: "eu-central-1",
		Prefix: prefix,
		Credentials: S3Credentials{
			Type:            "access_key",
			AccessKeyID:     "key",
			SecretAccessKey: "secret",
		},
	}}, fake
}

func TestS3Keys(t *testing.T) {
	for prefix, want := range map[string][]string{
		"":          {"a.zip", "/a.zip"},
		"noteme":    {"noteme/a.zip"},
		"noteme/":   {"noteme/a.zip", "noteme//a.zip"},
		"/path/to/": {"path/to/a.zip", "/path/to//a.zip"},
	} {
		target := &s3Target{settings: S3Settings{Prefix: prefix}}
		if got := target.keys("a.zip"); !slices.Equal(got, want) {
			t.Errorf("prefix %q: keys = %q, want %q", prefix, got, want)
		}
	}
}

func TestS3KeysOfTheOriginal(t *testing.T) {
	ctx := context.Background()
	for _, tc := range []struct{ prefix, original, saved string }{
		{"", "/old.zip", "new.zip"},
		{"noteme/", "noteme//old.zip", "noteme/new.zip"},
	} {
		t.Run(tc.prefix, func(t *testing.T) {
			target, fake := newS3Target(t, tc.prefix, map[string]string{
				tc.original:                "old",
				"elsewhere/x.zip":          "nested",
				tc.prefix + "nested/y.zip": "nested",
			})

			source := filepath.Join(t.TempDir(), "new.zip")
			if err := os.WriteFile(source, []byte("new"), 0o600); err != nil {
				t.Fatal(err)
			}
			if _, err := target.Save(ctx, "new.zip", source); err != nil {
				t.Fatal(err)
			}
			if fake.objects[tc.saved] != "new" {
				t.Errorf("new backup not at %q: %v", tc.saved, fake.objects)
			}

			items, err := target.List(ctx)
			if err != nil {
				t.Fatal(err)
			}
			var names []string
			for _, item := range items {
				names = append(names, item.Identifier)
			}
			slices.Sort(names)
			if !slices.Equal(names, []string{"new.zip", "old.zip"}) {
				t.Errorf("listed = %v", names)
			}

			body, _, err := target.Open(ctx, "old.zip")
			if err != nil {
				t.Fatal(err)
			}
			data, _ := io.ReadAll(body)
			body.Close()
			if string(data) != "old" {
				t.Errorf("original backup = %q", data)
			}
			if _, _, err := target.Open(ctx, "missing.zip"); !errors.Is(err, ErrNotFound) {
				t.Errorf("missing = %v", err)
			}

			if err := target.Delete(ctx, "old.zip"); err != nil {
				t.Fatal(err)
			}
			if _, ok := fake.objects[tc.original]; ok {
				t.Errorf("original backup not deleted: %v", fake.objects)
			}
		})
	}
}
