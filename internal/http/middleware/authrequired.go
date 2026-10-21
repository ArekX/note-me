package middleware

import (
	"fmt"
	"net/http"
	"noteme/internal/components"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
)

func AuthRequiredMiddleware(c *components.Components, w http.ResponseWriter, r *http.Request) (bool, error) {
	state, err := requeststate.FromCtx(r.Context())

	if err != nil {
		return false, fmt.Errorf("error while retrieving request state")
	}

	if state.Session == nil {
		response.RespondJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
		return false, nil
	}

	return true, nil
}
