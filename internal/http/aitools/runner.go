package aitools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"slices"
	"time"

	"noteme/internal/components/repository"
	"noteme/internal/http/rbac"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	callTimeout           = time.Minute
	protectedReadMessage  = "This note is protected and cannot be read over MCP."
	protectedWriteMessage = "This note is protected and cannot be changed over MCP."
	readOnlyMessage       = "This MCP client is read only."
	helpMissingMessage    = "Help is not available on this server."
)

// Runs catalog tools on the server for MCP clients (decision 0.84). Browser
// tools need the user in the app or their password and are left out, except
// the ones in serverTools.
type Runner struct {
	hub  *websocket.Hub
	repo repository.Repository
	// The frontend build, whose help/ folder holds the exported help pages.
	frontend fs.FS
}

func NewRunner(hub *websocket.Hub, repo repository.Repository, frontend fs.FS) *Runner {
	return &Runner{hub: hub, repo: repo, frontend: frontend}
}

type serverTool func(r *Runner, ctx context.Context, caller websocket.Caller, arguments json.RawMessage) (any, error)

var serverTools = map[string]serverTool{
	"get_profile":      (*Runner).getProfile,
	"list_help_topics": (*Runner).listHelpTopics,
	"get_help_topic":   (*Runner).getHelpTopic,
}

func (r *Runner) Tools(role string, readOnly bool) []Tool {
	var tools []Tool
	for _, tool := range ForRole(role) {
		if tool.Browser && serverTools[tool.Name] == nil || readOnly && !tool.ReadOnly {
			continue
		}
		tools = append(tools, tool)
	}
	return tools
}

// Errors meant for the AI come back as *websocket.ClientError.
func (r *Runner) Run(ctx context.Context, caller websocket.Caller, readOnly bool, name string, arguments json.RawMessage) (string, error) {
	tools := r.Tools(caller.Session.Role, readOnly)
	index := slices.IndexFunc(tools, func(tool Tool) bool { return tool.Name == name })
	if index < 0 {
		if _, exists := Find(caller.Session.Role, name); exists && readOnly {
			return "", websocket.NewClientError(readOnlyMessage)
		}
		return "", websocket.NewClientError(fmt.Sprintf("There is no tool %s.", name))
	}
	tool := tools[index]
	if len(arguments) == 0 {
		arguments = json.RawMessage(`{}`)
	}

	call, err := tool.Prepare(Env{Session: caller.Session}, arguments)
	if err != nil {
		return "", clientError(err)
	}
	if run := serverTools[name]; run != nil {
		result, err := run(r, ctx, caller, arguments)
		if err != nil {
			return "", err
		}
		data, err := json.Marshal(result)
		return string(data), err
	}

	if tool.Protected == ProtectedWrite {
		if err := r.refuseProtected(ctx, caller, arguments); err != nil {
			return "", err
		}
	}

	timeout := callTimeout
	if call.TimeoutMs > 0 {
		timeout = time.Duration(call.TimeoutMs) * time.Millisecond
	}
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	response, err := r.hub.Call(callCtx, caller, call.Namespace, call.Type, call.Payload)
	if err != nil {
		return "", err
	}

	var object any
	if err := json.Unmarshal(response, &object); err != nil {
		return "", fmt.Errorf("decode %s response: %w", name, err)
	}
	removed := withoutEncryptedText(object)
	if response, err = json.Marshal(object); err != nil {
		return "", err
	}
	result, err := tool.Result(response)
	if err != nil || !removed || tool.Protected != ProtectedRead {
		return result, err
	}
	var withNotice map[string]any
	if err := json.Unmarshal([]byte(result), &withNotice); err != nil {
		return "", fmt.Errorf("decode %s result: %w", name, err)
	}
	withNotice["notice"] = protectedReadMessage
	data, err := json.Marshal(withNotice)
	return string(data), err
}

func clientError(err error) error {
	var issues validation.Issues
	if errors.As(err, &issues) {
		return websocket.NewClientError(issues.Error())
	}
	return err
}

