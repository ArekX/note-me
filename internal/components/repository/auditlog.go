package repository

import "context"

type AuditEntry struct {
	Event    string
	UserId   *int
	Username string
	Address  string
	Details  string
}

type AuditRecord struct {
	Id        int64
	CreatedAt int64
	Event     string
	UserId    *int
	Username  string
	Address   string
	Details   string
}

// Empty fields do not filter; From and To are unix seconds.
type AuditFilters struct {
	Event    string
	Username string
	From     int64
	To       int64
}

type AuditLog interface {
	CreateAuditEntry(ctx context.Context, entry AuditEntry) error
	FindAuditEntries(ctx context.Context, filters AuditFilters, page int) (*Paged[AuditRecord], error)
	FindAuditEvents(ctx context.Context) ([]string, error)
	DeleteAuditEntriesBefore(ctx context.Context, createdBefore int64) error
}
