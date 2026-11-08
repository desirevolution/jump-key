package main

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type workspaceChange struct {
	ID       string  `json:"id"`
	Name     *string `json:"name"`
	SourceID string  `json:"sourceId,omitempty"`
}

func decodeWorkspaceChange(w http.ResponseWriter, r *http.Request) (workspaceChange, bool) {
	var change workspaceChange
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&change); err != nil {
		writeAPIError(w, 400, "invalid_body", "Invalid workspace request")
		return change, false
	}
	if err := dec.Decode(new(any)); err != io.EOF {
		writeAPIError(w, 400, "invalid_body", "Only one JSON object is allowed")
		return change, false
	}
	if change.Name == nil {
		writeAPIError(w, 400, "invalid_name", "A workspace name is required")
		return change, false
	}
	raw, _ := json.Marshal(*change.Name)
	if _, ok := parseWorkspaceName(raw); !ok {
		writeAPIError(w, 400, "invalid_name", "Name must be at most 64 characters without control characters")
		return change, false
	}
	return change, true
}

func workspaceIDValid(id string) bool { return len(id) <= 64 && workspacePattern.MatchString(id) }

func updateWorkspaceName(original []byte, name string) ([]byte, error) {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(original, &fields); err != nil {
		return nil, err
	}
	if fields == nil {
		return nil, errors.New("workspace must be an object")
	}
	raw, err := json.Marshal(name)
	if err != nil {
		return nil, err
	}
	fields["workspaceName"] = raw
	return json.MarshalIndent(fields, "", "  ")
}

// POST /api/workspaces creates a new isolated workspace. Optional sourceId duplicates JSON only.
func (s *server) createWorkspace(w http.ResponseWriter, r *http.Request) {
	if !checkExpectedUser(w, r) {
		return
	}
	change, ok := decodeWorkspaceChange(w, r)
	if !ok {
		return
	}
	if !workspaceIDValid(change.ID) {
		writeAPIError(w, 400, "invalid_id", "Invalid workspace ID")
		return
	}
	user := requestUser(r)
	s.workspaceMu.Lock()
	defer s.workspaceMu.Unlock()
	meta, err := s.readWorkspaceMetadata(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot load workspace metadata")
		return
	}
	name := workspaceFilename(change.ID, user)
	unlock := s.lockConfig(name)
	defer unlock()
	if _, err := os.Lstat(filepath.Join(s.configDir, name)); err == nil {
		writeAPIError(w, 409, "already_exists", "Workspace ID already exists")
		return
	} else if !errors.Is(err, fs.ErrNotExist) {
		writeAPIError(w, 500, "read_failed", "Cannot inspect workspace")
		return
	}
	data := []byte(`{"categories":[],"searchEngines":[]}`)
	if change.SourceID != "" {
		if !workspaceIDValid(change.SourceID) {
			writeAPIError(w, 400, "invalid_source", "Invalid source workspace")
			return
		}
		source, err := s.readConfig(workspaceFilename(change.SourceID, user))
		if err != nil {
			writeAPIError(w, 404, "not_found", "Source workspace not found")
			return
		}
		if err := validateConfiguration(source); err != nil {
			writeAPIError(w, 400, "invalid_source", "Source workspace configuration is invalid")
			return
		}
		data = source
	}
	data, err = updateWorkspaceName(data, *change.Name)
	if err != nil || validateConfiguration(data) != nil {
		writeAPIError(w, 400, "invalid_config", "Workspace configuration is invalid")
		return
	}
	if err := createConfigExclusive(filepath.Join(s.configDir, name), data); err != nil {
		if errors.Is(err, fs.ErrExist) {
			writeAPIError(w, 409, "already_exists", "Workspace ID already exists")
		} else {
			writeAPIError(w, 500, "write_failed", "Cannot create workspace")
		}
		return
	}
	// Workspace creation and its ordering metadata succeed or fail together.
	entries, listErr := s.listUserWorkspaces(user)
	if listErr != nil {
		_ = os.Remove(filepath.Join(s.configDir, name))
		writeAPIError(w, 500, "read_failed", "Cannot list workspaces")
		return
	}
	ordered := orderedIDs(reconcileWorkspaceOrder(meta, entries))
	meta.Order = make([]string, 0, len(ordered))
	for _, existingID := range ordered {
		if existingID != change.ID {
			meta.Order = append(meta.Order, existingID)
		}
	}
	meta.Order = append(meta.Order, change.ID)
	delete(meta.Renames, change.ID) // An old ID may be intentionally reused.
	if err := s.writeWorkspaceMetadata(user, meta); err != nil {
		_ = os.Remove(filepath.Join(s.configDir, name))
		writeAPIError(w, 500, "write_failed", "Cannot store workspace order")
		return
	}
	label := *change.Name
	if label == "" && change.ID != "default" {
		label = strings.ToUpper(change.ID[:1]) + strings.ReplaceAll(change.ID[1:], "-", " ")
	}
	w.Header().Set("ETag", configETag(data))
	w.Header().Set("Location", "/api/workspaces/"+url.PathEscape(change.ID))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(workspaceEntry{change.ID, label, name})
}

