package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const (
	maxErrorBody = 64 * 1024
	// A single streamed line holds at most one chunk of an answer.
	maxLineSize = 4 * 1024 * 1024
)

func send(ctx context.Context, client *http.Client, method, url string, headers map[string]string, body any) (*http.Response, error) {
	var reader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("encode request: %w", err)
		}
		reader = bytes.NewReader(data)
	}
	request, err := http.NewRequestWithContext(ctx, method, url, reader)
	if err != nil {
		return nil, err
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	for name, value := range headers {
		request.Header.Set(name, value)
	}

	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	if response.StatusCode >= 300 {
		defer response.Body.Close()
		data, _ := io.ReadAll(io.LimitReader(response.Body, maxErrorBody))
		return nil, &ProviderError{Status: response.StatusCode, Message: errorMessage(data)}
	}
	return response, nil
}

func getJSON(ctx context.Context, client *http.Client, url string, headers map[string]string, target any) error {
	response, err := send(ctx, client, http.MethodGet, url, headers, nil)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if err := json.NewDecoder(response.Body).Decode(target); err != nil {
		return fmt.Errorf("read response: %w", err)
	}
	return nil
}

// {"error":{"message":"..."}} from OpenAI and Claude, {"error":"..."} from
// Ollama; anything else is shown as sent.
func errorMessage(data []byte) string {
	var nested struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if json.Unmarshal(data, &nested) == nil && nested.Error.Message != "" {
		return nested.Error.Message
	}
	var flat struct {
		Error string `json:"error"`
	}
	if json.Unmarshal(data, &flat) == nil && flat.Error != "" {
		return flat.Error
	}
	text := strings.TrimSpace(string(data))
	if text == "" {
		return "no details"
	}
	return text
}

func newScanner(r io.Reader) *bufio.Scanner {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), maxLineSize)
	return scanner
}

// Server-sent events: fn gets each event's name (empty without one) and its
// data lines joined.
func readEvents(r io.Reader, fn func(event, data string) error) error {
	scanner := newScanner(r)
	var event string
	var data []string
	dispatch := func() error {
		if len(data) == 0 {
			event = ""
			return nil
		}
		err := fn(event, strings.Join(data, "\n"))
		event, data = "", nil
		return err
	}
	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case line == "":
			if err := dispatch(); err != nil {
				return err
			}
		case strings.HasPrefix(line, ":"):
		case strings.HasPrefix(line, "event:"):
			event = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
		case strings.HasPrefix(line, "data:"):
			data = append(data, strings.TrimPrefix(strings.TrimPrefix(line, "data:"), " "))
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	return dispatch()
}

// A model can send arguments that are not JSON; they are kept as a JSON
// string so the tool's validation reports them.
func validArguments(raw string) json.RawMessage {
	if strings.TrimSpace(raw) == "" {
		return json.RawMessage(`{}`)
	}
	if json.Valid([]byte(raw)) {
		return json.RawMessage(raw)
	}
	quoted, _ := json.Marshal(raw)
	return quoted
}

func bearer(key string) map[string]string {
	if key == "" {
		return nil
	}
	return map[string]string{"Authorization": "Bearer " + key}
}
