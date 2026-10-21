package encryption

import (
	"bytes"
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"io"

	"golang.org/x/crypto/chacha20poly1305"
)

// Encrypted file: FileMagic || salt(16) || chunk...; each chunk is
// uint32 BE sealed length || nonce(24) || XChaCha20-Poly1305(plain) || tag.
// The chunk index and whether it is the last one are additional data, so
// chunks cannot be reordered, dropped or cut off at the end. The key comes
// from Argon2id over the passphrase with the file's salt (parameters of 0.14).
const (
	FileMagic     = "NOTEME-ENC-1"
	fileChunkSize = 64 * 1024
)

var (
	fileAdditionalData  = []byte("noteme:v2:file")
	ErrNotEncryptedFile = errors.New("file is not an encrypted NoteMe file")
)

func chunkAdditionalData(index uint64, final bool) []byte {
	data := make([]byte, 0, len(fileAdditionalData)+9)
	data = append(data, fileAdditionalData...)
	data = binary.BigEndian.AppendUint64(data, index)
	if final {
		return append(data, 1)
	}
	return append(data, 0)
}

func EncryptFile(w io.Writer, r io.Reader, passphrase string) error {
	salt := make([]byte, saltSize)
	if _, err := rand.Read(salt); err != nil {
		return err
	}
	aead, err := chacha20poly1305.NewX(passwordKey(passphrase, salt))
	if err != nil {
		return fmt.Errorf("create cipher: %w", err)
	}
	if _, err := w.Write(append([]byte(FileMagic), salt...)); err != nil {
		return err
	}

	buffer := make([]byte, fileChunkSize)
	nonce := make([]byte, aead.NonceSize())
	var index uint64
	for {
		n, readErr := io.ReadFull(r, buffer)
		if readErr != nil && !errors.Is(readErr, io.EOF) && !errors.Is(readErr, io.ErrUnexpectedEOF) {
			return readErr
		}
		final := readErr != nil
		if _, err := rand.Read(nonce); err != nil {
			return err
		}
		sealed := aead.Seal(nil, nonce, buffer[:n], chunkAdditionalData(index, final))
		header := binary.BigEndian.AppendUint32(nil, uint32(len(sealed)))
		for _, part := range [][]byte{header, nonce, sealed} {
			if _, err := w.Write(part); err != nil {
				return err
			}
		}
		if final {
			return nil
		}
		index++
	}
}

func IsEncryptedFile(head []byte) bool {
	return bytes.HasPrefix(head, []byte(FileMagic))
}

func DecryptFile(w io.Writer, r io.Reader, passphrase string) error {
	header := make([]byte, len(FileMagic)+saltSize)
	if _, err := io.ReadFull(r, header); err != nil {
		return ErrNotEncryptedFile
	}
	if !IsEncryptedFile(header) {
		return ErrNotEncryptedFile
	}
	aead, err := chacha20poly1305.NewX(passwordKey(passphrase, header[len(FileMagic):]))
	if err != nil {
		return fmt.Errorf("create cipher: %w", err)
	}

	lengthBytes := make([]byte, 4)
	nonce := make([]byte, aead.NonceSize())
	sealed := make([]byte, 0, fileChunkSize+aead.Overhead())
	var index uint64
	for {
		if _, err := io.ReadFull(r, lengthBytes); err != nil {
			return ErrDecrypt
		}
		length := binary.BigEndian.Uint32(lengthBytes)
		if length < uint32(aead.Overhead()) || length > fileChunkSize+uint32(aead.Overhead()) {
			return ErrDecrypt
		}
		if _, err := io.ReadFull(r, nonce); err != nil {
			return ErrDecrypt
		}
		sealed = sealed[:length]
		if _, err := io.ReadFull(r, sealed); err != nil {
			return ErrDecrypt
		}

		plain, err := aead.Open(nil, nonce, sealed, chunkAdditionalData(index, false))
		final := false
		if err != nil {
			if plain, err = aead.Open(nil, nonce, sealed, chunkAdditionalData(index, true)); err != nil {
				return ErrDecrypt
			}
			final = true
		}
		if _, err := w.Write(plain); err != nil {
			return err
		}
		if final {
			return nil
		}
		index++
	}
}
