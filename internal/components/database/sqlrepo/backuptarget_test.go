package sqlrepo

import (
	"context"
	"testing"

	"noteme/internal/components/repository"
)

func TestBackupTargets(t *testing.T) {
	r := openTestRepository(t)
	ctx := context.Background()

	target, err := r.CreateBackupTarget(ctx, repository.BackupTargetData{Name: "Local", Type: "local", Settings: `{"location":"/backups"}`})
	if err != nil || target.Id == 0 || target.LastBackupAt != nil {
		t.Fatalf("create = %+v, %v", target, err)
	}
	if updated, _ := r.UpdateBackupTarget(ctx, target.Id, repository.BackupTargetData{Name: "Renamed", Type: "local", Settings: `{"location":"/other"}`}); !updated {
		t.Error("update failed")
	}
	if targets, _ := r.GetBackupTargets(ctx); len(targets) != 1 || targets[0].Name != "Renamed" || targets[0].Settings != `{"location":"/other"}` {
		t.Errorf("targets = %+v", targets)
	}

	if claimed, _ := r.ClaimBackupTarget(ctx, target.Id); !claimed {
		t.Fatal("first claim failed")
	}
	if claimed, _ := r.ClaimBackupTarget(ctx, target.Id); claimed {
		t.Error("claimed twice")
	}
	if deleted, _ := r.DeleteBackupTarget(ctx, target.Id); deleted {
		t.Error("deleted while a backup is in progress")
	}
	if err := r.ReleaseBackupTarget(ctx, target.Id, false); err != nil {
		t.Fatal(err)
	}
	if stored, _ := r.GetBackupTarget(ctx, target.Id); stored.LastBackupAt != nil {
		t.Error("failed backup set the last backup time")
	}

	r.ClaimBackupTarget(ctx, target.Id)
	if err := r.ReleaseBackupTarget(ctx, target.Id, true); err != nil {
		t.Fatal(err)
	}
	if stored, _ := r.GetBackupTarget(ctx, target.Id); stored.LastBackupAt == nil {
		t.Error("successful backup did not set the last backup time")
	}

	r.ClaimBackupTarget(ctx, target.Id)
	if err := r.ClearAllBackupInProgress(ctx); err != nil {
		t.Fatal(err)
	}
	if inProgress, _ := r.IsBackupInProgress(ctx, target.Id); inProgress {
		t.Error("flag not cleared")
	}
	if deleted, _ := r.DeleteBackupTarget(ctx, target.Id); !deleted {
		t.Error("delete failed")
	}
	if stored, _ := r.GetBackupTarget(ctx, target.Id); stored != nil {
		t.Error("target still there")
	}
}
