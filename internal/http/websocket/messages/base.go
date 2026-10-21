package messages

import (
	"encoding/json"
	"reflect"
)

type Header struct {
	RequestID string `json:"requestId"`
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
}

func (h *Header) MessageHeader() *Header { return h }

// Binary frames carry the JSON header followed by raw bytes; BinaryData is
// never part of the JSON.
type Binary struct {
	BinaryData []byte `json:"-"`
}

type Error struct {
	Header
	Message string `json:"message"`
}

type Paged[T any] struct {
	Results []T `json:"results"`
	Total   int `json:"total"`
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
}

const (
	NamespaceSystem        = "system"
	NamespaceNotifications = "notifications"
	NamespaceTree          = "tree"
	NamespaceGroups        = "groups"
	NamespaceNotes         = "notes"
	NamespaceTags          = "tags"
	NamespaceUsers         = "users"
	NamespaceFiles         = "files"
	NamespaceSettings      = "settings"
	NamespaceChanges       = "changes"
	NamespaceAi            = "ai"

	SystemError = "error"
)

// Optional tells an absent key (Set false) from null (Set true, Value nil);
// fields of this type need the omitzero tag.
type Optional[T any] struct {
	Set   bool
	Value *T
}

func (o Optional[T]) ValueType() reflect.Type {
	return reflect.TypeFor[T]()
}

func (o Optional[T]) IsZero() bool {
	return !o.Set
}

func (o Optional[T]) MarshalJSON() ([]byte, error) {
	return json.Marshal(o.Value)
}

func (o *Optional[T]) UnmarshalJSON(data []byte) error {
	o.Set = true
	o.Value = nil
	if string(data) == "null" {
		return nil
	}
	o.Value = new(T)
	return json.Unmarshal(data, o.Value)
}
