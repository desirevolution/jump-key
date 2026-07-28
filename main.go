package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
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

var (
	validUserPattern = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)
	backupPattern    = regexp.MustCompile(`^services\.backup-([A-Za-z0-9._:-]+)\.json$`)
)

type options struct {
	host              string
	port              int
	configDir         string
	iconsDir          string
	copyDefaultConfig bool
}

type server struct {
	distFS    fs.FS
	configDir string
	iconsDir  string
	logger    *slog.Logger
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
		distFS:    distFS,
		configDir: opts.configDir,
		iconsDir:  opts.iconsDir,
		logger:    logger,
	}

	if opts.copyDefaultConfig {
		if err := app.copyDefaultConfig(); err != nil {
			logger.Error("failed to copy default configuration", "error", err)
			os.Exit(1)
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", app.handleHealth)
	mux.HandleFunc("/config/", app.handleConfig)
	mux.HandleFunc("/icons/", app.handleIcons)
	mux.HandleFunc("/", app.handleStatic)

	address := net.JoinHostPort(opts.host, fmt.Sprintf("%d", opts.port))

	httpServer := &http.Server{
		Addr:              address,
		Handler:           requestLogger(logger, mux),
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
	flag.StringVar(&opts.configDir, "config-dir", "", "Existing writable configuration directory (required)")
	flag.StringVar(&opts.iconsDir, "icons-dir", "", "Existing icons directory (required)")
	flag.BoolVar(&opts.copyDefaultConfig, "copy-default-config", false, "Copy embedded default config when services.json does not exist")
	flag.Parse()

	return opts
}

func validateOptions(opts options) error {
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
	if err := requireDirectory(opts.configDir, true); err != nil {
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

func (s *server) copyDefaultConfig() error {
	target := filepath.Join(s.configDir, "services.json")

	_, err := os.Stat(target)
	switch {
	case err == nil:
		s.logger.Info("default configuration already exists", "path", target)
		return nil
	case !errors.Is(err, os.ErrNotExist):
		return fmt.Errorf("inspect target configuration: %w", err)
	}

	data, err := fs.ReadFile(s.distFS, "config/services.json")
	if err != nil {
		return fmt.Errorf("read embedded default configuration: %w", err)
	}
	if !json.Valid(data) {
		return errors.New("embedded default configuration is invalid JSON")
	}

	file, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		if errors.Is(err, os.ErrExist) {
			return nil
		}
		return fmt.Errorf("create default configuration: %w", err)
	}

	success := false
	defer func() {
		_ = file.Close()
		if !success {
			_ = os.Remove(target)
		}
	}()

	if _, err := file.Write(data); err != nil {
		return fmt.Errorf("write default configuration: %w", err)
	}
	if err := file.Sync(); err != nil {
		return fmt.Errorf("sync default configuration: %w", err)
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("close default configuration: %w", err)
	}

	success = true
	s.logger.Info("default configuration copied", "path", target)
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

func (s *server) handleConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")

	filename, err := resolveConfigFilename(r.URL.Path, r.Header.Get("Remote-User"))
	if err != nil {
		http.NotFound(w, r)
		return
	}

	target := filepath.Join(s.configDir, filename)

	switch r.Method {
	case http.MethodGet, http.MethodHead:
		s.serveConfigFile(w, r, target)
	case http.MethodPut:
		s.putConfigFile(w, r, target)
	default:
		w.Header().Set("Allow", "GET, HEAD, PUT")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func resolveConfigFilename(requestPath, user string) (string, error) {
	const prefix = "/config/"

	if !strings.HasPrefix(requestPath, prefix) {
		return "", errors.New("invalid config path")
	}

	requestName := strings.TrimPrefix(requestPath, prefix)
	if requestName == "" || requestName != path.Base(requestName) {
		return "", errors.New("invalid config filename")
	}

	if user != "" && !validUserPattern.MatchString(user) {
		return "", errors.New("invalid Remote-User value")
	}

	if requestName == "services.json" {
		if user == "" {
			return "services.json", nil
		}
		return "services." + user + ".json", nil
	}

	match := backupPattern.FindStringSubmatch(requestName)
	if match == nil {
		return "", errors.New("unsupported config filename")
	}

	if user == "" {
		return "services.backup-" + match[1] + ".json", nil
	}

	return "services." + user + ".backup-" + match[1] + ".json", nil
}

func (s *server) serveConfigFile(w http.ResponseWriter, r *http.Request, filename string) {
	file, err := os.Open(filename)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			http.NotFound(w, r)
			return
		}
		s.logger.Error("failed to open configuration", "path", filename, "error", err)
		http.Error(w, "failed to read configuration", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		http.Error(w, "failed to inspect configuration", http.StatusInternalServerError)
		return
	}
	if !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

func (s *server) putConfigFile(w http.ResponseWriter, r *http.Request, filename string) {
	r.Body = http.MaxBytesReader(w, r.Body, maxConfigSize)
	defer r.Body.Close()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			http.Error(w, "configuration exceeds 2 MiB", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}

	if len(data) == 0 {
		http.Error(w, "request body is empty", http.StatusBadRequest)
		return
	}
	if !json.Valid(data) {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	_, statErr := os.Stat(filename)
	created := errors.Is(statErr, os.ErrNotExist)
	if statErr != nil && !created {
		http.Error(w, "failed to inspect target file", http.StatusInternalServerError)
		return
	}

	if err := atomicWrite(filename, data, 0o644); err != nil {
		s.logger.Error("failed to write configuration", "path", filename, "error", err)
		http.Error(w, "failed to save configuration", http.StatusInternalServerError)
		return
	}

	s.logger.Info(
		"configuration saved",
		"path", filename,
		"bytes", len(data),
		"remote_user", r.Header.Get("Remote-User"),
	)

	if created {
		w.WriteHeader(http.StatusCreated)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func atomicWrite(filename string, data []byte, mode fs.FileMode) error {
	directory := filepath.Dir(filename)
	tempFile, err := os.CreateTemp(directory, ".jump-key-*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary file: %w", err)
	}

	tempName := tempFile.Name()
	success := false
	defer func() {
		_ = tempFile.Close()
		if !success {
			_ = os.Remove(tempName)
		}
	}()

	if err := tempFile.Chmod(mode); err != nil {
		return fmt.Errorf("set temporary file permissions: %w", err)
	}
	if _, err := tempFile.Write(data); err != nil {
		return fmt.Errorf("write temporary file: %w", err)
	}
	if err := tempFile.Sync(); err != nil {
		return fmt.Errorf("sync temporary file: %w", err)
	}
	if err := tempFile.Close(); err != nil {
		return fmt.Errorf("close temporary file: %w", err)
	}
	if err := os.Rename(tempName, filename); err != nil {
		return fmt.Errorf("replace target file: %w", err)
	}

	success = true
	return nil
}

func (s *server) handleIcons(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=3600")
	handler := http.StripPrefix("/icons/", http.FileServer(http.Dir(s.iconsDir)))
	handler.ServeHTTP(w, r)
}

func (s *server) handleStatic(w http.ResponseWriter, r *http.Request) {
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
	case name == "index.html":
		w.Header().Set("Cache-Control", "no-cache")
	case strings.HasPrefix(name, "assets/"):
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	default:
		w.Header().Set("Cache-Control", "public, max-age=3600")
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
			"remote_user", r.Header.Get("Remote-User"),
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}
