package main

import (
	"encoding/json"
	"flag"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func publicFixture(t *testing.T) (*server, http.Handler) {
	t.Helper()
	dir, icons := t.TempDir(), t.TempDir()
	for name, data := range map[string]string{
		"services.arthur.json": `{"owner":"arthur"}`, "home.workspace.arthur.json": `{"owner":"home"}`,
		"private.workspace.arthur.json": `{"owner":"private"}`, "services.bob.json": `{"owner":"bob"}`,
		"services.arthur.backup-secret.json": `{"secret":true}`,
	} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(data), 0600); err != nil {
			t.Fatal(err)
		}
	}
	os.WriteFile(filepath.Join(icons, "ok.svg"), []byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`), 0600)
	os.WriteFile(filepath.Join(icons, "secret.txt"), []byte("secret"), 0600)
	os.Symlink(filepath.Join(dir, "services.bob.json"), filepath.Join(icons, "escape.svg"))
	s := &server{readOnly: true, publicWorkspaces: []string{"home", "default"}, configUser: "arthur", configDir: dir, iconsDir: icons, logger: slog.New(slog.NewTextHandler(io.Discard, nil)), distFS: fstest.MapFS{
		"index.html":           {Data: []byte(`<script>console.log('trusted')</script>`)},
		"manifest.webmanifest": {Data: []byte(`{"name":"JumpKey","share_target":{"action":"/"}}`)},
	}}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/workspaces", s.handleWorkspaces)
	mux.HandleFunc("/config/", s.handleConfig)
	mux.HandleFunc("/icons/", s.handleIcons)
	mux.HandleFunc("/", s.handleStatic)
	return s, s.publicSecurity(mux)
}
func TestPublicRoutes(t *testing.T) {
	s, h := publicFixture(t)
	for _, tc := range []struct {
		method, path string
		status       int
	}{
		{"GET", "/config/services.json", 200}, {"HEAD", "/config/services.json?workspace=home", 200},
		{"GET", "/config/services.json?workspace=private", 404}, {"GET", "/config/services.json?workspace=../bob", 404},
		{"GET", "/config/services.bob.json", 404}, {"GET", "/config/services.backup-secret.json", 404},
		{"GET", "/config/private.workspace.arthur.json", 404}, {"GET", "/icons/", 404}, {"GET", "/icons/secret.txt", 404},
		{"GET", "/icons/escape.svg", 404}, {"GET", "/icons/ok.svg", 200},
		{"PUT", "/config/services.json", 405}, {"POST", "/config/services.json", 405}, {"DELETE", "/config/services.json", 405},
		{"PATCH", "/config/services.json?workspace=home", 405}, {"PUT", "/anything", 405},
	} {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			r := httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{"changed":true}`))
			r.Header.Set("Remote-User", "bob")
			r.Header.Set("X-JumpKey-User", "bob")
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != tc.status {
				t.Fatalf("got %d: %s", w.Code, w.Body.String())
			}
			if w.Header().Get("X-Content-Type-Options") != "nosniff" {
				t.Fatal("missing headers")
			}
			if tc.path == "/config/services.json" && tc.method == "GET" && !strings.Contains(w.Body.String(), "arthur") {
				t.Fatal("fixed user not honored")
			}
			if tc.method == "HEAD" && w.Body.Len() != 0 {
				t.Fatal("HEAD body")
			}
		})
	}
	data, _ := os.ReadFile(filepath.Join(s.configDir, "services.arthur.json"))
	if string(data) != `{"owner":"arthur"}` {
		t.Fatal("file changed")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/workspaces", nil))
	var list struct {
		ReadOnly   bool
		User       string
		Workspaces []workspaceEntry
	}
	json.Unmarshal(w.Body.Bytes(), &list)
	if !list.ReadOnly || list.User != "public" || len(list.Workspaces) != 2 || list.Workspaces[0].ID != "home" {
		t.Fatalf("unexpected manifest: %+v", list)
	}
	if strings.Contains(w.Body.String(), "arthur") || strings.Contains(w.Body.String(), "private") {
		t.Fatal("private metadata exposed")
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/manifest.webmanifest", nil))
	if strings.Contains(w.Body.String(), "share_target") {
		t.Fatal("share target exposed")
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	csp := w.Header().Get("Content-Security-Policy")
	if !strings.Contains(csp, "'sha256-") || !strings.Contains(csp, "frame-ancestors 'none'") {
		t.Fatal(csp)
	}
	// An allowed config replaced by a symlink must not bypass the file policy.
	os.Remove(filepath.Join(s.configDir, "services.arthur.json"))
	os.Symlink(filepath.Join(s.configDir, "services.bob.json"), filepath.Join(s.configDir, "services.arthur.json"))
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/config/services.json", nil))
	if w.Code != 404 {
		t.Fatal("symlink config served")
	}
}
func TestPublicOptions(t *testing.T) {
	s, _ := publicFixture(t)
	valid := options{readOnly: true, publicWorkspaces: "home,default", configUser: "arthur", configDir: s.configDir, iconsDir: s.iconsDir, host: "127.0.0.1", port: 8080}
	if err := validateOptions(valid); err != nil {
		t.Fatal(err)
	}
	for _, mutate := range []func(*options){
		func(o *options) { o.publicWorkspaces = "" }, func(o *options) { o.publicWorkspaces = "home,home" }, func(o *options) { o.publicWorkspaces = "missing" },
		func(o *options) { o.publicWorkspaces = "../private" }, func(o *options) { o.configUser = "../bob" }, func(o *options) { o.copyDefaultConfig = true }, func(o *options) { o.readOnly = false },
	} {
		o := valid
		mutate(&o)
		if validateOptions(o) == nil {
			t.Fatalf("accepted %+v", o)
		}
	}
	flags := flag.NewFlagSet("test", flag.ContinueOnError)
	var opts options
	env := map[string]string{"JUMPKEY_READ_ONLY": "true", "JUMPKEY_PUBLIC_WORKSPACES": "home", "JUMPKEY_CONFIG_USER": "arthur"}
	if err := registerPublicOptions(flags, &opts, func(k string) string { return env[k] }); err != nil {
		t.Fatal(err)
	}
	if err := flags.Parse([]string{"--read-only=false", "--config-user=bob", "--public-workspaces=default"}); err != nil {
		t.Fatal(err)
	}
	if opts.readOnly || opts.configUser != "bob" || opts.publicWorkspaces != "default" {
		t.Fatal("CLI must win")
	}
	if registerPublicOptions(flag.NewFlagSet("bad", flag.ContinueOnError), &options{}, func(k string) string {
		if k == "JUMPKEY_READ_ONLY" {
			return "typo"
		}
		return ""
	}) == nil {
		t.Fatal("invalid bool accepted")
	}
	entries, _ := os.ReadDir(s.configDir)
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), ".jump-key") {
			t.Fatal("unexpected write")
		}
	}
}
