package main

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestSaveBacksUpPreviousBytesAndRejectsInvalid(t *testing.T) {
	dir := t.TempDir()
	previous := []byte(`{"categories":[],"searchEngines":[],"custom":"preserved"}`)
	next := []byte(`{"categories":[{"category":"Tools","services":[{"id":"svc-1","name":"One","url":"/one"}]}],"searchEngines":[]}`)
	target := filepath.Join(dir, "services.json")
	if err := os.WriteFile(target, previous, 0600); err != nil {
		t.Fatal(err)
	}
	s := &server{configDir: dir, logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
	w := httptest.NewRecorder()
	s.handleConfig(w, httptest.NewRequest(http.MethodPut, "/config/services.json", bytes.NewReader(next)))
	if w.Code != 204 {
		t.Fatalf("save: %d %s", w.Code, w.Body.String())
	}
	backups, _ := filepath.Glob(filepath.Join(dir, "services.backup-*.json"))
	if len(backups) != 1 {
		t.Fatalf("backups: %v", backups)
	}
	got, _ := os.ReadFile(backups[0])
	if !bytes.Equal(got, previous) {
		t.Fatal("backup did not preserve original bytes")
	}
	w = httptest.NewRecorder()
	s.handleConfig(w, httptest.NewRequest(http.MethodPut, "/config/services.json", bytes.NewBufferString(`{"categories":[null],"searchEngines":[]}`)))
	if w.Code != 400 {
		t.Fatalf("invalid config accepted: %d", w.Code)
	}
	got, _ = os.ReadFile(target)
	if !bytes.Equal(got, next) {
		t.Fatal("failed save modified configuration")
	}
}

func TestBackupFailureDoesNotOverwrite(t *testing.T) {
	dir := t.TempDir()
	// A directory at the config path cannot be read as the previous config.
	if err := os.Mkdir(filepath.Join(dir, "services.json"), 0700); err != nil {
		t.Fatal(err)
	}
	s := &server{configDir: dir, logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
	w := httptest.NewRecorder()
	s.handleConfig(w, httptest.NewRequest(http.MethodPut, "/config/services.json", bytes.NewBufferString(`{"categories":[],"searchEngines":[]}`)))
	if w.Code != 500 {
		t.Fatalf("expected backup failure: %d", w.Code)
	}
	info, _ := os.Stat(filepath.Join(dir, "services.json"))
	if !info.IsDir() {
		t.Fatal("target replaced")
	}
}
