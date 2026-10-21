package middleware

import (
	"net/http"
	"noteme/internal/components"
	"noteme/internal/http/response"
)

var crossOrigin = http.NewCrossOriginProtection()

func CSRFMiddleware(c *components.Components, w http.ResponseWriter, r *http.Request) (bool, error) {
	if err := crossOrigin.Check(r); err != nil {
		response.RespondJSON(w, http.StatusForbidden, map[string]string{
			"error": "Cross-origin request blocked",
		})
		return false, nil
	}

	return true, nil
}
