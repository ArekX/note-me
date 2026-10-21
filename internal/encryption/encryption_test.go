package encryption

import (
	"errors"
	"strings"
	"testing"
)

func TestNoteKeyRoundTrip(t *testing.T) {
	encryptedKey, err := GenerateNoteEncryptionKey("password123")
	if err != nil {
		t.Fatal(err)
	}
	if !IsCurrentFormat(encryptedKey) {
		t.Fatalf("key %q is not in the current format", encryptedKey)
	}

	key, err := OpenNoteKey(encryptedKey, "password123")
	if err != nil {
		t.Fatal(err)
	}
	if len(key) != noteKeySize {
		t.Fatalf("key length = %d", len(key))
	}

	if _, err := OpenNoteKey(encryptedKey, "wrong-password"); !errors.Is(err, ErrDecrypt) {
		t.Errorf("wrong password error = %v, want ErrDecrypt", err)
	}

	encryptedNote, err := EncryptNote(key, "Secret note ✓\nline two")
	if err != nil {
		t.Fatal(err)
	}

	reEncryptedKey, err := ReEncryptNoteKey("password123", "new-password", encryptedKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := OpenNoteKey(reEncryptedKey, "password123"); !errors.Is(err, ErrDecrypt) {
		t.Errorf("old password still opens the re-encrypted key: %v", err)
	}

	sameKey, err := OpenNoteKey(reEncryptedKey, "new-password")
	if err != nil {
		t.Fatal(err)
	}
	text, err := DecryptNote(sameKey, encryptedNote)
	if err != nil {
		t.Fatal(err)
	}
	if text != "Secret note ✓\nline two" {
		t.Errorf("decrypted note = %q", text)
	}
}

func TestDecryptRejectsTamperedAndForeignData(t *testing.T) {
	key := make([]byte, noteKeySize)
	encrypted, err := EncryptNote(key, "text")
	if err != nil {
		t.Fatal(err)
	}

	tampered := []byte(encrypted)
	tampered[len(tampered)-3] ^= 1
	if _, err := DecryptNote(key, string(tampered)); err == nil {
		t.Error("tampered note decrypted")
	}

	encryptedKey, err := sealNoteKey(key, "password123")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := DecryptNote(key, encryptedKey); !errors.Is(err, ErrDecrypt) {
		t.Errorf("wrapped key decrypted as a note: %v", err)
	}

	legacy := "t6CulJzap2kZwN0P34Cx4GclmwOa50a+7Z0vhtOLxFbk+H5BkXuhGX8zRfrU3Iwaou57XsnJ0ey9mGXRLtseEO7HDyQ="
	if _, err := DecryptNote(key, legacy); !errors.Is(err, ErrUnsupportedFormat) {
		t.Errorf("legacy note error = %v, want ErrUnsupportedFormat", err)
	}
	if _, err := OpenNoteKey(strings.TrimPrefix(encryptedKey, prefix), "password123"); !errors.Is(err, ErrUnsupportedFormat) {
		t.Errorf("unprefixed key error = %v, want ErrUnsupportedFormat", err)
	}
}
