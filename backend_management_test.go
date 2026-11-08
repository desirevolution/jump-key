package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func requestManagement(s *server, method, path, body, ifMatch string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	if ifMatch != "" {
		r.Header.Set("If-Match", ifMatch)
	}
	res := httptest.NewRecorder()
	switch {
	case path == "/api/workspaces":
		s.handleWorkspaces(res, r)
	case path == "/api/workspace-order":
		s.putWorkspaceOrder(res, r)
	default:
		s.handleWorkspaceDetail(res, r)
	}
	return res
}
func workspacesResponse(t *testing.T, s *server) (string, []workspaceEntry, map[string]string) {
	t.Helper()
	response := requestManagement(s, "GET", "/api/workspaces", "", "")
	if response.Code != 200 {
		t.Fatalf("list %d: %s", response.Code, response.Body.String())
	}
	var data struct {
		OrderETag  string            `json:"orderETag"`
		Workspaces []workspaceEntry  `json:"workspaces"`
		Renames    map[string]string `json:"renames"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &data); err != nil {
		t.Fatal(err)
	}
	return data.OrderETag, data.Workspaces, data.Renames
}
func TestManagementOrderAndRename(t *testing.T) {
	s := testServer(t)
	for _, id := range []string{"default", "home", "work"} {
		writeFixture(t, s, workspaceFilename(id, ""), baseConfig)
	}
	etag, list, _ := workspacesResponse(t, s)
	if strings.Join(orderedIDs(list), ",") != "default,home,work" {
		t.Fatal(list)
	}
	assertErrorCode(t, requestManagement(s, "PUT", "/api/workspace-order", `{"order":["work","home","default"]}`, ""), 428, "precondition_required")
	assertErrorCode(t, requestManagement(s, "PUT", "/api/workspace-order", `{"order":["work","home","default"]}`, `"old"`), 412, "precondition_failed")
	assertErrorCode(t, requestManagement(s, "PUT", "/api/workspace-order", `{"order":["work","work","default"]}`, etag), 400, "invalid_order")
	saved := requestManagement(s, "PUT", "/api/workspace-order", `{"order":["work","home","default"]}`, etag)
	if saved.Code != 204 {
		t.Fatal(saved.Code, saved.Body.String())
	}
	_, list, _ = workspacesResponse(t, s)
	if strings.Join(orderedIDs(list), ",") != "work,home,default" {
		t.Fatal(list)
	}
	renamed := requestManagement(s, "PATCH", "/api/workspaces/home", `{"id":"personal","name":"Personal"}`, configETag(baseConfig))
	if renamed.Code != 200 {
		t.Fatalf("rename %d: %s", renamed.Code, renamed.Body.String())
	}
	if _, err := os.Stat(filepath.Join(s.configDir, "home.workspace.json")); !os.IsNotExist(err) {
		t.Fatal("old workspace still exists")
	}
	data, err := os.ReadFile(filepath.Join(s.configDir, "personal.workspace.json"))
	if err != nil || !bytes.Contains(data, []byte(`"workspaceName": "Personal"`)) {
		t.Fatal("renamed data invalid", err)
	}
	_, list, renames := workspacesResponse(t, s)
	if strings.Join(orderedIDs(list), ",") != "work,personal,default" || renames["home"] != "personal" {
		t.Fatal(list, renames)
	}
}
func TestManagementDeletePreservesLatestVersionAndLastWorkspace(t *testing.T) {
	s := testServer(t)
	latest := []byte(`{"workspaceName":"Latest","categories":[],"searchEngines":[]}`)
	writeFixture(t, s, "services.json", baseConfig)
	writeFixture(t, s, "work.workspace.json", latest)
	assertErrorCode(t, requestManagement(s, "DELETE", "/api/workspaces/work", "", ""), 428, "precondition_required")
	assertErrorCode(t, requestManagement(s, "DELETE", "/api/workspaces/work", "", `"stale"`), 412, "precondition_failed")
	deleted := requestManagement(s, "DELETE", "/api/workspaces/work", "", configETag(latest))
	if deleted.Code != 204 {
		t.Fatal(deleted.Code, deleted.Body.String())
	}
	backups, _ := filepath.Glob(filepath.Join(s.configDir, "work.workspace.deleted-*.json"))
	if len(backups) != 1 {
		t.Fatal("missing permanent backup", backups)
	}
	preserved, _ := os.ReadFile(backups[0])
	if !bytes.Equal(preserved, latest) {
		t.Fatal("backup is not latest version")
	}
	if _, err := os.Stat(filepath.Join(s.configDir, "work.workspace.json")); !os.IsNotExist(err) {
		t.Fatal("workspace still present")
	}
	assertErrorCode(t, requestManagement(s, "DELETE", "/api/workspaces/default", "", configETag(baseConfig)), 409, "last_workspace")
}
func TestConcurrentDeleteKeepsOneWorkspace(t *testing.T) {
	s := testServer(t)
	writeFixture(t, s, "one.workspace.json", baseConfig)
	writeFixture(t, s, "two.workspace.json", baseConfig)
	ids := []string{"one", "two"}
	var wg sync.WaitGroup
	results := make(chan int, 2)
	for _, id := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			results <- requestManagement(s, "DELETE", "/api/workspaces/"+id, "", configETag(baseConfig)).Code
		}(id)
	}
	wg.Wait()
	close(results)
	success, conflict := 0, 0
	for status := range results {
		if status == http.StatusNoContent {
			success++
		} else if status == http.StatusConflict {
			conflict++
		} else {
			t.Fatalf("status %d", status)
		}
	}
	if success != 1 || conflict != 1 {
		t.Fatal(success, conflict)
	}
	_, list, _ := workspacesResponse(t, s)
	if len(list) != 1 {
		t.Fatal(list)
	}
}
