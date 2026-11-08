package main

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Workspace order is user-scoped server state, separate from the individual JSON configs.
// Rename mappings allow browsers that were offline to migrate their local references.
type workspaceMetadata struct {
	Order   []string          `json:"order"`
	Renames map[string]string `json:"renames,omitempty"`
}

func metadataFilename(user string) string {
	if user == "" {
		return ".jumpkey-workspaces.json"
	}
	return ".jumpkey-workspaces." + user + ".json"
}
func defaultWorkspaceMetadata() workspaceMetadata {
	return workspaceMetadata{Order: []string{}, Renames: map[string]string{}}
}
func (s *server) readWorkspaceMetadata(user string) (workspaceMetadata, error) {
	meta := defaultWorkspaceMetadata()
	file, err := openPublicFile(s.configDir, metadataFilename(user))
	if errors.Is(err, fs.ErrNotExist) {
		return meta, nil
	}
	if err != nil {
		return meta, err
	}
	defer file.Close()
	if err := json.NewDecoder(file).Decode(&meta); err != nil {
		return defaultWorkspaceMetadata(), err
	}
	if meta.Order == nil {
		meta.Order = []string{}
	}
	if meta.Renames == nil {
		meta.Renames = map[string]string{}
	}
	return meta, nil
}
func metadataETag(meta workspaceMetadata) string {
	data, _ := json.Marshal(meta)
	return configETag(data)
}
func (s *server) writeWorkspaceMetadata(user string, meta workspaceMetadata) error {
	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	name := metadataFilename(user)
	path := filepath.Join(s.configDir, name)
	if info, err := os.Lstat(path); err == nil && !info.Mode().IsRegular() {
		return fs.ErrPermission
	} else if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	return atomicWrite(path, data, 0o644)
}
func reconcileWorkspaceOrder(meta workspaceMetadata, entries []workspaceEntry) []workspaceEntry {
	byID := make(map[string]workspaceEntry, len(entries))
	for _, entry := range entries {
		byID[entry.ID] = entry
	}
	sorted := make([]workspaceEntry, 0, len(entries))
	for _, id := range meta.Order {
		if entry, ok := byID[id]; ok {
			sorted = append(sorted, entry)
			delete(byID, id)
		}
	}
	remaining := make([]string, 0, len(byID))
	for id := range byID {
		remaining = append(remaining, id)
	}
	sort.Slice(remaining, func(i, j int) bool {
		if remaining[i] == "default" {
			return true
		}
		if remaining[j] == "default" {
			return false
		}
		return remaining[i] < remaining[j]
	})
	for _, id := range remaining {
		sorted = append(sorted, byID[id])
	}
	return sorted
}
func orderedIDs(entries []workspaceEntry) []string {
	result := make([]string, 0, len(entries))
	for _, entry := range entries {
		result = append(result, entry.ID)
	}
	return result
}
func (s *server) listUserWorkspaces(user string) ([]workspaceEntry, error) {
	entries, err := os.ReadDir(s.configDir)
	if err != nil {
		return nil, err
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
		id := ""
		if name == workspaceFilename("default", user) {
			id = "default"
		} else if strings.HasSuffix(name, suffix) {
			id = strings.TrimSuffix(name, suffix)
		} else {
			continue
		}
		if !workspaceIDValid(id) {
			continue
		}
		label := strings.ReplaceAll(id, "-", " ")
		label = strings.ToUpper(label[:1]) + label[1:]
		if id == "default" {
			label = ""
		}
		if configured := s.workspaceNameFromFile(name); configured != "" {
			label = configured
		}
		list = append(list, workspaceEntry{id, label, name})
	}
	return list, nil
}
func (s *server) putWorkspaceOrder(w http.ResponseWriter, r *http.Request) {
	if s.readOnly {
		writeAPIError(w, 405, "read_only", "Read-only workspace")
		return
	}
	if !checkExpectedUser(w, r) {
		return
	}
	match := r.Header.Values("If-Match")
	if len(match) == 0 {
		writeAPIError(w, 428, "precondition_required", "If-Match is required")
		return
	}
	if len(match) != 1 {
		writeAPIError(w, 400, "invalid_precondition", "A single If-Match is required")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	defer r.Body.Close()
	var body struct {
		Order []string `json:"order"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if decoder.Decode(&body) != nil || body.Order == nil || decoder.Decode(new(any)) != io.EOF {
		writeAPIError(w, 400, "invalid_body", "Invalid order request")
		return
	}
	s.workspaceMu.Lock()
	defer s.workspaceMu.Unlock()
	user := requestUser(r)
	meta, err := s.readWorkspaceMetadata(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot read workspace order")
		return
	}
	if metadataETag(meta) != match[0] {
		writeAPIError(w, 412, "precondition_failed", "Workspace order changed; reload required")
		return
	}
	entries, err := s.listUserWorkspaces(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot list workspaces")
		return
	}
	if len(body.Order) != len(entries) {
		writeAPIError(w, 400, "invalid_order", "Order must contain every available workspace exactly once")
		return
	}
	valid := map[string]bool{}
	for _, entry := range entries {
		valid[entry.ID] = true
	}
	for _, id := range body.Order {
		if !valid[id] {
			writeAPIError(w, 400, "invalid_order", "Unknown or duplicate workspace ID")
			return
		}
		delete(valid, id)
	}
	meta.Order = body.Order
	if err := s.writeWorkspaceMetadata(user, meta); err != nil {
		writeAPIError(w, 500, "write_failed", "Cannot save workspace order")
		return
	}
	w.Header().Set("ETag", metadataETag(meta))
	w.WriteHeader(http.StatusNoContent)
}
