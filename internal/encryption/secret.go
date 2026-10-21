package encryption

import "crypto/rand"

var secretAdditionalData = []byte("noteme:v2:ai-key")

// prefix + base64(salt(16) || nonce(24) || ciphertext || tag(16)); the key is
// Argon2id over the passphrase with that salt (decision 0.83).
func EncryptSecret(passphrase, secret string) (string, error) {
	salt := make([]byte, saltSize)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	sealed, err := seal(passwordKey(passphrase, salt), []byte(secret), secretAdditionalData)
	if err != nil {
		return "", err
	}
	return encode(append(salt, sealed...)), nil
}

func DecryptSecret(passphrase, encrypted string) (string, error) {
	data, err := decode(encrypted)
	if err != nil {
		return "", err
	}
	if len(data) < saltSize {
		return "", ErrDecrypt
	}
	salt, sealed := data[:saltSize], data[saltSize:]
	secret, err := open(passwordKey(passphrase, salt), sealed, secretAdditionalData)
	if err != nil {
		return "", err
	}
	return string(secret), nil
}
