package response

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRespondPageError(t *testing.T) {
	for status, want := range map[int]string{
		http.StatusForbidden:           "/error/403",
		http.StatusNotFound:            "/error/404",
		http.StatusBadRequest:          "/error/404",
		http.StatusInternalServerError: "/error/500",
		http.StatusServiceUnavailable:  "/error/500",
	} {
		req := httptest.NewRequest(http.MethodGet, "/file/x", nil)
		req.Header.Set("Accept", "text/html")
		rec := httptest.NewRecorder()
		RespondPageError(rec, req, status, "secret detail")
		if rec.Code != http.StatusSeeOther || rec.Header().Get("Location") != want {
			t.Errorf("status %d: %d %q, want %s", status, rec.Code, rec.Header().Get("Location"), want)
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/file/x", nil)
	req.Header.Set("Accept", "application/json")
	rec := httptest.NewRecorder()
	RespondPageError(rec, req, http.StatusForbidden, "You do not have access to this file.")
	if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), "You do not have access to this file.") {
		t.Errorf("json client: %d %s", rec.Code, rec.Body.String())
	}
}
