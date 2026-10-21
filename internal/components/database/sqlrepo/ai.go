package sqlrepo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"noteme/internal/components/repository"
)

const aiProviderColumns = `"id", "name", "type", "base_url", "api_key", "model", "is_default", "created_at", "updated_at"`

func scanAIProvider(row interface{ Scan(...any) error }) (repository.AIProvider, error) {
	var provider repository.AIProvider
	err := row.Scan(&provider.Id, &provider.Name, &provider.Type, &provider.BaseURL, &provider.APIKey,
		&provider.Model, &provider.IsDefault, &provider.CreatedAt, &provider.UpdatedAt)
	return provider, err
}

func (r *Repository) GetProviders(ctx context.Context) ([]repository.AIProvider, error) {
	rows, err := r.q.QueryContext(ctx, `SELECT `+aiProviderColumns+` FROM "ai_provider" ORDER BY "name", "id"`)
	if err != nil {
		return nil, fmt.Errorf("get AI providers: %w", err)
	}
	defer rows.Close()
	providers := []repository.AIProvider{}
	for rows.Next() {
		provider, err := scanAIProvider(rows)
		if err != nil {
			return nil, fmt.Errorf("get AI providers: %w", err)
		}
		providers = append(providers, provider)
	}
	return providers, rows.Err()
}

func (r *Repository) aiProvider(ctx context.Context, where string, args ...any) (*repository.AIProvider, error) {
	provider, err := scanAIProvider(r.q.QueryRowContext(ctx, `SELECT `+aiProviderColumns+` FROM "ai_provider" WHERE `+where, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &provider, nil
}

func (r *Repository) GetProvider(ctx context.Context, id int64) (*repository.AIProvider, error) {
	provider, err := r.aiProvider(ctx, `"id" = ?`, id)
	if err != nil {
		return nil, fmt.Errorf("get AI provider: %w", err)
	}
	return provider, nil
}

func (r *Repository) CreateProvider(ctx context.Context, data repository.AIProviderData) (*repository.AIProvider, error) {
	timestamp := now()
	created, err := r.insertIfAbsent(ctx,
		`INSERT INTO "ai_provider" ("name", "type", "base_url", "api_key", "model", "created_at", "updated_at")
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[]string{"name"}, data.Name, data.Type, data.BaseURL, data.APIKey, data.Model, timestamp, timestamp)
	if err != nil {
		return nil, fmt.Errorf("create AI provider: %w", err)
	}
	if !created {
		return nil, repository.ErrAIProviderExists
	}
	provider, err := r.aiProvider(ctx, `"name" = ?`, data.Name)
	if err != nil {
		return nil, fmt.Errorf("create AI provider: %w", err)
	}
	return provider, nil
}

func (r *Repository) UpdateProvider(ctx context.Context, id int64, data repository.AIProviderData) (bool, error) {
	var taken bool
	err := r.q.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM "ai_provider" WHERE "name" = ? AND "id" != ?)`, data.Name, id).Scan(&taken)
	if err != nil {
		return false, fmt.Errorf("update AI provider: %w", err)
	}
	if taken {
		return false, repository.ErrAIProviderExists
	}

	query := `UPDATE "ai_provider" SET "name" = ?, "type" = ?, "base_url" = ?, "model" = ?, "updated_at" = ?`
	args := []any{data.Name, data.Type, data.BaseURL, data.Model, now()}
	if data.APIKey != nil {
		query += `, "api_key" = ?`
		args = append(args, *data.APIKey)
	}
	result, err := r.q.ExecContext(ctx, query+` WHERE "id" = ?`, append(args, id)...)
	if err != nil {
		return false, fmt.Errorf("update AI provider: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) DeleteProvider(ctx context.Context, id int64) (bool, error) {
	deleted := false
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		for _, statement := range []string{
			`UPDATE "ai_user_access" SET "provider_id" = NULL WHERE "provider_id" = ?`,
			`UPDATE "ai_conversation" SET "provider_id" = NULL WHERE "provider_id" = ?`,
		} {
			if _, err := tx.q.ExecContext(ctx, statement, id); err != nil {
				return err
			}
		}
		result, err := tx.q.ExecContext(ctx, `DELETE FROM "ai_provider" WHERE "id" = ?`, id)
		if err != nil {
			return err
		}
		affected, err := result.RowsAffected()
		deleted = affected == 1
		return err
	})
	if err != nil {
		return false, fmt.Errorf("delete AI provider: %w", err)
	}
	return deleted, nil
}

func (r *Repository) SetDefaultProvider(ctx context.Context, id *int64) error {
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		if _, err := tx.q.ExecContext(ctx, `UPDATE "ai_provider" SET "is_default" = false WHERE "is_default" = true`); err != nil {
			return err
		}
		if id == nil {
			return nil
		}
		_, err := tx.q.ExecContext(ctx, `UPDATE "ai_provider" SET "is_default" = true WHERE "id" = ?`, *id)
		return err
	})
	if err != nil {
		return fmt.Errorf("set default AI provider: %w", err)
	}
	return nil
}

