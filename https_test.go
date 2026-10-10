package main

import (
	"crypto/tls"
	"flag"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPSRecognition(t *testing.T) {
	trusted, err := parseTrustedProxies("192.0.2.10,198.51.100.0/24,2001:db8::/64")
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name, peer, path string
		proto            []string
		tls, allowed     bool
	}{
		{"plain HTTP", "192.0.2.10:123", "/", nil, false, false},
		{"trusted HTTPS", "192.0.2.10:123", "/", []string{"https"}, false, true},
		{"trusted HTTP", "192.0.2.10:123", "/", []string{"http"}, false, false},
		{"spoofed header", "203.0.113.10:123", "/", []string{"https"}, false, false},
		{"trusted subnet", "198.51.100.42:123", "/", []string{"https"}, false, true},
		{"outside subnet", "198.51.101.42:123", "/", []string{"https"}, false, false},
		{"IPv6", "[2001:db8::1]:123", "/", []string{"https"}, false, true},
		{"mapped IPv4", "[::ffff:192.0.2.10]:123", "/", []string{"https"}, false, true},
		{"multiple values", "192.0.2.10:123", "/", []string{"https", "http"}, false, false},
		{"joined values", "192.0.2.10:123", "/", []string{"https, http"}, false, false},
		{"direct TLS", "203.0.113.10:123", "/", nil, true, true},
		{"health", "203.0.113.10:123", "/healthz", nil, false, true},
		{"health path suffix", "203.0.113.10:123", "/healthz/", nil, false, false},
		{"config denied", "203.0.113.10:123", "/config/services.json", nil, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("GET", tc.path, nil)
			r.RemoteAddr = tc.peer
			if tc.proto != nil {
				r.Header["X-Forwarded-Proto"] = tc.proto
			}
			r.Header.Set("X-Forwarded-For", "192.0.2.10")
			r.Header.Set("Forwarded", "proto=https;for=192.0.2.10")
			if tc.tls {
				r.TLS = &tls.ConnectionState{}
			}
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })
			w := httptest.NewRecorder()
			enforceHTTPS(next, true, trusted).ServeHTTP(w, r)
			expected := 403
			if tc.allowed {
				expected = 204
			}
			if w.Code != expected {
				t.Fatalf("got %d", w.Code)
			}
		})
	}
	// No configured proxy trusts no headers; disabled enforcement keeps legacy HTTP.
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "192.0.2.10:123"
	r.Header.Set("X-Forwarded-Proto", "https")
	if requestIsHTTPS(r, nil) {
		t.Fatal("trusted a header without an allowlist")
	}
	w := httptest.NewRecorder()
	enforceHTTPS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) }), false, nil).ServeHTTP(w, r)
	if w.Code != 204 {
		t.Fatal(w.Code)
	}
}
func TestHTTPSOptions(t *testing.T) {
	for _, tc := range []struct {
		readonly bool
		env      string
		args     []string
		want     bool
	}{
		{false, "", nil, false}, {true, "", nil, true}, {true, "false", nil, false},
		{false, "true", nil, true}, {true, "true", []string{"--require-https=false"}, false},
		{false, "false", []string{"--require-https"}, true},
	} {
		opts := options{readOnly: tc.readonly}
		f := flag.NewFlagSet("test", flag.ContinueOnError)
		if err := registerHTTPSOptions(f, &opts, func(k string) string {
			if k == "JUMPKEY_REQUIRE_HTTPS" {
				return tc.env
			}
			return ""
		}); err != nil {
			t.Fatal(err)
		}
		if err := f.Parse(tc.args); err != nil {
			t.Fatal(err)
		}
		if opts.httpsRequired() != tc.want {
			t.Fatalf("unexpected mode: %+v", tc)
		}
	}
	for _, raw := range []string{"proxy.example.com", "192.0.2.1:8080", "192.0.2.0/99", "192.0.2.1,", "*"} {
		if _, err := parseTrustedProxies(raw); err == nil {
			t.Fatalf("accepted %q", raw)
		}
	}
	if registerHTTPSOptions(flag.NewFlagSet("bad", flag.ContinueOnError), &options{}, func(k string) string {
		if k == "JUMPKEY_REQUIRE_HTTPS" {
			return "typo"
		}
		return ""
	}) == nil {
		t.Fatal("bad env accepted")
	}
}
