package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

var baseConfig = []byte(`{"categories":[],"searchEngines":[]}`)

func testServer(t *testing.T) *server {
	t.Helper()
	return &server{configDir: t.TempDir(), backupKeep: 2, logger: slog.New(slog.NewTextHandler(io.Discard, nil)), authMode: "local"}
}

func writeFixture(t *testing.T, s *server, name string, data []byte) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(s.configDir, name), data, 0600); err != nil {
		t.Fatal(err)
	}
}
func configRequestTest(s *server, method, url string, body []byte, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, url, bytes.NewReader(body))
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res := httptest.NewRecorder()
	s.handleConfig(res, req)
	return res
}
func assertErrorCode(t *testing.T, w *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status %d want %d: %s", w.Code, status, w.Body.String())
	}
	var payload apiErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid error response: %v", err)
	}
	if payload.Error.Code != code {
		t.Fatalf("error %q want %q", payload.Error.Code, code)
	}
}

func TestConfigRevisionContract(t *testing.T) {
	s := testServer(t)
	writeFixture(t, s, "services.json", baseConfig)
	read := configRequestTest(s, "GET", "/config/services.json", nil, nil)
	if read.Code != 200 || read.Header().Get("ETag") != configETag(baseConfig) {
		t.Fatalf("GET: %d %v", read.Code, read.Header())
	}
	cached := configRequestTest(s, "GET", "/config/services.json", nil, map[string]string{"If-None-Match": configETag(baseConfig)})
	if cached.Code != 304 {
		t.Fatalf("conditional GET: %d", cached.Code)
	}
	next := []byte(`{"categories":[],"searchEngines":[],"version":2}`)
	assertErrorCode(t, configRequestTest(s, "PUT", "/config/services.json", next, nil), 428, "precondition_required")
	assertErrorCode(t, configRequestTest(s, "PUT", "/config/services.json", next, map[string]string{"If-Match": `"stale"`}), 412, "precondition_failed")
	assertErrorCode(t, configRequestTest(s, "PUT", "/config/services.json", next, map[string]string{"If-None-Match": "*"}), 412, "precondition_failed")
	saved := configRequestTest(s, "PUT", "/config/services.json", next, map[string]string{"If-Match": configETag(baseConfig)})
	if saved.Code != 204 || saved.Header().Get("ETag") != configETag(next) {
		t.Fatalf("PUT %d %v", saved.Code, saved.Header())
	}
	assertErrorCode(t, configRequestTest(s, "PUT", "/config/services.json", next, map[string]string{"If-Match": configETag(baseConfig)}), 412, "precondition_failed")
	after, err := os.ReadFile(filepath.Join(s.configDir, "services.json"))
	if err != nil || !bytes.Equal(after, next) {
		t.Fatalf("unexpected saved bytes: %s %v", after, err)
	}
	backups, _ := filepath.Glob(filepath.Join(s.configDir, "services.backup-*.json"))
	if len(backups) != 1 {
		t.Fatalf("expected one backup: %v", backups)
	}
	assertErrorCode(t, configRequestTest(s, "GET", "/config/services.backup-2026-01-01.json", nil, nil), 404, "not_found")
	assertErrorCode(t, configRequestTest(s, "PUT", "/config/services.backup-2026-01-01.json", next, map[string]string{"If-None-Match": "*"}), 404, "not_found")
}

func TestConfigCreateAndBackupRotation(t *testing.T) {
	s := testServer(t)
	assertErrorCode(t, configRequestTest(s, "PUT", "/config/services.json", baseConfig, nil), 428, "precondition_required")
	assertErrorCode(t, configRequestTest(s, "PUT", "/config/services.json", baseConfig, map[string]string{"If-Match": `"something"`}), 412, "precondition_failed")
	created := configRequestTest(s, "PUT", "/config/services.json", baseConfig, map[string]string{"If-None-Match": "*"})
	if created.Code != 201 {
		t.Fatalf("create: %d %s", created.Code, created.Body.String())
	}
	if again := configRequestTest(s, "PUT", "/config/services.json", baseConfig, map[string]string{"If-None-Match": "*"}); again.Code != 412 {
		t.Fatalf("duplicate creation: %d", again.Code)
	}
	current := baseConfig
	for i := 0; i < 5; i++ {
		next := []byte(`{"categories":[],"searchEngines":[],"counter":` + string(rune('0'+i)) + `}`)
		w := configRequestTest(s, "PUT", "/config/services.json", next, map[string]string{"If-Match": configETag(current)})
		if w.Code != 204 {
			t.Fatalf("save %d: %d %s", i, w.Code, w.Body.String())
		}
		current = next
	}
	backups, err := filepath.Glob(filepath.Join(s.configDir, "services.backup-*.json"))
	if err != nil || len(backups) != 2 {
		t.Fatalf("rotation retained %d backups: %v", len(backups), err)
	}
	unrelated := filepath.Join(s.configDir, "services.backup-keepme.json")
	if err := os.WriteFile(unrelated, baseConfig, 0600); err != nil {
		t.Fatal(err)
	}
	w := configRequestTest(s, "PUT", "/config/services.json", baseConfig, map[string]string{"If-Match": configETag(current)})
	if w.Code != 204 {
		t.Fatal(w.Code)
	}
	if _, err := os.Stat(unrelated); err != nil {
		t.Fatal("unrelated backup removed", err)
	}
}

