package middleware

import (
	"net/http"
	"noteme/internal/components"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
	"noteme/internal/http/routes"
)

type MiddlewareChain struct {
	mws        []MiddlewareFunc
	components *components.Components
}

type MiddlewareFunc func(c *components.Components, w http.ResponseWriter, r *http.Request) (bool, error)

func New(c *components.Components, mws ...MiddlewareFunc) *MiddlewareChain {
	return &MiddlewareChain{
		mws:        mws,
		components: c,
	}
}

func (c *MiddlewareChain) Wrap(routeFn routes.RouteFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r = r.WithContext(requeststate.NewCtxValue(r.Context()))

		for _, middlewareFn := range c.mws {
			shouldContinue, err := middlewareFn(c.components, w, r)
			if err != nil {
				c.components.Log.Error("error while running middleware", "error", err)
				response.RespondJSON(w, 500, map[string]string{
					"error": "Error while processing the request",
				})
				return
			}

			if !shouldContinue {
				return
			}
		}

		routeFn(c.components, w, r)
	}
}

func CreateAuthenticatedMiddlewareChain(c *components.Components) *MiddlewareChain {
	return New(c,
		CSRFMiddleware,
		JSONContentTypeMiddleware,
		LoadSessionMiddleware,
		AuthRequiredMiddleware,
		UserStepsRequiredMiddleware,
	)
}

func CreateSessionMiddlewareChain(c *components.Components) *MiddlewareChain {
	return New(c,
		CSRFMiddleware,
		JSONContentTypeMiddleware,
		LoadSessionMiddleware,
		AuthRequiredMiddleware,
	)
}

// The session is loaded when there is one, but none is required.
func CreateOptionalSessionMiddlewareChain(c *components.Components) *MiddlewareChain {
	return New(c,
		CSRFMiddleware,
		LoadSessionMiddleware,
	)
}

func CreateLoginMiddlewareChain(c *components.Components) *MiddlewareChain {
	return New(c,
		CSRFMiddleware,
		JSONContentTypeMiddleware,
		LoginGuardMiddleware,
	)
}