func (r *Repository) GetEffectiveProvider(ctx context.Context, userId int) (*repository.AIProvider, error) {
	var hasAccess bool
	var providerId sql.NullInt64
	err := r.q.QueryRowContext(ctx, `SELECT "provider_id" FROM "ai_user_access" WHERE "user_id" = ?`, userId).Scan(&providerId)
	switch {
	case errors.Is(err, sql.ErrNoRows):
	case err != nil:
		return nil, fmt.Errorf("get AI access: %w", err)
	default:
		hasAccess = true
	}

	var provider *repository.AIProvider
	switch {
	case !hasAccess:
		provider, err = r.aiProvider(ctx, `"is_default" = true ORDER BY "id" LIMIT 1`)
	case providerId.Valid:
		provider, err = r.aiProvider(ctx, `"id" = ?`, providerId.Int64)
	}
	if err != nil {
		return nil, fmt.Errorf("get AI access: %w", err)
	}
	return provider, nil
}

func (r *Repository) FindUserAccess(ctx context.Context, userIds []int) ([]repository.AIUserAccess, error) {
	access := []repository.AIUserAccess{}
	if len(userIds) == 0 {
		return access, nil
	}
	args := make([]any, 0, len(userIds))
	for _, id := range userIds {
		args = append(args, id)
	}
	rows, err := r.q.QueryContext(ctx,
		`SELECT "user_id", "provider_id" FROM "ai_user_access" WHERE "user_id" IN (`+placeholders(len(userIds))+`) ORDER BY "user_id"`,
		args...)
	if err != nil {
		return nil, fmt.Errorf("find AI access: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var record repository.AIUserAccess
		if err := rows.Scan(&record.UserId, &record.ProviderId); err != nil {
			return nil, fmt.Errorf("find AI access: %w", err)
		}
		access = append(access, record)
	}
	return access, rows.Err()
}

func (r *Repository) SetUserAccess(ctx context.Context, userId int, followDefault bool, providerId *int64) error {
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		if followDefault {
			_, err := tx.q.ExecContext(ctx, `DELETE FROM "ai_user_access" WHERE "user_id" = ?`, userId)
			return err
		}
		created, err := tx.insertIfAbsent(ctx,
			`INSERT INTO "ai_user_access" ("user_id", "provider_id") VALUES (?, ?)`,
			[]string{"user_id"}, userId, providerId)
		if err != nil || created {
			return err
		}
		_, err = tx.q.ExecContext(ctx, `UPDATE "ai_user_access" SET "provider_id" = ? WHERE "user_id" = ?`, providerId, userId)
		return err
	})
	if err != nil {
		return fmt.Errorf("set AI access: %w", err)
	}
	return nil
}

const aiConversationColumns = `"id", "user_id", "provider_id", "provider_name", "model", "title", "created_at", "updated_at"`

func scanAIConversation(row interface{ Scan(...any) error }) (repository.AIConversation, error) {
	var conversation repository.AIConversation
	err := row.Scan(&conversation.Id, &conversation.UserId, &conversation.ProviderId, &conversation.ProviderName,
		&conversation.Model, &conversation.Title, &conversation.CreatedAt, &conversation.UpdatedAt)
	return conversation, err
}

func (r *Repository) FindConversations(ctx context.Context, userId int, page int) (*repository.Paged[repository.AIConversation], error) {
	records, err := pageResults(ctx, r.q, pageQuery{
		Columns: aiConversationColumns,
		From:    `"ai_conversation" WHERE "user_id" = ?`,
		OrderBy: `"updated_at" DESC, "id" DESC`,
		Args:    []any{userId},
		Page:    page,
	}, func(rows *sql.Rows) (repository.AIConversation, error) { return scanAIConversation(rows) })
	if err != nil {
		return nil, fmt.Errorf("find AI conversations: %w", err)
	}
	return records, nil
}

