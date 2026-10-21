package ai

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strings"

	aiclient "noteme/internal/components/ai"
	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/http/rbac"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	checkPrompt     = "Reply with the single word OK."
	checkReplyLimit = 200
)

func validateProvider(data messages.AiProviderRequest, creating bool) validation.Issues {
	var issues validation.Issues
	issues.MinLength("name", strings.TrimSpace(data.Name), 1, "Name must have at least one character")
	issues.MaxLength("name", data.Name, 255, "Name must have at most 255 characters")
	if !slices.Contains(aiclient.Types, data.Type) {
		issues.Add("invalid_value", "type", `Invalid option: expected one of "ollama"|"openai"|"claude"`)
	}
	baseURL := strings.TrimSpace(data.BaseURL)
	if baseURL != "" && !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		issues.Custom("base_url", "Base URL must start with http:// or https://")
	}
	issues.MaxLength("base_url", baseURL, 2048, "Base URL must have at most 2048 characters")
	issues.MinLength("model", strings.TrimSpace(data.Model), 1, "Model is required")
	issues.MaxLength("model", data.Model, 255, "Model must have at most 255 characters")
	needsKey := data.Type == aiclient.TypeOpenAI || data.Type == aiclient.TypeClaude
	if creating && needsKey && (data.APIKey == nil || strings.TrimSpace(*data.APIKey) == "") {
		issues.Custom("api_key", "API key is required")
	}
	return issues
}

func (n *Namespace) decodeProvider(raw json.RawMessage, creating bool) (repository.AIProviderData, error) {
	var data messages.AiProviderRequest
	if issues := validation.Decode(raw, &data); len(issues) > 0 {
		return repository.AIProviderData{}, issues
	}
	if issues := validateProvider(data, creating); len(issues) > 0 {
		return repository.AIProviderData{}, issues
	}
	baseURL := strings.TrimSpace(data.BaseURL)
	if baseURL == "" {
		baseURL = aiclient.DefaultBaseURLs[data.Type]
	}
	result := repository.AIProviderData{Name: strings.TrimSpace(data.Name), Type: data.Type, BaseURL: baseURL, Model: strings.TrimSpace(data.Model)}
	if data.APIKey != nil && strings.TrimSpace(*data.APIKey) != "" {
		sealed, err := n.ai.SealKey(strings.TrimSpace(*data.APIKey))
		if err != nil {
			return repository.AIProviderData{}, err
		}
		result.APIKey = &sealed
	}
	return result, nil
}

func (n *Namespace) providerRecord(provider repository.AIProvider) messages.AiProviderRecord {
	record := messages.AiProviderRecord{
		ID:        provider.Id,
		Name:      provider.Name,
		Type:      provider.Type,
		BaseURL:   provider.BaseURL,
		Model:     provider.Model,
		IsDefault: provider.IsDefault,
		HasKey:    provider.APIKey != nil,
		CreatedAt: provider.CreatedAt,
		UpdatedAt: provider.UpdatedAt,
	}
	if provider.APIKey != nil {
		_, err := n.ai.OpenKey(provider.Id, *provider.APIKey)
		record.KeyUnreadable = err != nil
	}
	return record
}

func providerError(err error) error {
	if errors.Is(err, repository.ErrAIProviderExists) {
		return websocket.NewClientError(err.Error())
	}
	return err
}

func (n *Namespace) storedProvider(ctx context.Context, id int64) (*repository.AIProvider, error) {
	provider, err := n.repo.AI().GetProvider(ctx, id)
	if err != nil {
		return nil, err
	}
	if provider == nil {
		return nil, websocket.NewClientError(providerNotFound)
	}
	return provider, nil
}

func providerDetails(provider *repository.AIProvider) map[string]any {
	return map[string]any{"provider_id": provider.Id, "name": provider.Name, "type": provider.Type, "model": provider.Model}
}

// The other admins' provider lists; access follows in accessChanged.
func notifyAdmins(ctx context.Context, req *websocket.Request, id int64) {
	req.Hub.SendToPermission(ctx, rbac.CanManageAiProviders, req.Client.UserID, messages.NewDataChanged(messages.EntityAiProvider, id))
}

func (n *Namespace) getProviders(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	providers, err := n.repo.AI().GetProviders(ctx)
	if err != nil {
		return err
	}
	records := make([]messages.AiProviderRecord, 0, len(providers))
	for _, provider := range providers {
		records = append(records, n.providerRecord(provider))
	}
	return req.Respond(ctx, &messages.GetAiProvidersResponse{Header: messages.Header{Type: messages.AiGetProvidersResponse}, Providers: records})
}

func (n *Namespace) createProvider(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	var msg struct {
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}
	data, err := n.decodeProvider(msg.Data, true)
	if err != nil {
		return err
	}
	provider, err := n.repo.AI().CreateProvider(ctx, data)
	if err != nil {
		return providerError(err)
	}
	n.audit.Record(ctx, audit.AIProviderCreated, req.Client.Actor(), providerDetails(provider))

	req.RespondToUser(ctx, &messages.CreateAiProviderResponse{Header: messages.Header{Type: messages.AiCreateProviderResponse}, Record: n.providerRecord(*provider)})
	notifyAdmins(ctx, req, provider.Id)
	return nil
}

