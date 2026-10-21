package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/google/uuid"
)

// The key is optional, for ollama.com or a proxy in front of a server.
type ollama struct {
	client  *http.Client
	baseURL string
	key     string
}

type ollamaToolCall struct {
	Function struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	} `json:"function"`
}

type ollamaMessage struct {
	Role      string           `json:"role"`
	Content   string           `json:"content"`
	ToolCalls []ollamaToolCall `json:"tool_calls,omitempty"`
	ToolName  string           `json:"tool_name,omitempty"`
}

func ollamaMessages(request Request) []ollamaMessage {
	messages := []ollamaMessage{}
	if request.System != "" {
		messages = append(messages, ollamaMessage{Role: "system", Content: request.System})
	}
	for _, message := range request.Messages {
		converted := ollamaMessage{Role: message.Role, Content: message.Content, ToolName: message.ToolName}
		for _, call := range message.ToolCalls {
			var toolCall ollamaToolCall
			toolCall.Function.Name = call.Name
			toolCall.Function.Arguments = call.Arguments
			converted.ToolCalls = append(converted.ToolCalls, toolCall)
		}
		messages = append(messages, converted)
	}
	return messages
}

func (o *ollama) Stream(ctx context.Context, request Request, onText func(text string)) (*Response, error) {
	body := map[string]any{
		"model":    request.Model,
		"messages": ollamaMessages(request),
		"stream":   true,
	}
	if len(request.Tools) > 0 {
		body["tools"] = openAITools(request.Tools)
	}
	response, err := send(ctx, o.client, http.MethodPost, strings.TrimRight(o.baseURL, "/")+"/api/chat", bearer(o.key), body)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	result := &Response{}
	var text strings.Builder
	scanner := newScanner(response.Body)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var chunk struct {
			Message ollamaMessage `json:"message"`
			Error   string        `json:"error"`
		}
		if err := json.Unmarshal([]byte(line), &chunk); err != nil {
			return nil, fmt.Errorf("read stream: %w", err)
		}
		if chunk.Error != "" {
			return nil, &ProviderError{Message: chunk.Error}
		}
		if chunk.Message.Content != "" {
			text.WriteString(chunk.Message.Content)
			onText(chunk.Message.Content)
		}
		// Ollama sends whole calls without ids.
		for _, call := range chunk.Message.ToolCalls {
			result.ToolCalls = append(result.ToolCalls, ToolCall{
				ID:        "call_" + uuid.NewString(),
				Name:      call.Function.Name,
				Arguments: validArguments(string(call.Function.Arguments)),
			})
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	result.Text = text.String()
	return result, nil
}

func (o *ollama) ListModels(ctx context.Context) ([]string, error) {
	var list struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if err := getJSON(ctx, o.client, strings.TrimRight(o.baseURL, "/")+"/api/tags", bearer(o.key), &list); err != nil {
		return nil, err
	}
	models := make([]string, 0, len(list.Models))
	for _, model := range list.Models {
		models = append(models, model.Name)
	}
	slices.Sort(models)
	return models, nil
}
