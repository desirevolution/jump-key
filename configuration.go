package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"
)

// Decode only fields we validate; unknown fields remain in the original saved bytes.
func validateConfiguration(data []byte) error {
	var config struct {
		WorkspaceName json.RawMessage `json:"workspaceName"`
		Categories    []struct {
			Category    string `json:"category"`
			CategoryKey string `json:"categoryKey"`
			Services    []struct {
				ID   *string `json:"id"`
				Name string  `json:"name"`
				URL  string  `json:"url"`
				Key  string  `json:"key"`
				Icon *string `json:"icon"`
			} `json:"services"`
		} `json:"categories"`
		SearchEngines []struct {
			Name   string `json:"name"`
			Prefix string `json:"prefix"`
			URL    string `json:"url"`
		} `json:"searchEngines"`
	}
	if err := json.Unmarshal(data, &config); err != nil {
		return err
	}
	if _, ok := parseWorkspaceName(config.WorkspaceName); !ok {
		return errors.New("invalid workspaceName: expected a string of up to 64 characters without control characters")
	}
	if config.Categories == nil || config.SearchEngines == nil {
		return errors.New("categories and searchEngines must be arrays")
	}
	ids, categoryKeys, prefixes := map[string]bool{}, map[string]bool{}, map[string]bool{}
	checkKey := func(key string, used map[string]bool) bool {
		if key == "" {
			return true
		}
		key = strings.ToLower(key)
		if len(key) != 1 || key[0] < 'a' || key[0] > 'z' || used[key] {
			return false
		}
		used[key] = true
		return true
	}
	for _, category := range config.Categories {
		if strings.TrimSpace(category.Category) == "" || category.Services == nil || !checkKey(category.CategoryKey, categoryKeys) {
			return errors.New("invalid category or duplicate shortcut")
		}
		serviceKeys := map[string]bool{}
		for _, service := range category.Services {
			if strings.TrimSpace(service.Name) == "" || strings.TrimSpace(service.URL) == "" || !checkKey(service.Key, serviceKeys) {
				return errors.New("invalid service or duplicate shortcut")
			}
			if service.ID != nil {
				if strings.TrimSpace(*service.ID) == "" || ids[*service.ID] {
					return fmt.Errorf("invalid or duplicate service ID: %q", *service.ID)
				}
				ids[*service.ID] = true
			}
		}
	}
	for _, engine := range config.SearchEngines {
		prefix := strings.ToLower(engine.Prefix)
		if strings.TrimSpace(engine.Name) == "" || strings.TrimSpace(prefix) == "" || strings.TrimSpace(engine.URL) == "" || prefixes[prefix] {
			return errors.New("invalid search engine or duplicate prefix")
		}
		prefixes[prefix] = true
	}
	return nil
}

// A blank name means the usual filename/translated Default label should be used.
// Use the same rules in the browser's configuration validator.
func parseWorkspaceName(raw json.RawMessage) (string, bool) {
	if len(raw) == 0 {
		return "", true
	}
	var name string
	if string(raw) == "null" || json.Unmarshal(raw, &name) != nil {
		return "", false
	}
	for _, r := range name {
		if r <= 0x1f || r == 0x7f {
			return "", false
		}
	}
	name = strings.TrimSpace(name)
	if utf8.RuneCountInString(name) > 64 {
		return "", false
	}
	return name, true
}
