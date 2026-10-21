package sqlrepo

import (
	"context"
	"errors"
	"testing"

	"noteme/internal/components/repository"
)

func newTestProvider(t *testing.T, r *Repository, name string, key *string) *repository.AIProvider {
	t.Helper()
	provider, err := r.CreateProvider(context.Background(), repository.AIProviderData{
		Name: name, Type: "openai", BaseURL: "https://api.openai.com/v1", Model: "gpt-test", APIKey: key,
	})
	if err != nil {
		t.Fatal(err)
	}
	return provider
}

func effectiveName(t *testing.T, r *Repository, userId int) string {
	t.Helper()
	provider, err := r.GetEffectiveProvider(context.Background(), userId)
	if err != nil {
		t.Fatal(err)
	}
	if provider == nil {
		return ""
	}
	return provider.Name
}

func TestAIProviders(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	key := "v2:sealed"
	first := newTestProvider(t, r, "OpenAI", &key)
	if first.Type != "openai" || first.APIKey == nil || *first.APIKey != key || first.IsDefault || first.CreatedAt == 0 {
		t.Errorf("created = %+v", first)
	}
	second := newTestProvider(t, r, "Local", nil)
	if _, err := r.CreateProvider(ctx, repository.AIProviderData{Name: "Local", Type: "ollama"}); !errors.Is(err, repository.ErrAIProviderExists) {
		t.Errorf("duplicate name = %v", err)
	}

	if providers, err := r.GetProviders(ctx); err != nil || len(providers) != 2 || providers[0].Name != "Local" {
		t.Errorf("providers = %+v, %v", providers, err)
	}

	updated, err := r.UpdateProvider(ctx, first.Id, repository.AIProviderData{Name: "Renamed", Type: "openai", BaseURL: "https://example.com/v1", Model: "gpt-other"})
	if err != nil || !updated {
		t.Fatalf("update = %v, %v", updated, err)
	}
	if got, _ := r.GetProvider(ctx, first.Id); got.Name != "Renamed" || got.Model != "gpt-other" || got.APIKey == nil || *got.APIKey != key {
		t.Errorf("after update without a key = %+v", got)
	}
	newKey := "v2:other"
	if _, err := r.UpdateProvider(ctx, first.Id, repository.AIProviderData{Name: "Renamed", Type: "openai", Model: "gpt-other", APIKey: &newKey}); err != nil {
		t.Fatal(err)
	}
	if got, _ := r.GetProvider(ctx, first.Id); *got.APIKey != newKey {
		t.Errorf("key after update = %v", *got.APIKey)
	}
	if _, err := r.UpdateProvider(ctx, first.Id, repository.AIProviderData{Name: "Local"}); !errors.Is(err, repository.ErrAIProviderExists) {
		t.Errorf("rename to a taken name = %v", err)
	}
	if updated, err := r.UpdateProvider(ctx, 999, repository.AIProviderData{Name: "Missing"}); err != nil || updated {
		t.Errorf("update of a missing provider = %v, %v", updated, err)
	}
	if got, err := r.GetProvider(ctx, 999); err != nil || got != nil {
		t.Errorf("missing provider = %+v, %v", got, err)
	}

	if err := r.SetDefaultProvider(ctx, &first.Id); err != nil {
		t.Fatal(err)
	}
	if err := r.SetDefaultProvider(ctx, &second.Id); err != nil {
		t.Fatal(err)
	}
	providers, _ := r.GetProviders(ctx)
	if !providers[0].IsDefault || providers[1].IsDefault {
		t.Errorf("defaults = %+v", providers)
	}
	if err := r.SetDefaultProvider(ctx, nil); err != nil {
		t.Fatal(err)
	}
	if providers, _ := r.GetProviders(ctx); providers[0].IsDefault || providers[1].IsDefault {
		t.Errorf("defaults after clearing = %+v", providers)
	}
}

