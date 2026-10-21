package encryption

import (
	"strings"
	"testing"
)

func TestRandomToken(t *testing.T) {
	first, second := RandomToken("nmcp_", 32), RandomToken("nmcp_", 32)
	if !strings.HasPrefix(first, "nmcp_") || len(first) != len("nmcp_")+43 || first == second {
		t.Errorf("tokens %q, %q", first, second)
	}
}

// Expected value from `printf abc | sha256sum`.
func TestTokenHash(t *testing.T) {
	if got := TokenHash("abc"); got != "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" {
		t.Errorf("hash = %s", got)
	}
}
