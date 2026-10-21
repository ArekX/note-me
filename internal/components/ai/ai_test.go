package ai

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"noteme/internal/components/repository"
)

type recorded struct {
	path    string
	headers http.Header
	body    map[string]any
}

// Replays a captured stream and records the request it got.
func replay(t *testing.T, status int, stream string) (*httptest.Server, *recorded) {
	t.Helper()
	got := &recorded{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got.path = r.URL.RequestURI()
		got.headers = r.Header.Clone()
		if data, _ := io.ReadAll(r.Body); len(data) > 0 {
			if err := json.Unmarshal(data, &got.body); err != nil {
				t.Errorf("request body: %v", err)
			}
		}
		w.WriteHeader(status)
		for _, part := range strings.SplitAfter(stream, "\n") {
			_, _ = io.WriteString(w, part)
			w.(http.Flusher).Flush()
		}
	}))
	t.Cleanup(server.Close)
	return server, got
}

func client(t *testing.T, providerType, url, key string) Provider {
	t.Helper()
	provider, err := NewClient(http.DefaultClient, providerType, url, key)
	if err != nil {
		t.Fatal(err)
	}
	return provider
}

func encode(t *testing.T, value any) string {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

var history = Request{
	Model:  "test-model",
	System: "You are NoteMe's assistant.",
	Messages: []Message{
		{Role: RoleUser, Content: "Find my plan"},
		{Role: RoleAssistant, ToolCalls: []ToolCall{{ID: "call-1", Name: "search_notes", Arguments: json.RawMessage(`{"query":"plan"}`)}}},
		{Role: RoleTool, ToolCallID: "call-1", ToolName: "search_notes", Content: `[{"id":3}]`},
		{Role: RoleUser, Content: "Open it"},
	},
	Tools: []Tool{{Name: "open_note", Description: "Opens a note", Parameters: json.RawMessage(`{"type":"object","properties":{"id":{"type":"integer"}}}`)}},
}

func collect(t *testing.T, provider Provider) (*Response, []string) {
	t.Helper()
	var chunks []string
	response, err := provider.Stream(context.Background(), history, func(text string) { chunks = append(chunks, text) })
	if err != nil {
		t.Fatal(err)
	}
	return response, chunks
}

func TestOpenAIStream(t *testing.T) {
	server, got := replay(t, http.StatusOK, `data: {"choices":[{"delta":{"role":"assistant","content":"Opening "}}]}

data: {"choices":[{"delta":{"content":"it."}}]}

data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-9","type":"function","function":{"name":"open_note","arguments":""}}]}}]}

data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"id\":"}}]}}]}

data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"3}"}}]}}]}

data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}

data: [DONE]

`)
	response, chunks := collect(t, client(t, TypeOpenAI, server.URL+"/v1/", "sk-test"))

	if response.Text != "Opening it." || strings.Join(chunks, "|") != "Opening |it." {
		t.Errorf("text = %q, chunks = %q", response.Text, chunks)
	}
	if encode(t, response.ToolCalls) != `[{"id":"call-9","name":"open_note","arguments":{"id":3}}]` {
		t.Errorf("tool calls = %s", encode(t, response.ToolCalls))
	}
	if got.path != "/v1/chat/completions" || got.headers.Get("Authorization") != "Bearer sk-test" {
		t.Errorf("request = %s %v", got.path, got.headers)
	}
	want := `[{"content":"You are NoteMe's assistant.","role":"system"},{"content":"Find my plan","role":"user"},` +
		`{"content":null,"role":"assistant","tool_calls":[{"function":{"arguments":"{\"query\":\"plan\"}","name":"search_notes"},"id":"call-1","type":"function"}]},` +
		`{"content":"[{\"id\":3}]","role":"tool","tool_call_id":"call-1"},{"content":"Open it","role":"user"}]`
	if messages := encode(t, got.body["messages"]); messages != want {
		t.Errorf("messages = %s", messages)
	}
	if tools := encode(t, got.body["tools"]); tools != `[{"function":{"description":"Opens a note","name":"open_note","parameters":{"properties":{"id":{"type":"integer"}},"type":"object"}},"type":"function"}]` {
		t.Errorf("tools = %s", tools)
	}
	if got.body["stream"] != true || got.body["model"] != "test-model" {
		t.Errorf("body = %v", got.body)
	}
}

func TestClaudeStream(t *testing.T) {
	server, got := replay(t, http.StatusOK, `event: message_start
data: {"type":"message_start","message":{"id":"msg_1","role":"assistant","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: ping
data: {"type": "ping"}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Opening "}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"it."}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_1","name":"open_note","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"id\""}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":": 3}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}

event: message_stop
data: {"type":"message_stop"}
`)
	response, chunks := collect(t, client(t, TypeClaude, server.URL, "sk-ant"))

	if response.Text != "Opening it." || len(chunks) != 2 {
		t.Errorf("text = %q, chunks = %q", response.Text, chunks)
	}
	if encode(t, response.ToolCalls) != `[{"id":"toolu_1","name":"open_note","arguments":{"id":3}}]` {
		t.Errorf("tool calls = %s", encode(t, response.ToolCalls))
	}
	if got.path != "/v1/messages" || got.headers.Get("x-api-key") != "sk-ant" || got.headers.Get("anthropic-version") != "2023-06-01" {
		t.Errorf("request = %s %v", got.path, got.headers)
	}
	// The tool result and the next user text share one user message.
	want := `[{"content":[{"text":"Find my plan","type":"text"}],"role":"user"},` +
		`{"content":[{"id":"call-1","input":{"query":"plan"},"name":"search_notes","type":"tool_use"}],"role":"assistant"},` +
		`{"content":[{"content":"[{\"id\":3}]","tool_use_id":"call-1","type":"tool_result"},{"text":"Open it","type":"text"}],"role":"user"}]`
	if messages := encode(t, got.body["messages"]); messages != want {
		t.Errorf("messages = %s", messages)
	}
	if got.body["system"] != "You are NoteMe's assistant." || got.body["max_tokens"] != float64(claudeMaxTokens) {
		t.Errorf("body = %v", got.body)
	}
	if tools := encode(t, got.body["tools"]); tools != `[{"description":"Opens a note","input_schema":{"properties":{"id":{"type":"integer"}},"type":"object"},"name":"open_note"}]` {
		t.Errorf("tools = %s", tools)
	}
}

func TestOllamaStream(t *testing.T) {
	server, got := replay(t, http.StatusOK, `{"model":"llama","message":{"role":"assistant","content":"Opening "},"done":false}
{"model":"llama","message":{"role":"assistant","content":"it."},"done":false}
{"model":"llama","message":{"role":"assistant","content":"","tool_calls":[{"function":{"name":"open_note","arguments":{"id":3}}}]},"done":false}
{"model":"llama","message":{"role":"assistant","content":""},"done":true,"done_reason":"stop"}
`)
	response, chunks := collect(t, client(t, TypeOllama, server.URL, ""))

	if response.Text != "Opening it." || len(chunks) != 2 {
		t.Errorf("text = %q, chunks = %q", response.Text, chunks)
	}
	if len(response.ToolCalls) != 1 || !strings.HasPrefix(response.ToolCalls[0].ID, "call_") || string(response.ToolCalls[0].Arguments) != `{"id":3}` {
		t.Errorf("tool calls = %s", encode(t, response.ToolCalls))
	}
	if got.path != "/api/chat" || got.headers.Get("Authorization") != "" {
		t.Errorf("request = %s %v", got.path, got.headers)
	}
	want := `[{"content":"You are NoteMe's assistant.","role":"system"},{"content":"Find my plan","role":"user"},` +
		`{"content":"","role":"assistant","tool_calls":[{"function":{"arguments":{"query":"plan"},"name":"search_notes"}}]},` +
		`{"content":"[{\"id\":3}]","role":"tool","tool_name":"search_notes"},{"content":"Open it","role":"user"}]`
	if messages := encode(t, got.body["messages"]); messages != want {
		t.Errorf("messages = %s", messages)
	}

	keyed, got := replay(t, http.StatusOK, `{"message":{"role":"assistant","content":"ok"},"done":true}`+"\n")
	collect(t, client(t, TypeOllama, keyed.URL, "ollama-key"))
	if got.headers.Get("Authorization") != "Bearer ollama-key" {
		t.Errorf("headers with a key = %v", got.headers)
	}
}

func TestToolArgumentsThatAreNotJSON(t *testing.T) {
	server, _ := replay(t, http.StatusOK, `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c","function":{"name":"open_note","arguments":"{id: 3"}}]}}]}

data: {"choices":[{"delta":{"tool_calls":[{"index":1,"id":"d","function":{"name":"get_tree"}}]}}]}

data: [DONE]
`)
	response, _ := collect(t, client(t, TypeOpenAI, server.URL, ""))
	if encode(t, response.ToolCalls) != `[{"id":"c","name":"open_note","arguments":"{id: 3"},{"id":"d","name":"get_tree","arguments":{}}]` {
		t.Errorf("tool calls = %s", encode(t, response.ToolCalls))
	}
}

func TestProviderErrors(t *testing.T) {
	for name, tt := range map[string]struct {
		providerType, stream string
		status               int
		want                 string
	}{
		"openai status":   {TypeOpenAI, `{"error":{"message":"Incorrect API key provided","type":"invalid_request_error"}}`, http.StatusUnauthorized, "401 Unauthorized: Incorrect API key provided"},
		"claude status":   {TypeClaude, `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`, 529, "529: Overloaded"},
		"ollama status":   {TypeOllama, `{"error":"registry.ollama.ai/library/gemma does not support tools"}`, http.StatusBadRequest, "400 Bad Request: registry.ollama.ai/library/gemma does not support tools"},
		"plain text":      {TypeOpenAI, "bad gateway", http.StatusBadGateway, "502 Bad Gateway: bad gateway"},
		"openai stream":   {TypeOpenAI, "data: {\"error\":{\"message\":\"Rate limited\"}}\n\n", http.StatusOK, "Rate limited"},
		"claude stream":   {TypeClaude, "event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"api_error\",\"message\":\"Internal error\"}}\n\n", http.StatusOK, "Internal error"},
		"ollama stream":   {TypeOllama, `{"error":"model not found"}` + "\n", http.StatusOK, "model not found"},
		"broken response": {TypeOllama, "not json\n", http.StatusOK, "read stream"},
	} {
		server, _ := replay(t, tt.status, tt.stream)
		_, err := client(t, tt.providerType, server.URL, "key").Stream(context.Background(), history, func(string) {})
		if err == nil || !strings.Contains(err.Error(), tt.want) {
			t.Errorf("%s: error = %v, want %q", name, err, tt.want)
		}
		var providerErr *ProviderError
		if name != "broken response" && !errors.As(err, &providerErr) {
			t.Errorf("%s: %T is not a ProviderError", name, err)
		}
	}
}

func TestStreamStopsOnCancel(t *testing.T) {
	release := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "data: {\"choices\":[{\"delta\":{\"content\":\"Thinking\"}}]}\n\n")
		w.(http.Flusher).Flush()
		select {
		case <-r.Context().Done():
		case <-release:
		}
	}))
	t.Cleanup(server.Close)
	t.Cleanup(func() { close(release) })

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		_, err := client(t, TypeOpenAI, server.URL, "").Stream(ctx, history, func(string) { cancel() })
		done <- err
	}()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Errorf("error = %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("stream kept running after cancel")
	}
}

