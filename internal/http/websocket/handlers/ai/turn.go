package ai

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	aiclient "noteme/internal/components/ai"
	"noteme/internal/components/repository"
	"noteme/internal/http/aitools"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	statusDone     = "done"
	statusFailed   = "failed"
	statusDeclined = "declined"

	busyMessage          = "The assistant is already answering in this conversation."
	otherTabMessage      = "This conversation is running in another tab."
	mismatchMessage      = "The tool results do not match the requested calls."
	declinedText         = "The user declined this action."
	cancelledText        = "The turn was cancelled before the tool ran."
	timeoutText          = "The tool was not answered in time."
	unreadableResultText = "The tool's response could not be read."
	protectedPlaceholder = "[Protected note content is not stored.]"
	stopWait             = 5 * time.Second
	// Models stream faster than a slow connection drains its queue, and a
	// full queue drops the connection.
	chunkInterval = 50 * time.Millisecond
)

var (
	errCancelled = errors.New("turn cancelled")
	errTimeout   = errors.New("tool calls not answered in time")
)

// Pushes go only to the connection that sent the message, so two tabs never
// run the same tool twice; closing it cancels the turn.
type turn struct {
	id             string
	conversationID int64
	userID         int
	client         *websocket.Client
	cancel         context.CancelFunc
	done           chan struct{}
	results        chan []messages.AiToolResult
	// What the user had open when they sent the message.
	page string

	mu      sync.Mutex
	waiting []string
}

func (t *turn) stop() {
	t.cancel()
	select {
	case <-t.done:
	case <-time.After(stopWait):
	}
}

func (t *turn) expect(ids []string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.waiting = ids
}

// Every requested call is answered exactly once.
func (t *turn) deliver(results []messages.AiToolResult) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	if len(t.waiting) == 0 || len(results) != len(t.waiting) {
		return false
	}
	seen := map[string]bool{}
	for _, result := range results {
		if !slices.Contains(t.waiting, result.ID) || seen[result.ID] {
			return false
		}
		seen[result.ID] = true
	}
	t.waiting = nil
	t.results <- results
	return true
}

func (n *Namespace) runningTurn(conversationID int64) *turn {
	n.mu.Lock()
	defer n.mu.Unlock()
	return n.turns[conversationID]
}

func (n *Namespace) claim(t *turn) bool {
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.turns[t.conversationID] != nil {
		return false
	}
	n.turns[t.conversationID] = t
	return true
}

func (n *Namespace) release(t *turn) {
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.turns[t.conversationID] == t {
		delete(n.turns, t.conversationID)
	}
	close(t.done)
}

