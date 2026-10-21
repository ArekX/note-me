package ai

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"noteme/internal/components"
	aiclient "noteme/internal/components/ai"
	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	noAccessMessage     = "AI is not available to you."
	unreadableMessage   = "The AI provider's API key cannot be decrypted. Ask an administrator to enter it again."
	notFoundMessage     = "Conversation not found."
	providerNotFound    = "Provider not found."
	maxMessageLength    = 20000
	maxTitleLength      = 100
	maxUserAccessLookup = 100
)

// Limits of a turn (decision 0.83).
const (
	defaultMaxRounds    = 25
	defaultMaxResult    = 20000
	defaultToolTimeout  = 10 * time.Minute
	defaultCheckTimeout = time.Minute
)

type Namespace struct {
	repo  repository.Repository
	ai    *aiclient.AI
	audit *audit.Log
	log   *slog.Logger

	mu    sync.Mutex
	turns map[int64]*turn

	maxRounds    int
	maxResult    int
	toolTimeout  time.Duration
	checkTimeout time.Duration
	now          func() time.Time
}

func New(c *components.Components) *Namespace {
	return &Namespace{
		repo:         c.Repository,
		ai:           c.AI,
		audit:        c.Audit,
		log:          c.Log,
		turns:        map[int64]*turn{},
		maxRounds:    defaultMaxRounds,
		maxResult:    defaultMaxResult,
		toolTimeout:  defaultToolTimeout,
		checkTimeout: defaultCheckTimeout,
		now:          time.Now,
	}
}

func (n *Namespace) Register(hub *websocket.Hub) {
	for typ, fn := range map[string]websocket.Handler{
		messages.AiGetProviders:       n.getProviders,
		messages.AiCreateProvider:     n.createProvider,
		messages.AiUpdateProvider:     n.updateProvider,
		messages.AiDeleteProvider:     n.deleteProvider,
		messages.AiSetDefaultProvider: n.setDefaultProvider,
		messages.AiTestProvider:       n.testProvider,
		messages.AiListProviderModels: n.listProviderModels,
		messages.AiGetUserAccess:      n.getUserAccess,
		messages.AiSetUserAccess:      n.setUserAccess,
		messages.AiGetAccess:          n.getAccess,
		messages.AiFindConversations:  n.findConversations,
		messages.AiGetTools:           n.getTools,
		messages.AiGetConversation:    n.getConversation,
		messages.AiSendMessage:        n.sendMessage,
		messages.AiSubmitToolResults:  n.submitToolResults,
		messages.AiCancelTurn:         n.cancelTurn,
		messages.AiRenameConversation: n.renameConversation,
		messages.AiDeleteConversation: n.deleteConversation,
	} {
		hub.Handle(messages.NamespaceAi, typ, fn)
	}
}

// Access is not part of the session, since a default change would rewrite
// every session; it is read on each message instead.
func (n *Namespace) provider(ctx context.Context, req *websocket.Request) (*repository.AIProvider, error) {
	provider, err := n.repo.AI().GetEffectiveProvider(ctx, req.Client.UserID)
	if err != nil {
		return nil, err
	}
	if provider == nil {
		return nil, websocket.NewClientError(noAccessMessage)
	}
	return provider, nil
}

// Editing the provider's model or key keeps its conversations open; only
// another provider (or none) locks them.
func isLocked(conversation *repository.AIConversation, provider *repository.AIProvider) bool {
	return provider == nil || conversation.ProviderId == nil || *conversation.ProviderId != provider.Id
}

const lockedMessage = "Your AI access changed, so this conversation can be read but not continued."

func pushAccessChanged(ctx context.Context, req *websocket.Request, userIDs ...int) {
	changed := &messages.AiAccessChangedEvent{Header: messages.Header{Namespace: messages.NamespaceAi, Type: messages.AiAccessChanged}}
	if len(userIDs) == 0 {
		req.Hub.SendToEveryone(ctx, 0, changed)
		return
	}
	req.Hub.SendToUsers(ctx, userIDs, changed)
}

func pushConversationUpdated(ctx context.Context, hub *websocket.Hub, userID int, conversationID int64, deleted bool) {
	hub.SendToUser(ctx, userID, &messages.AiConversationUpdatedEvent{
		Header:         messages.Header{Namespace: messages.NamespaceAi, Type: messages.AiConversationUpdated},
		ConversationID: conversationID,
		Deleted:        deleted,
	})
}

func conversationRecord(conversation *repository.AIConversation) messages.AiConversationRecord {
	return messages.AiConversationRecord{
		ID:        conversation.Id,
		Title:     conversation.Title,
		CreatedAt: conversation.CreatedAt,
		UpdatedAt: conversation.UpdatedAt,
	}
}

func decodeToolCalls(stored *string) []messages.AiToolCall {
	if stored == nil {
		return nil
	}
	var calls []messages.AiToolCall
	if err := json.Unmarshal([]byte(*stored), &calls); err != nil {
		return nil
	}
	return calls
}

func messageRecord(message repository.AIMessage) messages.AiMessageRecord {
	return messages.AiMessageRecord{
		ID:         message.Id,
		Role:       message.Role,
		Content:    message.Content,
		ToolCalls:  decodeToolCalls(message.ToolCalls),
		ToolCallID: message.ToolCallId,
		ToolName:   message.ToolName,
		ToolStatus: message.ToolStatus,
		CreatedAt:  message.CreatedAt,
	}
}

func historyMessage(message repository.AIMessage) aiclient.Message {
	converted := aiclient.Message{Role: message.Role, Content: message.Content}
	for _, call := range decodeToolCalls(message.ToolCalls) {
		converted.ToolCalls = append(converted.ToolCalls, aiclient.ToolCall{ID: call.ID, Name: call.Name, Arguments: call.Arguments})
	}
	if message.ToolCallId != nil {
		converted.ToolCallID = *message.ToolCallId
	}
	if message.ToolName != nil {
		converted.ToolName = *message.ToolName
	}
	return converted
}
