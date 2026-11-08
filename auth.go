package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/netip"
	"os"
	"regexp"
	"strconv"
	"strings"
)

var validUserPattern = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)

type userContextKey struct{}

func requestUser(r *http.Request) string {
	user, _ := r.Context().Value(userContextKey{}).(string)
	return user
}

func trustedPeer(remote string, allowed []netip.Prefix) bool {
	host, _, err := net.SplitHostPort(remote)
	if err != nil {
		return false
	}
	ip, err := netip.ParseAddr(host)
	if err != nil {
		return false
	}
	for _, prefix := range allowed {
		if prefix.Contains(ip.Unmap()) {
			return true
		}
	}
	return false
}

// Identity is never taken from X-Forwarded-For or a client-supplied header in local mode.
// The proxy must strip incoming Remote-User and set exactly one trusted value.
func (s *server) authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.readOnly {
			r.Header.Del("Remote-User")
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey{}, "")))
			return
		}
		if s.authMode != "proxy" {
			r.Header.Del("Remote-User")
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey{}, "")))
			return
		}
		if r.URL.Path == "/healthz" && (r.Method == http.MethodGet || r.Method == http.MethodHead) {
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey{}, "")))
			return
		}
		if !trustedPeer(r.RemoteAddr, s.trustedProxies) {
			writeAPIError(w, http.StatusForbidden, "untrusted_proxy", "Request did not come from a trusted proxy")
			return
		}
		values := r.Header.Values("Remote-User")
		if len(values) != 1 || !validUserPattern.MatchString(values[0]) || strings.TrimSpace(values[0]) != values[0] {
			writeAPIError(w, http.StatusUnauthorized, "identity_required", "Valid authenticated user is required")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey{}, values[0])))
	})
}

func getenvDefault(key, fallback string) string {
	if value, ok := lookupEnv(key); ok {
		return value
	}
	return fallback
}

// Indirection also allows option-parsing tests to avoid mutating global environment.
var lookupEnv = func(key string) (string, bool) { return os.LookupEnv(key) }

func parseBackupKeep(raw string) (int, error) {
	if raw == "" {
		return 20, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 || value > 1000 {
		return 0, errors.New("JUMPKEY_BACKUP_KEEP must be between 1 and 1000")
	}
	return value, nil
}

// A browser may carry state from a previous authenticated session. Reject
// write requests instead of applying that state to the currently logged-in user.
func checkExpectedUser(w http.ResponseWriter, r *http.Request) bool {
	if values, ok := r.Header["X-Jumpkey-User"]; ok && (len(values) != 1 || values[0] != requestUser(r)) {
		writeAPIError(w, 409, "user_changed", "User changed; reload required")
		return false
	}
	return true
}
