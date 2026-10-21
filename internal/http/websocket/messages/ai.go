package messages

import "encoding/json"

const (
	AiGetProviders       = "getProviders"
	AiCreateProvider     = "createProvider"
	AiUpdateProvider     = "updateProvider"
	AiDeleteProvider     = "deleteProvider"
	AiSetDefaultProvider = "setDefaultProvider"
	AiTestProvider       = "testProvider"
	AiListProviderModels = "listProviderModels"
	AiGetUserAccess      = "getUserAccess"
	AiSetUserAccess      = "setUserAccess"
	AiGetAccess          = "getAccess"
	AiFindConversations  = "findConversations"
	AiGetTools           = "getTools"
	AiGetConversation    = "getConversation"
	AiSendMessage        = "sendMessage"
	AiSubmitToolResults  = "submitToolResults"
	AiCancelTurn         = "cancelTurn"
	AiRenameConversation = "renameConversation"
	AiDeleteConversation = "deleteConversation"

	AiGetProvidersResponse       = "getProvidersResponse"
	AiCreateProviderResponse     = "createProviderResponse"
	AiUpdateProviderResponse     = "updateProviderResponse"
	AiDeleteProviderResponse     = "deleteProviderResponse"
	AiSetDefaultProviderResponse = "setDefaultProviderResponse"
	AiTestProviderResponse       = "testProviderResponse"
	AiListProviderModelsResponse = "listProviderModelsResponse"
	AiGetUserAccessResponse      = "getUserAccessResponse"
	AiSetUserAccessResponse      = "setUserAccessResponse"
	AiGetAccessResponse          = "getAccessResponse"
	AiFindConversationsResponse  = "findConversationsResponse"
	AiGetToolsResponse           = "getToolsResponse"
	AiGetConversationResponse    = "getConversationResponse"
	AiSendMessageResponse        = "sendMessageResponse"
	AiSubmitToolResultsResponse  = "submitToolResultsResponse"
	AiCancelTurnResponse         = "cancelTurnResponse"
	AiRenameConversationResponse = "renameConversationResponse"
	AiDeleteConversationResponse = "deleteConversationResponse"

	AiTurnStarted         = "turnStarted"
	AiMessageChunk        = "messageChunk"
	AiToolCallsRequested  = "toolCallsRequested"
	AiTurnFinished        = "turnFinished"
	AiTurnFailed          = "turnFailed"
	AiConversationUpdated = "conversationUpdated"
	AiAccessChanged       = "accessChanged"
)

// Access values of an admin's per-user setting.
const (
	AiAccessDefault  = "default"
	AiAccessNone     = "none"
	AiAccessProvider = "provider"
)

// The key itself is never sent back.
type AiProviderRecord struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	Type          string `json:"type"`
	BaseURL       string `json:"base_url"`
	Model         string `json:"model"`
	IsDefault     bool   `json:"is_default"`
	HasKey        bool   `json:"has_key"`
	KeyUnreadable bool   `json:"key_unreadable"`
	CreatedAt     int64  `json:"created_at"`
	UpdatedAt     int64  `json:"updated_at"`
}

// On update an absent api_key keeps the stored one.
type AiProviderRequest struct {
	Name    string  `json:"name"`
	Type    string  `json:"type"`
	BaseURL string  `json:"base_url"`
	Model   string  `json:"model"`
	APIKey  *string `json:"api_key,omitempty"`
}

type AiUserAccessRecord struct {
	UserID     int64  `json:"user_id"`
	Access     string `json:"access"`
	ProviderID *int64 `json:"provider_id"`
}

type AiConversationRecord struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

type AiToolCall struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments"`
}

type AiMessageRecord struct {
	ID         int64        `json:"id"`
	Role       string       `json:"role"`
	Content    string       `json:"content"`
	ToolCalls  []AiToolCall `json:"tool_calls"`
	ToolCallID *string      `json:"tool_call_id"`
	ToolName   *string      `json:"tool_name"`
	ToolStatus *string      `json:"tool_status"`
	CreatedAt  int64        `json:"created_at"`
}

