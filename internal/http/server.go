package http

import (
	"context"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"path"
	"strings"
	"time"

	"noteme/internal/components"
	"noteme/internal/http/mcp"
	"noteme/internal/http/middleware"
	"noteme/internal/http/oauth"
	"noteme/internal/http/routes"
	"noteme/internal/http/websocket"
)

const jsonRouteTimeout = 30 * time.Second

type Server struct {
	http       *http.Server
	log        *slog.Logger
	components *components.Components
}

func New(c *components.Components, log *slog.Logger, frontend fs.FS, hub *websocket.Hub) *Server {
	mux := http.NewServeMux()

	srv := &Server{
		http: &http.Server{
			Addr:              c.Config.WebserverAddr(),
			Handler:           mux,
			ReadHeaderTimeout: 10 * time.Second,
			// No WriteTimeout: it would cut the websocket and long downloads.
			IdleTimeout: 120 * time.Second,
		},
		log:        log,
		components: c,
	}
	srv.http.RegisterOnShutdown(hub.Shutdown)

	authenticatedMiddlewareChain := middleware.CreateAuthenticatedMiddlewareChain(c)
	loginMiddlewareChain := middleware.CreateLoginMiddlewareChain(c)
	sessionMiddlewareChain := middleware.CreateSessionMiddlewareChain(c)
	optionalSessionMiddlewareChain := middleware.CreateOptionalSessionMiddlewareChain(c)

	// Only the JSON routes; the websocket, file and download routes stream.
	timed := func(h http.Handler) http.Handler {
		return http.TimeoutHandler(h, jsonRouteTimeout, `{"error":"Request timed out"}`)
	}

	mux.Handle("GET /api/health", timed(srv.route(routes.HealthCheck)))
	mux.Handle("GET /api/public/{identifier}", timed(srv.route(routes.PublicNote)))
	mux.Handle("POST /api/login", timed(loginMiddlewareChain.Wrap(routes.Login)))
	mux.Handle("POST /api/login/passkey/options", timed(loginMiddlewareChain.Wrap(routes.PasskeyLoginOptions)))
	mux.Handle("POST /api/login/passkey", timed(loginMiddlewareChain.Wrap(routes.PasskeyLogin)))
	mux.Handle("POST /api/logout", timed(optionalSessionMiddlewareChain.Wrap(routes.Logout(hub))))
	mux.Handle("GET /api/session", timed(sessionMiddlewareChain.Wrap(routes.Session)))
	mux.Handle("POST /api/process-step", timed(sessionMiddlewareChain.Wrap(routes.ProcessStep(hub))))
	mux.Handle("GET /ws", authenticatedMiddlewareChain.Wrap(hub.HandleRequest))
	mux.Handle("GET /file/{identifier}", optionalSessionMiddlewareChain.Wrap(routes.File))
	mux.Handle("GET /api/data-export/{identifier}", authenticatedMiddlewareChain.Wrap(routes.DownloadDataExport))
	mux.Handle("GET /api/settings/download-backup", authenticatedMiddlewareChain.Wrap(routes.DownloadBackup))

	spa := spaHandler(frontend)
	oauthServer := oauth.New(c, log.With("component", "oauth"), spa)
	mux.Handle("GET "+oauth.MetadataPath, http.HandlerFunc(oauthServer.Metadata))
	mux.Handle("GET "+oauth.AuthorizePath, http.HandlerFunc(oauthServer.Authorize))
	mux.Handle("POST "+oauth.TokenPath, timed(http.HandlerFunc(oauthServer.Token)))
	mux.Handle("GET /api/oauth/consent", timed(authenticatedMiddlewareChain.Wrap(oauthServer.ConsentInfo)))
	mux.Handle("POST /api/oauth/consent", timed(authenticatedMiddlewareChain.Wrap(oauthServer.Consent)))
	mcp.New(c, log.With("component", "mcp"), hub, frontend).Register(mux)

	mux.Handle("/", spa)

	return srv
}

func (s *Server) Handler() http.Handler {
	return s.http.Handler
}

func (s *Server) ListenAndServe(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() {
		s.log.Info("Webserver started", "address", s.http.Addr)
		if err := s.http.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return s.http.Shutdown(shutdownCtx)
	}
}

func (s *Server) route(fn routes.RouteFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fn(s.components, w, r)
	}
}

func spaHandler(frontend fs.FS) http.Handler {
	fileServer := http.FileServerFS(frontend)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if info, err := fs.Stat(frontend, name); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		index, err := fs.ReadFile(frontend, "index.html")
		if err != nil {
			http.Error(w, "Frontend has not been built. Run `make build-frontend`.", http.StatusServiceUnavailable)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = w.Write(index)
	})
}
