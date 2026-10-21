package aitools

import (
	"encoding/json"
	"fmt"
	"reflect"
	"slices"

	"noteme/internal/http/rbac"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/validation"
)

// What a tool does with protected notes; the browser asks for the user's
// consent first (decision 0.83).
const (
	ProtectedNone = ""
	// Reads a note's text, which the browser decrypts.
	ProtectedRead = "read"
	// Writes a note's text, which the browser encrypts.
	ProtectedWrite = "write"
	// Protects or unprotects a note.
	ProtectedProtection = "protection"
)

type Env struct {
	Session requeststate.Session
}

// The websocket message a tool call becomes, sent by the browser under the
// user's own session.
type Call struct {
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
	Expect    string `json:"expect"`
	Payload   any    `json:"payload"`
	// For messages answered later than the usual request timeout.
	TimeoutMs int `json:"timeout_ms,omitempty"`
}

type Tool struct {
	Name        string
	Title       string
	Description string
	Permission  rbac.Permission
	// Changes nothing; the only tools an MCP client marked read only gets.
	ReadOnly bool
	// Waits for the user's Allow or Deny before it runs.
	Confirm   bool
	Protected string
	// Runs in the browser without a websocket message.
	Browser    bool
	Parameters json.RawMessage

	prepare func(env Env, arguments json.RawMessage) (*Call, error)
	trim    func(response map[string]any) any
}

func define[A any](tool Tool, prepare func(env Env, args A) (*Call, error)) Tool {
	schema, err := json.Marshal(schemaOf(reflect.TypeFor[A]()))
	if err != nil {
		panic(fmt.Sprintf("aitools: schema of %s: %v", tool.Name, err))
	}
	tool.Parameters = schema
	tool.prepare = func(env Env, arguments json.RawMessage) (*Call, error) {
		var args A
		if issues := validation.Decode(arguments, &args); len(issues) > 0 {
			return nil, issues
		}
		if prepare == nil {
			return nil, nil
		}
		return prepare(env, args)
	}
	return tool
}

func message(namespace, typ, expect string, payload any) (*Call, error) {
	return &Call{Namespace: namespace, Type: typ, Expect: expect, Payload: payload}, nil
}

type noArguments struct{}

var catalog = func() []Tool {
	var tools []Tool
	for _, group := range [][]Tool{
		folderTools, noteTools, reminderTools, recycleBinTools, sharingTools,
		notificationTools, fileTools, profileTools, helpTools,
		userTools, backupTools, tagTools, logTools,
	} {
		tools = append(tools, group...)
	}
	seen := map[string]bool{}
	for _, tool := range tools {
		if seen[tool.Name] {
			panic("aitools: tool " + tool.Name + " defined twice")
		}
		seen[tool.Name] = true
	}
	return tools
}()

func ForRole(role string) []Tool {
	var tools []Tool
	for _, tool := range catalog {
		if tool.Permission == "" || rbac.Can(rbac.Role(role), tool.Permission) {
			tools = append(tools, tool)
		}
	}
	return tools
}

func Find(role, name string) (Tool, bool) {
	index := slices.IndexFunc(ForRole(role), func(tool Tool) bool { return tool.Name == name })
	if index < 0 {
		return Tool{}, false
	}
	return ForRole(role)[index], true
}

// nil for a browser tool; arguments that fail the tool's schema come back as
// validation.Issues.
func (t Tool) Prepare(env Env, arguments json.RawMessage) (*Call, error) {
	return t.prepare(env, arguments)
}

// The handler's response without the message header, trimmed for the model.
func (t Tool) Result(response json.RawMessage) (string, error) {
	if t.Browser {
		return string(response), nil
	}
	var object map[string]any
	if err := json.Unmarshal(response, &object); err != nil {
		return "", fmt.Errorf("decode %s response: %w", t.Name, err)
	}
	for _, key := range []string{"requestId", "namespace", "type"} {
		delete(object, key)
	}
	var result any = object
	if t.trim != nil {
		result = t.trim(object)
	}
	data, err := json.Marshal(result)
	if err != nil {
		return "", fmt.Errorf("encode %s result: %w", t.Name, err)
	}
	return string(data), nil
}
