package encryption

import (
	"strings"
	"testing"
)

func TestPasswordHashRoundTrip(t *testing.T) {
	hash, err := HashPassword("correct horse")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(hash, "$argon2id$v=19$m=65536,t=3,p=4$") || !IsPasswordHash(hash) {
		t.Fatalf("hash = %q", hash)
	}
	if !VerifyPassword(hash, "correct horse") {
		t.Error("the right password does not verify")
	}
	if VerifyPassword(hash, "wrong") || VerifyPassword(hash, "") {
		t.Error("a wrong password verifies")
	}

	other, _ := HashPassword("correct horse")
	if other == hash {
		t.Error("two hashes of the same password share a salt")
	}
}

func TestVerifyPasswordRejectsOtherFormats(t *testing.T) {
	for _, hash := range []string{
		"",
		"$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
		"$argon2id$v=19$m=1024,t=1,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaA",
		"$argon2id$v=19$m=65536,t=3,p=4$short$short",
	} {
		if VerifyPassword(hash, "anything") {
			t.Errorf("hash %q verifies", hash)
		}
		if IsPasswordHash(hash) && !strings.HasPrefix(hash, "$argon2id$") {
			t.Errorf("hash %q reported as argon2id", hash)
		}
	}
}
