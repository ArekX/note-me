package ai

import (
	"context"
	"encoding/json"
	"strings"

	"noteme/internal/http/aitools"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

// Without access the answer says so instead of failing, so the browser can
// hide the assistant.
func (n *Namespace) getAccess(ctx context.Context, req *websocket.Request) error {
	provider, err := n.repo.AI().GetEffectiveProvider(ctx, req.Client.UserID)
	if err != nil {
		return err
	}
	response := &messages.GetAiAccessResponse{Header: messages.Header{Type: messages.AiGetAccessResponse}}
	if provider != nil {
		response.Enabled = true
	}
	return req.Respond(ctx, response)
}

func (n *Namespace) findConversations(ctx context.Context, req *websocket.Request) error {
	if _, err := n.provider(ctx, req); err != nil {
		return err
	}
	var msg messages.FindAiConversations
	if err := req.Decode(&msg); err != nil {
		return err
	}
	page, err := n.repo.AI().FindConversations(ctx, req.Client.UserID, msg.Page)
	if err != nil {
		return err
	}
	records := make([]messages.AiConversationRecord, 0, len(page.Results))
	for _, conversation := range page.Results {
		records = append(records, conversationRecord(&conversation))
	}
	return req.Respond(ctx, &messages.FindAiConversationsResponse{
		Header:  messages.Header{Type: messages.AiFindConversationsResponse},
		Records: messages.Paged[messages.AiConversationRecord]{Results: records, Total: page.Total, Page: page.Page, PerPage: page.PerPage},
	})
}

func (n *Namespace) getTools(ctx context.Context, req *websocket.Request) error {
	if _, err := n.provider(ctx, req); err != nil {
		return err
	}
	tools := aitools.ForRole(req.Client.Session().Role)
	infos := make([]messages.AiToolInfo, 0, len(tools))
	for _, tool := range tools {
		infos = append(infos, messages.AiToolInfo{
			Name: tool.Name, Title: tool.Title, Description: tool.Description,
			Confirm: tool.Confirm, Protected: tool.Protected, Browser: tool.Browser,
		})
	}
	return req.Respond(ctx, &messages.GetAiToolsResponse{Header: messages.Header{Type: messages.AiGetToolsResponse}, Tools: infos})
}

func (n *Namespace) getConversation(ctx context.Context, req *websocket.Request) error {
	provider, err := n.provider(ctx, req)
	if err != nil {
		return err
	}
	var msg messages.GetAiConversation
	if err := req.Decode(&msg); err != nil {
		return err
	}
	conversation, err := n.repo.AI().GetConversation(ctx, req.Client.UserID, msg.ID)
	if err != nil {
		return err
	}
	if conversation == nil {
		return websocket.NewClientError(notFoundMessage)
	}
	stored, err := n.repo.AI().GetMessages(ctx, conversation.Id)
	if err != nil {
		return err
	}
	records := make([]messages.AiMessageRecord, 0, len(stored))
	for _, message := range stored {
		records = append(records, messageRecord(message))
	}
	return req.Respond(ctx, &messages.GetAiConversationResponse{
		Header:       messages.Header{Type: messages.AiGetConversationResponse},
		Conversation: conversationRecord(conversation),
		Messages:     records,
		IsLocked:     isLocked(conversation, provider),
		IsRunning:    n.runningTurn(conversation.Id) != nil,
	})
}

func (n *Namespace) renameConversation(ctx context.Context, req *websocket.Request) error {
	if _, err := n.provider(ctx, req); err != nil {
		return err
	}
	var msg struct {
		ID    int64  `json:"id"`
		Title string `json:"title"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}
	title := strings.TrimSpace(msg.Title)
	var issues validation.Issues
	issues.MinLength("title", title, 1, "Title must have at least one character")
	issues.MaxLength("title", title, 255, "Title must have at most 255 characters")
	if len(issues) > 0 {
		return issues
	}
	renamed, err := n.repo.AI().RenameConversation(ctx, req.Client.UserID, msg.ID, title)
	if err != nil {
		return err
	}
	if !renamed {
		return websocket.NewClientError(notFoundMessage)
	}
	if err := req.Respond(ctx, &messages.RenameAiConversationResponse{Header: messages.Header{Type: messages.AiRenameConversationResponse}, ID: msg.ID, Title: title}); err != nil {
		return err
	}
	pushConversationUpdated(ctx, req.Hub, req.Client.UserID, msg.ID, false)
	return nil
}

// A running turn is cancelled first, so it does not write into the deleted
// conversation.
func (n *Namespace) deleteConversation(ctx context.Context, req *websocket.Request) error {
	if _, err := n.provider(ctx, req); err != nil {
		return err
	}
	var msg messages.DeleteAiConversation
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if running := n.runningTurn(msg.ID); running != nil && running.userID == req.Client.UserID {
		running.stop()
	}
	deleted, err := n.repo.AI().DeleteConversation(ctx, req.Client.UserID, msg.ID)
	if err != nil {
		return err
	}
	if !deleted {
		return websocket.NewClientError(notFoundMessage)
	}
	if err := req.Respond(ctx, &messages.DeleteAiConversationResponse{Header: messages.Header{Type: messages.AiDeleteConversationResponse}, DeletedID: msg.ID}); err != nil {
		return err
	}
	pushConversationUpdated(ctx, req.Hub, req.Client.UserID, msg.ID, true)
	return nil
}

func conversationTitle(text string) string {
	line, _, _ := strings.Cut(strings.TrimSpace(text), "\n")
	runes := []rune(strings.TrimSpace(line))
	if len(runes) > maxTitleLength {
		return strings.TrimSpace(string(runes[:maxTitleLength])) + "…"
	}
	return string(runes)
}

func encodeToolCalls(calls []messages.AiToolCall) (*string, error) {
	if len(calls) == 0 {
		return nil, nil
	}
	data, err := json.Marshal(calls)
	if err != nil {
		return nil, err
	}
	encoded := string(data)
	return &encoded, nil
}
