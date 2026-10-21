package sqlrepo

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"noteme/internal/components/repository"
)

const mcpClientColumns = `c."id", c."user_id", c."name", c."kind", c."client_id", c."client_secret_hash", c."redirect_uris",
	c."is_read_only", c."created_at", c."last_used_at",
	(SELECT p."token_prefix" FROM "mcp_token" p WHERE p."client_id" = c."id" AND p."kind" = 'personal' ORDER BY p."id" DESC LIMIT 1)`

const mcpTokenColumns = `t."id", t."client_id", t."kind", t."token_hash", t."token_prefix", t."expires_at", t."rotated_at", t."created_at"`

func mcpClientScanTargets(client *repository.MCPClient, redirectURIs *string) []any {
	return []any{&client.Id, &client.UserId, &client.Name, &client.Kind, &client.ClientId, &client.ClientSecretHash,
		redirectURIs, &client.IsReadOnly, &client.CreatedAt, &client.LastUsedAt, &client.TokenPrefix}
}

func decodeRedirectURIs(client *repository.MCPClient, value string) error {
	if err := json.Unmarshal([]byte(value), &client.RedirectURIs); err != nil {
		return fmt.Errorf("decode redirect URIs: %w", err)
	}
	return nil
}

func encodeRedirectURIs(uris []string) (string, error) {
	if uris == nil {
		uris = []string{}
	}
	value, err := json.Marshal(uris)
	return string(value), err
}

func scanMCPClient(row interface{ Scan(...any) error }) (repository.MCPClient, error) {
	var client repository.MCPClient
	var redirectURIs string
	if err := row.Scan(mcpClientScanTargets(&client, &redirectURIs)...); err != nil {
		return client, err
	}
	return client, decodeRedirectURIs(&client, redirectURIs)
}

