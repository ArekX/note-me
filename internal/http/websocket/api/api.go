package api

import (
	"noteme/internal/components"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/ai"
	"noteme/internal/http/websocket/handlers/changes"
	"noteme/internal/http/websocket/handlers/files"
	"noteme/internal/http/websocket/handlers/groups"
	"noteme/internal/http/websocket/handlers/notes"
	"noteme/internal/http/websocket/handlers/notifications"
	"noteme/internal/http/websocket/handlers/settings"
	"noteme/internal/http/websocket/handlers/tags"
	"noteme/internal/http/websocket/handlers/tree"
	"noteme/internal/http/websocket/handlers/users"
)

func NewHub(c *components.Components) *websocket.Hub {
	hub := websocket.NewHub(c)
	hub.RegisterNamespaces(
		tree.New(c),
		groups.New(c),
		notes.New(c),
		notifications.New(c),
		tags.New(c),
		files.New(c),
		users.New(c),
		settings.New(c),
		changes.New(c),
		ai.New(c),
	)
	return hub
}