func (r *Runner) refuseProtected(ctx context.Context, caller websocket.Caller, arguments json.RawMessage) error {
	var args noteID
	if err := json.Unmarshal(arguments, &args); err != nil {
		return err
	}
	callCtx, cancel := context.WithTimeout(ctx, callTimeout)
	defer cancel()
	response, err := r.hub.Call(callCtx, caller, messages.NamespaceNotes, messages.NotesGetDetails, map[string]any{"id": args.ID, "options": map[string]any{}})
	if err != nil {
		return err
	}
	var details messages.GetNoteDetailsResponse
	if err := json.Unmarshal(response, &details); err != nil {
		return fmt.Errorf("decode note details: %w", err)
	}
	if details.Record.IsEncrypted {
		return websocket.NewClientError(protectedWriteMessage)
	}
	return nil
}

// Protected notes are flagged with is_encrypted true, or 1 in tree records.
func withoutEncryptedText(value any) bool {
	removed := false
	switch value := value.(type) {
	case map[string]any:
		if flag := value["is_encrypted"]; flag == true || flag == 1.0 {
			if _, ok := value["note"]; ok {
				delete(value, "note")
				removed = true
			}
		}
		for _, item := range value {
			removed = withoutEncryptedText(item) || removed
		}
	case []any:
		for _, item := range value {
			removed = withoutEncryptedText(item) || removed
		}
	}
	return removed
}

func (r *Runner) getProfile(ctx context.Context, caller websocket.Caller, _ json.RawMessage) (any, error) {
	record, err := r.repo.Users().GetUserById(ctx, caller.Session.UserId)
	if err != nil {
		return nil, err
	}
	if record == nil {
		return nil, websocket.NewClientError("User not found.")
	}
	return map[string]any{
		"name":             record.Name,
		"username":         record.Username,
		"role":             record.Role,
		"timezone":         record.Timezone,
		"preferred_editor": record.PreferredEditor,
	}, nil
}

type helpIndexEntry struct {
	Key        string           `json:"key"`
	Name       string           `json:"name"`
	Permission *rbac.Permission `json:"permission"`
}

// Admin topics follow canSeeHelpTopic in the frontend (decision 0.79).
func (r *Runner) visibleHelpTopics(role string) ([]helpIndexEntry, error) {
	data, err := fs.ReadFile(r.frontend, "help/index.json")
	if errors.Is(err, fs.ErrNotExist) {
		return nil, websocket.NewClientError(helpMissingMessage)
	}
	if err != nil {
		return nil, err
	}
	var index []helpIndexEntry
	if err := json.Unmarshal(data, &index); err != nil {
		return nil, fmt.Errorf("decode help index: %w", err)
	}
	return slices.DeleteFunc(index, func(entry helpIndexEntry) bool {
		return entry.Permission != nil && !(rbac.CanAccessSettings(rbac.Role(role)) && rbac.Can(rbac.Role(role), *entry.Permission))
	}), nil
}

func (r *Runner) listHelpTopics(_ context.Context, caller websocket.Caller, _ json.RawMessage) (any, error) {
	topics, err := r.visibleHelpTopics(caller.Session.Role)
	if err != nil {
		return nil, err
	}
	result := make([]map[string]string, 0, len(topics))
	for _, topic := range topics {
		result = append(result, map[string]string{"topic": topic.Key, "name": topic.Name})
	}
	return result, nil
}

func (r *Runner) getHelpTopic(_ context.Context, caller websocket.Caller, arguments json.RawMessage) (any, error) {
	var args helpTopicArgs
	if err := json.Unmarshal(arguments, &args); err != nil {
		return nil, err
	}
	topics, err := r.visibleHelpTopics(caller.Session.Role)
	if err != nil {
		return nil, err
	}
	index := slices.IndexFunc(topics, func(topic helpIndexEntry) bool { return topic.Key == args.Topic })
	if index < 0 {
		return nil, websocket.NewClientError(fmt.Sprintf("There is no help topic %s.", args.Topic))
	}
	text, err := fs.ReadFile(r.frontend, "help/"+topics[index].Key+".md")
	if err != nil {
		return nil, fmt.Errorf("read help topic %s: %w", args.Topic, err)
	}
	return map[string]string{"topic": topics[index].Key, "name": topics[index].Name, "text": string(text)}, nil
}
