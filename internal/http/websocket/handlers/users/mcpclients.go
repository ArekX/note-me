package users

import (
	"context"
	"errors"
	"net/url"
	"strings"

	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/encryption"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

// Token formats of decision 0.84.
const (
	personalTokenPrefix  = "nmcp_"
	clientSecretPrefix   = "nmcps_"
	secretSize           = 32
	clientIDSize         = 16
	shownPrefixLength    = len(personalTokenPrefix) + 6
	maxRedirectURIs      = 10
	maxRedirectURILength = 2048
	mcpClientNotFound    = "MCP client not found."
)

func (n *Namespace) registerMcpClients(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceUsers, messages.UsersGetMcpClients, n.getMcpClients)
	hub.Handle(messages.NamespaceUsers, messages.UsersCreateMcpClient, n.createMcpClient)
	hub.Handle(messages.NamespaceUsers, messages.UsersUpdateMcpClient, n.updateMcpClient)
	hub.Handle(messages.NamespaceUsers, messages.UsersDeleteMcpClient, n.deleteMcpClient)
	hub.Handle(messages.NamespaceUsers, messages.UsersRegenerateMcpClientSecret, n.regenerateMcpClientSecret)
}

func mcpClientRecord(client repository.MCPClient) messages.McpClientRecord {
	return messages.McpClientRecord{
		ID:           client.Id,
		Name:         client.Name,
		Kind:         client.Kind,
		ClientID:     client.ClientId,
		TokenPrefix:  client.TokenPrefix,
		RedirectURIs: client.RedirectURIs,
		IsReadOnly:   client.IsReadOnly,
		CreatedAt:    client.CreatedAt,
		LastUsedAt:   client.LastUsedAt,
	}
}

func (n *Namespace) getMcpClients(ctx context.Context, req *websocket.Request) error {
	clients, err := n.repo.MCP().FindClients(ctx, req.Client.UserID)
	if err != nil {
		return err
	}
	records := make([]messages.McpClientRecord, 0, len(clients))
	for _, client := range clients {
		records = append(records, mcpClientRecord(client))
	}
	return req.Respond(ctx, &messages.GetMcpClientsResponse{Type: messages.UsersGetMcpClientsResponse, Clients: records})
}

// http is allowed only on loopback addresses, whose port the authorization
// server ignores (RFC 8252).
func validRedirectURI(value string) bool {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" || parsed.Fragment != "" || parsed.User != nil {
		return false
	}
	switch parsed.Scheme {
	case "https":
		return true
	case "http":
		host := parsed.Hostname()
		return host == "127.0.0.1" || host == "::1" || host == "localhost"
	}
	return false
}

func validateMcpClient(data *messages.McpClientData, kind string) validation.Issues {
	var issues validation.Issues
	data.Name = strings.TrimSpace(data.Name)
	issues.MinLength("name", data.Name, 1, "Name must have at least one character")
	issues.MaxLength("name", data.Name, maxNameLength, nameTooLongMessage)

	if kind != repository.MCPClientOAuth {
		data.RedirectURIs = []string{}
		return issues
	}
	uris := make([]string, 0, len(data.RedirectURIs))
	for _, uri := range data.RedirectURIs {
		uris = append(uris, strings.TrimSpace(uri))
	}
	data.RedirectURIs = uris
	if len(uris) == 0 {
		issues.Custom("redirect_uris", "Add at least one redirect URI.")
	}
	issues.MaxItems("redirect_uris", len(uris), maxRedirectURIs, "At most 10 redirect URIs are allowed.")
	for _, uri := range uris {
		if len(uri) > maxRedirectURILength {
			issues.Custom("redirect_uris", "Redirect URI must have at most 2048 characters")
			break
		}
		if !validRedirectURI(uri) {
			issues.Custom("redirect_uris", "Redirect URI must use https, or http on localhost.")
			break
		}
	}
	return issues
}

func clientExistsError(err error) error {
	if errors.Is(err, repository.ErrMCPClientExists) {
		return websocket.NewClientError(err.Error())
	}
	return err
}

func createPersonalToken(ctx context.Context, repo repository.Repository, clientID int64) (string, error) {
	token := encryption.RandomToken(personalTokenPrefix, secretSize)
	_, err := repo.MCP().CreateToken(ctx, repository.NewMCPToken{
		ClientId:    clientID,
		Kind:        repository.MCPTokenPersonal,
		TokenHash:   encryption.TokenHash(token),
		TokenPrefix: token[:shownPrefixLength],
	})
	return token, err
}

