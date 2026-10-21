package middleware

import (
	"net/http"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/loginguard"
	"noteme/internal/http/clientip"
	"noteme/internal/http/response"
)

func LoginGuardMiddleware(c *components.Components, w http.ResponseWriter, r *http.Request) (bool, error) {
	address := clientip.FromRequest(r, c.Config.TrustedProxies)
	if !c.LoginGuard.Attempt(address) {
		c.Audit.Record(r.Context(), audit.LoginLocked, audit.Actor{Address: address}, map[string]any{"route": r.URL.Path})
		response.RespondJSON(w, http.StatusForbidden, map[string]string{"error": loginguard.LockedMessage})
		return false, nil
	}
	return true, nil
}
