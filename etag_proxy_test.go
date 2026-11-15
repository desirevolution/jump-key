package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Caddy encode changes a strong ETag from "sha256-..." to
// "sha256-...-gzip" / "sha256-...-zstd" on compressed JSON responses.
// The browser returns that tag as If-Match; the backend must still verify
// the raw configuration bytes and reject stale values.
func TestProxiedETagComparison(t *testing.T) {
	canonical := configETag(baseConfig)
	other := configETag([]byte(`{"categories":[],"searchEngines":[],"new":true}`))
	prefix := strings.TrimSuffix(canonical, `"`)
	for _, input := range []string{canonical, prefix + `-gzip"`, prefix + `-zstd"`} {
		if !matchesConfigETag(input, canonical) {
			t.Fatalf("expected matching tag %q", input)
		}
	}
	for _, input := range []string{
		"", other, strings.TrimSuffix(other, `"`) + `-gzip"`,
		`W/` + canonical, `W/` + prefix + `-gzip"`,
		prefix + `-br"`, prefix + `-gzip`,
		prefix + `-gzip", "extra"`, `*`,
	} {
		if matchesConfigETag(input, canonical) {
			t.Fatalf("unexpected matching tag %q", input)
		}
	}
}

func TestCreateWithCaddyEncodedETag(t *testing.T) {
	for _, encoding := range []string{"gzip", "zstd"} {
		t.Run(encoding, func(t *testing.T) {
			s := testServer(t)
			writeFixture(t, s, "services.json", baseConfig)
			get := configRequestTest(s, "GET", "/config/services.json?workspace=default", nil, nil)
			if get.Code != 200 {
				t.Fatalf("GET %d", get.Code)
			}
			fromProxy := strings.TrimSuffix(get.Header().Get("ETag"), `"`) + "-" + encoding + `"`
			// New category and service are ordinary conditional full-doc writes.
			withCategory := []byte(`{"categories":[{"category":"New","services":[]}],"searchEngines":[]}`)
			first := configRequestTest(s, "PUT", "/config/services.json?workspace=default", withCategory, map[string]string{"If-Match": fromProxy})
			if first.Code != 204 {
				t.Fatalf("category create: %d %s", first.Code, first.Body.String())
			}
			withService := []byte(`{"categories":[{"category":"New","services":[{"name":"App","url":"https://example.com"}]}],"searchEngines":[]}`)
			secondTag := strings.TrimSuffix(first.Header().Get("ETag"), `"`) + "-" + encoding + `"`
			second := configRequestTest(s, "PUT", "/config/services.json?workspace=default", withService, map[string]string{"If-Match": secondTag})
			if second.Code != 204 {
				t.Fatalf("service create: %d %s", second.Code, second.Body.String())
			}
			actual, err := os.ReadFile(filepath.Join(s.configDir, "services.json"))
			if err != nil || !bytes.Equal(actual, withService) {
				t.Fatalf("unexpected config: %s, %v", actual, err)
			}
			// A stale version is not made valid by an encoding suffix.
			stale := configRequestTest(s, "PUT", "/config/services.json?workspace=default", withService, map[string]string{"If-Match": fromProxy})
			assertErrorCode(t, stale, 412, "precondition_failed")
		})
	}
}

func TestWorkspaceRenameAndDeleteWithCaddyETag(t *testing.T) {
	s := testServer(t)
	writeFixture(t, s, "services.json", baseConfig)
	writeFixture(t, s, "home.workspace.json", baseConfig)
	proxyTag := strings.TrimSuffix(configETag(baseConfig), `"`) + `-gzip"`
	response := requestManagement(s, "PATCH", "/api/workspaces/home", `{"name":"Personal"}`, proxyTag)
	if response.Code != 204 {
		t.Fatalf("rename: %d %s", response.Code, response.Body.String())
	}
	// The post-rename ETag must be rechecked, not bypassed.
	get := configRequestTest(s, "GET", "/config/services.json?workspace=home", nil, nil)
	newTag := strings.TrimSuffix(get.Header().Get("ETag"), `"`) + `-zstd"`
	deleted := requestManagement(s, "DELETE", "/api/workspaces/home", "", newTag)
	if deleted.Code != 204 {
		t.Fatalf("delete: %d %s", deleted.Code, deleted.Body.String())
	}
}

func TestWorkspaceOrderWithCaddyETag(t *testing.T) {
	s := testServer(t)
	writeFixture(t, s, "services.json", baseConfig)
	writeFixture(t, s, "home.workspace.json", baseConfig)
	etag, _, _ := workspacesResponse(t, s)
	proxyTag := strings.TrimSuffix(etag, `"`) + `-zstd"`
	result := requestManagement(s, "PUT", "/api/workspace-order", `{"order":["home","default"]}`, proxyTag)
	if result.Code != 204 {
		t.Fatalf("order: %d %s", result.Code, result.Body.String())
	}
}