// The secret goes only to the asking tab; then every tab of the user gets the
// response without it under a new request id, as a change from elsewhere.
func (n *Namespace) createMcpClient(ctx context.Context, req *websocket.Request) error {
	var msg messages.CreateMcpClient
	if err := req.Decode(&msg); err != nil {
		return err
	}
	kind := msg.Data.Kind
	var issues validation.Issues
	if kind != repository.MCPClientToken && kind != repository.MCPClientOAuth {
		issues.Custom("kind", `Invalid option: expected one of "token"|"oauth"`)
	}
	if issues = append(issues, validateMcpClient(&msg.Data.McpClientData, kind)...); len(issues) > 0 {
		return issues
	}

	newClient := repository.NewMCPClient{
		UserId:       req.Client.UserID,
		Name:         msg.Data.Name,
		Kind:         kind,
		RedirectURIs: msg.Data.RedirectURIs,
		IsReadOnly:   msg.Data.IsReadOnly,
	}
	var secret string
	if kind == repository.MCPClientOAuth {
		clientID := encryption.RandomToken("", clientIDSize)
		secret = encryption.RandomToken(clientSecretPrefix, secretSize)
		hash := encryption.TokenHash(secret)
		newClient.ClientId, newClient.ClientSecretHash = &clientID, &hash
	}

	var client *repository.MCPClient
	err := n.repo.RunInTransaction(ctx, func(tx repository.Repository) error {
		created, err := tx.MCP().CreateClient(ctx, newClient)
		if err != nil {
			return err
		}
		if kind == repository.MCPClientToken {
			if secret, err = createPersonalToken(ctx, tx, created.Id); err != nil {
				return err
			}
		}
		client, err = tx.MCP().GetClient(ctx, req.Client.UserID, created.Id)
		return err
	})
	if err != nil {
		return clientExistsError(err)
	}

	n.audit.Record(ctx, audit.MCPClientCreated, req.Client.Actor(), map[string]any{"client_id": client.Id, "name": client.Name, "kind": client.Kind, "is_read_only": client.IsReadOnly})
	if err := req.Respond(ctx, &messages.CreateMcpClientResponse{
		Type:   messages.UsersCreateMcpClientResponse,
		Client: mcpClientRecord(*client),
		Secret: secret,
	}); err != nil {
		return err
	}
	req.Hub.SendToUser(ctx, req.Client.UserID, &messages.CreateMcpClientResponse{
		Namespace: messages.NamespaceUsers,
		Type:      messages.UsersCreateMcpClientResponse,
		Client:    mcpClientRecord(*client),
	})
	return nil
}

func (n *Namespace) ownMcpClient(ctx context.Context, req *websocket.Request, id int64) (*repository.MCPClient, error) {
	client, err := n.repo.MCP().GetClient(ctx, req.Client.UserID, id)
	if err != nil {
		return nil, err
	}
	if client == nil {
		return nil, websocket.NewClientError(mcpClientNotFound)
	}
	return client, nil
}

func (n *Namespace) updateMcpClient(ctx context.Context, req *websocket.Request) error {
	var msg messages.UpdateMcpClient
	if err := req.Decode(&msg); err != nil {
		return err
	}
	client, err := n.ownMcpClient(ctx, req, msg.ID)
	if err != nil {
		return err
	}
	if issues := validateMcpClient(&msg.Data, client.Kind); len(issues) > 0 {
		return issues
	}

	if _, err := n.repo.MCP().UpdateClient(ctx, req.Client.UserID, msg.ID, repository.MCPClientData{
		Name:         msg.Data.Name,
		IsReadOnly:   msg.Data.IsReadOnly,
		RedirectURIs: msg.Data.RedirectURIs,
	}); err != nil {
		return clientExistsError(err)
	}
	if client, err = n.ownMcpClient(ctx, req, msg.ID); err != nil {
		return err
	}

	n.audit.Record(ctx, audit.MCPClientUpdated, req.Client.Actor(), map[string]any{"client_id": client.Id, "name": client.Name, "is_read_only": client.IsReadOnly})
	req.RespondToUser(ctx, &messages.UpdateMcpClientResponse{Type: messages.UsersUpdateMcpClientResponse, Client: mcpClientRecord(*client)})
	return nil
}

func (n *Namespace) deleteMcpClient(ctx context.Context, req *websocket.Request) error {
	var msg messages.DeleteMcpClient
	if err := req.Decode(&msg); err != nil {
		return err
	}
	deleted, err := n.repo.MCP().DeleteClient(ctx, req.Client.UserID, msg.ID)
	if err != nil {
		return err
	}
	if deleted {
		n.audit.Record(ctx, audit.MCPClientDeleted, req.Client.Actor(), map[string]any{"client_id": msg.ID})
	}
	req.RespondToUser(ctx, &messages.DeleteMcpClientResponse{Type: messages.UsersDeleteMcpClientResponse, ID: msg.ID})
	return nil
}

// A token client gets a new personal token and the old one stops working; an
// OAuth client gets a new secret and keeps its tokens (decision 0.84).
func (n *Namespace) regenerateMcpClientSecret(ctx context.Context, req *websocket.Request) error {
	var msg messages.RegenerateMcpClientSecret
	if err := req.Decode(&msg); err != nil {
		return err
	}
	client, err := n.ownMcpClient(ctx, req, msg.ID)
	if err != nil {
		return err
	}

	var secret string
	err = n.repo.RunInTransaction(ctx, func(tx repository.Repository) error {
		if client.Kind == repository.MCPClientOAuth {
			secret = encryption.RandomToken(clientSecretPrefix, secretSize)
			_, err := tx.MCP().SetClientSecret(ctx, req.Client.UserID, client.Id, encryption.TokenHash(secret))
			return err
		}
		if err := tx.MCP().DeleteClientTokens(ctx, client.Id); err != nil {
			return err
		}
		secret, err = createPersonalToken(ctx, tx, client.Id)
		return err
	})
	if err != nil {
		return err
	}
	if client, err = n.ownMcpClient(ctx, req, msg.ID); err != nil {
		return err
	}

	n.audit.Record(ctx, audit.MCPClientSecretRenewed, req.Client.Actor(), map[string]any{"client_id": client.Id})
	if err := req.Respond(ctx, &messages.RegenerateMcpClientSecretResponse{
		Type:   messages.UsersRegenerateMcpClientSecretResponse,
		Client: mcpClientRecord(*client),
		Secret: secret,
	}); err != nil {
		return err
	}
	req.Hub.SendToUser(ctx, req.Client.UserID, &messages.RegenerateMcpClientSecretResponse{
		Namespace: messages.NamespaceUsers,
		Type:      messages.UsersRegenerateMcpClientSecretResponse,
		Client:    mcpClientRecord(*client),
	})
	return nil
}
