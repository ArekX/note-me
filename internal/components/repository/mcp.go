package repository

import (
	"context"
	"errors"
)

var ErrMCPClientExists = errors.New("MCP client with this name already exists.")

// Values of mcp_client.kind and mcp_token.kind (decision 0.84).
const (
	MCPClientToken = "token"
	MCPClientOAuth = "oauth"

	MCPTokenPersonal = "personal"
	MCPTokenAccess   = "access"
	MCPTokenRefresh  = "refresh"
)

type MCPClient struct {
	Id     int64
	UserId int
	Name   string
	Kind   string
	// Only OAuth clients have a client id and secret; the secret is a
	// SHA-256 hash.
	ClientId         *string
	ClientSecretHash *string
	RedirectURIs     []string
	IsReadOnly       bool
	CreatedAt        int64
	LastUsedAt       *int64
	// Prefix of the personal token, so the user can tell tokens apart.
	TokenPrefix *string
}

type NewMCPClient struct {
	UserId           int
	Name             string
	Kind             string
	ClientId         *string
	ClientSecretHash *string
	RedirectURIs     []string
	IsReadOnly       bool
}

type MCPClientData struct {
	Name         string
	IsReadOnly   bool
	RedirectURIs []string
}

type MCPToken struct {
	Id          int64
	ClientId    int64
	Kind        string
	TokenHash   string
	TokenPrefix string
	ExpiresAt   *int64
	RotatedAt   *int64
	CreatedAt   int64
}

type NewMCPToken struct {
	ClientId    int64
	Kind        string
	TokenHash   string
	TokenPrefix string
	ExpiresAt   *int64
}

type MCPTokenRecord struct {
	MCPToken
	Client MCPClient
}

type MCP interface {
	CreateClient(ctx context.Context, client NewMCPClient) (*MCPClient, error)
	UpdateClient(ctx context.Context, userId int, id int64, data MCPClientData) (bool, error)
	FindClients(ctx context.Context, userId int) ([]MCPClient, error)
	GetClient(ctx context.Context, userId int, id int64) (*MCPClient, error)
	// Deletes the client's tokens with it.
	DeleteClient(ctx context.Context, userId int, id int64) (bool, error)
	GetClientByClientID(ctx context.Context, clientId string) (*MCPClient, error)
	SetClientSecret(ctx context.Context, userId int, id int64, secretHash string) (bool, error)
	// Updates last_used_at only when it is older than a minute.
	TouchClient(ctx context.Context, id int64, at int64) error

	GetToken(ctx context.Context, tokenHash string) (*MCPTokenRecord, error)
	CreateToken(ctx context.Context, token NewMCPToken) (*MCPToken, error)
	// false when the token was already rotated, which means it was used twice.
	RotateRefreshToken(ctx context.Context, id int64, at int64) (bool, error)
	DeleteClientTokens(ctx context.Context, clientId int64) error
	DeleteExpiredTokens(ctx context.Context, at int64) (int64, error)
}
