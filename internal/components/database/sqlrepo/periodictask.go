package sqlrepo

import (
	"context"
	"database/sql"
	"fmt"

	"noteme/internal/components/repository"
)

func (r *Repository) GetPeriodicTaskSchedules(ctx context.Context) ([]repository.PeriodicTaskSchedule, error) {
	rows, err := r.q.QueryContext(ctx, `SELECT "task_identifier", "next_run_at" FROM "periodic_task_schedule" ORDER BY "id"`)
	if err != nil {
		return nil, fmt.Errorf("get periodic task schedules: %w", err)
	}
	defer rows.Close()

	schedules := []repository.PeriodicTaskSchedule{}
	for rows.Next() {
		var schedule repository.PeriodicTaskSchedule
		var nextRunAt sql.NullInt64
		if err := rows.Scan(&schedule.TaskIdentifier, &nextRunAt); err != nil {
			return nil, err
		}
		if nextRunAt.Valid {
			schedule.NextRunAt = &nextRunAt.Int64
		}
		schedules = append(schedules, schedule)
	}
	return schedules, rows.Err()
}

// Sets only the next run, keeping the last run's result.
func (r *Repository) SchedulePeriodicTask(ctx context.Context, taskIdentifier string, nextRunAt int64) error {
	_, err := r.q.ExecContext(ctx,
		r.dialect.upsert(`INSERT INTO "periodic_task_schedule" ("task_identifier", "next_run_at") VALUES (?, ?)`,
			[]string{"task_identifier"}, []string{"next_run_at"}),
		taskIdentifier, nextRunAt)
	if err != nil {
		return fmt.Errorf("schedule periodic task: %w", err)
	}
	return nil
}

func (r *Repository) SavePeriodicTaskRun(ctx context.Context, run repository.PeriodicTaskRun) error {
	return r.runInTransaction(ctx, func(tx *Repository) error {
		if err := tx.SchedulePeriodicTask(ctx, run.TaskIdentifier, run.NextRunAt); err != nil {
			return err
		}

		var reason *string
		var err error
		if run.Successful {
			_, err = tx.q.ExecContext(ctx,
				`UPDATE "periodic_task_schedule" SET "is_last_run_successful" = true, "last_successful_run_at" = ? WHERE "task_identifier" = ?`,
				run.RanAt, run.TaskIdentifier)
		} else {
			failReason := run.FailReason
			if failReason == "" {
				failReason = "Unknown error"
			}
			reason = &failReason
			_, err = tx.q.ExecContext(ctx,
				`UPDATE "periodic_task_schedule" SET "is_last_run_successful" = false, "last_fail_reason" = ?, "last_fail_run_at" = ? WHERE "task_identifier" = ?`,
				failReason, run.RanAt, run.TaskIdentifier)
		}
		if err != nil {
			return fmt.Errorf("save periodic task run: %w", err)
		}

		_, err = tx.q.ExecContext(ctx,
			`INSERT INTO "periodic_task_run" ("task_identifier", "ran_at", "duration_ms", "is_successful", "fail_reason") VALUES (?, ?, ?, ?, ?)`,
			run.TaskIdentifier, run.RanAt, run.DurationMs, run.Successful, reason)
		if err != nil {
			return fmt.Errorf("record periodic task run: %w", err)
		}
		return nil
	})
}

func (r *Repository) GetAllPeriodicTasks(ctx context.Context) ([]repository.PeriodicTaskRecord, error) {
	rows, err := r.q.QueryContext(ctx,
		`SELECT "task_identifier", "next_run_at", "is_last_run_successful", "last_successful_run_at", "last_fail_reason", "last_fail_run_at"
		 FROM "periodic_task_schedule" ORDER BY "id"`)
	if err != nil {
		return nil, fmt.Errorf("get periodic tasks: %w", err)
	}
	defer rows.Close()

	records := []repository.PeriodicTaskRecord{}
	for rows.Next() {
		var (
			record      repository.PeriodicTaskRecord
			nextRunAt   sql.NullInt64
			successful  sql.NullBool
			lastSuccess sql.NullInt64
			failReason  sql.NullString
			lastFail    sql.NullInt64
		)
		if err := rows.Scan(&record.TaskIdentifier, &nextRunAt, &successful, &lastSuccess, &failReason, &lastFail); err != nil {
			return nil, err
		}
		if nextRunAt.Valid {
			record.NextRunAt = &nextRunAt.Int64
		}
		if successful.Valid {
			record.IsLastRunSuccessful = &successful.Bool
		}
		if lastSuccess.Valid {
			record.LastSuccessfulRunAt = &lastSuccess.Int64
		}
		if failReason.Valid {
			record.LastFailReason = &failReason.String
		}
		if lastFail.Valid {
			record.LastFailRunAt = &lastFail.Int64
		}
		records = append(records, record)
	}
	return records, rows.Err()
}

func (r *Repository) DeleteUnusedPeriodicTasks(ctx context.Context, inUse []string) error {
	where := ""
	args := make([]any, 0, len(inUse))
	if len(inUse) > 0 {
		where = ` WHERE "task_identifier" NOT IN (` + placeholders(len(inUse)) + `)`
		for _, name := range inUse {
			args = append(args, name)
		}
	}
	return r.runInTransaction(ctx, func(tx *Repository) error {
		for _, table := range []string{"periodic_task_schedule", "periodic_task_run"} {
			if _, err := tx.q.ExecContext(ctx, `DELETE FROM "`+table+`"`+where, args...); err != nil {
				return fmt.Errorf("delete unused periodic tasks: %w", err)
			}
		}
		return nil
	})
}

func (r *Repository) FindPeriodicTaskRuns(ctx context.Context, filters repository.PeriodicTaskRunFilters, page int) (*repository.Paged[repository.PeriodicTaskRunRecord], error) {
	from := `"periodic_task_run" WHERE "task_identifier" = ? AND "ran_at" >= ?`
	args := []any{filters.TaskIdentifier, filters.RanFrom}
	if filters.Successful != nil {
		from += ` AND "is_successful" = ?`
		args = append(args, *filters.Successful)
	}

	runs, err := pageResults(ctx, r.q, pageQuery{
		Columns: `"id", "task_identifier", "ran_at", "duration_ms", "is_successful", "fail_reason"`,
		From:    from,
		OrderBy: `"ran_at" DESC, "id" DESC`,
		Args:    args,
		Page:    page,
	}, func(rows *sql.Rows) (repository.PeriodicTaskRunRecord, error) {
		var run repository.PeriodicTaskRunRecord
		var failReason sql.NullString
		err := rows.Scan(&run.Id, &run.TaskIdentifier, &run.RanAt, &run.DurationMs, &run.IsSuccessful, &failReason)
		if failReason.Valid {
			run.FailReason = &failReason.String
		}
		return run, err
	})
	if err != nil {
		return nil, fmt.Errorf("find periodic task runs: %w", err)
	}
	return runs, nil
}

func (r *Repository) DeletePeriodicTaskRunsBefore(ctx context.Context, ranBefore int64) error {
	if _, err := r.q.ExecContext(ctx, `DELETE FROM "periodic_task_run" WHERE "ran_at" < ?`, ranBefore); err != nil {
		return fmt.Errorf("delete periodic task runs: %w", err)
	}
	return nil
}
