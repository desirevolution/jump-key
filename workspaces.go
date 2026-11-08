package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
)

var workspacePattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type workspaceEntry struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	File string `json:"file"`
}

func workspaceFilename(id, user string) string {
	if id == "default" {
		if user == "" {
			return "services.json"
		}
		return "services." + user + ".json"
	}
	if user == "" {
		return id + ".workspace.json"
	}
	return id + ".workspace." + user + ".json"
}

// Read only the optional display name; do not alter IDs or configuration filenames.
func configuredWorkspaceName(reader io.Reader) string {
	var config struct {
		WorkspaceName json.RawMessage `json:"workspaceName"`
	}
	if err := json.NewDecoder(io.LimitReader(reader, maxConfigSize+1)).Decode(&config); err != nil {
		return ""
	}
	name, valid := parseWorkspaceName(config.WorkspaceName)
	if !valid {
		return ""
	}
	return name
}

func (s *server) workspaceNameFromFile(filename string) string {
	data, err := s.readConfig(filename)
	if err != nil {
		return ""
	}
	return configuredWorkspaceName(bytes.NewReader(data))
}

func (s *server) handleWorkspaces(w http.ResponseWriter, r *http.Request) {
	if s.readOnly {
		s.handlePublicWorkspaces(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	if r.Method == http.MethodPost {
		s.createWorkspace(w, r)
		return
	}
	if !requireMethod(w, r.Method, http.MethodGet, http.MethodHead) {
		return
	}
	user := requestUser(r)
	if user != "" && !validUserPattern.MatchString(user) {
		writeAPIError(w, 400, "invalid_user", "Invalid user")
		return
	}
	s.workspaceMu.Lock()
	defer s.workspaceMu.Unlock()
	meta, err := s.readWorkspaceMetadata(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot read workspace order")
		return
	}
	entries, err := s.listUserWorkspaces(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot list workspaces")
		return
	}
	list := reconcileWorkspaceOrder(meta, entries)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("ETag", metadataETag(meta))
	if r.Method == http.MethodHead {
		return
	}
	_ = json.NewEncoder(w).Encode(struct {
		User       string            `json:"user"`
		Workspaces []workspaceEntry  `json:"workspaces"`
		OrderETag  string            `json:"orderETag"`
		Renames    map[string]string `json:"renames"`
	}{user, list, metadataETag(meta), meta.Renames})
}
