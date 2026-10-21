package aitools

import (
	"encoding/json"
	"reflect"
	"strings"
)

type optionalField interface {
	ValueType() reflect.Type
}

var rawMessageType = reflect.TypeFor[json.RawMessage]()

// The JSON schema of an argument struct, read from the same tags
// validation.Decode follows: omitempty/omitzero is optional,
// `zod:"nullable"` accepts null; `desc` describes a field and `enum` lists
// its values.
func schemaOf(t reflect.Type) map[string]any {
	properties := map[string]any{}
	required := []string{}
	for field := range t.Fields() {
		name, options, _ := strings.Cut(field.Tag.Get("json"), ",")
		if name == "" || name == "-" {
			continue
		}
		property := typeSchema(field.Type)
		if field.Tag.Get("zod") == "nullable" {
			property["type"] = []any{property["type"], "null"}
		}
		if description := field.Tag.Get("desc"); description != "" {
			property["description"] = description
		}
		if values := field.Tag.Get("enum"); values != "" {
			property["enum"] = strings.Split(values, ",")
		}
		properties[name] = property
		if !strings.Contains(options, "omitempty") && !strings.Contains(options, "omitzero") {
			required = append(required, name)
		}
	}
	schema := map[string]any{"type": "object", "properties": properties, "additionalProperties": false}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func typeSchema(t reflect.Type) map[string]any {
	if optional, ok := reflect.Zero(t).Interface().(optionalField); ok {
		t = optional.ValueType()
	}
	if t == rawMessageType {
		return map[string]any{"type": "object"}
	}
	if t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	switch t.Kind() {
	case reflect.String:
		return map[string]any{"type": "string"}
	case reflect.Bool:
		return map[string]any{"type": "boolean"}
	case reflect.Int, reflect.Int32, reflect.Int64:
		return map[string]any{"type": "integer"}
	case reflect.Float64:
		return map[string]any{"type": "number"}
	case reflect.Slice:
		return map[string]any{"type": "array", "items": typeSchema(t.Elem())}
	case reflect.Struct:
		return schemaOf(t)
	}
	return map[string]any{}
}
