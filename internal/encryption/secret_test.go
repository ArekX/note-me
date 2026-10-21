package encryption

import (
	"encoding/base64"
	"errors"
	"strings"
	"testing"
)

func TestSecretRoundTrip(t *testing.T) {
	sealed, err := EncryptSecret("server key", "sk-test-123")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(sealed, prefix) || strings.Contains(sealed, "sk-test-123") {
		t.Fatalf("sealed = %q", sealed)
	}
	// salt(16) + nonce(24) + 11 bytes + tag(16)
	raw, _ := base64.StdEncoding.DecodeString(strings.TrimPrefix(sealed, prefix))
	if len(raw) != 16+24+11+16 {
		t.Errorf("sealed length = %d", len(raw))
	}

	again, _ := EncryptSecret("server key", "sk-test-123")
	if again == sealed {
		t.Error("two seals of the same secret are equal")
	}
	if secret, err := DecryptSecret("server key", sealed); err != nil || secret != "sk-test-123" {
		t.Errorf("decrypt = %q, %v", secret, err)
	}
}

func TestSecretRefusesOtherKeysAndFormats(t *testing.T) {
	sealed, err := EncryptSecret("server key", "sk-test-123")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := DecryptSecret("other key", sealed); !errors.Is(err, ErrDecrypt) {
		t.Errorf("other key = %v", err)
	}

	noteKey, _ := GenerateNoteEncryptionKey("server key")
	if _, err := DecryptSecret("server key", noteKey); !errors.Is(err, ErrDecrypt) {
		t.Errorf("a note key opened as a secret: %v", err)
	}
	for _, value := range []string{"sk-plain", "v2:!!!", "v2:" + base64.StdEncoding.EncodeToString([]byte("short"))} {
		if _, err := DecryptSecret("server key", value); err == nil {
			t.Errorf("%q was accepted", value)
		}
	}
}
