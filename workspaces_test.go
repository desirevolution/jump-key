package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestWorkspaceListAndIsolation(t *testing.T) {
	dir := t.TempDir()
	config := []byte(`{"categories":[],"searchEngines":[]}`)
	for _, name := range []string{"services.json", "services.arthur.json", "work.workspace.arthur.json", "work.workspace.bob.json", "work.workspace.json", "services.arthur.backup-x.json", "work.workspace.arthur.backup-x.json"} {
		if err := os.WriteFile(filepath.Join(dir, name), config, 0600); err != nil {
			t.Fatal(err)
		}
	}
	s := &server{configDir: dir, logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
	req := httptest.NewRequest("GET", "/api/workspaces", nil)
	req.Header.Set("Remote-User", "arthur")
	w := httptest.NewRecorder()
	s.handleWorkspaces(w, req)
	var result struct {
		User       string
		Workspaces []workspaceEntry
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.User != "arthur" || len(result.Workspaces) != 2 || result.Workspaces[0].ID != "default" || result.Workspaces[1].File != "work.workspace.arthur.json" {
		t.Fatalf("unexpected list: %+v", result)
	}
	for _, tc := range []struct {
		url, user, expected string
		code                int
	}{{"/config/services.json?workspace=work", "arthur", "arthur", 200}, {"/config/services.json?workspace=missing", "arthur", "arthur", 404}, {"/config/services.json?workspace=../bob", "arthur", "arthur", 404}, {"/config/services.json?workspace=work", "bob", "arthur", 409}} {
		r := httptest.NewRequest("GET", tc.url, nil)
		r.Header.Set("Remote-User", tc.user)
		r.Header.Set("X-JumpKey-User", tc.expected)
		out := httptest.NewRecorder()
		s.handleConfig(out, r)
		if out.Code != tc.code {
			t.Fatalf("%s: %d", tc.url, out.Code)
		}
	}
	updated := []byte(`{"categories":[],"searchEngines":[],"test":true}`)
	r := httptest.NewRequest(http.MethodPut, "/config/services.json?workspace=work", bytes.NewReader(updated))
	r.Header.Set("Remote-User", "arthur")
	out := httptest.NewRecorder()
	s.handleConfig(out, r)
	if out.Code >= 300 {
		t.Fatal(out.Code, out.Body.String())
	}
	actual, _ := os.ReadFile(filepath.Join(dir, "work.workspace.arthur.json"))
	if !bytes.Equal(actual, updated) {
		t.Fatal("wrong workspace written")
	}
	untouched, _ := os.ReadFile(filepath.Join(dir, "work.workspace.bob.json"))
	if !bytes.Equal(untouched, config) {
		t.Fatal("other user modified")
	}
}

func TestWorkspaceNamesFromConfigAndFallback(t *testing.T) {
	dir := t.TempDir()
	for name, content := range map[string]string{
		"services.json":           `{"workspaceName":"  My Services  ","categories":[],"searchEngines":[]}`,
		"work.workspace.json":     `{"workspaceName":"Office","categories":[],"searchEngines":[]}`,
		"home-lab.workspace.json": `{"categories":[],"searchEngines":[]}`,
		"archive.workspace.json":  `{"workspaceName":"","categories":[],"searchEngines":[]}`,
		"services.bob.json":       `{"workspaceName":"Bob's Space","categories":[],"searchEngines":[]}`,
		"work.workspace.bob.json": `{"workspaceName":"Bob's Work","categories":[],"searchEngines":[]}`,
	} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0600); err != nil {
			t.Fatal(err)
		}
	}
	s := &server{configDir: dir}
	check := func(user string, expected map[string]string) {
		t.Helper()
		r := httptest.NewRequest("GET", "/api/workspaces", nil)
		r.Header.Set("Remote-User", user)
		w := httptest.NewRecorder()
		s.handleWorkspaces(w, r)
		if w.Code != 200 {
			t.Fatalf("list: %d", w.Code)
		}
		var response struct{ Workspaces []workspaceEntry }
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		if len(response.Workspaces) != len(expected) {
			t.Fatalf("user=%q: %+v", user, response.Workspaces)
		}
		for _, item := range response.Workspaces {
			if want, ok := expected[item.ID]; !ok || item.Name != want {
				t.Fatalf("user=%q workspace=%q name=%q want=%q", user, item.ID, item.Name, want)
			}
		}
	}
	check("", map[string]string{"default": "My Services", "work": "Office", "home-lab": "Home lab", "archive": "Archive"})
	check("bob", map[string]string{"default": "Bob's Space", "work": "Bob's Work"})
	if err := os.WriteFile(filepath.Join(dir, "services.json"), []byte(`{"categories":[],"searchEngines":[]}`), 0600); err != nil {
		t.Fatal(err)
	}
	check("", map[string]string{"default": "", "work": "Office", "home-lab": "Home lab", "archive": "Archive"})
}