func (n *Namespace) updateProvider(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	var msg struct {
		ID   int64           `json:"id"`
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}
	existing, err := n.storedProvider(ctx, msg.ID)
	if err != nil {
		return err
	}
	data, err := n.decodeProvider(msg.Data, existing.APIKey == nil)
	if err != nil {
		return err
	}
	if _, err := n.repo.AI().UpdateProvider(ctx, msg.ID, data); err != nil {
		return providerError(err)
	}
	updated, err := n.storedProvider(ctx, msg.ID)
	if err != nil {
		return err
	}
	details := providerDetails(updated)
	details["key_changed"] = data.APIKey != nil
	n.audit.Record(ctx, audit.AIProviderUpdated, req.Client.Actor(), details)

	req.RespondToUser(ctx, &messages.UpdateAiProviderResponse{Header: messages.Header{Type: messages.AiUpdateProviderResponse}, Record: n.providerRecord(*updated)})
	notifyAdmins(ctx, req, msg.ID)
	pushAccessChanged(ctx, req)
	return nil
}

// Users set to the provider get no AI, users on the default lose it when it
// was the default; their conversations stay, locked.
func (n *Namespace) deleteProvider(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	var msg messages.DeleteAiProvider
	if err := req.Decode(&msg); err != nil {
		return err
	}
	existing, err := n.storedProvider(ctx, msg.ID)
	if err != nil {
		return err
	}
	if _, err := n.repo.AI().DeleteProvider(ctx, msg.ID); err != nil {
		return err
	}
	n.audit.Record(ctx, audit.AIProviderDeleted, req.Client.Actor(), providerDetails(existing))

	req.RespondToUser(ctx, &messages.DeleteAiProviderResponse{Header: messages.Header{Type: messages.AiDeleteProviderResponse}, DeletedID: msg.ID})
	notifyAdmins(ctx, req, msg.ID)
	pushAccessChanged(ctx, req)
	return nil
}

func (n *Namespace) setDefaultProvider(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	var msg messages.SetDefaultAiProvider
	if err := req.Decode(&msg); err != nil {
		return err
	}
	details := map[string]any{"provider_id": nil}
	if msg.ID != nil {
		provider, err := n.storedProvider(ctx, *msg.ID)
		if err != nil {
			return err
		}
		details = providerDetails(provider)
	}
	if err := n.repo.AI().SetDefaultProvider(ctx, msg.ID); err != nil {
		return err
	}
	n.audit.Record(ctx, audit.AIDefaultChanged, req.Client.Actor(), details)

	req.RespondToUser(ctx, &messages.SetDefaultAiProviderResponse{Header: messages.Header{Type: messages.AiSetDefaultProviderResponse}, ID: msg.ID})
	var id int64
	if msg.ID != nil {
		id = *msg.ID
	}
	notifyAdmins(ctx, req, id)
	pushAccessChanged(ctx, req)
	return nil
}

// A short request with one tool, so a model without tool support fails here
// rather than in a conversation. It runs off the connection's queue.
func (n *Namespace) testProvider(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	var msg messages.TestAiProvider
	if err := req.Decode(&msg); err != nil {
		return err
	}
	provider, err := n.storedProvider(ctx, msg.ID)
	if err != nil {
		return err
	}

	respond := func(success bool, message string) {
		if err := req.Respond(ctx, &messages.TestAiProviderResponse{Header: messages.Header{Type: messages.AiTestProviderResponse}, Success: success, Message: message}); err != nil {
			n.log.Debug("Could not send the AI provider test result", "error", err)
		}
	}
	client, err := n.ai.Client(*provider)
	if err != nil {
		respond(false, err.Error())
		return nil
	}
	go func() {
		checkCtx, cancel := context.WithTimeout(ctx, n.checkTimeout)
		defer cancel()
		response, err := client.Stream(checkCtx, aiclient.Request{
			Model:    provider.Model,
			Messages: []aiclient.Message{{Role: aiclient.RoleUser, Content: checkPrompt}},
			Tools:    []aiclient.Tool{{Name: "get_time", Description: "Gets the current time.", Parameters: json.RawMessage(`{"type":"object","properties":{}}`)}},
		}, func(string) {})
		if err != nil {
			respond(false, err.Error())
			return
		}
		reply := strings.TrimSpace(response.Text)
		if reply == "" && len(response.ToolCalls) > 0 {
			reply = "a tool call"
		}
		if len([]rune(reply)) > checkReplyLimit {
			reply = string([]rune(reply)[:checkReplyLimit]) + "…"
		}
		respond(true, "The provider answered with "+reply)
	}()
	return nil
}