func TestAIAccessResolution(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	follower := createTestUser(t, r, "follower")
	overridden := createTestUser(t, r, "overridden")
	disabled := createTestUser(t, r, "disabled")

	if name := effectiveName(t, r, follower); name != "" {
		t.Errorf("no providers: %q", name)
	}

	main := newTestProvider(t, r, "Main", nil)
	other := newTestProvider(t, r, "Other", nil)
	if name := effectiveName(t, r, follower); name != "" {
		t.Errorf("no default: %q", name)
	}
	if err := r.SetDefaultProvider(ctx, &main.Id); err != nil {
		t.Fatal(err)
	}
	if err := r.SetUserAccess(ctx, overridden, false, &other.Id); err != nil {
		t.Fatal(err)
	}
	if err := r.SetUserAccess(ctx, disabled, false, &other.Id); err != nil {
		t.Fatal(err)
	}
	if err := r.SetUserAccess(ctx, disabled, false, nil); err != nil {
		t.Fatal(err)
	}

	for user, want := range map[int]string{follower: "Main", overridden: "Other", disabled: ""} {
		if name := effectiveName(t, r, user); name != want {
			t.Errorf("user %d: %q, want %q", user, name, want)
		}
	}
	access, err := r.FindUserAccess(ctx, []int{follower, overridden, disabled})
	if err != nil || len(access) != 2 || access[0].UserId != overridden || *access[0].ProviderId != other.Id || access[1].ProviderId != nil {
		t.Errorf("access = %+v, %v", access, err)
	}
	if access, err := r.FindUserAccess(ctx, nil); err != nil || len(access) != 0 {
		t.Errorf("access of nobody = %+v, %v", access, err)
	}

	conversation, err := r.CreateConversation(ctx, repository.NewAIConversation{UserId: overridden, ProviderId: other.Id, ProviderName: "Other", Model: "m", Title: "Chat"})
	if err != nil {
		t.Fatal(err)
	}

	// A deleted override turns into no AI; a deleted default leaves the
	// users who followed it without AI.
	if deleted, err := r.DeleteProvider(ctx, other.Id); err != nil || !deleted {
		t.Fatalf("delete = %v, %v", deleted, err)
	}
	if name := effectiveName(t, r, overridden); name != "" {
		t.Errorf("deleted override: %q", name)
	}
	if got, _ := r.GetConversation(ctx, overridden, conversation.Id); got.ProviderId != nil || got.ProviderName != "Other" {
		t.Errorf("conversation after provider delete = %+v", got)
	}
	if deleted, _ := r.DeleteProvider(ctx, main.Id); !deleted {
		t.Fatal("default not deleted")
	}
	if name := effectiveName(t, r, follower); name != "" {
		t.Errorf("deleted default: %q", name)
	}
	if deleted, err := r.DeleteProvider(ctx, main.Id); err != nil || deleted {
		t.Errorf("second delete = %v, %v", deleted, err)
	}

	again := newTestProvider(t, r, "Again", nil)
	if err := r.SetDefaultProvider(ctx, &again.Id); err != nil {
		t.Fatal(err)
	}
	if err := r.SetUserAccess(ctx, overridden, true, nil); err != nil {
		t.Fatal(err)
	}
	if name := effectiveName(t, r, overridden); name != "Again" {
		t.Errorf("back to the default: %q", name)
	}
}

