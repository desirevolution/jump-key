package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

func registerPublicOptions(flags *flag.FlagSet, opts *options, env func(string) string) error {
	var err error
	value := false
	if raw := env("JUMPKEY_READ_ONLY"); raw != "" {
		value, err = strconv.ParseBool(raw)
	}
	flags.BoolVar(&opts.readOnly, "read-only", value, "Disable writes and publish only explicitly allowed workspaces")
	flags.StringVar(&opts.publicWorkspaces, "public-workspaces", env("JUMPKEY_PUBLIC_WORKSPACES"), "Comma-separated public workspace IDs (required with --read-only)")
	flags.StringVar(&opts.configUser, "config-user", env("JUMPKEY_CONFIG_USER"), "Fixed configuration user (only with --read-only)")
	if err != nil {
		return fmt.Errorf("invalid JUMPKEY_READ_ONLY: %w", err)
	}
	return nil
}
func parseWorkspaceList(value string) []string {
	var list []string
	for _, id := range strings.Split(value, ",") {
		if id = strings.TrimSpace(id); id != "" {
			list = append(list, id)
		}
	}
	return list
}
func validatePublicOptions(opts options) error {
	if opts.optionError != nil {
		return opts.optionError
	}
	if !opts.readOnly {
		if opts.publicWorkspaces != "" || opts.configUser != "" {
			return errors.New("--public-workspaces and --config-user require --read-only")
		}
		return nil
	}
	if opts.copyDefaultConfig {
		return errors.New("--copy-default-config cannot be used with --read-only")
	}
	if opts.configUser != "" && !validUserPattern.MatchString(opts.configUser) {
		return errors.New("invalid --config-user")
	}
	ids := parseWorkspaceList(opts.publicWorkspaces)
	if len(ids) == 0 {
		return errors.New("--read-only requires --public-workspaces")
	}
	seen := map[string]bool{}
	for _, id := range ids {
		if !workspacePattern.MatchString(id) || seen[id] {
			return fmt.Errorf("invalid or duplicate public workspace: %q", id)
		}
		seen[id] = true
		f, err := openPublicFile(opts.configDir, workspaceFilename(id, opts.configUser))
		if err != nil {
			return fmt.Errorf("public workspace %q is unavailable: %w", id, err)
		}
		f.Close()
	}
	return nil
}
func (s *server) publicWorkspace(id string) bool {
	for _, allowed := range s.publicWorkspaces {
		if allowed == id {
			return true
		}
	}
	return false
}

// Root-confined opens prevent symlink escapes. Public config filenames cannot be symlinks.
func openPublicFile(directory, name string) (*os.File, error) {
	if !filepath.IsLocal(name) {
		return nil, fs.ErrPermission
	}
	info, err := os.Lstat(filepath.Join(directory, name))
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() {
		return nil, fs.ErrPermission
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		return nil, err
	}
	defer root.Close()
	f, err := root.Open(name)
	if err != nil {
		return nil, err
	}
	info, err = f.Stat()
	if err != nil || !info.Mode().IsRegular() {
		f.Close()
		return nil, fs.ErrPermission
	}
	return f, nil
}
func allowPublicRead(w http.ResponseWriter, r *http.Request) bool {
	w.Header().Set("Cache-Control", "no-store")
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		return true
	}
	w.Header().Set("Allow", "GET, HEAD")
	http.Error(w, "read-only", http.StatusMethodNotAllowed)
	return false
}
func (s *server) handlePublicConfig(w http.ResponseWriter, r *http.Request) {
	if !allowPublicRead(w, r) {
		return
	}
	id := r.URL.Query().Get("workspace")
	if id == "" {
		id = "default"
	}
	if r.URL.Path != "/config/services.json" || !s.publicWorkspace(id) {
		http.NotFound(w, r)
		return
	}
	f, err := openPublicFile(s.configDir, workspaceFilename(id, s.configUser))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	info, _ := f.Stat()
	w.Header().Set("Content-Type", "application/json")
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}
func (s *server) handlePublicWorkspaces(w http.ResponseWriter, r *http.Request) {
	if !allowPublicRead(w, r) {
		return
	}
	list := []workspaceEntry{}
	for _, id := range s.publicWorkspaces {
		name := strings.ReplaceAll(id, "-", " ")
		name = strings.ToUpper(name[:1]) + name[1:]
		if id == "default" {
			name = ""
		}
		// The fixed backend user is not a visitor identity and need not be exposed.
		list = append(list, workspaceEntry{id, name, workspaceFilename(id, "")})
	}
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodHead {
		json.NewEncoder(w).Encode(struct {
			User       string           `json:"user"`
			ReadOnly   bool             `json:"readOnly"`
			Workspaces []workspaceEntry `json:"workspaces"`
		}{"public", true, list})
	}
}
func (s *server) handlePublicIcon(w http.ResponseWriter, r *http.Request) {
	if !allowPublicRead(w, r) {
		return
	}
	name := strings.TrimPrefix(r.URL.Path, "/icons/")
	switch strings.ToLower(filepath.Ext(name)) {
	case ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico":
	default:
		http.NotFound(w, r)
		return
	}
	f, err := openPublicFile(s.iconsDir, name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	info, _ := f.Stat()
	w.Header().Set("Content-Type", mime.TypeByExtension(strings.ToLower(filepath.Ext(name))))
	// Also sandbox SVGs opened directly, not just those rendered as images.
	w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox; style-src 'unsafe-inline'; frame-ancestors 'none'")
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}
func (s *server) handlePublicManifest(w http.ResponseWriter, r *http.Request) {
	if !allowPublicRead(w, r) {
		return
	}
	data, err := fs.ReadFile(s.distFS, "manifest.webmanifest")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	var manifest map[string]any
	if json.Unmarshal(data, &manifest) != nil {
		http.Error(w, "invalid manifest", 500)
		return
	}
	delete(manifest, "share_target")
	w.Header().Set("Content-Type", "application/manifest+json")
	if r.Method != http.MethodHead {
		json.NewEncoder(w).Encode(manifest)
	}
}
func (s *server) publicSecurity(next http.Handler) http.Handler {
	if !s.readOnly {
		return next
	}
	// Hash trusted inline scripts in the compiled HTML; never allow arbitrary inline JS.
	scripts := "'self'"
	data, _ := fs.ReadFile(s.distFS, "index.html")
	for _, match := range regexp.MustCompile(`(?s)<script\b[^>]*>(.*?)</script>`).FindAllSubmatch(data, -1) {
		if len(match[1]) == 0 {
			continue
		}
		hash := sha256.Sum256(match[1])
		scripts += " 'sha256-" + base64.StdEncoding.EncodeToString(hash[:]) + "'"
	}
	csp := "default-src 'self'; script-src " + scripts + "; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' https: data:; connect-src 'self' https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; worker-src 'self'"
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Content-Security-Policy", csp)
		if !allowPublicRead(w, r) {
			return
		}
		next.ServeHTTP(w, r)
	})
}