func TestConcurrentWritesOnlyOneWins(t *testing.T) {
	s := testServer(t)
	writeFixture(t, s, "services.json", baseConfig)
	const total = 12
	results := make(chan int, total)
	var wg sync.WaitGroup
	for i := 0; i < total; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			body := []byte(`{"categories":[],"searchEngines":[],"number":"` + string(rune('A'+i)) + `"}`)
			res := configRequestTest(s, "PUT", "/config/services.json", body, map[string]string{"If-Match": configETag(baseConfig)})
			results <- res.Code
		}(i)
	}
	wg.Wait()
	close(results)
	wins, conflicts := 0, 0
	for status := range results {
		if status == 204 {
			wins++
		} else if status == 412 {
			conflicts++
		} else {
			t.Fatalf("unexpected status %d", status)
		}
	}
	if wins != 1 || conflicts != total-1 {
		t.Fatalf("wins=%d conflicts=%d", wins, conflicts)
	}
}

func TestWorkspaceCreateDuplicateRenameAndIsolation(t *testing.T) {
	s := testServer(t)
	writeFixture(t, s, "services.alice.json", []byte(`{"workspaceName":"Original","categories":[{"category":"Tools","services":[{"id":"a","name":"Alpha","url":"/alpha"}]}],"searchEngines":[],"custom":{"keep":true}}`))
	send := func(method, path, user, content, etag string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, strings.NewReader(content))
		r.Header.Set("Remote-User", user)
		r = r.WithContext(context.WithValue(r.Context(), userContextKey{}, user))
		if etag != "" {
			r.Header.Set("If-Match", etag)
		}
		w := httptest.NewRecorder()
		if path == "/api/workspaces" {
			s.handleWorkspaces(w, r)
		} else {
			s.handleWorkspaceDetail(w, r)
		}
		return w
	}
	created := send("POST", "/api/workspaces", "alice", `{"id":"copy","name":"Copied","sourceId":"default"}`, "")
	if created.Code != 201 {
		t.Fatalf("create: %d %s", created.Code, created.Body.String())
	}
	data, err := os.ReadFile(filepath.Join(s.configDir, "copy.workspace.alice.json"))
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["workspaceName"] != "Copied" || decoded["custom"] == nil {
		t.Fatalf("lost source fields: %s", data)
	}
	if _, err := os.Stat(filepath.Join(s.configDir, "copy.workspace.bob.json")); !os.IsNotExist(err) {
		t.Fatal("cross-user data leak")
	}
	again := send("POST", "/api/workspaces", "alice", `{"id":"copy","name":"Again"}`, "")
	assertErrorCode(t, again, 409, "already_exists")
	invalid := send("POST", "/api/workspaces", "alice", `{"id":"../other","name":"Unsafe"}`, "")
	assertErrorCode(t, invalid, 400, "invalid_id")
	wrongUser := send("POST", "/api/workspaces", "bob", `{"id":"copy","name":"Copy","sourceId":"default"}`, "")
	assertErrorCode(t, wrongUser, 404, "not_found")
	missing := send("PATCH", "/api/workspaces/copy", "alice", `{"name":"Renamed"}`, "")
	assertErrorCode(t, missing, 428, "precondition_required")
	conflict := send("PATCH", "/api/workspaces/copy", "alice", `{"name":"Renamed"}`, `"old"`)
	assertErrorCode(t, conflict, 412, "precondition_failed")
	renamed := send("PATCH", "/api/workspaces/copy", "alice", `{"name":"Renamed"}`, created.Header().Get("ETag"))
	if renamed.Code != 204 || renamed.Header().Get("ETag") == created.Header().Get("ETag") {
		t.Fatalf("rename: %d %s", renamed.Code, renamed.Body.String())
	}
	renamedData, err := os.ReadFile(filepath.Join(s.configDir, "copy.workspace.alice.json"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(renamedData, []byte(`"workspaceName": "Renamed"`)) || !bytes.Contains(renamedData, []byte(`"custom"`)) {
		t.Fatal("renaming lost fields")
	}
}

func TestProxyModeIdentityAndLocalIsolation(t *testing.T) {
	s := testServer(t)
	writeFixture(t, s, "services.json", baseConfig)
	writeFixture(t, s, "services.alice.json", []byte(`{"categories":[],"searchEngines":[],"user":"alice"}`))
	s.authMode = "proxy"
	s.trustedProxies = []netip.Prefix{netip.MustParsePrefix("192.0.2.10/32")}
	mux := http.NewServeMux()
	mux.HandleFunc("/config/", s.handleConfig)
	mux.HandleFunc("/api/workspaces", s.handleWorkspaces)
	mux.HandleFunc("/healthz", s.handleHealth)
	secured := s.authenticate(mux)
	send := func(peer string, values []string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "/config/services.json", nil)
		r.RemoteAddr = peer
		for _, v := range values {
			r.Header.Add("Remote-User", v)
		}
		w := httptest.NewRecorder()
		secured.ServeHTTP(w, r)
		return w
	}
	assertErrorCode(t, send("192.0.2.99:8000", []string{"alice"}), 403, "untrusted_proxy")
	assertErrorCode(t, send("192.0.2.10:8000", nil), 401, "identity_required")
	assertErrorCode(t, send("192.0.2.10:8000", []string{"alice", "bob"}), 401, "identity_required")
	assertErrorCode(t, send("192.0.2.10:8000", []string{"../bob"}), 401, "identity_required")
	ok := send("192.0.2.10:8000", []string{"alice"})
	if ok.Code != 200 || !strings.Contains(ok.Body.String(), `"alice"`) {
		t.Fatalf("trusted read: %d %s", ok.Code, ok.Body.String())
	}
	s.authMode = "local"
	local := send("192.0.2.10:8000", []string{"alice"})
	if local.Code != 200 || strings.Contains(local.Body.String(), `"alice"`) {
		t.Fatal("local mode trusted spoofed identity")
	}
}