func TestAIConversations(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	owner := createTestUser(t, r, "owner")
	other := createTestUser(t, r, "other")
	provider := newTestProvider(t, r, "Main", nil)

	var ids []int64
	for _, title := range []string{"First", "Second", "Third"} {
		conversation, err := r.CreateConversation(ctx, repository.NewAIConversation{UserId: owner, ProviderId: provider.Id, ProviderName: "Main", Model: "gpt-test", Title: title})
		if err != nil {
			t.Fatal(err)
		}
		ids = append(ids, conversation.Id)
	}
	created, _ := r.GetConversation(ctx, owner, ids[0])
	if created.Title != "First" || *created.ProviderId != provider.Id || created.Model != "gpt-test" || created.UserId != owner {
		t.Errorf("created = %+v", created)
	}
	if got, err := r.GetConversation(ctx, other, ids[0]); err != nil || got != nil {
		t.Errorf("other user's conversation = %+v, %v", got, err)
	}

	toolCalls := `[{"id":"call-1","name":"get_tree","arguments":{}}]`
	callId, name, status := "call-1", "get_tree", "done"
	if err := r.AppendMessages(ctx, ids[0], []repository.NewAIMessage{
		{Role: "user", Content: "Hello"},
		{Role: "assistant", Content: "", ToolCalls: &toolCalls},
		{Role: "tool", Content: `{"tree":[]}`, ToolCallId: &callId, ToolName: &name, ToolStatus: &status},
	}); err != nil {
		t.Fatal(err)
	}
	messages, err := r.GetMessages(ctx, ids[0])
	if err != nil || len(messages) != 3 || messages[0].Content != "Hello" || *messages[1].ToolCalls != toolCalls || *messages[2].ToolStatus != "done" || messages[0].ToolCalls != nil {
		t.Fatalf("messages = %+v, %v", messages, err)
	}

	// Appending moves the conversation to the top of the list.
	if _, err := r.q.ExecContext(ctx, `UPDATE "ai_conversation" SET "updated_at" = 1 WHERE "id" != ?`, ids[0]); err != nil {
		t.Fatal(err)
	}
	page, err := r.FindConversations(ctx, owner, 1)
	if err != nil || page.Total != 3 || page.Results[0].Id != ids[0] || page.Results[1].Id != ids[2] {
		t.Errorf("page = %+v, %v", page, err)
	}
	if page, _ := r.FindConversations(ctx, other, 1); page.Total != 0 {
		t.Errorf("other user's page = %+v", page)
	}

	if renamed, err := r.RenameConversation(ctx, other, ids[0], "Stolen"); err != nil || renamed {
		t.Errorf("rename by another user = %v, %v", renamed, err)
	}
	if renamed, err := r.RenameConversation(ctx, owner, ids[0], "Renamed"); err != nil || !renamed {
		t.Errorf("rename = %v, %v", renamed, err)
	}
	if deleted, err := r.DeleteConversation(ctx, other, ids[0]); err != nil || deleted {
		t.Errorf("delete by another user = %v, %v", deleted, err)
	}
	if messages, _ := r.GetMessages(ctx, ids[0]); len(messages) != 3 {
		t.Errorf("messages after a foreign delete = %d", len(messages))
	}
	if deleted, err := r.DeleteConversation(ctx, owner, ids[0]); err != nil || !deleted {
		t.Errorf("delete = %v, %v", deleted, err)
	}
	if messages, _ := r.GetMessages(ctx, ids[0]); len(messages) != 0 {
		t.Errorf("messages after delete = %d", len(messages))
	}

	if err := r.SetUserAccess(ctx, owner, false, nil); err != nil {
		t.Fatal(err)
	}
	if err := r.AppendMessages(ctx, ids[1], []repository.NewAIMessage{{Role: "user", Content: "Bye"}}); err != nil {
		t.Fatal(err)
	}
	if deleted, err := r.DeleteUserRecord(ctx, owner, other); err != nil || deleted == nil {
		t.Fatalf("delete user = %+v, %v", deleted, err)
	}
	for table, query := range map[string]string{
		"conversations": `SELECT COUNT(*) FROM "ai_conversation"`,
		"messages":      `SELECT COUNT(*) FROM "ai_message"`,
		"access":        `SELECT COUNT(*) FROM "ai_user_access"`,
	} {
		var count int
		if err := r.q.QueryRowContext(ctx, query).Scan(&count); err != nil || count != 0 {
			t.Errorf("%s after the user was deleted = %d, %v", table, count, err)
		}
	}
}
