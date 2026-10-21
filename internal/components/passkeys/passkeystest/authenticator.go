package passkeystest

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"net/url"

	"github.com/go-webauthn/webauthn/protocol/webauthncbor"
	"github.com/go-webauthn/webauthn/protocol/webauthncose"
)

// AuthenticatorFlags bits of the WebAuthn specification, §6.1.
const (
	flagUserPresent    = 0x01
	flagUserVerified   = 0x04
	flagBackupEligible = 0x08
	flagBackupState    = 0x10
	flagAttestedData   = 0x40
)

// A software authenticator that answers WebAuthn options the way a browser
// and a passkey provider would.
type Authenticator struct {
	Origin         string
	CredentialID   []byte
	UserHandle     []byte
	Counter        uint32
	FreezeCounter  bool
	UserVerified   bool
	BackupEligible bool
	BackupState    bool
	Transports     []string
	// nil leaves credProps out of the registration response.
	Discoverable *bool

	key *ecdsa.PrivateKey
}

func New(origin string) *Authenticator {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		panic(err)
	}
	id := make([]byte, 16)
	_, _ = rand.Read(id)
	discoverable := true
	return &Authenticator{
		Origin:         origin,
		CredentialID:   id,
		UserVerified:   true,
		BackupEligible: true,
		BackupState:    true,
		Transports:     []string{"internal", "hybrid"},
		Discoverable:   &discoverable,
		key:            key,
	}
}

type options struct {
	Challenge string `json:"challenge"`
	User      struct {
		ID string `json:"id"`
	} `json:"user"`
}

// Takes PublicKeyCredentialCreationOptionsJSON and returns RegistrationResponseJSON.
func (a *Authenticator) Register(creationOptions any) (json.RawMessage, error) {
	opts, err := decodeOptions(creationOptions)
	if err != nil {
		return nil, err
	}
	if a.UserHandle, err = base64.RawURLEncoding.DecodeString(opts.User.ID); err != nil {
		return nil, fmt.Errorf("decode user id: %w", err)
	}

	clientData := a.clientData("webauthn.create", opts.Challenge)

	// Uncompressed point: 0x04 || X || Y.
	point, err := a.key.PublicKey.Bytes()
	if err != nil {
		return nil, err
	}
	publicKey, err := webauthncbor.Marshal(webauthncose.EC2PublicKeyData{
		PublicKeyData: webauthncose.PublicKeyData{KeyType: int64(webauthncose.EllipticKey), Algorithm: int64(webauthncose.AlgES256)},
		Curve:         int64(webauthncose.P256),
		XCoord:        point[1:33],
		YCoord:        point[33:],
	})
	if err != nil {
		return nil, err
	}

	authData := a.authData(flagAttestedData)
	authData = append(authData, make([]byte, 16)...)
	authData = binary.BigEndian.AppendUint16(authData, uint16(len(a.CredentialID)))
	authData = append(authData, a.CredentialID...)
	authData = append(authData, publicKey...)

	attestation, err := webauthncbor.Marshal(map[string]any{
		"fmt":      "none",
		"attStmt":  map[string]any{},
		"authData": authData,
	})
	if err != nil {
		return nil, err
	}

	extensions := map[string]any{}
	if a.Discoverable != nil {
		extensions["credProps"] = map[string]bool{"rk": *a.Discoverable}
	}

	return json.Marshal(map[string]any{
		"id":    encode(a.CredentialID),
		"rawId": encode(a.CredentialID),
		"type":  "public-key",
		"response": map[string]any{
			"clientDataJSON":    encode(clientData),
			"attestationObject": encode(attestation),
			"transports":        a.Transports,
		},
		"clientExtensionResults":  extensions,
		"authenticatorAttachment": "platform",
	})
}

// Takes PublicKeyCredentialRequestOptionsJSON and returns AuthenticationResponseJSON.
func (a *Authenticator) Login(requestOptions any) (json.RawMessage, error) {
	opts, err := decodeOptions(requestOptions)
	if err != nil {
		return nil, err
	}
	if !a.FreezeCounter {
		a.Counter++
	}

	clientData := a.clientData("webauthn.get", opts.Challenge)
	authData := a.authData(0)
	clientDataHash := sha256.Sum256(clientData)
	digest := sha256.Sum256(append(authData[:len(authData):len(authData)], clientDataHash[:]...))
	signature, err := ecdsa.SignASN1(rand.Reader, a.key, digest[:])
	if err != nil {
		return nil, err
	}

	return json.Marshal(map[string]any{
		"id":    encode(a.CredentialID),
		"rawId": encode(a.CredentialID),
		"type":  "public-key",
		"response": map[string]any{
			"clientDataJSON":    encode(clientData),
			"authenticatorData": encode(authData),
			"signature":         encode(signature),
			"userHandle":        encode(a.UserHandle),
		},
		"clientExtensionResults":  map[string]any{},
		"authenticatorAttachment": "platform",
	})
}

func (a *Authenticator) clientData(ceremony, challenge string) []byte {
	data, _ := json.Marshal(map[string]any{
		"type":        ceremony,
		"challenge":   challenge,
		"origin":      a.Origin,
		"crossOrigin": false,
	})
	return data
}

func (a *Authenticator) authData(extraFlags byte) []byte {
	origin, _ := url.Parse(a.Origin)
	rpIDHash := sha256.Sum256([]byte(origin.Hostname()))

	flags := flagUserPresent | extraFlags
	if a.UserVerified {
		flags |= flagUserVerified
	}
	if a.BackupEligible {
		flags |= flagBackupEligible
	}
	if a.BackupState {
		flags |= flagBackupState
	}

	data := append(rpIDHash[:], flags)
	return binary.BigEndian.AppendUint32(data, a.Counter)
}

func decodeOptions(value any) (options, error) {
	raw, ok := value.(json.RawMessage)
	if !ok {
		var err error
		if raw, err = json.Marshal(value); err != nil {
			return options{}, err
		}
	}
	var opts options
	if err := json.Unmarshal(raw, &opts); err != nil {
		return options{}, fmt.Errorf("decode options: %w", err)
	}
	return opts, nil
}

func encode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}
