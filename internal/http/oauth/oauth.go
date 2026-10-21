package oauth

import (
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/oauthex"

	"noteme/internal/components"
	"noteme/internal/config"
	"noteme/internal/http/response"
)

const (
	ResourceMetadataPath = "/.well-known/oauth-protected-resource/mcp"
	MetadataPath         = "/.well-known/oauth-authorization-server"
	AuthorizePath        = "/oauth/authorize"
	TokenPath            = "/oauth/token"

	codeLifetime         = 60 * time.Second
	accessTokenLifetime  = time.Hour
	refreshTokenLifetime = 30 * 24 * time.Hour
	// Same format as personal tokens (decision 0.84).
	tokenPrefix       = "nmcp_"
	secretSize        = 32
	shownPrefixLength = len(tokenPrefix) + 6
	internalMessage   = "Error while processing the request"
)

func Issuer(cfg *config.Config) string {
	return strings.TrimSuffix(cfg.AppURL.String(), "/")
}

func Resource(cfg *config.Config) string {
	return Issuer(cfg) + "/mcp"
}

type Server struct {
	c   *components.Components
	log *slog.Logger
	// Answers a valid authorization request with the consent page.
	spa http.Handler

	mu    sync.Mutex
	codes map[string]authorizationCode
}

type authorizationCode struct {
	clientID    int64
	redirectURI string
	challenge   string
	expiresAt   time.Time
}

func New(c *components.Components, log *slog.Logger, spa http.Handler) *Server {
	return &Server{c: c, log: log, spa: spa, codes: map[string]authorizationCode{}}
}

func (s *Server) Metadata(w http.ResponseWriter, _ *http.Request) {
	issuer := Issuer(s.c.Config)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	response.RespondJSON(w, http.StatusOK, oauthex.AuthServerMeta{
		Issuer:                            issuer,
		AuthorizationEndpoint:             issuer + AuthorizePath,
		TokenEndpoint:                     issuer + TokenPath,
		ResponseTypesSupported:            []string{"code"},
		GrantTypesSupported:               []string{"authorization_code", "refresh_token"},
		TokenEndpointAuthMethodsSupported: []string{"client_secret_basic", "client_secret_post"},
		CodeChallengeMethodsSupported:     []string{"S256"},
	})
}

// Loopback redirect URIs match on any port (RFC 8252), since native apps
// listen on whatever port is free; everything else matches exactly.
func matchRedirectURI(registered []string, requested string) bool {
	for _, uri := range registered {
		if uri == requested || sameLoopbackURI(uri, requested) {
			return true
		}
	}
	return false
}

func sameLoopbackURI(registered, requested string) bool {
	a, errA := url.Parse(registered)
	b, errB := url.Parse(requested)
	if errA != nil || errB != nil || a.Scheme != "http" || b.Scheme != "http" {
		return false
	}
	host := a.Hostname()
	if host != "localhost" && !net.ParseIP(host).IsLoopback() {
		return false
	}
	return host == b.Hostname() && a.Path == b.Path && a.RawQuery == b.RawQuery && b.User == nil && b.Fragment == ""
}

func withParameters(base string, parameters url.Values) string {
	target, err := url.Parse(base)
	if err != nil {
		return base
	}
	query := target.Query()
	for key, values := range parameters {
		for _, value := range values {
			if value != "" {
				query.Add(key, value)
			}
		}
	}
	target.RawQuery = query.Encode()
	return target.String()
}