type AiToolInfo struct {
	Name        string `json:"name"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Confirm     bool   `json:"confirm"`
	Protected   string `json:"protected"`
	Browser     bool   `json:"browser"`
}

// The websocket message the browser sends for a tool call.
type AiToolMessage struct {
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
	Expect    string `json:"expect"`
	Payload   any    `json:"payload"`
	TimeoutMs int    `json:"timeout_ms,omitempty"`
}

type AiToolCallRequest struct {
	AiToolCall
	Title     string         `json:"title"`
	Confirm   bool           `json:"confirm"`
	Protected string         `json:"protected"`
	Browser   bool           `json:"browser"`
	Message   *AiToolMessage `json:"message"`
}

// Status is done, failed or declined; content is the response JSON for a
// done websocket call, else the text for the model. Protected marks a
// decrypted protected note, which is not stored.
type AiToolResult struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	Content   string `json:"content"`
	Protected bool   `json:"protected,omitempty"`
}

type GetAiProviders struct{ Header }

type GetAiProvidersResponse struct {
	Header
	Providers []AiProviderRecord `json:"providers"`
}

type CreateAiProviderResponse struct {
	Header
	Record AiProviderRecord `json:"record"`
}

type UpdateAiProviderResponse struct {
	Header
	Record AiProviderRecord `json:"record"`
}

type DeleteAiProvider struct {
	Header
	ID int64 `json:"id"`
}

type DeleteAiProviderResponse struct {
	Header
	DeletedID int64 `json:"deleted_id"`
}

type SetDefaultAiProvider struct {
	Header
	ID *int64 `json:"id"`
}

type SetDefaultAiProviderResponse struct {
	Header
	ID *int64 `json:"id"`
}

type TestAiProvider struct {
	Header
	ID int64 `json:"id"`
}

type TestAiProviderResponse struct {
	Header
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// Without api_key the stored key of provider_id is used, so an edit form can
// load models without asking for the key again.
type ListAiProviderModels struct {
	Header
	ProviderID *int64 `json:"provider_id"`
	// Not "type", which names the message.
	ProviderType string  `json:"provider_type"`
	BaseURL      string  `json:"base_url"`
	APIKey       *string `json:"api_key"`
}

type ListAiProviderModelsResponse struct {
	Header
	Models []string `json:"models"`
}

type GetAiUserAccess struct {
	Header
	UserIDs []int64 `json:"user_ids"`
}

type GetAiUserAccessResponse struct {
	Header
	Records []AiUserAccessRecord `json:"records"`
}

type SetAiUserAccess struct {
	Header
	AiUserAccessRecord
}

type SetAiUserAccessResponse struct {
	Header
	Record AiUserAccessRecord `json:"record"`
}

type GetAiAccessResponse struct {
	Header
	Enabled bool `json:"enabled"`
}

type FindAiConversations struct {
	Header
	Page int `json:"page"`
}

type FindAiConversationsResponse struct {
	Header
	Records Paged[AiConversationRecord] `json:"records"`
}

type GetAiToolsResponse struct {
	Header
	Tools []AiToolInfo `json:"tools"`
}

type GetAiConversation struct {
	Header
	ID int64 `json:"id"`
}

type GetAiConversationResponse struct {
	Header
	Conversation AiConversationRecord `json:"conversation"`
	Messages     []AiMessageRecord    `json:"messages"`
	IsLocked     bool                 `json:"is_locked"`
	IsRunning    bool                 `json:"is_running"`
}

type SendAiMessageResponse struct {
	Header
	Conversation AiConversationRecord `json:"conversation"`
	TurnID       string               `json:"turn_id"`
}

type SubmitAiToolResults struct {
	Header
	ConversationID int64          `json:"conversation_id"`
	TurnID         string         `json:"turn_id"`
	Results        []AiToolResult `json:"results"`
}

type SubmitAiToolResultsResponse struct{ Header }

type CancelAiTurn struct {
	Header
	ConversationID int64 `json:"conversation_id"`
}

type CancelAiTurnResponse struct {
	Header
	Cancelled bool `json:"cancelled"`
}

type RenameAiConversationResponse struct {
	Header
	ID    int64  `json:"id"`
	Title string `json:"title"`
}

type DeleteAiConversation struct {
	Header
	ID int64 `json:"id"`
}

type DeleteAiConversationResponse struct {
	Header
	DeletedID int64 `json:"deleted_id"`
}

type AiTurnEvent struct {
	Header
	ConversationID int64  `json:"conversation_id"`
	TurnID         string `json:"turn_id"`
}

type AiMessageChunkEvent struct {
	AiTurnEvent
	Text string `json:"text"`
}

type AiToolCallsRequestedEvent struct {
	AiTurnEvent
	Calls []AiToolCallRequest `json:"calls"`
}

type AiTurnFinishedEvent struct {
	AiTurnEvent
	Cancelled bool `json:"cancelled"`
}

type AiTurnFailedEvent struct {
	AiTurnEvent
	Message string `json:"message"`
}

type AiConversationUpdatedEvent struct {
	Header
	ConversationID int64 `json:"conversation_id"`
	Deleted        bool  `json:"deleted"`
}

type AiAccessChangedEvent struct{ Header }
