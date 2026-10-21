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

// Chat Completions, which OpenAI-compatible servers also offer.
type openAI struct {
	client  *http.Client
	baseURL string
	key     string
}

type openAIFunction struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	Parameters  json.RawMessage `json:"parameters,omitempty"`
	Arguments   *string         `json:"arguments,omitempty"`
}

type openAIToolCall struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Function openAIFunction `json:"function"`
}

type openAIMessage struct {
	Role string `json:"role"`
	// null on an assistant message that only calls tools.
	Content    *string          `json:"content"`
	ToolCalls  []openAIToolCall `json:"tool_calls,omitempty"`
	ToolCallID string           `json:"tool_call_id,omitempty"`
}

type openAITool struct {
	Type     string         `json:"type"`
	Function openAIFunction `json:"function"`
}

type openAIChunk struct {
	Choices []struct {
		Delta struct {
			Content   string `json:"content"`
			ToolCalls []struct {
				Index    int    `json:"index"`
				ID       string `json:"id"`
				Function struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				} `json:"function"`
			} `json:"tool_calls"`
		} `json:"delta"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func openAITools(tools []Tool) []openAITool {
	result := make([]openAITool, 0, len(tools))
	for _, tool := range tools {
		result = append(result, openAITool{Type: "function", Function: openAIFunction{
			Name: tool.Name, Description: tool.Description, Parameters: tool.Parameters,
		}})
	}
	return result
}

func openAIMessages(request Request) []openAIMessage {
	messages := []openAIMessage{}
	if request.System != "" {
		messages = append(messages, openAIMessage{Role: "system", Content: &request.System})
	}
	for _, message := range request.Messages {
		content := message.Content
		converted := openAIMessage{Role: message.Role, Content: &content, ToolCallID: message.ToolCallID}
		for _, call := range message.ToolCalls {
			arguments := string(call.Arguments)
			converted.ToolCalls = append(converted.ToolCalls, openAIToolCall{
				ID: call.ID, Type: "function", Function: openAIFunction{Name: call.Name, Arguments: &arguments},
			})
		}
		if len(converted.ToolCalls) > 0 && content == "" {
			converted.Content = nil
		}
		messages = append(messages, converted)
	}
	return messages
}

func (o *openAI) Stream(ctx context.Context, request Request, onText func(text string)) (*Response, error) {
	body := map[string]any{
		"model":    request.Model,
		"messages": openAIMessages(request),
		"stream":   true,
	}
	if len(request.Tools) > 0 {
		body["tools"] = openAITools(request.Tools)
	}
	response, err := send(ctx, o.client, http.MethodPost, strings.TrimRight(o.baseURL, "/")+"/chat/completions", bearer(o.key), body)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	var text strings.Builder
	type pendingCall struct{ id, name, arguments string }
	calls := map[int]*pendingCall{}
	err = readEvents(response.Body, func(_, data string) error {
		if data == "[DONE]" {
			return nil
		}
		var chunk openAIChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			return fmt.Errorf("read stream: %w", err)
		}
		if chunk.Error != nil {
			return &ProviderError{Message: chunk.Error.Message}
		}
		for _, choice := range chunk.Choices {
			if choice.Delta.Content != "" {
				text.WriteString(choice.Delta.Content)
				onText(choice.Delta.Content)
			}
			for _, delta := range choice.Delta.ToolCalls {
				call := calls[delta.Index]
				if call == nil {
					call = &pendingCall{}
					calls[delta.Index] = call
				}
				if delta.ID != "" {
					call.id = delta.ID
				}
				call.name += delta.Function.Name
				call.arguments += delta.Function.Arguments
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

func (o *openAI) ListModels(ctx context.Context) ([]string, error) {
	var list struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := getJSON(ctx, o.client, strings.TrimRight(o.baseURL, "/")+"/models", bearer(o.key), &list); err != nil {
		return nil, err
	}
	models := make([]string, 0, len(list.Data))
	for _, model := range list.Data {
		models = append(models, model.ID)
	}
	slices.Sort(models)
	return models, nil
}