func (r *Repository) mcpClient(ctx context.Context, where string, args ...any) (*repository.MCPClient, error) {
	client, err := scanMCPClient(r.q.QueryRowContext(ctx, `SELECT `+mcpClientColumns+` FROM "mcp_client" c WHERE `+where, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &client, nil
}

func (r *Repository) CreateClient(ctx context.Context, client repository.NewMCPClient) (*repository.MCPClient, error) {
	redirectURIs, err := encodeRedirectURIs(client.RedirectURIs)
	if err != nil {
		return nil, fmt.Errorf("create MCP client: %w", err)
	}
	created, err := r.insertIfAbsent(ctx,
		`INSERT INTO "mcp_client" ("user_id", "name", "kind", "client_id", "client_secret_hash", "redirect_uris", "is_read_only", "created_at")
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[]string{"user_id", "name"}, client.UserId, client.Name, client.Kind, client.ClientId, client.ClientSecretHash,
		redirectURIs, client.IsReadOnly, now())
	if err != nil {
		return nil, fmt.Errorf("create MCP client: %w", err)
	}
	if !created {
		return nil, repository.ErrMCPClientExists
	}
	record, err := r.mcpClient(ctx, `c."user_id" = ? AND c."name" = ?`, client.UserId, client.Name)
	if err != nil {
		return nil, fmt.Errorf("create MCP client: %w", err)
	}
	return record, nil
}

func (r *Repository) UpdateClient(ctx context.Context, userId int, id int64, data repository.MCPClientData) (bool, error) {
	var taken bool
	err := r.q.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM "mcp_client" WHERE "user_id" = ? AND "name" = ? AND "id" != ?)`, userId, data.Name, id).Scan(&taken)
	if err != nil {
		return false, fmt.Errorf("update MCP client: %w", err)
	}
	if taken {
		return false, repository.ErrMCPClientExists
	}
	redirectURIs, err := encodeRedirectURIs(data.RedirectURIs)
	if err != nil {
		return false, fmt.Errorf("update MCP client: %w", err)
	}
	result, err := r.q.ExecContext(ctx,
		`UPDATE "mcp_client" SET "name" = ?, "is_read_only" = ?, "redirect_uris" = ? WHERE "id" = ? AND "user_id" = ?`,
		data.Name, data.IsReadOnly, redirectURIs, id, userId)
	if err != nil {
		return false, fmt.Errorf("update MCP client: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) FindClients(ctx context.Context, userId int) ([]repository.MCPClient, error) {
	rows, err := r.q.QueryContext(ctx,
		`SELECT `+mcpClientColumns+` FROM "mcp_client" c WHERE c."user_id" = ? ORDER BY c."name", c."id"`, userId)
	if err != nil {
		return nil, fmt.Errorf("find MCP clients: %w", err)
	}
	defer rows.Close()
	clients := []repository.MCPClient{}
	for rows.Next() {
		client, err := scanMCPClient(rows)
		if err != nil {
			return nil, fmt.Errorf("find MCP clients: %w", err)
		}
		clients = append(clients, client)
	}
	return clients, rows.Err()
}

func (r *Repository) GetClient(ctx context.Context, userId int, id int64) (*repository.MCPClient, error) {
	client, err := r.mcpClient(ctx, `c."id" = ? AND c."user_id" = ?`, id, userId)
	if err != nil {
		return nil, fmt.Errorf("get MCP client: %w", err)
	}
	return client, nil
}

func (r *Repository) DeleteClient(ctx context.Context, userId int, id int64) (bool, error) {
	deleted := false
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		if _, err := tx.q.ExecContext(ctx,
			`DELETE FROM "mcp_token" WHERE "client_id" IN (SELECT "id" FROM "mcp_client" WHERE "id" = ? AND "user_id" = ?)`, id, userId); err != nil {
			return err
		}
		result, err := tx.q.ExecContext(ctx, `DELETE FROM "mcp_client" WHERE "id" = ? AND "user_id" = ?`, id, userId)
		if err != nil {
			return err
		}
		affected, err := result.RowsAffected()
		deleted = affected == 1
		return err
	})
	if err != nil {
		return false, fmt.Errorf("delete MCP client: %w", err)
	}
	return deleted, nil
}

func (r *Repository) GetClientByClientID(ctx context.Context, clientId string) (*repository.MCPClient, error) {
	client, err := r.mcpClient(ctx, `c."client_id" = ?`, clientId)
	if err != nil {
		return nil, fmt.Errorf("get MCP client by client id: %w", err)
	}
	return client, nil
}

func (r *Repository) SetClientSecret(ctx context.Context, userId int, id int64, secretHash string) (bool, error) {
	result, err := r.q.ExecContext(ctx,
		`UPDATE "mcp_client" SET "client_secret_hash" = ? WHERE "id" = ? AND "user_id" = ? AND "kind" = ?`,
		secretHash, id, userId, repository.MCPClientOAuth)
	if err != nil {
		return false, fmt.Errorf("set MCP client secret: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) TouchClient(ctx context.Context, id int64, at int64) error {
	_, err := r.q.ExecContext(ctx,
		`UPDATE "mcp_client" SET "last_used_at" = ? WHERE "id" = ? AND ("last_used_at" IS NULL OR "last_used_at" < ?)`,
		at, id, at-60)
	if err != nil {
		return fmt.Errorf("touch MCP client: %w", err)
	}
	return nil
}

func (r *Repository) GetToken(ctx context.Context, tokenHash string) (*repository.MCPTokenRecord, error) {
	var record repository.MCPTokenRecord
	var redirectURIs string
	targets := append([]any{&record.Id, &record.ClientId, &record.Kind, &record.TokenHash, &record.TokenPrefix,
		&record.ExpiresAt, &record.RotatedAt, &record.CreatedAt}, mcpClientScanTargets(&record.Client, &redirectURIs)...)
	err := r.q.QueryRowContext(ctx,
		`SELECT `+mcpTokenColumns+`, `+mcpClientColumns+`
		 FROM "mcp_token" t INNER JOIN "mcp_client" c ON c."id" = t."client_id" WHERE t."token_hash" = ?`, tokenHash).Scan(targets...)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err == nil {
		err = decodeRedirectURIs(&record.Client, redirectURIs)
	}
	if err != nil {
		return nil, fmt.Errorf("get MCP token: %w", err)
	}
	return &record, nil
}

func (r *Repository) CreateToken(ctx context.Context, token repository.NewMCPToken) (*repository.MCPToken, error) {
	timestamp := now()
	id, err := r.insert(ctx,
		`INSERT INTO "mcp_token" ("client_id", "kind", "token_hash", "token_prefix", "expires_at", "created_at")
		 VALUES (?, ?, ?, ?, ?, ?)`,
		token.ClientId, token.Kind, token.TokenHash, token.TokenPrefix, token.ExpiresAt, timestamp)
	if err != nil {
		return nil, fmt.Errorf("create MCP token: %w", err)
	}
	return &repository.MCPToken{
		Id:          id,
		ClientId:    token.ClientId,
		Kind:        token.Kind,
		TokenHash:   token.TokenHash,
		TokenPrefix: token.TokenPrefix,
		ExpiresAt:   token.ExpiresAt,
		CreatedAt:   timestamp,
	}, nil
}

func (r *Repository) RotateRefreshToken(ctx context.Context, id int64, at int64) (bool, error) {
	result, err := r.q.ExecContext(ctx,
		`UPDATE "mcp_token" SET "rotated_at" = ? WHERE "id" = ? AND "kind" = ? AND "rotated_at" IS NULL`,
		at, id, repository.MCPTokenRefresh)
	if err != nil {
		return false, fmt.Errorf("rotate MCP refresh token: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) DeleteClientTokens(ctx context.Context, clientId int64) error {
	if _, err := r.q.ExecContext(ctx, `DELETE FROM "mcp_token" WHERE "client_id" = ?`, clientId); err != nil {
		return fmt.Errorf("delete MCP client tokens: %w", err)
	}
	return nil
}

func (r *Repository) DeleteExpiredTokens(ctx context.Context, at int64) (int64, error) {
	result, err := r.q.ExecContext(ctx, `DELETE FROM "mcp_token" WHERE "expires_at" IS NOT NULL AND "expires_at" < ?`, at)
	if err != nil {
		return 0, fmt.Errorf("delete expired MCP tokens: %w", err)
	}
	return result.RowsAffected()
}
