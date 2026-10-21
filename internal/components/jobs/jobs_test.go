package jobs

import (
	"errors"
	"testing"
)

func TestEnqueueAbortAndFinish(t *testing.T) {
	q := New()

	id, err := q.Enqueue(CreateDataExport, 1, DataExport{ExportID: "e"})
	if err != nil {
		t.Fatal(err)
	}
	job := <-q.Pending()
	if job.ID != id || job.UserID != 1 || job.Payload.(DataExport).ExportID != "e" {
		t.Fatalf("job = %+v", job)
	}

	if err := q.Abort(id, 2); !errors.Is(err, ErrNotOwner) {
		t.Errorf("abort by another user = %v", err)
	}
	if err := q.Abort("missing", 1); !errors.Is(err, ErrNotOwner) {
		t.Errorf("abort of unknown job = %v", err)
	}
	if job.Context().Err() != nil {
		t.Fatal("job cancelled by a refused abort")
	}
	if err := q.Abort(id, 1); err != nil {
		t.Fatal(err)
	}
	if job.Context().Err() == nil {
		t.Error("aborted job context is not done")
	}
	if err := q.Abort(id, 1); !errors.Is(err, ErrNotOwner) {
		t.Errorf("second abort = %v", err)
	}

	id, _ = q.Enqueue(CreateDataExport, 1, nil)
	<-q.Pending()
	q.Finish(id)
	if len(q.owners) != 0 {
		t.Errorf("owners after finish = %v", q.owners)
	}
	if err := q.Abort(id, 1); !errors.Is(err, ErrNotOwner) {
		t.Errorf("abort after finish = %v", err)
	}
}

func TestQueueFull(t *testing.T) {
	q := New()
	for range queueSize {
		if _, err := q.Enqueue(CreateDataExport, 1, nil); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := q.Enqueue(CreateDataExport, 1, nil); !errors.Is(err, ErrQueueFull) {
		t.Errorf("enqueue on a full queue = %v", err)
	}
	if len(q.owners) != queueSize {
		t.Errorf("owners = %d", len(q.owners))
	}
}
