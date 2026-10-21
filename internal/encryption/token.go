package encryption

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
)

func RandomToken(prefix string, size int) string {
	data := make([]byte, size)
	_, _ = rand.Read(data)
	return prefix + base64.RawURLEncoding.EncodeToString(data)
}

// Tokens carry 256 random bits, so a plain SHA-256 is enough to store them.
func TokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
