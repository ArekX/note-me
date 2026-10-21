package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"noteme/internal/components/repository"
	"noteme/internal/encryption"
)

const (
	TypeOllama = "ollama"
	TypeOpenAI = "openai"
	TypeClaude = "claude"
)

var Types = []string{TypeOllama, TypeOpenAI, TypeClaude}

// Ollama defaults to its cloud; a local server is http://localhost:11434.
var DefaultBaseURLs = map[string]string{
	TypeOllama: "https://ollama.com",
	TypeOpenAI: "https://api.openai.com/v1",
	TypeClaude: "https://api.anthropic.com",
}

var ErrKeyUnreadable = errors.New("API key cannot be decrypted, enter it again")

const (
	RoleUser      = "user"
	RoleAssistant = "assistant"
	RoleTool      = "tool"
)

type ToolCall struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments"`
}

// One format for every provider; each client converts it.
type Message struct {
	Role    string
	Content string
	// Assistant messages.
	ToolCalls []ToolCall
	// Tool messages.
	ToolCallID string
	ToolName   string
}

type Tool struct {
	Name        string
	Description string
	// JSON schema of the arguments, an object.
	Parameters json.RawMessage
}

type Request struct {
	Model    string
	System   string
	Messages []Message
	Tools    []Tool
}

type Response struct {
	Text      string
	ToolCalls []ToolCall
}

type Provider interface {
	// onText gets the answer's text as it arrives.
	Stream(ctx context.Context, request Request, onText func(text string)) (*Response, error)
	ListModels(ctx context.Context) ([]string, error)
}

type ProviderError struct {
	Status  int
	Message string
}

func (e *ProviderError) Error() string {
	if e.Status == 0 {
		return e.Message
	}
	if text := http.StatusText(e.Status); text != "" {
		return fmt.Sprintf("%d %s: %s", e.Status, text, e.Message)
	}
	return fmt.Sprintf("%d: %s", e.Status, e.Message)
}

type openedKey struct {
	sealed string
	plain  string
}

// Opened keys are kept per provider and replaced when the sealed value
// changes, so a turn does not pay for Argon2id.
type AI struct {
	secret string
	client *http.Client

	mu   sync.Mutex
	keys map[int64]openedKey
}

func New(secret string) *AI {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	// Ollama may load the model before it answers.
	transport.ResponseHeaderTimeout = 5 * time.Minute
	return &AI{secret: secret, client: &http.Client{Transport: transport}, keys: map[int64]openedKey{}}
}

func (a *AI) SealKey(key string) (string, error) {
	return encryption.EncryptSecret(a.secret, key)
}

func (a *AI) OpenKey(providerID int64, sealed string) (string, error) {
	a.mu.Lock()
	cached, ok := a.keys[providerID]
	a.mu.Unlock()
	if ok && cached.sealed == sealed {
		return cached.plain, nil
	}

	plain, err := encryption.DecryptSecret(a.secret, sealed)
	if err != nil {
		return "", ErrKeyUnreadable
	}
	a.mu.Lock()
	a.keys[providerID] = openedKey{sealed: sealed, plain: plain}
	a.mu.Unlock()
	return plain, nil
}

func (a *AI) Client(provider repository.AIProvider) (Provider, error) {
	key := ""
	if provider.APIKey != nil {
		var err error
		if key, err = a.OpenKey(provider.Id, *provider.APIKey); err != nil {
			return nil, err
		}
	}
	return NewClient(a.client, provider.Type, provider.BaseURL, key)
}

func NewClient(client *http.Client, providerType, baseURL, key string) (Provider, error) {
	if baseURL == "" {
		baseURL = DefaultBaseURLs[providerType]
	}
	switch providerType {
	case TypeOpenAI:
		return &openAI{client: client, baseURL: baseURL, key: key}, nil
	case TypeClaude:
		return &claude{client: client, baseURL: baseURL, key: key}, nil
	case TypeOllama:
		return &ollama{client: client, baseURL: baseURL, key: key}, nil
	}
	return nil, fmt.Errorf("unknown AI provider type %q", providerType)
}

func (a *AI) HTTP() *http.Client {
	return a.client
}
