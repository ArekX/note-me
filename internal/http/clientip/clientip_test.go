package clientip

import (
	"net/http/httptest"
	"net/netip"
	"testing"
)

func TestFromRequest(t *testing.T) {
	trusted := []netip.Prefix{
		netip.MustParsePrefix("10.0.0.0/8"),
		netip.MustParsePrefix("::1/128"),
	}

	for _, c := range []struct {
		name    string
		remote  string
		headers []string
		want    string
	}{
		{"no proxy", "203.0.113.5:4000", nil, "203.0.113.5"},
		{"untrusted peer cannot spoof", "203.0.113.5:4000", []string{"198.51.100.1"}, "203.0.113.5"},
		{"trusted proxy", "10.0.0.2:80", []string{"198.51.100.1"}, "198.51.100.1"},
		{"client supplied hops are skipped", "10.0.0.2:80", []string{"1.1.1.1, 198.51.100.1"}, "198.51.100.1"},
		{"chain of trusted proxies", "10.0.0.2:80", []string{"198.51.100.1, 10.0.0.9", "10.0.0.3"}, "198.51.100.1"},
		{"only trusted hops", "10.0.0.2:80", []string{"10.0.0.7"}, "10.0.0.7"},
		{"invalid hop stops the walk", "10.0.0.2:80", []string{"198.51.100.1, garbage"}, "10.0.0.2"},
		{"no header from trusted proxy", "[::1]:80", nil, "::1"},
		{"ipv4 mapped peer", "[::ffff:203.0.113.5]:4000", nil, "203.0.113.5"},
	} {
		t.Run(c.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/api/login", nil)
			r.RemoteAddr = c.remote
			for _, header := range c.headers {
				r.Header.Add("X-Forwarded-For", header)
			}
			if got := FromRequest(r, trusted); got != c.want {
				t.Errorf("FromRequest() = %q, want %q", got, c.want)
			}
		})
	}
}