func (n *Namespace) sendMessage(ctx context.Context, req *websocket.Request) error {
	provider, err := n.provider(ctx, req)
	if err != nil {
		return err
	}
	var msg struct {
		ConversationID *int64    `json:"conversation_id" zod:"nullable"`
		Text           string    `json:"text"`
		Page           *openPage `json:"page"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}
	var issues validation.Issues
	issues.MinLength("text", strings.TrimSpace(msg.Text), 1, "Message must have at least one character")
	issues.MaxLength("text", msg.Text, maxMessageLength, "Message must have at most 20000 characters")
	if len(issues) > 0 {
		return issues
	}
	client, err := n.ai.Client(*provider)
	if errors.Is(err, aiclient.ErrKeyUnreadable) {
		return websocket.NewClientError(unreadableMessage)
	}
	if err != nil {
		return err
	}

	userID := req.Client.UserID
	page, err := n.describePage(ctx, userID, msg.Page)
	if err != nil {
		return err
	}
	var conversation *repository.AIConversation
	if msg.ConversationID != nil {
		if conversation, err = n.repo.AI().GetConversation(ctx, userID, *msg.ConversationID); err != nil {
			return err
		}
		if conversation == nil {
			return websocket.NewClientError(notFoundMessage)
		}
		if isLocked(conversation, provider) {
			return websocket.NewClientError(lockedMessage)
		}
	} else {
		conversation, err = n.repo.AI().CreateConversation(ctx, repository.NewAIConversation{
			UserId: userID, ProviderId: provider.Id, ProviderName: provider.Name, Model: provider.Model, Title: conversationTitle(msg.Text),
		})
		if err != nil {
			return err
		}
	}

	turnCtx, cancel := context.WithCancel(ctx)
	t := &turn{
		id:             uuid.NewString(),
		conversationID: conversation.Id,
		userID:         userID,
		client:         req.Client,
		cancel:         cancel,
		done:           make(chan struct{}),
		results:        make(chan []messages.AiToolResult, 1),
		page:           page,
	}
	if !n.claim(t) {
		cancel()
		return websocket.NewClientError(busyMessage)
	}
	if err := n.repo.AI().AppendMessages(ctx, conversation.Id, []repository.NewAIMessage{{Role: aiclient.RoleUser, Content: msg.Text}}); err != nil {
		cancel()
		n.release(t)
		return err
	}

	if err := req.Respond(ctx, &messages.SendAiMessageResponse{
		Header:       messages.Header{Type: messages.AiSendMessageResponse},
		Conversation: conversationRecord(conversation),
		TurnID:       t.id,
	}); err != nil {
		cancel()
		n.release(t)
		return err
	}
	pushConversationUpdated(ctx, req.Hub, userID, conversation.Id, false)
	go n.run(turnCtx, req, t, provider, client)
	if msg.ConversationID == nil {
		go n.nameConversation(ctx, req.Hub, userID, conversation.Id, conversation.Title, msg.Text, provider.Model, client)
	}
	return nil
}

func (n *Namespace) submitToolResults(ctx context.Context, req *websocket.Request) error {
	var msg messages.SubmitAiToolResults
	if err := req.Decode(&msg); err != nil {
		return err
	}
	for _, result := range msg.Results {
		if !slices.Contains([]string{statusDone, statusFailed, statusDeclined}, result.Status) {
			return validation.Issues{{Code: "invalid_value", Path: []any{"results", "status"}, Message: `Invalid option: expected one of "done"|"failed"|"declined"`}}
		}
	}
	t := n.runningTurn(msg.ConversationID)
	if t == nil || t.userID != req.Client.UserID || t.id != msg.TurnID {
		return websocket.NewClientError(mismatchMessage)
	}
	if t.client != req.Client {
		return websocket.NewClientError(otherTabMessage)
	}
	if !t.deliver(msg.Results) {
		return websocket.NewClientError(mismatchMessage)
	}
	return req.Respond(ctx, &messages.SubmitAiToolResultsResponse{Header: messages.Header{Type: messages.AiSubmitToolResultsResponse}})
}

func (n *Namespace) cancelTurn(ctx context.Context, req *websocket.Request) error {
	var msg messages.CancelAiTurn
	if err := req.Decode(&msg); err != nil {
		return err
	}
	t := n.runningTurn(msg.ConversationID)
	cancelled := t != nil && t.userID == req.Client.UserID
	if cancelled {
		t.cancel()
	}
	return req.Respond(ctx, &messages.CancelAiTurnResponse{Header: messages.Header{Type: messages.AiCancelTurnResponse}, Cancelled: cancelled})
}

type toolOutcome struct {
	call      messages.AiToolCall
	status    string
	content   string
	protected bool
}

func (n *Namespace) run(ctx context.Context, req *websocket.Request, t *turn, provider *repository.AIProvider, client aiclient.Provider) {
	defer n.release(t)
	// Saving and the last pushes outlive a cancelled turn.
	finalCtx := context.WithoutCancel(ctx)
	defer pushConversationUpdated(finalCtx, req.Hub, t.userID, t.conversationID, false)

	event := func(typ string) messages.AiTurnEvent {
		return messages.AiTurnEvent{Header: messages.Header{Namespace: messages.NamespaceAi, Type: typ}, ConversationID: t.conversationID, TurnID: t.id}
	}
	send := func(msg websocket.Outgoing) {
		if err := req.Send(finalCtx, msg); err != nil {
			n.log.Debug("Could not send an AI turn message", "error", err)
		}
	}
	fail := func(message string) {
		send(&messages.AiTurnFailedEvent{AiTurnEvent: event(messages.AiTurnFailed), Message: message})
	}
	finish := func(cancelled bool) {
		send(&messages.AiTurnFinishedEvent{AiTurnEvent: event(messages.AiTurnFinished), Cancelled: cancelled})
	}
	save := func(stored ...repository.NewAIMessage) bool {
		if err := n.repo.AI().AppendMessages(finalCtx, t.conversationID, stored); err != nil {
			n.log.Error("Could not save AI messages", "conversation", t.conversationID, "error", err)
			fail("The conversation could not be saved.")
			return false
		}
		return true
	}

	stored, err := n.repo.AI().GetMessages(ctx, t.conversationID)
	if err != nil {
		n.log.Error("Could not load AI messages", "conversation", t.conversationID, "error", err)
		fail("The conversation could not be loaded.")
		return
	}
	history := make([]aiclient.Message, 0, len(stored))
	for _, message := range stored {
		history = append(history, historyMessage(message))
	}

	session := req.Client.Session()
	tools := aitools.ForRole(session.Role)
	definitions := make([]aiclient.Tool, 0, len(tools))
	for _, tool := range tools {
		definitions = append(definitions, aiclient.Tool{Name: tool.Name, Description: tool.Description, Parameters: tool.Parameters})
	}
	system := systemPrompt(session, n.now(), t.page)

	started := event(messages.AiTurnStarted)
	send(&started)
	for round := 0; ; round++ {
		if round == n.maxRounds {
			fail(fmt.Sprintf("The assistant stopped after %d rounds of tool calls.", n.maxRounds))
			return
		}

		var streamed, unsent strings.Builder
		lastChunk := time.Time{}
		flush := func() {
			if unsent.Len() > 0 {
				send(&messages.AiMessageChunkEvent{AiTurnEvent: event(messages.AiMessageChunk), Text: unsent.String()})
				unsent.Reset()
				lastChunk = time.Now()
			}
		}
		response, err := client.Stream(ctx, aiclient.Request{Model: provider.Model, System: system, Messages: history, Tools: definitions}, func(text string) {
			streamed.WriteString(text)
			unsent.WriteString(text)
			if time.Since(lastChunk) >= chunkInterval {
				flush()
			}
		})
		flush()
		if err != nil {
			if partial := streamed.String(); partial != "" && !save(repository.NewAIMessage{Role: aiclient.RoleAssistant, Content: partial}) {
				return
			}
			if ctx.Err() != nil {
				finish(true)
				return
			}
			n.log.Info("AI provider failed", "provider", provider.Name, "error", err)
			fail("The AI provider could not answer: " + err.Error())
			return
		}

		calls := callsOf(response.ToolCalls)
		encoded, err := encodeToolCalls(calls)
		if err != nil {
			fail("The conversation could not be saved.")
			return
		}
		if !save(repository.NewAIMessage{Role: aiclient.RoleAssistant, Content: response.Text, ToolCalls: encoded}) {
			return
		}
		assistant := aiclient.Message{Role: aiclient.RoleAssistant, Content: response.Text}
		for _, call := range calls {
			assistant.ToolCalls = append(assistant.ToolCalls, aiclient.ToolCall{ID: call.ID, Name: call.Name, Arguments: call.Arguments})
		}
		history = append(history, assistant)
		if len(calls) == 0 {
			finish(false)
			return
		}

		outcomes, err := n.runTools(ctx, t, send, event(messages.AiToolCallsRequested), session, calls)
		results := make([]repository.NewAIMessage, 0, len(outcomes))
		for _, outcome := range outcomes {
			content := outcome.content
			if outcome.protected {
				content = protectedPlaceholder
			}
			results = append(results, repository.NewAIMessage{
				Role: aiclient.RoleTool, Content: content,
				ToolCallId: &outcome.call.ID, ToolName: &outcome.call.Name, ToolStatus: &outcome.status,
			})
			history = append(history, aiclient.Message{Role: aiclient.RoleTool, Content: outcome.content, ToolCallID: outcome.call.ID, ToolName: outcome.call.Name})
		}
		if !save(results...) {
			return
		}
		switch {
		case errors.Is(err, errCancelled):
			finish(true)
			return
		case errors.Is(err, errTimeout):
			fail(fmt.Sprintf("The tool calls were not answered within %s.", n.toolTimeout))
			return
		}
	}
}

// Ids are made unique, since some OpenAI-compatible servers leave them empty.
func callsOf(calls []aiclient.ToolCall) []messages.AiToolCall {
	result := make([]messages.AiToolCall, 0, len(calls))
	seen := map[string]bool{}
	for _, call := range calls {
		id := call.ID
		if id == "" || seen[id] {
			id = "call_" + uuid.NewString()
		}
		seen[id] = true
		result = append(result, messages.AiToolCall{ID: id, Name: call.Name, Arguments: call.Arguments})
	}
	return result
}

// Calls with unknown names or arguments that fail the tool's schema are
// answered here; the rest go to the browser, which runs them as the user.
func (n *Namespace) runTools(ctx context.Context, t *turn, send func(websocket.Outgoing), event messages.AiTurnEvent, session requeststate.Session, calls []messages.AiToolCall) ([]toolOutcome, error) {
	outcomes := make([]toolOutcome, len(calls))
	requests := []messages.AiToolCallRequest{}
	pending := map[string]int{}
	for index, call := range calls {
		outcomes[index] = toolOutcome{call: call, status: statusFailed}
		tool, ok := aitools.Find(session.Role, call.Name)
		if !ok {
			outcomes[index].content = fmt.Sprintf("There is no tool named %s.", call.Name)
			continue
		}
		prepared, err := tool.Prepare(aitools.Env{Session: session}, call.Arguments)
		if err != nil {
			outcomes[index].content = "Invalid arguments: " + err.Error()
			continue
		}
		request := messages.AiToolCallRequest{AiToolCall: call, Title: tool.Title, Confirm: tool.Confirm, Protected: tool.Protected, Browser: tool.Browser}
		if prepared != nil {
			request.Message = &messages.AiToolMessage{Namespace: prepared.Namespace, Type: prepared.Type, Expect: prepared.Expect, Payload: prepared.Payload, TimeoutMs: prepared.TimeoutMs}
		}
		requests = append(requests, request)
		pending[call.ID] = index
	}
	if len(requests) == 0 {
		return outcomes, nil
	}

	ids := make([]string, 0, len(requests))
	for _, request := range requests {
		ids = append(ids, request.ID)
	}
	t.expect(ids)
	event.Type = messages.AiToolCallsRequested
	send(&messages.AiToolCallsRequestedEvent{AiTurnEvent: event, Calls: requests})

	unanswered := func(text string) {
		t.expect(nil)
		for _, index := range pending {
			outcomes[index].content = text
		}
	}
	timer := time.NewTimer(n.toolTimeout)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		unanswered(cancelledText)
		return outcomes, errCancelled
	case <-timer.C:
		unanswered(timeoutText)
		return outcomes, errTimeout
	case results := <-t.results:
		for _, result := range results {
			index := pending[result.ID]
			outcome := &outcomes[index]
			outcome.status = result.Status
			outcome.protected = result.Protected
			outcome.content = result.Content
			switch result.Status {
			case statusDone:
				tool, _ := aitools.Find(session.Role, outcome.call.Name)
				content, err := tool.Result([]byte(result.Content))
				if err != nil {
					outcome.status, outcome.content = statusFailed, unreadableResultText
				} else {
					outcome.content = content
				}
			case statusDeclined:
				if outcome.content == "" {
					outcome.content = declinedText
				}
			}
			outcome.content = cut(outcome.content, n.maxResult)
		}
		return outcomes, nil
	}
}

func cut(text string, limit int) string {
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	return string(runes[:limit]) + fmt.Sprintf("\n[Cut to the first %d characters.]", limit)
}