func TestListModels(t *testing.T) {
	for providerType, tt := range map[string]struct{ body, path string }{
		TypeOpenAI: {`{"object":"list","data":[{"id":"gpt-b"},{"id":"gpt-a"}]}`, "/models"},
		TypeClaude: {`{"data":[{"id":"gpt-b","type":"model"},{"id":"gpt-a","type":"model"}],"has_more":false}`, "/v1/models?limit=1000"},
		TypeOllama: {`{"models":[{"name":"gpt-b"},{"name":"gpt-a"}]}`, "/api/tags"},
	} {
		server, got := replay(t, http.StatusOK, tt.body)
		models, err := client(t, providerType, server.URL, "key").ListModels(context.Background())
		if err != nil || strings.Join(models, ",") != "gpt-a,gpt-b" || got.path != tt.path {
			t.Errorf("%s: models = %v, %v, path %s", providerType, models, err, got.path)
		}
	}
}

func TestKeys(t *testing.T) {
	service := New("server secret")
	sealed, err := service.SealKey("sk-live")
	if err != nil {
		t.Fatal(err)
	}
	if key, err := service.OpenKey(1, sealed); err != nil || key != "sk-live" {
		t.Fatalf("open = %q, %v", key, err)
	}
	// Cached by the sealed value, so a new key is opened again.
	if key, _ := service.OpenKey(1, sealed); key != "sk-live" {
		t.Errorf("cached key = %q", key)
	}
	resealed, _ := service.SealKey("sk-new")
	if key, _ := service.OpenKey(1, resealed); key != "sk-new" {
		t.Errorf("key after an update = %q", key)
	}

	moved := New("other secret")
	if _, err := moved.OpenKey(1, sealed); !errors.Is(err, ErrKeyUnreadable) {
		t.Errorf("other secret = %v", err)
	}
	if _, err := moved.Client(repository.AIProvider{Id: 1, Type: TypeOpenAI, APIKey: &sealed}); !errors.Is(err, ErrKeyUnreadable) {
		t.Errorf("client with an unreadable key = %v", err)
	}
	if _, err := moved.Client(repository.AIProvider{Id: 2, Type: TypeOllama}); err != nil {
		t.Errorf("client without a key = %v", err)
	}
	if _, err := moved.Client(repository.AIProvider{Id: 3, Type: "gemini"}); err == nil {
		t.Error("unknown type accepted")
	}
}
