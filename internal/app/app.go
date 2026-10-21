package app

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"noteme/frontend"
	"noteme/internal/components"
	"noteme/internal/config"
	"noteme/internal/http"
	"noteme/internal/http/websocket/api"
	"noteme/internal/logger"
	"noteme/internal/workers"
	"noteme/internal/workers/jobprocessor"
	"noteme/internal/workers/periodictask"
	"noteme/internal/workers/periodictask/tasks"
)

const shutdownTimeout = 10 * time.Second

type App struct {
	Config     *config.Config
	Log        *slog.Logger
	Components *components.Components
}

func Init(ctx context.Context) (*App, error) {
	if err := config.LoadEnvironment(); err != nil {
		return nil, fmt.Errorf("load environment: %w", err)
	}

	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	if err := cfg.RequireBackupEncryptionKey(); err != nil {
		return nil, err
	}
	if err := cfg.RequireAIEncryptionKey(); err != nil {
		return nil, err
	}

	logBuffer := logger.NewBuffer()
	log := logger.New(logger.Options{Level: cfg.LoggingLevel, AreColorsAllowed: cfg.ShowLogColors, Buffer: logBuffer})
	for _, warning := range cfg.Warnings {
		log.Warn(warning)
	}

	components, err := components.New(ctx, log, logBuffer, cfg)
	if err != nil {
		return nil, err
	}

	return &App{Config: cfg, Log: log, Components: components}, nil
}

func (a *App) Close() error {
	return a.Components.Cleanup()
}

func (a *App) Serve(ctx context.Context) error {
	if err := a.Components.Initialize(ctx); err != nil {
		return err
	}
	if err := a.Components.Storage.Init(); err != nil {
		return err
	}

	dist, err := frontend.Dist()
	if err != nil {
		return fmt.Errorf("load embedded frontend: %w", err)
	}

	runCtx, cancelRunCtx := context.WithCancel(ctx)
	defer cancelRunCtx()

	// The hub subscribes to bus events, so it exists before workers publish.
	hub := api.NewHub(a.Components)

	taskLog := a.Log.With("worker", "periodic-task")
	supervisor := workers.NewSupervisor(a.Log.With("service", "supervisor"),
		periodictask.New(taskLog, a.Components.Repository, a.Components.Bus, a.Config.PeriodicTaskHistoryDays, tasks.Default(a.Components, taskLog)...),
		jobprocessor.New(a.Log.With("worker", "processor"), a.Components),
	)
	supervisor.Start(runCtx)

	httpServer := http.New(a.Components, a.Log.With("service", "webserver"), dist, hub)

	errCh := make(chan error, 1)
	go func() { errCh <- httpServer.ListenAndServe(runCtx) }()

	result := <-errCh
	cancelRunCtx()

	// Hijacked websocket connections are not part of the HTTP shutdown; the
	// database closes after Serve returns, so their handlers finish first.
	hub.Wait(shutdownTimeout)
	supervisor.Wait()
	return result
}
