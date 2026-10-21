package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"strings"
)

const (
	claudeVersion = "2023-06-01"
	// The Messages API requires a limit; this one fits every current model.
	claudeMaxTokens = 8192
)

type claude struct {
	client  *http.Client
	baseURL string
	key     string
}

type claudeBlock struct {
	Type      string          `json:"type"`
	Text      string          `json:"text,omitempty"`
	ID        string          `json:"id,omitempty"`
	Name      string          `json:"name,omitempty"`
	Input     json.RawMessage `json:"input,omitempty"`
	ToolUseID string          `json:"tool_use_id,omitempty"`
	Content   string          `json:"content,omitempty"`
}

type claudeMessage struct {
	Role    string        `json:"role"`
	Content []claudeBlock `json:"content"`
}

type claudeTool struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	InputSchema json.RawMessage `json:"input_schema"`
}

func (c *claude) headers() map[string]string {
	return map[string]string{"x-api-key": c.key, "anthropic-version": claudeVersion}
}

// Tool results travel in user messages, and the roles have to alternate, so
// a tool message and the user text after it share one user message.
func claudeMessages(messages []Message) []claudeMessage {
	result := []claudeMessage{}
	add := func(role string, blocks ...claudeBlock) {
		if len(blocks) == 0 {
			return
		}
		if last := len(result) - 1; last >= 0 && result[last].Role == role {
			result[last].Content = append(result[last].Content, blocks...)
			return
		}
		result = append(result, claudeMessage{Role: role, Content: blocks})
	}
	for _, message := range messages {
		switch message.Role {
		case RoleTool:
			add("user", claudeBlock{Type: "tool_result", ToolUseID: message.ToolCallID, Content: message.Content})
		case RoleAssistant:
			var blocks []claudeBlock
			if message.Content != "" {
				blocks = append(blocks, claudeBlock{Type: "text", Text: message.Content})
			}
			for _, call := range message.ToolCalls {
				input := call.Arguments
				if !strings.HasPrefix(strings.TrimSpace(string(input)), "{") {
					input = json.RawMessage(`{}`)
				}
				blocks = append(blocks, claudeBlock{Type: "tool_use", ID: call.ID, Name: call.Name, Input: input})
			}
			add("assistant", blocks...)
		default:
			add("user", claudeBlock{Type: "text", Text: message.Content})
		}
	}
	return result
}

type claudeEvent struct {
	Type         string `json:"type"`
	Index        int    `json:"index"`
	ContentBlock struct {
		Type string `json:"type"`
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"content_block"`
	Delta struct {
		Type        string `json:"type"`
		Text        string `json:"text"`
		PartialJSON string `json:"partial_json"`
	} `json:"delta"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *claude) Stream(ctx context.Context, request Request, onText func(text string)) (*Response, error) {
	body := map[string]any{
		"model":      request.Model,
		"max_tokens": claudeMaxTokens,
		"messages":   claudeMessages(request.Messages),
		"stream":     true,
	}
	if request.System != "" {
		body["system"] = request.System
	}
	if len(request.Tools) > 0 {
		tools := make([]claudeTool, 0, len(request.Tools))
		for _, tool := range request.Tools {
			tools = append(tools, claudeTool{Name: tool.Name, Description: tool.Description, InputSchema: tool.Parameters})
		}
		body["tools"] = tools
	}
	response, err := send(ctx, c.client, http.MethodPost, strings.TrimRight(c.baseURL, "/")+"/v1/messages", c.headers(), body)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	var text strings.Builder
	type pendingCall struct{ id, name, arguments string }
	calls := map[int]*pendingCall{}
	err = readEvents(response.Body, func(_, data string) error {
		var event claudeEvent
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			return fmt.Errorf("read stream: %w", err)
		}
		switch event.Type {
		case "error":
			return &ProviderError{Message: event.Error.Message}
		case "content_block_start":
			if event.ContentBlock.Type == "tool_use" {
				calls[event.Index] = &pendingCall{id: event.ContentBlock.ID, name: event.ContentBlock.Name}
			}
		case "content_block_delta":
			switch event.Delta.Type {
			case "text_delta":
				text.WriteString(event.Delta.Text)
				onText(event.Delta.Text)
			case "input_json_delta":
				if call := calls[event.Index]; call != nil {
					call.arguments += event.Delta.PartialJSON
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	result := &Response{Text: text.String()}
	for _, index := range slices.Sorted(maps.Keys(calls)) {
		call := calls[index]
		result.ToolCalls = append(result.ToolCalls, ToolCall{ID: call.id, Name: call.name, Arguments: validArguments(call.arguments)})
	}
	return result, nil
}

func (c *claude) ListModels(ctx context.Context) ([]string, error) {
	var list struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := getJSON(ctx, c.client, strings.TrimRight(c.baseURL, "/")+"/v1/models?limit=1000", c.headers(), &list); err != nil {
		return nil, err
	}
	models := make([]string, 0, len(list.Data))
	for _, model := range list.Data {
		models = append(models, model.ID)
	}
	slices.Sort(models)
	return models, nil
}
