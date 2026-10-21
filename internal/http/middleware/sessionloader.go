package middleware

import (
	"fmt"
	"net/http"
	"noteme/internal/components"
	"noteme/internal/http/requeststate"
)

// The original set the cookie with a Domain, this one is host-only; a browser
// still holding the old cookie sends both, older one first.
func LoadSessionMiddleware(c *components.Components, w http.ResponseWriter, r *http.Request) (bool, error) {
	state, err := requeststate.FromCtx(r.Context())

	if err != nil {
		return false, fmt.Errorf("error while retrieving request state")
	}

	for _, cookie := range r.CookiesNamed("session") {
		sessionRecord, err := c.Repository.Sessions().GetSessionByKey(r.Context(), cookie.Value)

		if err != nil {
			return false, fmt.Errorf("error while retrieving session data by key")
		}

		if sessionRecord == nil {
			continue
		}

		session, err := requeststate.SessionFromJson([]byte(sessionRecord.Data))

		if err != nil {
			return false, fmt.Errorf("error while parsing sesion data")
		}

		state.Session = session
		state.SessionKey = sessionRecord.Key
		break
	}

	return true, nil
}
