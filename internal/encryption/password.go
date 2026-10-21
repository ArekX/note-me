package encryption

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"
	"sync"

	"golang.org/x/crypto/argon2"
)

// PHC string: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>, salt and hash in
// unpadded standard base64. Only these parameters are accepted (0.14).
const (
	passwordHashPrefix = "$argon2id$v=19$"
	passwordHashSize   = 32
)

var passwordParams = fmt.Sprintf("m=%d,t=%d,p=%d", argonMemory, argonTime, argonThreads)

func HashPassword(password string) (string, error) {
	salt := make([]byte, saltSize)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, passwordHashSize)
	return passwordHashPrefix + passwordParams + "$" +
		base64.RawStdEncoding.EncodeToString(salt) + "$" +
		base64.RawStdEncoding.EncodeToString(hash), nil
}

func IsPasswordHash(value string) bool {
	return strings.HasPrefix(value, passwordHashPrefix)
}

// A hash in any other format never verifies; the time it takes still
// matches a real check, so a missing user cannot be told apart by timing.
func VerifyPassword(hash, password string) bool {
	salt, want, ok := parsePasswordHash(hash)
	if !ok {
		salt, want, _ = parsePasswordHash(dummyPasswordHash())
		ok = false
	}
	got := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, passwordHashSize)
	return subtle.ConstantTimeCompare(got, want) == 1 && ok
}

func parsePasswordHash(hash string) (salt, want []byte, ok bool) {
	rest, found := strings.CutPrefix(hash, passwordHashPrefix+passwordParams+"$")
	if !found {
		return nil, nil, false
	}
	parts := strings.Split(rest, "$")
	if len(parts) != 2 {
		return nil, nil, false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[0])
	if err != nil || len(salt) != saltSize {
		return nil, nil, false
	}
	want, err = base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil || len(want) != passwordHashSize {
		return nil, nil, false
	}
	return salt, want, true
}

var dummyPasswordHash = sync.OnceValue(func() string {
	hash, err := HashPassword(rand.Text())
	if err != nil {
		panic(err)
	}
	return hash
})
