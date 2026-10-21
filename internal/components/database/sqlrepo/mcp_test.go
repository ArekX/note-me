package sqlrepo

import (
	"context"
	"errors"
	"slices"
	"testing"

	"noteme/internal/components/repository"
)

func newTestMCPClient(t *testing.T, r *Repository, client repository.NewMCPClient) *repository.MCPClient {
	t.Helper()
	created, err := r.CreateClient(context.Background(), client)
	if err != nil {
		t.Fatal(err)
	}
	return created
}

func newTestMCPToken(t *testing.T, r *Repository, token repository.NewMCPToken) *repository.MCPToken {
	t.Helper()
	created, err := r.CreateToken(context.Background(), token)
	if err != nil {
		t.Fatal(err)
	}
	return created
}

func countMCPTokens(t *testing.T, r *Repository, clientId int64) int {
	t.Helper()
	var count int
	if err := r.q.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM "mcp_token" WHERE "client_id" = ?`, clientId).Scan(&count); err != nil {
		t.Fatal(err)
	}
	return count
}

func TestMCPClients(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	alice := createTestUser(t, r, "alice")
	bob := createTestUser(t, r, "bob")

	token := newTestMCPClient(t, r, repository.NewMCPClient{UserId: alice, Name: "Claude Code", Kind: repository.MCPClientToken})
	if token.UserId != alice || token.Kind != repository.MCPClientToken || token.ClientId != nil || token.IsReadOnly ||
		token.RedirectURIs == nil || len(token.RedirectURIs) != 0 || token.CreatedAt == 0 || token.LastUsedAt != nil || token.TokenPrefix != nil {
		t.Errorf("token client = %+v", token)
	}
	clientId, secret := "client-a", "secret-hash"
	uris := []string{"https://claude.ai/api/mcp/auth_callback", "http://127.0.0.1/callback"}
	oauth := newTestMCPClient(t, r, repository.NewMCPClient{
		UserId: alice, Name: "Assistant", Kind: repository.MCPClientOAuth, ClientId: &clientId,
		ClientSecretHash: &secret, RedirectURIs: uris, IsReadOnly: true,
	})
	if *oauth.ClientId != clientId || *oauth.ClientSecretHash != secret || !slices.Equal(oauth.RedirectURIs, uris) || !oauth.IsReadOnly {
		t.Errorf("oauth client = %+v", oauth)
	}
	if _, err := r.CreateClient(ctx, repository.NewMCPClient{UserId: alice, Name: "Claude Code", Kind: repository.MCPClientToken}); !errors.Is(err, repository.ErrMCPClientExists) {
		t.Errorf("duplicate name = %v", err)
	}
	other := newTestMCPClient(t, r, repository.NewMCPClient{UserId: bob, Name: "Claude Code", Kind: repository.MCPClientToken})

	newTestMCPToken(t, r, repository.NewMCPToken{ClientId: token.Id, Kind: repository.MCPTokenPersonal, TokenHash: "old", TokenPrefix: "nmcp_old"})
	newTestMCPToken(t, r, repository.NewMCPToken{ClientId: token.Id, Kind: repository.MCPTokenPersonal, TokenHash: "new", TokenPrefix: "nmcp_new"})
	newTestMCPToken(t, r, repository.NewMCPToken{ClientId: oauth.Id, Kind: repository.MCPTokenAccess, TokenHash: "access", TokenPrefix: "nmcpa"})

	clients, err := r.FindClients(ctx, alice)
	if err != nil || len(clients) != 2 || clients[0].Name != "Assistant" || clients[1].Name != "Claude Code" {
		t.Fatalf("clients = %+v, %v", clients, err)
	}
	if clients[0].TokenPrefix != nil || clients[1].TokenPrefix == nil || *clients[1].TokenPrefix != "nmcp_new" {
		t.Errorf("token prefixes = %v, %v", clients[0].TokenPrefix, clients[1].TokenPrefix)
	}
	if got, err := r.GetClient(ctx, alice, token.Id); err != nil || got == nil || got.TokenPrefix == nil || *got.TokenPrefix != "nmcp_new" {
		t.Errorf("get = %+v, %v", got, err)
	}
	if got, err := r.GetClient(ctx, bob, token.Id); err != nil || got != nil {
		t.Errorf("another user's client = %+v, %v", got, err)
	}
	if got, err := r.GetClientByClientID(ctx, clientId); err != nil || got == nil || got.Id != oauth.Id || !slices.Equal(got.RedirectURIs, uris) {
		t.Errorf("by client id = %+v, %v", got, err)
	}
	if got, err := r.GetClientByClientID(ctx, "missing"); err != nil || got != nil {
		t.Errorf("unknown client id = %+v, %v", got, err)
	}

	updated, err := r.UpdateClient(ctx, alice, oauth.Id, repository.MCPClientData{Name: "Renamed", RedirectURIs: []string{"https://chatgpt.com/connector_platform_oauth_redirect"}})
	if err != nil || !updated {
		t.Fatalf("update = %v, %v", updated, err)
	}
	if got, _ := r.GetClient(ctx, alice, oauth.Id); got.Name != "Renamed" || got.IsReadOnly || len(got.RedirectURIs) != 1 {
		t.Errorf("after update = %+v", got)
	}
	if _, err := r.UpdateClient(ctx, alice, oauth.Id, repository.MCPClientData{Name: "Claude Code"}); !errors.Is(err, repository.ErrMCPClientExists) {
		t.Errorf("rename to a taken name = %v", err)
	}
	if updated, err := r.UpdateClient(ctx, alice, oauth.Id, repository.MCPClientData{Name: "Renamed", IsReadOnly: true}); err != nil || !updated {
		t.Errorf("update keeping the name = %v, %v", updated, err)
	}
	if got, _ := r.GetClient(ctx, alice, oauth.Id); !got.IsReadOnly || got.RedirectURIs == nil || len(got.RedirectURIs) != 0 {
		t.Errorf("after update without redirect URIs = %+v", got)
	}
	if updated, err := r.UpdateClient(ctx, bob, oauth.Id, repository.MCPClientData{Name: "Stolen"}); err != nil || updated {
		t.Errorf("update by another user = %v, %v", updated, err)
	}

	if changed, err := r.SetClientSecret(ctx, alice, oauth.Id, "rotated-hash"); err != nil || !changed {
		t.Errorf("set secret = %v, %v", changed, err)
	}
	if got, _ := r.GetClient(ctx, alice, oauth.Id); *got.ClientSecretHash != "rotated-hash" {
		t.Errorf("secret = %v", *got.ClientSecretHash)
	}
	if changed, err := r.SetClientSecret(ctx, alice, token.Id, "x"); err != nil || changed {
		t.Errorf("secret on a token client = %v, %v", changed, err)
	}
	if changed, err := r.SetClientSecret(ctx, bob, oauth.Id, "x"); err != nil || changed {
		t.Errorf("secret by another user = %v, %v", changed, err)
	}

	if err := r.TouchClient(ctx, token.Id, 1000); err != nil {
		t.Fatal(err)
	}
	for _, step := range []struct{ at, want int64 }{{1030, 1000}, {1060, 1000}, {1061, 1061}} {
		if err := r.TouchClient(ctx, token.Id, step.at); err != nil {
			t.Fatal(err)
		}
		if got, _ := r.GetClient(ctx, alice, token.Id); got.LastUsedAt == nil || *got.LastUsedAt != step.want {
			t.Errorf("touch at %d: last used = %v, want %d", step.at, got.LastUsedAt, step.want)
		}
	}

	if deleted, err := r.DeleteClient(ctx, bob, token.Id); err != nil || deleted {
		t.Errorf("delete by another user = %v, %v", deleted, err)
	}
	if countMCPTokens(t, r, token.Id) != 2 {
		t.Error("another user's delete removed tokens")
	}
	if deleted, err := r.DeleteClient(ctx, alice, token.Id); err != nil || !deleted {
		t.Errorf("delete = %v, %v", deleted, err)
	}
	if countMCPTokens(t, r, token.Id) != 0 {
		t.Error("tokens of the deleted client left")
	}
	if got, _ := r.GetClient(ctx, alice, token.Id); got != nil {
		t.Errorf("deleted client = %+v", got)
	}
	if got, _ := r.GetClient(ctx, bob, other.Id); got == nil {
		t.Error("another user's client with the same name was removed")
	}
}

func TestMCPTokens(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()
	user := createTestUser(t, r, "alice")
	clientId := "client-a"
	client := newTestMCPClient(t, r, repository.NewMCPClient{UserId: user, Name: "Assistant", Kind: repository.MCPClientOAuth, ClientId: &clientId, RedirectURIs: []string{"https://a.test/cb"}})
	second := newTestMCPClient(t, r, repository.NewMCPClient{UserId: user, Name: "Other", Kind: repository.MCPClientToken})

	expiresAt := int64(5000)
	access := newTestMCPToken(t, r, repository.NewMCPToken{ClientId: client.Id, Kind: repository.MCPTokenAccess, TokenHash: "access", TokenPrefix: "nmcpa", ExpiresAt: &expiresAt})
	if access.Id == 0 || access.CreatedAt == 0 || access.RotatedAt != nil || *access.ExpiresAt != expiresAt {
		t.Errorf("created = %+v", access)
	}
	refreshExpiresAt := int64(9000)
	refresh := newTestMCPToken(t, r, repository.NewMCPToken{ClientId: client.Id, Kind: repository.MCPTokenRefresh, TokenHash: "refresh", TokenPrefix: "nmcpr", ExpiresAt: &refreshExpiresAt})
	personal := newTestMCPToken(t, r, repository.NewMCPToken{ClientId: second.Id, Kind: repository.MCPTokenPersonal, TokenHash: "personal", TokenPrefix: "nmcp_p"})
	if _, err := r.CreateToken(ctx, repository.NewMCPToken{ClientId: second.Id, Kind: repository.MCPTokenPersonal, TokenHash: "personal", TokenPrefix: "x"}); err == nil {
		t.Error("duplicate token hash was stored")
	}

	record, err := r.GetToken(ctx, "access")
	if err != nil || record == nil {
		t.Fatalf("get token = %+v, %v", record, err)
	}
	if record.Id != access.Id || record.Kind != repository.MCPTokenAccess || record.TokenPrefix != "nmcpa" || *record.ExpiresAt != expiresAt ||
		record.Client.Id != client.Id || record.Client.UserId != user || *record.Client.ClientId != clientId || !slices.Equal(record.Client.RedirectURIs, []string{"https://a.test/cb"}) {
		t.Errorf("token record = %+v", record)
	}
	if record, err := r.GetToken(ctx, "personal"); err != nil || record.Client.TokenPrefix == nil || *record.Client.TokenPrefix != "nmcp_p" || record.ExpiresAt != nil {
		t.Errorf("personal token record = %+v, %v", record, err)
	}
	if record, err := r.GetToken(ctx, "missing"); err != nil || record != nil {
		t.Errorf("unknown token = %+v, %v", record, err)
	}

	if rotated, err := r.RotateRefreshToken(ctx, access.Id, 100); err != nil || rotated {
		t.Errorf("rotate an access token = %v, %v", rotated, err)
	}
	if rotated, err := r.RotateRefreshToken(ctx, refresh.Id, 100); err != nil || !rotated {
		t.Errorf("rotate = %v, %v", rotated, err)
	}
	if rotated, err := r.RotateRefreshToken(ctx, refresh.Id, 200); err != nil || rotated {
		t.Errorf("rotate twice = %v, %v", rotated, err)
	}
	if record, _ := r.GetToken(ctx, "refresh"); record.RotatedAt == nil || *record.RotatedAt != 100 {
		t.Errorf("rotated at = %v", record.RotatedAt)
	}

	if deleted, err := r.DeleteExpiredTokens(ctx, expiresAt); err != nil || deleted != 0 {
		t.Errorf("delete at expiry = %d, %v", deleted, err)
	}
	if deleted, err := r.DeleteExpiredTokens(ctx, expiresAt+1); err != nil || deleted != 1 {
		t.Errorf("delete expired = %d, %v", deleted, err)
	}
	if record, _ := r.GetToken(ctx, "access"); record != nil {
		t.Error("expired token left")
	}
	if record, _ := r.GetToken(ctx, "refresh"); record == nil {
		t.Error("unexpired token removed")
	}
	if deleted, err := r.DeleteExpiredTokens(ctx, 1<<40); err != nil || deleted != 1 {
		t.Errorf("delete every expiring token = %d, %v", deleted, err)
	}
	if record, _ := r.GetToken(ctx, "personal"); record == nil || record.Id != personal.Id {
		t.Error("personal token without expiry removed")
	}

	newTestMCPToken(t, r, repository.NewMCPToken{ClientId: client.Id, Kind: repository.MCPTokenAccess, TokenHash: "access-2", TokenPrefix: "nmcpa"})
	if err := r.DeleteClientTokens(ctx, client.Id); err != nil {
		t.Fatal(err)
	}
	if countMCPTokens(t, r, client.Id) != 0 || countMCPTokens(t, r, second.Id) != 1 {
		t.Error("client tokens not deleted or another client's deleted")
	}
}
