package validation

import (
	"encoding/json"
	"fmt"
	"reflect"
	"slices"
	"strings"
	"unicode/utf16"
)

// The {code, path, message} part of a zod issue, so the frontend maps server
// errors to fields the same way as its own.
type Issue struct {
	Code    string `json:"code"`
	Path    []any  `json:"path"`
	Message string `json:"message"`
}

type Issues []Issue

func (i Issues) Error() string {
	var buffer strings.Builder
	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(i); err != nil {
		return "Validation failed"
	}
	return strings.TrimSuffix(buffer.String(), "\n")
}

func (i *Issues) Add(code, field, message string) {
	path := []any{}
	if field != "" {
		path = []any{field}
	}
	*i = append(*i, Issue{Code: code, Path: path, Message: message})
}

// UTF-16 code units, like JavaScript's string length and zod's min().
func Length(value string) int {
	return len(utf16.Encode([]rune(value)))
}

func (i *Issues) MinLength(field, value string, minimum int, message string) {
	if Length(value) >= minimum {
		return
	}
	if message == "" {
		message = fmt.Sprintf("Too small: expected string to have >=%d characters", minimum)
	}
	i.Add("too_small", field, message)
}

func (i *Issues) MaxLength(field, value string, maximum int, message string) {
	if Length(value) <= maximum {
		return
	}
	if message == "" {
		message = fmt.Sprintf("Too big: expected string to have <=%d characters", maximum)
	}
	i.Add("too_big", field, message)
}

func (i *Issues) MaxItems(field string, count, maximum int, message string) {
	if count <= maximum {
		return
	}
	if message == "" {
		message = fmt.Sprintf("Too big: expected array to have <=%d items", maximum)
	}
	i.Add("too_big", field, message)
}

func (i *Issues) Custom(field, message string) {
	i.Add("custom", field, message)
}

// Behaves like a strict zod object. A field tagged omitempty or omitzero is
// optional, `zod:"nullable"` accepts null and `error:"..."` replaces the
// invalid type message like zod's {error} parameter. Callers run field rules
// only when it reports nothing, as zod skips refinements after structural
// failures.
func Decode(data []byte, dst any) Issues {
	var object map[string]json.RawMessage
	if err := json.Unmarshal(data, &object); err != nil || object == nil {
		return Issues{invalidType("", "object", data)}
	}

	value := reflect.ValueOf(dst).Elem()
	structType := value.Type()

	var issues Issues
	known := map[string]bool{}

	for index := range structType.NumField() {
		field := structType.Field(index)
		name, options, _ := strings.Cut(field.Tag.Get("json"), ",")
		if name == "" || name == "-" {
			continue
		}
		known[name] = true

		tagOptions := strings.Split(options, ",")
		optional := slices.Contains(tagOptions, "omitempty") || slices.Contains(tagOptions, "omitzero")
		nullable := field.Tag.Get("zod") == "nullable"
		invalid := func() Issue {
			issue := invalidType(name, zodType(field.Type), object[name])
			if message := field.Tag.Get("error"); message != "" {
				issue.Message = message
			}
			return issue
		}

		raw, present := object[name]
		if !present {
			if !optional {
				issues = append(issues, invalid())
			}
			continue
		}

		if jsonType(raw) == "null" && !nullable {
			issues = append(issues, invalid())
			continue
		}

		if err := json.Unmarshal(raw, value.Field(index).Addr().Interface()); err != nil {
			issues = append(issues, invalid())
		}
	}

	var unknown []string
	for key := range object {
		if !known[key] {
			unknown = append(unknown, key)
		}
	}
	if len(unknown) > 0 {
		slices.Sort(unknown)
		quoted := make([]string, len(unknown))
		for index, key := range unknown {
			quoted[index] = fmt.Sprintf("%q", key)
		}
		message := "Unrecognized key: " + quoted[0]
		if len(unknown) > 1 {
			message = "Unrecognized keys: " + strings.Join(quoted, ", ")
		}
		issues.Add("unrecognized_keys", "", message)
	}

	return issues
}

func invalidType(field, expected string, raw []byte) Issue {
	var issues Issues
	issues.Add("invalid_type", field, "Invalid input: expected "+expected+", received "+jsonType(raw))
	return issues[0]
}

type optionalField interface {
	ValueType() reflect.Type
}

func zodType(t reflect.Type) string {
	if optional, ok := reflect.Zero(t).Interface().(optionalField); ok {
		t = optional.ValueType()
	}
	if t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	switch t.Kind() {
	case reflect.String:
		return "string"
	case reflect.Bool:
		return "boolean"
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
		reflect.Float32, reflect.Float64:
		return "number"
	case reflect.Slice, reflect.Array:
		return "array"
	default:
		return "object"
	}
}

func jsonType(raw []byte) string {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" {
		return "undefined"
	}
	switch trimmed[0] {
	case '"':
		return "string"
	case '{':
		return "object"
	case '[':
		return "array"
	case 't', 'f':
		return "boolean"
	case 'n':
		return "null"
	default:
		return "number"
	}
}