func TestAuthConfigurationValidation(t *testing.T) {
	s := testServer(t)
	base := options{host: "127.0.0.1", port: 8080, configDir: s.configDir, iconsDir: s.configDir, authMode: "proxy", backupKeep: 20}
	if validateOptions(base) == nil {
		t.Fatal("proxy mode accepted with no trusted proxies")
	}
	base.trustedProxies = "127.0.0.1"
	if err := validateOptions(base); err != nil {
		t.Fatal(err)
	}
	base.authMode = "invalid"
	if validateOptions(base) == nil {
		t.Fatal("accepted invalid auth mode")
	}
	if _, err := parseBackupKeep("2trailing"); err == nil {
		t.Fatal("accepted trailing backup keep garbage")
	}
}

func TestPreservesConfigPermissionsAndRejectsSymlink(t *testing.T) {
	s := testServer(t)
	writeFixture(t, s, "services.json", baseConfig)
	file := filepath.Join(s.configDir, "services.json")
	if err := os.Chmod(file, 0o644); err != nil {
		t.Fatal(err)
	}
	next := []byte(`{"categories":[],"searchEngines":[],"value":1}`)
	res := configRequestTest(s, "PUT", "/config/services.json", next, map[string]string{"If-Match": configETag(baseConfig)})
	if res.Code != 204 {
		t.Fatalf("save: %d %s", res.Code, res.Body.String())
	}
	stat, err := os.Stat(file)
	if err != nil {
		t.Fatal(err)
	}
	if stat.Mode().Perm() != 0o644 {
		t.Fatalf("permissions changed to %o", stat.Mode().Perm())
	}
	outside := filepath.Join(t.TempDir(), "outside.json")
	if err := os.WriteFile(outside, baseConfig, 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(file); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, file); err != nil {
		t.Skipf("symlink unavailable: %v", err)
	}
	hidden := configRequestTest(s, "GET", "/config/services.json", nil, nil)
	if hidden.Code != 404 {
		t.Fatalf("symlink was read: %d", hidden.Code)
	}
	blocked := configRequestTest(s, "PUT", "/config/services.json", baseConfig, map[string]string{"If-Match": configETag(baseConfig)})
	if blocked.Code != 500 {
		t.Fatalf("symlink was overwritten: %d", blocked.Code)
	}
	got, err := os.ReadFile(outside)
	if err != nil || !bytes.Equal(got, baseConfig) {
		t.Fatalf("outside file modified %s %v", got, err)
	}
}

func TestProxyAuthModeDefaultsToHTTPS(t *testing.T) {
	opts := options{authMode: "proxy"}
	if !opts.httpsRequired() {
		t.Fatal("proxy auth mode must require HTTPS by default")
	}
	if err := opts.requireHTTPS.Set("false"); err != nil {
		t.Fatal(err)
	}
	if opts.httpsRequired() {
		t.Fatal("explicit local test override ignored")
	}
	s := testServer(t)
	opts = options{host: "127.0.0.1", port: 8080, configDir: s.configDir, iconsDir: s.configDir, authMode: "proxy", backupKeep: 20, trustedProxies: "0.0.0.0/0"}
	if validateOptions(opts) == nil {
		t.Fatal("accepted globally trusted proxy")
	}
}

func TestPrivateCacheHeaders(t *testing.T) {
	for name, want := range map[string]string{
		"sw.js":                "no-cache, must-revalidate",
		"index.html":           "no-cache, must-revalidate",
		"manifest.webmanifest": "no-cache, must-revalidate",
		"workbox-sample.js":    "no-cache, must-revalidate",
		"assets/app-abc.js":    "public, max-age=31536000, immutable",
	} {
		w := httptest.NewRecorder()
		setStaticCacheHeader(w, name)
		if got := w.Header().Get("Cache-Control"); got != want {
			t.Fatalf("%s: %q want %q", name, got, want)
		}
	}
}
