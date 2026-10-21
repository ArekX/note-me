package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/pbkdf2"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

// Format of the original app's note encryption: base64(salt(16) || iv(12) ||
// AES-256-GCM ciphertext || tag(16)), key from PBKDF2-SHA256 with 500000
// iterations. Note keys are 64 random bytes; notes use those raw bytes as
// the PBKDF2 password.
const (
	legacyIterations = 500000
	legacySaltSize   = 16
	legacyIVSize     = 12
)

func legacyDecrypt(encoded string, password []byte) ([]byte, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("decode base64: %w", err)
	}
	if len(data) < legacySaltSize+legacyIVSize {
		return nil, fmt.Errorf("encrypted value is too short")
	}

	salt := data[:legacySaltSize]
	iv := data[legacySaltSize : legacySaltSize+legacyIVSize]
	ciphertext := data[legacySaltSize+legacyIVSize:]

	key, err := pbkdf2.Key(sha256.New, string(password), salt, legacyIterations, 32)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	return gcm.Open(nil, iv, ciphertext, nil)
}
