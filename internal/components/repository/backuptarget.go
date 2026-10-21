package repository

import "context"

type BackupTarget struct {
	Id           int
	Name         string
	Type         string
	Settings     string
	CreatedAt    int64
	UpdatedAt    int64
	LastBackupAt *int64
}

type BackupTargetData struct {
	Name     string
	Type     string
	Settings string
}

type BackupTargets interface {
	GetBackupTargets(ctx context.Context) ([]BackupTarget, error)
	GetBackupTarget(ctx context.Context, id int) (*BackupTarget, error)
	CreateBackupTarget(ctx context.Context, data BackupTargetData) (*BackupTarget, error)
	UpdateBackupTarget(ctx context.Context, id int, data BackupTargetData) (bool, error)
	DeleteBackupTarget(ctx context.Context, id int) (bool, error)
	IsBackupInProgress(ctx context.Context, id int) (bool, error)
	ClaimBackupTarget(ctx context.Context, id int) (bool, error)
	ReleaseBackupTarget(ctx context.Context, id int, successful bool) error
	ClearAllBackupInProgress(ctx context.Context) error
}
