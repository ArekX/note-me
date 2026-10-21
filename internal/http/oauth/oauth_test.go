package oauth

import (
	"testing"
	"time"
)

func TestMatchRedirectURI(t *testing.T) {
	registered := []string{"https://claude.ai/api/mcp/auth_callback", "http://127.0.0.1:3000/callback", "http://localhost/cb?x=1"}
	cases := map[string]bool{
		"https://claude.ai/api/mcp/auth_callback":      true,
		"https://claude.ai/api/mcp/auth_callback/":     false,
		"https://claude.ai:8443/api/mcp/auth_callback": false,
		"http://127.0.0.1:51234/callback":              true,
		"http://127.0.0.1/callback":                    true,
		"http://127.0.0.1:51234/other":                 false,
		"http://127.0.0.2:3000/callback":               false,
		"http://localhost:9999/cb?x=1":                 true,
		"http://localhost:9999/cb?x=2":                 false,
		"http://user@127.0.0.1:3000/callback":          false,
		"https://127.0.0.1:3000/callback":              false,
		"":                                             false,
	}
	for uri, want := range cases {
		if got := matchRedirectURI(registered, uri); got != want {
			t.Errorf("%q = %v, want %v", uri, got, want)
		}
	}
}

func TestCodesAreSingleUseAndExpire(t *testing.T) {
	s := &Server{codes: map[string]authorizationCode{}}
	s.storeCode("live", authorizationCode{clientID: 1, expiresAt: time.Now().Add(time.Minute)})
	s.storeCode("expired", authorizationCode{clientID: 1, expiresAt: time.Now().Add(-time.Second)})

	if code, ok := s.takeCode("live"); !ok || code.clientID != 1 {
		t.Errorf("live code = %v, %v", code, ok)
	}
	if _, ok := s.takeCode("live"); ok {
		t.Error("code used twice")
	}
	if _, ok := s.takeCode("expired"); ok {
		t.Error("expired code accepted")
	}
	s.storeCode("other", authorizationCode{expiresAt: time.Now().Add(time.Minute)})
	if len(s.codes) != 1 {
		t.Errorf("expired codes kept: %d", len(s.codes))
	}
}
