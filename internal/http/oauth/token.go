package oauth

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"net/http"
	"net/url"
	"time"

	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/encryption"
	"noteme/internal/http/clientip"
	"noteme/internal/http/response"
)

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
}

// RFC 6749 5.2.
func tokenError(w http.ResponseWriter, status int, code, description string) {
	w.Header().Set("Cache-Control", "no-store")
	response.RespondJSON(w, status, map[string]string{"error": code, "error_description": description})
}

// Every token request counts in the login rate limit of its address, so
// client secrets cannot be guessed faster than passwords (decision 0.51).
func (s *Server) Token(w http.ResponseWriter, r *http.Request) {
	address := clientip.FromRequest(r, s.c.Config.TrustedProxies)
	if !s.c.LoginGuard.Attempt(address) {
		tokenError(w, http.StatusTooManyRequests, "invalid_request", "Too many requests, please try again later.")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	if err := r.ParseForm(); err != nil {
		tokenError(w, http.StatusBadRequest, "invalid_request", "The request body must be form encoded.")
		return
	}

	client := s.authenticateClient(w, r, address)
	if client == nil {
		return
	}
	if r.PostForm.Has("resource") && r.PostForm.Get("resource") != Resource(s.c.Config) {
		tokenError(w, http.StatusBadRequest, "invalid_target", "The resource must be "+Resource(s.c.Config)+".")
		return
	}

	switch r.PostForm.Get("grant_type") {
	case "authorization_code":
		s.exchangeCode(w, r, client)
	case "refresh_token":
		s.refresh(w, r, client, address)
	default:
		tokenError(w, http.StatusBadRequest, "unsupported_grant_type", "Only authorization_code and refresh_token are supported.")
	}
}

// client_secret_basic or client_secret_post.
func (s *Server) authenticateClient(w http.ResponseWriter, r *http.Request, address string) *repository.MCPClient {
	clientID, secret, basic := r.BasicAuth()
	if basic {
		clientID, _ = url.QueryUnescape(clientID)
		secret, _ = url.QueryUnescape(secret)
	} else {
		clientID, secret = r.PostForm.Get("client_id"), r.PostForm.Get("client_secret")
	}

	refuse := func() *repository.MCPClient {
		s.c.Audit.Record(r.Context(), audit.MCPClientAuthFailed, audit.Actor{Address: address}, map[string]any{"client_id": clientID})
		if basic {
			w.Header().Set("WWW-Authenticate", `Basic realm="NoteMe"`)
		}
		tokenError(w, http.StatusUnauthorized, "invalid_client", "Client authentication failed.")
		return nil
	}
	if clientID == "" || secret == "" {
		return refuse()
	}
	client, err := s.c.Repository.MCP().GetClientByClientID(r.Context(), clientID)
	if err != nil {
		s.log.Error("Could not load OAuth client", "error", err)
		tokenError(w, http.StatusInternalServerError, "server_error", internalMessage)
		return nil
	}
	if client == nil || client.ClientSecretHash == nil ||
		subtle.ConstantTimeCompare([]byte(*client.ClientSecretHash), []byte(encryption.TokenHash(secret))) != 1 {
		return refuse()
	}
	return client
}

func (s *Server) exchangeCode(w http.ResponseWriter, r *http.Request, client *repository.MCPClient) {
	code, ok := s.takeCode(r.PostForm.Get("code"))
	if !ok || code.clientID != client.Id {
		tokenError(w, http.StatusBadRequest, "invalid_grant", "The authorization code is invalid or has expired.")
		return
	}
	if r.PostForm.Get("redirect_uri") != code.redirectURI {
		tokenError(w, http.StatusBadRequest, "invalid_grant", "The redirect URI does not match the authorization request.")
		return
	}
	sum := sha256.Sum256([]byte(r.PostForm.Get("code_verifier")))
	if subtle.ConstantTimeCompare([]byte(base64.RawURLEncoding.EncodeToString(sum[:])), []byte(code.challenge)) != 1 {
		tokenError(w, http.StatusBadRequest, "invalid_grant", "The code verifier does not match the code challenge.")
		return
	}
	s.issueTokens(w, r.Context(), client)
}

// A rotated refresh token used again means it was copied, so every token of
// the client is deleted and the user has to connect again.
func (s *Server) refresh(w http.ResponseWriter, r *http.Request, client *repository.MCPClient, address string) {
	invalid := func() {
		tokenError(w, http.StatusBadRequest, "invalid_grant", "The refresh token is invalid or has expired.")
	}
	record, err := s.c.Repository.MCP().GetToken(r.Context(), encryption.TokenHash(r.PostForm.Get("refresh_token")))
	if err != nil {
		s.log.Error("Could not load refresh token", "error", err)
		tokenError(w, http.StatusInternalServerError, "server_error", internalMessage)
		return
	}
	now := time.Now().Unix()
	if record == nil || record.Kind != repository.MCPTokenRefresh || record.ClientId != client.Id ||
		record.ExpiresAt != nil && *record.ExpiresAt <= now {
		invalid()
		return
	}

	rotated := false
	if record.RotatedAt == nil {
		if rotated, err = s.c.Repository.MCP().RotateRefreshToken(r.Context(), record.Id, now); err != nil {
			s.log.Error("Could not rotate refresh token", "error", err)
			tokenError(w, http.StatusInternalServerError, "server_error", internalMessage)
			return
		}
	}
	if !rotated {
		if err := s.c.Repository.MCP().DeleteClientTokens(r.Context(), client.Id); err != nil {
			s.log.Error("Could not revoke MCP client tokens", "error", err)
		}
		s.c.Audit.Record(r.Context(), audit.MCPRefreshTokenReused, audit.Actor{UserID: client.UserId, Address: address}, map[string]any{"client_id": client.Id, "name": client.Name})
		invalid()
		return
	}
	s.issueTokens(w, r.Context(), client)
}

func (s *Server) issueTokens(w http.ResponseWriter, ctx context.Context, client *repository.MCPClient) {
	now := time.Now()
	result := tokenResponse{TokenType: "Bearer", ExpiresIn: int(accessTokenLifetime.Seconds())}
	err := s.c.Repository.RunInTransaction(ctx, func(tx repository.Repository) error {
		for _, token := range []struct {
			kind     string
			lifetime time.Duration
			value    *string
		}{
			{repository.MCPTokenAccess, accessTokenLifetime, &result.AccessToken},
			{repository.MCPTokenRefresh, refreshTokenLifetime, &result.RefreshToken},
		} {
			*token.value = encryption.RandomToken(tokenPrefix, secretSize)
			expiresAt := now.Add(token.lifetime).Unix()
			if _, err := tx.MCP().CreateToken(ctx, repository.NewMCPToken{
				ClientId:    client.Id,
				Kind:        token.kind,
				TokenHash:   encryption.TokenHash(*token.value),
				TokenPrefix: (*token.value)[:shownPrefixLength],
				ExpiresAt:   &expiresAt,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		s.log.Error("Could not issue MCP tokens", "error", err)
		tokenError(w, http.StatusInternalServerError, "server_error", internalMessage)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	response.RespondJSON(w, http.StatusOK, result)
}