// PATCH /api/workspaces/{id} updates only the JSON display name; never its stable ID.
func (s *server) handleWorkspaceDetail(w http.ResponseWriter, r *http.Request) {
	if s.readOnly {
		writeAPIError(w, 405, "read_only", "Read-only workspace")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	id := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	if !workspaceIDValid(id) {
		writeAPIError(w, 404, "not_found", "Workspace not found")
		return
	}
	if r.Method == http.MethodDelete {
		s.deleteWorkspace(w, r, id)
		return
	}
	if !requireMethod(w, r.Method, http.MethodPatch) {
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
	change, ok := decodeWorkspaceChange(w, r)
	if !ok {
		return
	}
	if change.SourceID != "" {
		writeAPIError(w, 400, "invalid_body", "sourceId cannot be changed")
		return
	}
	if change.ID != "" && !workspaceIDValid(change.ID) {
		writeAPIError(w, 400, "invalid_id", "Invalid new workspace ID")
		return
	}
	s.workspaceMu.Lock()
	defer s.workspaceMu.Unlock()
	user := requestUser(r)
	name := workspaceFilename(id, user)
	unlock := s.lockConfig(name)
	defer unlock()
	original, err := s.readConfig(name)
	if err != nil {
		writeAPIError(w, 404, "not_found", "Workspace not found")
		return
	}
	if configETag(original) != match[0] {
		writeAPIError(w, 412, "precondition_failed", "Workspace changed; reload required")
		return
	}
	if change.ID != "" && change.ID != id {
		s.renameWorkspaceFile(w, id, change.ID, user, original, *change.Name)
		return
	}
	data, err := updateWorkspaceName(original, *change.Name)
	if err != nil || validateConfiguration(data) != nil {
		writeAPIError(w, 400, "invalid_config", "Workspace configuration is invalid")
		return
	}
	etag, _, status, code, err := s.saveConfig(name, data, match[0], "")
	if err != nil {
		message := err.Error()
		if status >= 500 {
			message = "Failed to update workspace"
		}
		writeAPIError(w, status, code, message)
		return
	}
	w.Header().Set("ETag", etag)
	w.WriteHeader(http.StatusNoContent)
}

// renameWorkspaceFile is invoked with the workspace collection and old file locks held.
// Linking the new path exclusively prevents even concurrent external creation from being overwritten.
func (s *server) renameWorkspaceFile(w http.ResponseWriter, oldID, newID, user string, original []byte, newName string) {
	oldName := workspaceFilename(oldID, user)
	newNameFile := workspaceFilename(newID, user)
	unlock := s.lockConfig(newNameFile)
	defer unlock()
	data, err := updateWorkspaceName(original, newName)
	if err != nil || validateConfiguration(data) != nil {
		writeAPIError(w, 400, "invalid_config", "Invalid workspace configuration")
		return
	}
	oldPath := filepath.Join(s.configDir, oldName)
	newPath := filepath.Join(s.configDir, newNameFile)
	meta, err := s.readWorkspaceMetadata(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot read metadata")
		return
	}
	// Materialize order before the old ID disappears, including on installations
	// which had never saved a custom workspace order.
	entries, err := s.listUserWorkspaces(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot list workspaces")
		return
	}
	meta.Order = orderedIDs(reconcileWorkspaceOrder(meta, entries))
	// First create a new, complete workspace without clobbering any existing file.
	if err := createConfigExclusive(newPath, data); err != nil {
		if errors.Is(err, fs.ErrExist) {
			writeAPIError(w, 409, "already_exists", "Workspace ID already exists")
		} else {
			writeAPIError(w, 500, "write_failed", "Cannot rename workspace")
		}
		return
	}
	// Preserve the access mode of the original JSON file (also for read-only mounts).
	info, statErr := os.Lstat(oldPath)
	if statErr != nil || !info.Mode().IsRegular() {
		_ = os.Remove(newPath)
		writeAPIError(w, 500, "read_failed", "Original workspace is unavailable")
		return
	}
	if chmodErr := os.Chmod(newPath, info.Mode().Perm()); chmodErr != nil {
		_ = os.Remove(newPath)
		writeAPIError(w, 500, "write_failed", "Cannot preserve workspace permissions")
		return
	}
	if err := os.Remove(oldPath); err != nil {
		_ = os.Remove(newPath)
		writeAPIError(w, 500, "write_failed", "Cannot rename workspace")
		return
	}
	for i, v := range meta.Order {
		if v == oldID {
			meta.Order[i] = newID
		}
	}
	// Update existing rename chains for browsers that were offline more than once.
	for id, target := range meta.Renames {
		if target == oldID {
			meta.Renames[id] = newID
		}
	}
	meta.Renames[oldID] = newID
	if err := s.writeWorkspaceMetadata(user, meta); err != nil {
		if rollbackErr := createConfigExclusive(oldPath, original); rollbackErr != nil {
			writeAPIError(w, 500, "restore_failed", "Rename failed; restore the old workspace from the new file")
			return
		}
		_ = os.Chmod(oldPath, info.Mode().Perm())
		_ = os.Remove(newPath)
		writeAPIError(w, 500, "write_failed", "Cannot save rename metadata")
		return
	}
	w.Header().Set("ETag", configETag(data))
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(workspaceEntry{newID, newName, newNameFile})
}

// deleteWorkspace always preserves a permanent copy of the exact latest workspace bytes.
func (s *server) deleteWorkspace(w http.ResponseWriter, r *http.Request, id string) {
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
	s.workspaceMu.Lock()
	defer s.workspaceMu.Unlock()
	user := requestUser(r)
	entries, err := s.listUserWorkspaces(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot list workspaces")
		return
	}
	if len(entries) <= 1 {
		writeAPIError(w, 409, "last_workspace", "The last workspace cannot be deleted")
		return
	}
	filename := workspaceFilename(id, user)
	unlock := s.lockConfig(filename)
	defer unlock()
	data, err := s.readConfig(filename)
	if err != nil {
		writeAPIError(w, 404, "not_found", "Workspace not found")
		return
	}
	if configETag(data) != match[0] {
		writeAPIError(w, 412, "precondition_failed", "Workspace changed; reload required")
		return
	}
	meta, err := s.readWorkspaceMetadata(user)
	if err != nil {
		writeAPIError(w, 500, "read_failed", "Cannot read metadata")
		return
	}
	target := filepath.Join(s.configDir, filename)
	backup := strings.TrimSuffix(target, ".json") + ".deleted-" + time.Now().UTC().Format("2006-01-02T15-04-05.000000000") + ".json"
	if err := createConfigExclusive(backup, data); err != nil {
		writeAPIError(w, 500, "backup_failed", "Cannot preserve current workspace")
		return
	}
	if err := os.Chmod(backup, 0o600); err != nil {
		_ = os.Remove(backup)
		writeAPIError(w, 500, "backup_failed", "Cannot secure the deletion backup")
		return
	}
	if err := syncConfigDirectory(s.configDir); err != nil {
		writeAPIError(w, 500, "backup_failed", "Cannot finalize the deletion backup")
		return
	}
	originalInfo, statErr := os.Lstat(target)
	if statErr != nil || !originalInfo.Mode().IsRegular() {
		writeAPIError(w, 500, "delete_failed", "Cannot inspect workspace before deletion")
		return
	}
	if err := os.Remove(target); err != nil {
		writeAPIError(w, 500, "delete_failed", "Cannot remove workspace")
		return
	}
	remaining := make([]string, 0, len(meta.Order))
	for _, value := range meta.Order {
		if value != id {
			remaining = append(remaining, value)
		}
	}
	meta.Order = remaining
	if err := s.writeWorkspaceMetadata(user, meta); err != nil {
		if restoreErr := createConfigExclusive(target, data); restoreErr != nil {
			writeAPIError(w, 500, "restore_failed", "Workspace removal failed and must be restored from the deletion backup")
			return
		}
		if chmodErr := os.Chmod(target, originalInfo.Mode().Perm()); chmodErr != nil {
			writeAPIError(w, 500, "restore_failed", "Workspace was restored but its permissions need checking")
			return
		}
		writeAPIError(w, 500, "write_failed", "Cannot update workspace list")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
