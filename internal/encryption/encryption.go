package encryption

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/chacha20poly1305"
)

// The prefix cannot occur in standard base64, so a value without it is
// unambiguously in another (older) format.
const prefix = "v2:"

// Argon2id parameters are the second recommended option of RFC 9106; they are
// part of format v2, so changing them needs a new prefix.
const (
	argonTime    = 3
	argonMemory  = 64 * 1024
	argonThreads = 4
	saltSize     = 16
	noteKeySize  = chacha20poly1305.KeySize
)

var (
	keyAdditionalData  = []byte("noteme:v2:key")
	noteAdditionalData = []byte("noteme:v2:note")
)

var (
	ErrUnsupportedFormat = errors.New("encrypted value is not in a supported format")
	ErrDecrypt           = errors.New("could not decrypt, wrong password or corrupted data")
)

func GenerateNoteEncryptionKey(password string) (string, error) {
	key := make([]byte, noteKeySize)
	if _, err := rand.Read(key); err != nil {
		return "", err
	}
	return sealNoteKey(key, password)
}

func ReEncryptNoteKey(oldPassword, newPassword, encryptedKey string) (string, error) {
	key, err := OpenNoteKey(encryptedKey, oldPassword)
	if err != nil {
		return "", err
	}
	return sealNoteKey(key, newPassword)
}

func OpenNoteKey(encryptedKey, password string) ([]byte, error) {
	data, err := decode(encryptedKey)
	if err != nil {
		return nil, err
	}
	if len(data) < saltSize {
		return nil, ErrDecrypt
	}

	salt, sealed := data[:saltSize], data[saltSize:]
	key, err := open(passwordKey(password, salt), sealed, keyAdditionalData)
	if err != nil {
		return nil, err
	}
	if len(key) != noteKeySize {
		return nil, ErrDecrypt
	}
	return key, nil
}

func EncryptNote(noteKey []byte, text string) (string, error) {
	sealed, err := seal(noteKey, []byte(text), noteAdditionalData)
	if err != nil {
		return "", err
	}
	return encode(sealed), nil
}

func DecryptNote(noteKey []byte, encryptedText string) (string, error) {
	data, err := decode(encryptedText)
	if err != nil {
		return "", err
	}
	text, err := open(noteKey, data, noteAdditionalData)
	if err != nil {
		return "", err
	}
	return string(text), nil
}

func sealNoteKey(key []byte, password string) (string, error) {
	salt := make([]byte, saltSize)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	sealed, err := seal(passwordKey(password, salt), key, keyAdditionalData)
	if err != nil {
		return "", err
	}
	return encode(append(salt, sealed...)), nil
}

func passwordKey(password string, salt []byte) []byte {
	return argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, noteKeySize)
}

// nonce(24) || ciphertext || tag(16)
func seal(key, plaintext, additionalData []byte) ([]byte, error) {
	aead, err := chacha20poly1305.NewX(key)
	if err != nil {
		return nil, fmt.Errorf("create cipher: %w", err)
	}

	nonce := make([]byte, aead.NonceSize(), aead.NonceSize()+len(plaintext)+aead.Overhead())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return aead.Seal(nonce, nonce, plaintext, additionalData), nil
}

func open(key, data, additionalData []byte) ([]byte, error) {
	aead, err := chacha20poly1305.NewX(key)
	if err != nil {
		return nil, fmt.Errorf("create cipher: %w", err)
	}
	if len(data) < aead.NonceSize()+aead.Overhead() {
		return nil, ErrDecrypt
	}

	nonce, ciphertext := data[:aead.NonceSize()], data[aead.NonceSize():]
	plaintext, err := aead.Open(nil, nonce, ciphertext, additionalData)
	if err != nil {
		return nil, ErrDecrypt
	}
	return plaintext, nil
}

func IsCurrentFormat(value string) bool {
	return strings.HasPrefix(value, prefix)
}

func encode(data []byte) string {
	return prefix + base64.StdEncoding.EncodeToString(data)
}

func decode(value string) ([]byte, error) {
	encoded, ok := strings.CutPrefix(value, prefix)
	if !ok {
		return nil, ErrUnsupportedFormat
	}
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, ErrUnsupportedFormat
	}
	return data, nil
}
