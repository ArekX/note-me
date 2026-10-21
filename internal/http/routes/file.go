package routes

import (
	"errors"
	"net/http"
	"net/url"
	"os"
	"slices"
	"strings"
	"time"

	"noteme/internal/components"
	"noteme/internal/http/rbac"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
)

// Types the browser may display; everything else is downloaded.
var inlineMimeTypes = []string{
	"text/plain",
	"application/json",
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/x-icon",
	"image/webp",
	"image/bmp",
	"image/tiff",
	"audio/mpeg",
	"audio/ogg",
	"audio/wav",
	"video/mp4",
	"video/ogg",
	"video/webm",
}

const fileNotFound = "Requested file not found."

// A public file is served to anyone. A private one needs its owner or
// canManageAllFiles; a visitor without a session is sent to log in and comes
// back here.
func File(c *components.Components, w http.ResponseWriter, r *http.Request) {
	identifier := r.PathValue("identifier")
	file, err := c.Repository.Files().GetFileData(r.Context(), identifier)
	if err != nil {
		c.Log.Error("Could not load file", "error", err)
		response.RespondPageError(w, r, http.StatusInternalServerError, "Error while processing the request")
		return
	}
	if file == nil {
		response.RespondPageError(w, r, http.StatusNotFound, fileNotFound)
		return
	}

	if !file.IsPublic {
		state, err := requeststate.FromCtx(r.Context())
		if err != nil || state.Session == nil {
			http.Redirect(w, r, "/?redirect="+url.QueryEscape(r.URL.RequestURI()), http.StatusSeeOther)
			return
		}
		if state.Session.UserId != file.UserId && !rbac.Can(rbac.Role(state.Session.Role), rbac.CanManageAllFiles) {
			response.RespondPageError(w, r, http.StatusForbidden, "You do not have access to this file.")
			return
		}
	}

	content, err := c.Storage.OpenFile(identifier)
	if errors.Is(err, os.ErrNotExist) {
		response.RespondPageError(w, r, http.StatusNotFound, fileNotFound)
		return
	}
	if err != nil {
		c.Log.Error("Could not open file", "identifier", identifier, "error", err)
		response.RespondPageError(w, r, http.StatusInternalServerError, "Error while processing the request")
		return
	}
	defer content.Close()

	mimeType := file.MimeType
	if strings.HasPrefix(mimeType, "text/") {
		mimeType = "text/plain"
	}
	disposition := "inline"
	if r.URL.Query().Has("download") || !slices.Contains(inlineMimeTypes, mimeType) {
		disposition = "attachment"
	}

	header := w.Header()
	header.Set("Content-Type", mimeType)
	header.Set("Content-Disposition", disposition+`; filename="`+file.Name+`"`)
	// A private file stays out of every cache, so the next person at a
	// shared browser cannot open it after a logout (SF-22).
	if file.IsPublic {
		header.Set("Cache-Control", "public, max-age=604800, immutable")
		header.Set("ETag", `"`+identifier+`"`)
	} else {
		header.Set("Cache-Control", "private, no-store")
	}

	// ServeContent adds Content-Length, Range requests and 304 answers to
	// If-None-Match.
	http.ServeContent(w, r, "", time.Time{}, content)
}
