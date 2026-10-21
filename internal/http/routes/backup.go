package routes

import (
	"errors"
	"io"
	"net/http"
	"strconv"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/backups"
	"noteme/internal/http/rbac"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
)

// GET /api/settings/download-backup?identifier=&target_id= streams a backup
// from its target.
func DownloadBackup(c *components.Components, w http.ResponseWriter, r *http.Request) {
	state, err := requeststate.FromCtx(r.Context())
	if err != nil {
		response.RespondPageError(w, r, http.StatusInternalServerError, "Error while processing the request")
		return
	}
	if !rbac.Can(rbac.Role(state.Session.Role), rbac.CanManageBackups) {
		response.RespondPageError(w, r, http.StatusForbidden, "User does not have the required permission: "+string(rbac.CanManageBackups))
		return
	}

	identifier := r.URL.Query().Get("identifier")
	if !backups.ValidIdentifier(identifier) {
		response.RespondPageError(w, r, http.StatusBadRequest, "Invalid backup name.")
		return
	}
	targetID, _ := strconv.Atoi(r.URL.Query().Get("target_id"))
	target, err := c.Repository.BackupTargets().GetBackupTarget(r.Context(), targetID)
	if err != nil {
		c.Log.Error("error while loading backup target", "error", err)
		response.RespondPageError(w, r, http.StatusInternalServerError, "Error while processing the request")
		return
	}
	if target == nil {
		response.RespondPageError(w, r, http.StatusNotFound, "Backup target not found")
		return
	}

	handler, err := c.Backups.Target(*target)
	if err != nil {
		c.Log.Error("error while opening backup target", "error", err)
		response.RespondPageError(w, r, http.StatusInternalServerError, "Error while processing the request")
		return
	}
	reader, size, err := handler.Open(r.Context(), identifier)
	if errors.Is(err, backups.ErrNotFound) {
		response.RespondPageError(w, r, http.StatusNotFound, "Backup not found")
		return
	}
	if err != nil {
		c.Log.Error("error while opening backup", "error", err)
		response.RespondPageError(w, r, http.StatusInternalServerError, "Error while processing the request")
		return
	}
	defer reader.Close()
	c.Audit.Record(r.Context(), audit.BackupDownloaded, requestActor(c, r, state.Session), map[string]any{"target_id": target.Id, "identifier": identifier})

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", `attachment; filename="`+identifier+`"`)
	if size > 0 {
		w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	}
	w.Header().Set("Cache-Control", "no-cache")
	if _, err := io.Copy(w, reader); err != nil {
		c.Log.Debug("backup download interrupted", "error", err)
	}
}
