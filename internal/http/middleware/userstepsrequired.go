package middleware

import (
	"fmt"
	"net/http"
	"noteme/internal/components"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
)

func UserStepsRequiredMiddleware(c *components.Components, w http.ResponseWriter, r *http.Request) (bool, error) {
	state, err := requeststate.FromCtx(r.Context())

	if err != nil {
		return false, fmt.Errorf("error while retrieving request state")
	}

	if state.Session == nil {
		return true, nil
	}

	if steps := state.Session.RequiredSteps(); len(steps) > 0 {
		response.RespondJSON(w, http.StatusForbidden, map[string]string{
			"error": "Required step must be completed first",
			"code":  "step_required",
			"step":  steps[0],
		})
		return false, nil
	}

	return true, nil
}
