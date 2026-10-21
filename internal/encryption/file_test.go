package encryption

import (
	"bytes"
	"crypto/rand"
	"errors"
	"testing"
)

func TestEncryptFileRoundTrip(t *testing.T) {
	for _, size := range []int{0, 1, fileChunkSize - 1, fileChunkSize, fileChunkSize + 1, 3*fileChunkSize + 17} {
		plain := make([]byte, size)
		rand.Read(plain)

		var sealed bytes.Buffer
		if err := EncryptFile(&sealed, bytes.NewReader(plain), "pass phrase"); err != nil {
			t.Fatalf("size %d: encrypt: %v", size, err)
		}
		if !IsEncryptedFile(sealed.Bytes()) {
			t.Fatalf("size %d: magic missing", size)
		}

		var opened bytes.Buffer
		if err := DecryptFile(&opened, bytes.NewReader(sealed.Bytes()), "pass phrase"); err != nil {
			t.Fatalf("size %d: decrypt: %v", size, err)
		}
		if !bytes.Equal(opened.Bytes(), plain) {
			t.Fatalf("size %d: decrypted %d bytes, want %d", size, opened.Len(), size)
		}

		if err := DecryptFile(&bytes.Buffer{}, bytes.NewReader(sealed.Bytes()), "other"); !errors.Is(err, ErrDecrypt) {
			t.Errorf("size %d: wrong passphrase err = %v", size, err)
		}
	}
}

func TestDecryptFileDetectsTampering(t *testing.T) {
	plain := make([]byte, 2*fileChunkSize+5)
	rand.Read(plain)
	var sealed bytes.Buffer
	if err := EncryptFile(&sealed, bytes.NewReader(plain), "k"); err != nil {
		t.Fatal(err)
	}
	data := sealed.Bytes()

	truncated := data[:len(data)-10]
	if err := DecryptFile(&bytes.Buffer{}, bytes.NewReader(truncated), "k"); !errors.Is(err, ErrDecrypt) {
		t.Errorf("truncated err = %v", err)
	}

	flipped := bytes.Clone(data)
	flipped[len(FileMagic)+saltSize+4+24+3] ^= 1
	if err := DecryptFile(&bytes.Buffer{}, bytes.NewReader(flipped), "k"); !errors.Is(err, ErrDecrypt) {
		t.Errorf("flipped err = %v", err)
	}

	// Chunks cannot be reordered: the second chunk moved to the front fails.
	chunkLen := 4 + 24 + fileChunkSize + 16
	start := len(FileMagic) + saltSize
	swapped := append(append(append(bytes.Clone(data[:start]), data[start+chunkLen:start+2*chunkLen]...), data[start:start+chunkLen]...), data[start+2*chunkLen:]...)
	if err := DecryptFile(&bytes.Buffer{}, bytes.NewReader(swapped), "k"); !errors.Is(err, ErrDecrypt) {
		t.Errorf("swapped err = %v", err)
	}

	if err := DecryptFile(&bytes.Buffer{}, bytes.NewReader([]byte("PK\x03\x04 not encrypted")), "k"); !errors.Is(err, ErrNotEncryptedFile) {
		t.Errorf("plain file err = %v", err)
	}
}
