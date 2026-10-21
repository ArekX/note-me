package repository

import (
	"context"
	"errors"
)

var ErrAIProviderExists = errors.New("Provider with this name already exists.")

type AIProvider struct {
	Id      int64
	Name    string
	Type    string
	BaseURL string
	// Sealed with AI_ENCRYPTION_KEY; nil when the provider needs none.
	APIKey    *string
	Model     string
	IsDefault bool
	CreatedAt int64
	UpdatedAt int64
}

type AIProviderData struct {
	Name    string
	Type    string
	BaseURL string
	Model   string
	// On update nil keeps the stored key.
	APIKey *string
}

// A user without a row follows the default provider; ProviderId nil is no AI.
type AIUserAccess struct {
	UserId     int
	ProviderId *int64
}

type AIConversation struct {
	Id           int64
	UserId       int
	ProviderId   *int64
	ProviderName string
	Model        string
	Title        string
	CreatedAt    int64
	UpdatedAt    int64
}

type NewAIConversation struct {
	UserId       int
	ProviderId   int64
	ProviderName string
	Model        string
	Title        string
}

type AIMessage struct {
	Id             int64
	ConversationId int64
	Role           string
	Content        string
	// JSON of the tool calls an assistant message asked for.
	ToolCalls  *string
	ToolCallId *string
	ToolName   *string
	ToolStatus *string
	CreatedAt  int64
}

type NewAIMessage struct {
	Role       string
	Content    string
	ToolCalls  *string
	ToolCallId *string
	ToolName   *string
	ToolStatus *string
}

type AI interface {
	GetProviders(ctx context.Context) ([]AIProvider, error)
	GetProvider(ctx context.Context, id int64) (*AIProvider, error)
	CreateProvider(ctx context.Context, data AIProviderData) (*AIProvider, error)
	UpdateProvider(ctx context.Context, id int64, data AIProviderData) (bool, error)
	// Users set to the provider get no AI; conversations keep its name.
	DeleteProvider(ctx context.Context, id int64) (bool, error)
	// nil leaves no default provider.
	SetDefaultProvider(ctx context.Context, id *int64) error
	// nil when the user has no AI.
	GetEffectiveProvider(ctx context.Context, userId int) (*AIProvider, error)
	// Only users with their own setting are returned.
	FindUserAccess(ctx context.Context, userIds []int) ([]AIUserAccess, error)
	// followDefault removes the user's own setting.
	SetUserAccess(ctx context.Context, userId int, followDefault bool, providerId *int64) error

	FindConversations(ctx context.Context, userId int, page int) (*Paged[AIConversation], error)
	GetConversation(ctx context.Context, userId int, id int64) (*AIConversation, error)
	CreateConversation(ctx context.Context, conversation NewAIConversation) (*AIConversation, error)
	RenameConversation(ctx context.Context, userId int, id int64, title string) (bool, error)
	DeleteConversation(ctx context.Context, userId int, id int64) (bool, error)
	AppendMessages(ctx context.Context, conversationId int64, messages []NewAIMessage) error
	GetMessages(ctx context.Context, conversationId int64) ([]AIMessage, error)
}
