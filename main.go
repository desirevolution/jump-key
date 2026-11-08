package main

import (
	"bytes"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"net/netip"
	"os"
	"path"
	"strings"
	"sync"
	"time"
)

// dist must exist when compiling.
//
//go:embed dist
var embeddedFiles embed.FS

const (
	maxConfigSize = 2 << 20 // 2 MiB
	defaultHost   = "127.0.0.1"
	defaultPort   = 8080
)

type options struct {
	host              string
	port              int
	configDir         string
	iconsDir          string
	copyDefaultConfig bool
	readOnly          bool
	publicWorkspaces  string
	configUser        string
	optionError       error
	requireHTTPS      optionalBool
	trustedProxies    string
	authMode          string
	backupKeep        int
}

type server struct {
	workspaceMu      sync.Mutex
	configLockMu     sync.Mutex
	configLocks      map[string]*configLock
	backupKeep       int
	distFS           fs.FS
	configDir        string
	iconsDir         string
	logger           *slog.Logger
	readOnly         bool
	publicWorkspaces []string
	configUser       string
	authMode         string
	trustedProxies   []netip.Prefix
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	opts := parseOptions()

	if err := validateOptions(opts); err != nil {
		logger.Error("invalid configuration", "error", err)
		flag.Usage()
		os.Exit(2)
	}

	distFS, err := fs.Sub(embeddedFiles, "dist")
	if err != nil {
		logger.Error("failed to open embedded dist", "error", err)
		os.Exit(1)
	}

	app := &server{
		distFS:           distFS,
		configDir:        opts.configDir,
		iconsDir:         opts.iconsDir,
		logger:           logger,
		readOnly:         opts.readOnly,
		publicWorkspaces: parseWorkspaceList(opts.publicWorkspaces),
		configUser:       opts.configUser,
		backupKeep:       opts.backupKeep,
		authMode:         opts.authMode,
	}

	if opts.copyDefaultConfig {
		if err := app.copyDefaultConfig(); err != nil {
			logger.Error("failed to copy default configuration", "error", err)
			os.Exit(1)
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", app.handleHealth)
	mux.HandleFunc("/api/workspaces", app.handleWorkspaces)
	mux.HandleFunc("/api/workspaces/", app.handleWorkspaceDetail)
	mux.HandleFunc("/api/workspace-order", func(w http.ResponseWriter, r *http.Request) {
		if app.readOnly {
			writeAPIError(w, 405, "read_only", "Read-only workspace")
			return
		}
		if !requireMethod(w, r.Method, http.MethodPut) {
			return
		}
		app.putWorkspaceOrder(w, r)
	})
	mux.HandleFunc("/config/", app.handleConfig)
	mux.HandleFunc("/icons/", app.handleIcons)
	mux.HandleFunc("/", app.handleStatic)

	address := net.JoinHostPort(opts.host, fmt.Sprintf("%d", opts.port))

	trustedProxies, _ := parseTrustedProxies(opts.trustedProxies) // Validated before startup.
	app.trustedProxies = trustedProxies
	httpServer := &http.Server{
		Addr:              address,
		Handler:           requestLogger(logger, enforceHTTPS(app.authenticate(app.publicSecurity(mux)), opts.httpsRequired(), trustedProxies)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	logger.Info(
		"starting server",
		"address", address,
		"config_dir", opts.configDir,
		"icons_dir", opts.iconsDir,
		"read_only", opts.readOnly,
		"require_https", opts.httpsRequired(),
		"auth_mode", opts.authMode,
		"backup_keep", opts.backupKeep,
	)

	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func parseOptions() options {
	var opts options

	flag.StringVar(&opts.host, "host", defaultHost, "Host or IP address to listen on")
	flag.IntVar(&opts.port, "port", defaultPort, "HTTP server port")
	flag.StringVar(&opts.configDir, "config-dir", "", "Existing configuration directory (writable unless --read-only)")
	flag.StringVar(&opts.iconsDir, "icons-dir", "", "Existing icons directory (required)")
	flag.BoolVar(&opts.copyDefaultConfig, "copy-default-config", false, "Copy embedded default config when services.json does not exist")
	flag.StringVar(&opts.authMode, "auth-mode", getenvDefault("JUMPKEY_AUTH_MODE", "local"), "Authentication mode: local or proxy (requires trusted proxies)")
	backupValue, backupErr := parseBackupKeep(os.Getenv("JUMPKEY_BACKUP_KEEP"))
	opts.backupKeep = backupValue
	flag.IntVar(&opts.backupKeep, "backup-keep", backupValue, "Number of per-config backups to retain after successful saves (1-1000)")
	opts.optionError = errors.Join(registerPublicOptions(flag.CommandLine, &opts, os.Getenv), registerHTTPSOptions(flag.CommandLine, &opts, os.Getenv), backupErr)
	flag.Parse()

	return opts
}

func validateOptions(opts options) error {
	if opts.optionError != nil {
		return opts.optionError
	}
	if opts.backupKeep < 1 || opts.backupKeep > 1000 {
		return errors.New("--backup-keep must be between 1 and 1000")
	}
	if opts.authMode != "local" && opts.authMode != "proxy" {
		return errors.New("--auth-mode must be local or proxy")
	}
	if opts.readOnly && opts.authMode == "proxy" {
		return errors.New("--auth-mode=proxy is not available in public read-only mode")
	}
	if opts.authMode == "proxy" {
		trusted, err := parseTrustedProxies(opts.trustedProxies)
		if err != nil || len(trusted) == 0 {
			return errors.New("--auth-mode=proxy requires --trusted-proxies with immediate proxy IPs/CIDRs")
		}
		for _, prefix := range trusted {
			if prefix.Bits() == 0 {
				return errors.New("--auth-mode=proxy must not trust all addresses (0.0.0.0/0 or ::/0)")
			}
		}
	}
	if _, err := parseTrustedProxies(opts.trustedProxies); err != nil {
		return err
	}
	if err := validatePublicOptions(opts); err != nil {
		return err
	}
	if opts.configDir == "" {
		return errors.New("--config-dir is required")
	}
	if opts.iconsDir == "" {
		return errors.New("--icons-dir is required")
	}
	if opts.port < 1 || opts.port > 65535 {
		return fmt.Errorf("--port must be between 1 and 65535, got %d", opts.port)
	}
	if net.ParseIP(opts.host) == nil && opts.host != "localhost" {
		return fmt.Errorf("--host must be an IP address or localhost, got %q", opts.host)
	}
	if err := requireDirectory(opts.configDir, !opts.readOnly); err != nil {
		return fmt.Errorf("invalid config directory: %w", err)
	}
	if err := requireDirectory(opts.iconsDir, false); err != nil {
		return fmt.Errorf("invalid icons directory: %w", err)
	}
	return nil
}

func requireDirectory(directory string, mustBeWritable bool) error {
	info, err := os.Stat(directory)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("directory does not exist: %s", directory)
		}
		return fmt.Errorf("inspect %s: %w", directory, err)
	}
	if !info.IsDir() {
		return fmt.Errorf("path is not a directory: %s", directory)
	}
	if mustBeWritable {
		if err := testDirectoryWritable(directory); err != nil {
			return err
		}
	}
	return nil
}

func testDirectoryWritable(directory string) error {
	file, err := os.CreateTemp(directory, ".jump-key-write-test-*")
	if err != nil {
		return fmt.Errorf("directory is not writable: %s: %w", directory, err)
	}
	name := file.Name()
	if err := file.Close(); err != nil {
		_ = os.Remove(name)
		return fmt.Errorf("close write test file: %w", err)
	}
	if err := os.Remove(name); err != nil {
		return fmt.Errorf("remove write test file: %w", err)
	}
	return nil
}

func (s *server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}
}

func (s *server) handleIcons(w http.ResponseWriter, r *http.Request) {
	if s.readOnly {
		s.handlePublicIcon(w, r)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Cache-Control", "private, max-age=300, must-revalidate")
	handler := http.StripPrefix("/icons/", http.FileServer(http.Dir(s.iconsDir)))
	handler.ServeHTTP(w, r)
}

func (s *server) handleStatic(w http.ResponseWriter, r *http.Request) {
	if s.readOnly && r.URL.Path == "/manifest.webmanifest" {
		s.handlePublicManifest(w, r)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if name == "" || name == "." {
		name = "index.html"
	}

	info, err := fs.Stat(s.distFS, name)
	if err == nil && !info.IsDir() {
		s.serveEmbeddedFile(w, r, name)
		return
	}

	s.serveEmbeddedFile(w, r, "index.html")
}

func (s *server) serveEmbeddedFile(w http.ResponseWriter, r *http.Request, name string) {
	data, err := fs.ReadFile(s.distFS, name)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	setStaticCacheHeader(w, name)
	if contentType := mime.TypeByExtension(path.Ext(name)); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}

	http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(data))
}

func setStaticCacheHeader(w http.ResponseWriter, name string) {
	switch {
	case name == "index.html" || name == "sw.js" || name == "manifest.webmanifest" || name == "registerSW.js" || strings.HasPrefix(name, "workbox-"):
		w.Header().Set("Cache-Control", "no-cache, must-revalidate")
	case strings.HasPrefix(name, "assets/"):
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	default:
		w.Header().Set("Cache-Control", "private, max-age=300, must-revalidate")
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	if r.status != 0 {
		return
	}
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(data []byte) (int, error) {
	if r.status == 0 {
		r.WriteHeader(http.StatusOK)
	}
	return r.ResponseWriter.Write(data)
}

func requestLogger(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w}

		next.ServeHTTP(recorder, r)

		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}

		logger.Info(
			"request handled",
			"method", r.Method,
			"path", r.URL.Path,
			"status", status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}
