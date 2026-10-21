package routes

import (
	"net/http"

	"github.com/google/uuid"

	"noteme/internal/components"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
)

// Only the signed in user's own exports are found: the user id is part of the
// file name.
func DownloadDataExport(c *components.Components, w http.ResponseWriter, r *http.Request) {
	state, err := requeststate.FromCtx(r.Context())
	if err != nil {
		response.RespondPageError(w, r, http.StatusInternalServerError, "Error while processing the request")
		return
	}

	identifier := r.PathValue("identifier")
	if _, err := uuid.Parse(identifier); err != nil {
		response.RespondPageError(w, r, http.StatusNotFound, "Export not found.")
		return
	}
	file, err := c.Storage.OpenExportFile(state.Session.UserId, identifier)
	if err != nil {
		response.RespondPageError(w, r, http.StatusNotFound, "Export not found.")
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		c.Log.Error("error while reading export file", "error", err)
		response.RespondPageError(w, r, http.StatusInternalServerError, "Error while processing the request")
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="`+identifier+`.zip"`)
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeContent(w, r, "", info.ModTime(), file)
}
