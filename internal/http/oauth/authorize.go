package oauth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"time"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/encryption"
	"noteme/internal/http/clientip"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/response"
)

type authorizeRequest struct {
	client      *repository.MCPClient
	redirectURI string
	challenge   string
	state       string
}

// Before the redirect URI is trusted (trusted false) an error is shown, never
// sent to it (RFC 6749 4.1.2.1).
type authorizeError struct {
	trusted     bool
	code        string
	description string
}

func (s *Server) parseAuthorize(ctx context.Context, query url.Values) (*authorizeRequest, *authorizeError) {
	untrusted := func(description string) *authorizeError {
		return &authorizeError{code: "invalid_request", description: description}
	}
	clientID := query.Get("client_id")
	if clientID == "" {
		return nil, untrusted("The client_id parameter is missing.")
	}
	client, err := s.c.Repository.MCP().GetClientByClientID(ctx, clientID)
	if err != nil {
		s.log.Error("Could not load OAuth client", "error", err)
		return nil, &authorizeError{code: "server_error", description: internalMessage}
	}
	if client == nil || client.Kind != repository.MCPClientOAuth {
		return nil, untrusted("This MCP client does not exist. Check its client id in your NoteMe profile.")
	}

	redirectURI := query.Get("redirect_uri")
	if redirectURI == "" && len(client.RedirectURIs) == 1 {
		redirectURI = client.RedirectURIs[0]
	}
	if !matchRedirectURI(client.RedirectURIs, redirectURI) {
		return nil, untrusted("The redirect URI " + redirectURI + " is not registered for this MCP client. Add it to the client in your NoteMe profile.")
	}

	request := &authorizeRequest{client: client, redirectURI: redirectURI, challenge: query.Get("code_challenge"), state: query.Get("state")}
	trusted := func(code, description string) (*authorizeRequest, *authorizeError) {
		return request, &authorizeError{trusted: true, code: code, description: description}
	}
	switch {
	case query.Get("response_type") != "code":
		return trusted("unsupported_response_type", "Only the authorization code flow is supported.")
	case request.challenge == "" || query.Get("code_challenge_method") != "S256":
		return trusted("invalid_request", "PKCE with the S256 method is required.")
	case query.Has("resource") && query.Get("resource") != Resource(s.c.Config):
		return trusted("invalid_target", "The resource must be "+Resource(s.c.Config)+".")
	}
	return request, nil
}

func (r *authorizeRequest) errorURL(err *authorizeError) string {
	return withParameters(r.redirectURI, url.Values{"error": {err.code}, "error_description": {err.description}, "state": {r.state}})
}

// The session cookie is SameSite=Strict and is not sent when another site
// sends the browser here, so the SPA's own requests carry the consent.
func (s *Server) Authorize(w http.ResponseWriter, r *http.Request) {
	request, err := s.parseAuthorize(r.Context(), r.URL.Query())
	if err != nil && err.trusted {
		http.Redirect(w, r, request.errorURL(err), http.StatusFound)
		return
	}
	if err != nil {
		response.RespondPageError(w, r, http.StatusBadRequest, err.description)
		return
	}
	s.spa.ServeHTTP(w, r)
}

type consentInfo struct {
	ClientName string      `json:"client_name"`
	IsReadOnly bool        `json:"is_read_only"`
	User       consentUser `json:"user"`
}

type consentUser struct {
	Name     string `json:"name"`
	Username string `json:"username"`
}

// A client acts as the user who created it, so only that user may connect it.
func (s *Server) consentRequest(w http.ResponseWriter, r *http.Request, query url.Values) (*authorizeRequest, *requeststate.Session, bool) {
	state, stateErr := requeststate.FromCtx(r.Context())
	if stateErr != nil {
		response.RespondJSON(w, http.StatusInternalServerError, map[string]string{"error": internalMessage})
		return nil, nil, false
	}
	request, err := s.parseAuthorize(r.Context(), query)
	if err != nil {
		response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": err.description})
		return nil, nil, false
	}
	if request.client.UserId != state.Session.UserId {
		response.RespondJSON(w, http.StatusForbidden, map[string]string{"error": "This MCP client belongs to another user. Sign in as that user to connect it."})
		return nil, nil, false
	}
	return request, state.Session, true
}

func (s *Server) ConsentInfo(_ *components.Components, w http.ResponseWriter, r *http.Request) {
	request, session, ok := s.consentRequest(w, r, r.URL.Query())
	if !ok {
		return
	}
	response.RespondJSON(w, http.StatusOK, consentInfo{
		ClientName: request.client.Name,
		IsReadOnly: request.client.IsReadOnly,
		User:       consentUser{Name: session.Name, Username: session.Username},
	})
}

type consentBody struct {
	Query string `json:"query"`
	Allow bool   `json:"allow"`
}

func (s *Server) Consent(_ *components.Components, w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	var body consentBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	query, err := url.ParseQuery(body.Query)
	if err != nil {
		response.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid authorization request"})
		return
	}
	request, session, ok := s.consentRequest(w, r, query)
	if !ok {
		return
	}
	if !body.Allow {
		response.RespondJSON(w, http.StatusOK, map[string]string{"redirect_url": request.errorURL(&authorizeError{code: "access_denied", description: "The user denied access."})})
		return
	}

	code := encryption.RandomToken("", secretSize)
	s.storeCode(code, authorizationCode{
		clientID:    request.client.Id,
		redirectURI: request.redirectURI,
		challenge:   request.challenge,
		expiresAt:   time.Now().Add(codeLifetime),
	})
	actor := audit.Actor{UserID: session.UserId, Username: session.Username, Address: clientip.FromRequest(r, s.c.Config.TrustedProxies)}
	s.c.Audit.Record(r.Context(), audit.MCPConsentGiven, actor, map[string]any{"client_id": request.client.Id, "name": request.client.Name})
	response.RespondJSON(w, http.StatusOK, map[string]string{"redirect_url": withParameters(request.redirectURI, url.Values{"code": {code}, "state": {request.state}})})
}

func (s *Server) storeCode(code string, value authorizationCode) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for key, stored := range s.codes {
		if now.After(stored.expiresAt) {
			delete(s.codes, key)
		}
	}
	s.codes[encryption.TokenHash(code)] = value
}

// Single use: the code is gone after the first exchange, valid or not.
func (s *Server) takeCode(code string) (authorizationCode, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := encryption.TokenHash(code)
	value, ok := s.codes[key]
	delete(s.codes, key)
	if !ok || time.Now().After(value.expiresAt) {
		return authorizationCode{}, false
	}
	return value, true
}
