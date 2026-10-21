package requeststate

import (
	"context"
	"fmt"
	"log/slog"
)

type RequestState struct {
	Session    *Session
	SessionKey string
}

type ctxKey struct{}

func NewCtxValue(ctx context.Context) context.Context {
	state := &RequestState{}
	return context.WithValue(ctx, ctxKey{}, state)
}

func FromCtx(ctx context.Context) (*RequestState, error) {
	s, ok := ctx.Value(ctxKey{}).(*RequestState)

	if !ok {
		slog.Error("Error while retrieveing request state")
		return nil, fmt.Errorf("Could not retrieve request state from context")
	}

	return s, nil
}
