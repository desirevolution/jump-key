package main

import (
	"bytes"
	"errors"
	"io"
	"io/fs"
	"net/http"
	"path"
	"time"
)

// Config names are not user supplied filenames. Backups are never an API resource.
func resolveConfigFilename(requestPath, user string) (string, error) {
	if requestPath != "/config/services.json" {
		return "", errors.New("unsupported configuration path")
	}
	if user != "" && !validUserPattern.MatchString(user) {
		return "", errors.New("invalid user")
	}
	return workspaceFilename("default", user), nil
}

func (s *server) handleConfig(w http.ResponseWriter, r *http.Request) {
	if s.readOnly {
		s.handlePublicConfig(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	filename, err := resolveConfigFilename(r.URL.Path, requestUser(r))
	if err != nil {
		writeAPIError(w, 404, "not_found", "Configuration not found")
		return
	}
	user := requestUser(r)
	if !checkExpectedUser(w, r) {
		return
	}
	if values, ok := r.URL.Query()["workspace"]; ok {
		if len(values) != 1 || !workspacePattern.MatchString(values[0]) {
			writeAPIError(w, 404, "not_found", "Workspace not found")
			return
		}
		filename = workspaceFilename(values[0], user)
	}
	switch r.Method {
	case http.MethodGet, http.MethodHead:
		s.serveConfigFile(w, r, filename)
	case http.MethodPut:
		s.putConfigFile(w, r, filename)
	default:
		requireMethod(w, r.Method, http.MethodGet, http.MethodHead, http.MethodPut)
	}
}

func (s *server) serveConfigFile(w http.ResponseWriter, r *http.Request, name string) {
	data, err := s.readConfig(name)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) || errors.Is(err, fs.ErrPermission) {
			writeAPIError(w, 404, "not_found", "Configuration not found")
			return
		}
		writeAPIError(w, 500, "read_failed", "Failed to read configuration")
		return
	}
	w.Header().Set("ETag", configETag(data))
	w.Header().Set("Content-Type", "application/json")
	http.ServeContent(w, r, path.Base(name), time.Time{}, bytes.NewReader(data))
}

func (s *server) putConfigFile(w http.ResponseWriter, r *http.Request, name string) {
	if s.readOnly {
		writeAPIError(w, 403, "read_only", "Read-only configuration")
		return
	}
	match, hasMatch := r.Header["If-Match"]
	none, hasNone := r.Header["If-None-Match"]
	if !hasMatch && !hasNone {
		writeAPIError(w, 428, "precondition_required", "Use If-Match with the loaded ETag or If-None-Match: * when creating")
		return
	}
	if (hasMatch && (len(match) != 1 || match[0] == "")) || (hasNone && (len(none) != 1 || none[0] != "*")) || (hasMatch && hasNone) {
		writeAPIError(w, 400, "invalid_precondition", "Provide one valid conditional request header")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxConfigSize)
	defer r.Body.Close()
	data, err := io.ReadAll(r.Body)
	if err != nil {
		var limit *http.MaxBytesError
		if errors.As(err, &limit) {
			writeAPIError(w, 413, "too_large", "Configuration exceeds 2 MiB")
			return
		}
		writeAPIError(w, 400, "invalid_body", "Failed to read request body")
		return
	}
	if len(data) == 0 {
		writeAPIError(w, 400, "invalid_body", "Request body is empty")
		return
	}
	if err := validateConfiguration(data); err != nil {
		writeAPIError(w, 400, "invalid_config", "Invalid configuration: "+err.Error())
		return
	}
	unlock := s.lockConfig(name)
	defer unlock()
	matchValue, noneValue := "", ""
	if hasMatch {
		matchValue = match[0]
	}
	if hasNone {
		noneValue = none[0]
	}
	etag, created, status, code, err := s.saveConfig(name, data, matchValue, noneValue)
	if err != nil {
		if status == 500 && s.logger != nil {
			s.logger.Error("configuration save failed", "file", name, "error", err)
		}
		message := err.Error()
		if status >= 500 {
			message = "Failed to save configuration"
		}
		writeAPIError(w, status, code, message)
		return
	}
	w.Header().Set("ETag", etag)
	if created {
		w.WriteHeader(http.StatusCreated)
	} else {
		w.WriteHeader(http.StatusNoContent)
	}
}
