package clientip

import (
	"net"
	"net/http"
	"net/netip"
	"strings"
)

// X-Forwarded-For is only read when the direct peer is a trusted proxy. Each
// proxy appends the address it received from, so the list is walked from the
// right and the first address that is not a trusted proxy is the client; the
// entries left of it can be anything the client sent.
func FromRequest(r *http.Request, trusted []netip.Prefix) string {
	remote, ok := parseAddr(r.RemoteAddr)
	if !ok {
		return r.RemoteAddr
	}
	if !isTrusted(remote, trusted) {
		return remote.String()
	}

	var hops []string
	for _, value := range r.Header.Values("X-Forwarded-For") {
		hops = append(hops, strings.Split(value, ",")...)
	}

	client := remote
	for i := len(hops) - 1; i >= 0; i-- {
		hop, ok := parseAddr(strings.TrimSpace(hops[i]))
		if !ok {
			break
		}
		client = hop
		if !isTrusted(hop, trusted) {
			break
		}
	}
	return client.String()
}

func parseAddr(value string) (netip.Addr, bool) {
	if host, _, err := net.SplitHostPort(value); err == nil {
		value = host
	}
	addr, err := netip.ParseAddr(value)
	if err != nil {
		return netip.Addr{}, false
	}
	return addr.Unmap().WithZone(""), true
}

func isTrusted(addr netip.Addr, trusted []netip.Prefix) bool {
	for _, prefix := range trusted {
		if prefix.Contains(addr) {
			return true
		}
	}
	return false
}
