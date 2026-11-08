package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// The ETag represents the exact bytes on disk (not JSON reserialization).
func configETag(data []byte) string {
	sum := sha256.Sum256(data)
	return `"sha256-` + hex.EncodeToString(sum[:]) + `"`
}

// A per-file writer lock protects compare-and-swap, backup and rename as one operation.
// Readers need no lock because writes replace a fully synced temporary file atomically.
type configLock struct {
	mu    sync.Mutex
	users int
}

func (s *server) lockConfig(name string) func() {
	s.configLockMu.Lock()
	if s.configLocks == nil {
		s.configLocks = make(map[string]*configLock)
	}
	entry := s.configLocks[name]
	if entry == nil {
		entry = &configLock{}
		s.configLocks[name] = entry
	}
	entry.users++
	s.configLockMu.Unlock()
	entry.mu.Lock()
	return func() {
		entry.mu.Unlock()
		s.configLockMu.Lock()
		entry.users--
		if entry.users == 0 {
			delete(s.configLocks, name)
		}
		s.configLockMu.Unlock()
	}
}

func (s *server) readConfig(name string) ([]byte, error) {
	file, err := openPublicFile(s.configDir, name)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxConfigSize+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxConfigSize {
		return nil, fmt.Errorf("configuration exceeds 2 MiB")
	}
	return data, nil
}

// saveConfig must run under the filename writer lock. It does not do auth or validate JSON.
func (s *server) saveConfig(name string, next []byte, ifMatch, ifNoneMatch string) (string, bool, int, string, error) {
	previous, err := s.readConfig(name)
	created := errors.Is(err, fs.ErrNotExist)
	if err != nil && !created {
		return "", false, 500, "read_failed", err
	}
	if created {
		if ifNoneMatch != "*" || ifMatch != "" {
			return "", false, 412, "precondition_failed", errors.New("new configuration requires If-None-Match: *")
		}
	} else if ifMatch != configETag(previous) || ifNoneMatch != "" {
		return "", false, 412, "precondition_failed", errors.New("configuration changed; reload or reconcile edits")
	}
	target := filepath.Join(s.configDir, name)
	mode := fs.FileMode(0o644)
	if !created {
		info, err := os.Lstat(target)
		if err != nil {
			return "", false, 500, "read_failed", err
		}
		if !info.Mode().IsRegular() {
			return "", false, 500, "read_failed", errors.New("configuration is not a regular file")
		}
		mode = info.Mode().Perm()
	}
	if !created {
		// Save the exact existing bytes before a successful replacement.
		backup := strings.TrimSuffix(target, ".json") + ".backup-" + time.Now().UTC().Format("2006-01-02T15-04-05.000000000") + ".json"
		if err := atomicWrite(backup, previous, 0o600); err != nil {
			return "", false, 500, "backup_failed", err
		}
	}
	if created {
		// Creating a workspace must never overwrite an existing path, including a racing symlink.
		if err := createConfigExclusive(target, next); err != nil {
			return "", false, 500, "write_failed", err
		}
	} else if err := atomicWrite(target, next, mode); err != nil {
		return "", false, 500, "write_failed", err
	}
	if !created {
		if err := s.rotateBackups(target); err != nil {
			if s.logger != nil {
				s.logger.Warn("backup rotation failed", "file", name, "error", err)
			}
		}
	}
	return configETag(next), created, 0, "", nil
}

// An exclusive create avoids a read-check-create TOCTOU race against other writers.
func createConfigExclusive(filename string, data []byte) error {
	directory := filepath.Dir(filename)
	temp, err := os.CreateTemp(directory, ".jump-key-create-*.tmp")
	if err != nil {
		return err
	}
	tempName := temp.Name()
	defer os.Remove(tempName)
	if err := temp.Chmod(0o644); err != nil {
		temp.Close()
		return err
	}
	if _, err := temp.Write(data); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Sync(); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	// Atomic exclusive publication: readers never observe an incomplete workspace.
	// Hard links are created only within the same config directory/filesystem.
	return os.Link(tempName, filename)
}

func (s *server) rotateBackups(target string) error {
	keep := s.backupKeep
	if keep <= 0 {
		keep = 20
	}
	dir := filepath.Dir(target)
	prefix := strings.TrimSuffix(filepath.Base(target), ".json") + ".backup-"
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	backups := make([]string, 0)
	for _, entry := range entries {
		name := entry.Name()
		if !entry.Type().IsRegular() || !strings.HasPrefix(name, prefix) || !strings.HasSuffix(name, ".json") {
			continue
		}
		stamp := strings.TrimSuffix(strings.TrimPrefix(name, prefix), ".json")
		if _, err := time.Parse("2006-01-02T15-04-05.000000000", stamp); err != nil {
			continue
		}
		backups = append(backups, name)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(backups)))
	if len(backups) <= keep {
		return nil
	}
	for _, name := range backups[keep:] {
		if err := os.Remove(filepath.Join(dir, name)); err != nil {
			return err
		}
	}
	return nil
}

func atomicWrite(filename string, data []byte, mode fs.FileMode) error {
	directory := filepath.Dir(filename)
	tempFile, err := os.CreateTemp(directory, ".jump-key-*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary file: %w", err)
	}
	tempName := tempFile.Name()
	success := false
	defer func() {
		_ = tempFile.Close()
		if !success {
			_ = os.Remove(tempName)
		}
	}()
	if err := tempFile.Chmod(mode); err != nil {
		return err
	}
	if _, err := tempFile.Write(data); err != nil {
		return err
	}
	if err := tempFile.Sync(); err != nil {
		return err
	}
	if err := tempFile.Close(); err != nil {
		return err
	}
	if err := os.Rename(tempName, filename); err != nil {
		return err
	}
	success = true
	return nil
}

func (s *server) copyDefaultConfig() error {
	if s.readOnly {
		return errors.New("read-only")
	}
	target := filepath.Join(s.configDir, "services.json")
	if _, err := os.Lstat(target); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	data, err := fs.ReadFile(s.distFS, "config/services.json")
	if err != nil {
		return err
	}
	if !json.Valid(data) {
		return errors.New("invalid embedded configuration")
	}
	return createConfigExclusive(target, data)
}

// Sync the directory entry so the mandatory deletion backup is durable before unlink.
func syncConfigDirectory(directory string) error {
	file, err := os.Open(directory)
	if err != nil {
		return err
	}
	defer file.Close()
	return file.Sync()
}
