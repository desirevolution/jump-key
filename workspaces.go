package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
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
	f, err := os.Open(filepath.Join(s.configDir, filename))
	if err != nil {
		return ""
	}
	defer f.Close()
	return configuredWorkspaceName(f)
}

func (s *server) handleWorkspaces(w http.ResponseWriter, r *http.Request) {
	if s.readOnly {
		s.handlePublicWorkspaces(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	user := r.Header.Get("Remote-User")
	if user != "" && !validUserPattern.MatchString(user) {
		http.Error(w, "invalid user", http.StatusBadRequest)
		return
	}
	entries, err := os.ReadDir(s.configDir)
	if err != nil {
		http.Error(w, "cannot list workspaces", http.StatusInternalServerError)
		return
	}
	list := []workspaceEntry{}
	suffix := ".workspace.json"
	if user != "" {
		suffix = ".workspace." + user + ".json"
	}
	for _, entry := range entries {
		if !entry.Type().IsRegular() {
			continue
		}
		name := entry.Name()
		if name == workspaceFilename("default", user) {
			list = append(list, workspaceEntry{"default", s.workspaceNameFromFile(name), name})
			continue
		}
		if !strings.HasSuffix(name, suffix) {
			continue
		}
		id := strings.TrimSuffix(name, suffix)
		if id == "default" || !workspacePattern.MatchString(id) {
			continue
		}
		label := strings.ReplaceAll(id, "-", " ")
		label = strings.ToUpper(label[:1]) + label[1:]
		if configured := s.workspaceNameFromFile(name); configured != "" {
			label = configured
		}
		list = append(list, workspaceEntry{id, label, name})
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].ID == "default" {
			return true
		}
		if list[j].ID == "default" {
			return false
		}
		return list[i].ID < list[j].ID
	})
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(struct {
		User       string           `json:"user"`
		Workspaces []workspaceEntry `json:"workspaces"`
	}{user, list})
}
