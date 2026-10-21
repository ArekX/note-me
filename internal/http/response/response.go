package response

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
)

func RespondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("write json", "error", err)
	}
}

func RespondError(w http.ResponseWriter, err error) {
	RespondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
}

// A browser opening a file link or a download in a tab gets the app's error
// page instead of a JSON body; API clients keep the JSON. The page shows a
// fixed text per status, so nothing from the URL is displayed.
func RespondPageError(w http.ResponseWriter, r *http.Request, status int, message string) {
	if !strings.Contains(r.Header.Get("Accept"), "text/html") {
		RespondJSON(w, status, map[string]string{"error": message})
		return
	}
	page := http.StatusInternalServerError
	switch status {
	case http.StatusForbidden:
		page = status
	case http.StatusNotFound, http.StatusBadRequest:
		page = http.StatusNotFound
	}
	http.Redirect(w, r, "/error/"+strconv.Itoa(page), http.StatusSeeOther)
}
