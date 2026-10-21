package routes

import (
	"net/http"

	"noteme/internal/components"
	"noteme/internal/http/response"
)

type publicNote struct {
	Id          int64    `json:"id"`
	Title       string   `json:"title"`
	Note        string   `json:"note"`
	IsEncrypted bool     `json:"is_encrypted"`
	UpdatedAt   int64    `json:"updated_at"`
	Tags        []string `json:"tags"`
	UserName    string   `json:"user_name"`
}

// Anonymous; a protected note's text needs its owner's key, so it is refused.
func PublicNote(c *components.Components, w http.ResponseWriter, r *http.Request) {
	record, err := c.Repository.Shares().GetPublicShareNote(r.Context(), r.PathValue("identifier"))
	if err != nil {
		c.Log.Error("Could not load public note", "error", err)
		response.RespondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not load the note."})
		return
	}
	if record == nil {
		response.RespondJSON(w, http.StatusNotFound, map[string]string{"error": "Note not found."})
		return
	}
	if record.IsEncrypted {
		response.RespondJSON(w, http.StatusForbidden, map[string]string{"error": "This note is protected by its owner and cannot be viewed."})
		return
	}

	response.RespondJSON(w, http.StatusOK, publicNote{
		Id:          record.Id,
		Title:       record.Title,
		Note:        record.Note,
		IsEncrypted: record.IsEncrypted,
		UpdatedAt:   record.UpdatedAt,
		Tags:        record.Tags,
		UserName:    record.UserName,
	})
}
