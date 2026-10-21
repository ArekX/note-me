package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"noteme/internal/app"
	"noteme/internal/version"
)

func main() {
	time.Local = time.UTC

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := serve(ctx); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func serve(ctx context.Context) error {
	a, err := app.Init(ctx)
	if err != nil {
		return err
	}
	defer a.Close()

	a.Log.Info("Starting NoteMe", "version", version.String())
	return a.Serve(ctx)
}
