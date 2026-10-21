package middleware

import (
	"mime"
	"net/http"
	"noteme/internal/components"
	"noteme/internal/http/response"
)

func JSONContentTypeMiddleware(c *components.Components, w http.ResponseWriter, r *http.Request) (bool, error) {
	if r.Body == http.NoBody {
		return true, nil
	}

	mediaType, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))

	if mediaType != "application/json" {
		response.RespondJSON(w, http.StatusUnsupportedMediaType, map[string]string{
			"error": "Content-Type must be application/json",
		})
		return false, nil
	}

	return true, nil
}
