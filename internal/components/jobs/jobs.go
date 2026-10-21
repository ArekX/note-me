package jobs

import (
	"context"
	"errors"
	"sync"

	"github.com/google/uuid"
)

type Name string

const CreateDataExport Name = "create-data-export"

type DataExport struct {
	ExportID string
	Password string
}

var (
	ErrNotOwner  = errors.New("job is not owned by the user")
	ErrQueueFull = errors.New("job queue is full")
)

const queueSize = 64

type Job struct {
	ID      string
	Name    Name
	UserID  int
	Payload any

	ctx context.Context
}

// Done once the job is aborted.
func (j *Job) Context() context.Context {
	return j.ctx
}

type owner struct {
	userID int
	cancel context.CancelFunc
}

// Hands jobs from request handlers to the job processor worker and keeps
// who owns each one until it finishes, fails or is aborted (0.9.o).
type Queue struct {
	mu      sync.Mutex
	pending chan *Job
	owners  map[string]owner
}

func New() *Queue {
	return &Queue{pending: make(chan *Job, queueSize), owners: map[string]owner{}}
}

func (q *Queue) Enqueue(name Name, userID int, payload any) (string, error) {
	ctx, cancel := context.WithCancel(context.Background())
	job := &Job{ID: uuid.NewString(), Name: name, UserID: userID, Payload: payload, ctx: ctx}

	q.mu.Lock()
	defer q.mu.Unlock()
	select {
	case q.pending <- job:
		q.owners[job.ID] = owner{userID: userID, cancel: cancel}
		return job.ID, nil
	default:
		cancel()
		return "", ErrQueueFull
	}
}

// Unknown jobs answer ErrNotOwner too, so ids of other users' jobs reveal
// nothing.
func (q *Queue) Abort(jobID string, userID int) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	o, ok := q.owners[jobID]
	if !ok || o.userID != userID {
		return ErrNotOwner
	}
	o.cancel()
	delete(q.owners, jobID)
	return nil
}

func (q *Queue) Pending() <-chan *Job {
	return q.pending
}

func (q *Queue) Finish(jobID string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if o, ok := q.owners[jobID]; ok {
		o.cancel()
		delete(q.owners, jobID)
	}
}