func (n *Namespace) listProviderModels(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	var msg messages.ListAiProviderModels
	if err := req.Decode(&msg); err != nil {
		return err
	}
	if !slices.Contains(aiclient.Types, msg.ProviderType) {
		return websocket.NewClientError(`Invalid option: expected one of "ollama"|"openai"|"claude"`)
	}

	key := ""
	switch {
	case msg.APIKey != nil:
		key = strings.TrimSpace(*msg.APIKey)
	case msg.ProviderID != nil:
		provider, err := n.storedProvider(ctx, *msg.ProviderID)
		if err != nil {
			return err
		}
		if provider.APIKey != nil {
			if key, err = n.ai.OpenKey(provider.Id, *provider.APIKey); err != nil {
				return websocket.NewClientError(err.Error())
			}
		}
	}
	client, err := aiclient.NewClient(n.ai.HTTP(), msg.ProviderType, strings.TrimSpace(msg.BaseURL), key)
	if err != nil {
		return err
	}
	go func() {
		listCtx, cancel := context.WithTimeout(ctx, n.checkTimeout)
		defer cancel()
		models, err := client.ListModels(listCtx)
		if err != nil {
			_ = req.Respond(ctx, &messages.Error{Header: messages.Header{Namespace: messages.NamespaceSystem, Type: messages.SystemError}, Message: "Could not load models: " + err.Error()})
			return
		}
		if err := req.Respond(ctx, &messages.ListAiProviderModelsResponse{Header: messages.Header{Type: messages.AiListProviderModelsResponse}, Models: models}); err != nil {
			n.log.Debug("Could not send the AI models", "error", err)
		}
	}()
	return nil
}

func (n *Namespace) getUserAccess(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	var msg messages.GetAiUserAccess
	if err := req.Decode(&msg); err != nil {
		return err
	}
	var issues validation.Issues
	if issues.MaxItems("user_ids", len(msg.UserIDs), maxUserAccessLookup, ""); len(issues) > 0 {
		return issues
	}
	userIDs := make([]int, 0, len(msg.UserIDs))
	for _, id := range msg.UserIDs {
		userIDs = append(userIDs, int(id))
	}
	stored, err := n.repo.AI().FindUserAccess(ctx, userIDs)
	if err != nil {
		return err
	}
	byUser := map[int]repository.AIUserAccess{}
	for _, access := range stored {
		byUser[access.UserId] = access
	}
	records := make([]messages.AiUserAccessRecord, 0, len(msg.UserIDs))
	for _, id := range msg.UserIDs {
		record := messages.AiUserAccessRecord{UserID: id, Access: messages.AiAccessDefault}
		if access, ok := byUser[int(id)]; ok {
			record.Access = messages.AiAccessNone
			if access.ProviderId != nil {
				record.Access = messages.AiAccessProvider
				record.ProviderID = access.ProviderId
			}
		}
		records = append(records, record)
	}
	return req.Respond(ctx, &messages.GetAiUserAccessResponse{Header: messages.Header{Type: messages.AiGetUserAccessResponse}, Records: records})
}

func (n *Namespace) setUserAccess(ctx context.Context, req *websocket.Request) error {
	if err := req.Client.Require(rbac.CanManageAiProviders); err != nil {
		return err
	}
	var msg messages.SetAiUserAccess
	if err := req.Decode(&msg); err != nil {
		return err
	}
	user, err := n.repo.Users().GetUserById(ctx, int(msg.UserID))
	if err != nil {
		return err
	}
	if user == nil {
		return websocket.NewClientError("User not found.")
	}

	record := messages.AiUserAccessRecord{UserID: msg.UserID, Access: msg.Access}
	details := map[string]any{"user_id": user.Id, "username": user.Username, "access": msg.Access}
	switch msg.Access {
	case messages.AiAccessDefault:
		err = n.repo.AI().SetUserAccess(ctx, user.Id, true, nil)
	case messages.AiAccessNone:
		err = n.repo.AI().SetUserAccess(ctx, user.Id, false, nil)
	case messages.AiAccessProvider:
		if msg.ProviderID == nil {
			return websocket.NewClientError(providerNotFound)
		}
		provider, findErr := n.storedProvider(ctx, *msg.ProviderID)
		if findErr != nil {
			return findErr
		}
		record.ProviderID = &provider.Id
		details["provider_id"] = provider.Id
		details["provider"] = provider.Name
		err = n.repo.AI().SetUserAccess(ctx, user.Id, false, &provider.Id)
	default:
		return validation.Issues{{Code: "invalid_value", Path: []any{"access"}, Message: `Invalid option: expected one of "default"|"none"|"provider"`}}
	}
	if err != nil {
		return err
	}
	n.audit.Record(ctx, audit.AIAccessChanged, req.Client.Actor(), details)

	req.RespondToUser(ctx, &messages.SetAiUserAccessResponse{Header: messages.Header{Type: messages.AiSetUserAccessResponse}, Record: record})
	req.Hub.SendToPermission(ctx, rbac.CanManageAiProviders, req.Client.UserID, messages.NewDataChanged(messages.EntityUser, int64(user.Id)))
	pushAccessChanged(ctx, req, user.Id)
	return nil
}