func (r *Repository) GetConversation(ctx context.Context, userId int, id int64) (*repository.AIConversation, error) {
	conversation, err := scanAIConversation(r.q.QueryRowContext(ctx,
		`SELECT `+aiConversationColumns+` FROM "ai_conversation" WHERE "id" = ? AND "user_id" = ?`, id, userId))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get AI conversation: %w", err)
	}
	return &conversation, nil
}

func (r *Repository) CreateConversation(ctx context.Context, conversation repository.NewAIConversation) (*repository.AIConversation, error) {
	timestamp := now()
	id, err := r.insert(ctx,
		`INSERT INTO "ai_conversation" ("user_id", "provider_id", "provider_name", "model", "title", "created_at", "updated_at")
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		conversation.UserId, conversation.ProviderId, conversation.ProviderName, conversation.Model, conversation.Title, timestamp, timestamp)
	if err != nil {
		return nil, fmt.Errorf("create AI conversation: %w", err)
	}
	return r.GetConversation(ctx, conversation.UserId, id)
}

func (r *Repository) RenameConversation(ctx context.Context, userId int, id int64, title string) (bool, error) {
	result, err := r.q.ExecContext(ctx,
		`UPDATE "ai_conversation" SET "title" = ? WHERE "id" = ? AND "user_id" = ?`, title, id, userId)
	if err != nil {
		return false, fmt.Errorf("rename AI conversation: %w", err)
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (r *Repository) DeleteConversation(ctx context.Context, userId int, id int64) (bool, error) {
	deleted := false
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		if _, err := tx.q.ExecContext(ctx,
			`DELETE FROM "ai_message" WHERE "conversation_id" IN (SELECT "id" FROM "ai_conversation" WHERE "id" = ? AND "user_id" = ?)`, id, userId); err != nil {
			return err
		}
		result, err := tx.q.ExecContext(ctx, `DELETE FROM "ai_conversation" WHERE "id" = ? AND "user_id" = ?`, id, userId)
		if err != nil {
			return err
		}
		affected, err := result.RowsAffected()
		deleted = affected == 1
		return err
	})
	if err != nil {
		return false, fmt.Errorf("delete AI conversation: %w", err)
	}
	return deleted, nil
}

func (r *Repository) AppendMessages(ctx context.Context, conversationId int64, messages []repository.NewAIMessage) error {
	err := r.runInTransaction(ctx, func(tx *Repository) error {
		timestamp := now()
		for _, message := range messages {
			if _, err := tx.q.ExecContext(ctx,
				`INSERT INTO "ai_message" ("conversation_id", "role", "content", "tool_calls", "tool_call_id", "tool_name", "tool_status", "created_at")
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				conversationId, message.Role, message.Content, message.ToolCalls, message.ToolCallId, message.ToolName, message.ToolStatus, timestamp); err != nil {
				return err
			}
		}
		_, err := tx.q.ExecContext(ctx, `UPDATE "ai_conversation" SET "updated_at" = ? WHERE "id" = ?`, timestamp, conversationId)
		return err
	})
	if err != nil {
		return fmt.Errorf("append AI messages: %w", err)
	}
	return nil
}

func (r *Repository) GetMessages(ctx context.Context, conversationId int64) ([]repository.AIMessage, error) {
	rows, err := r.q.QueryContext(ctx,
		`SELECT "id", "conversation_id", "role", "content", "tool_calls", "tool_call_id", "tool_name", "tool_status", "created_at"
		 FROM "ai_message" WHERE "conversation_id" = ? ORDER BY "id"`, conversationId)
	if err != nil {
		return nil, fmt.Errorf("get AI messages: %w", err)
	}
	defer rows.Close()
	messages := []repository.AIMessage{}
	for rows.Next() {
		var message repository.AIMessage
		if err := rows.Scan(&message.Id, &message.ConversationId, &message.Role, &message.Content, &message.ToolCalls,
			&message.ToolCallId, &message.ToolName, &message.ToolStatus, &message.CreatedAt); err != nil {
			return nil, fmt.Errorf("get AI messages: %w", err)
		}
		messages = append(messages, message)
	}
	return messages, rows.Err()
}
