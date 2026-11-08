package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

type apiErrorResponse struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func writeAPIError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	var payload apiErrorResponse
	payload.Error.Code = code
	payload.Error.Message = message
	_ = json.NewEncoder(w).Encode(payload)
}

func requireMethod(w http.ResponseWriter, method string, allowed ...string) bool {
	for _, m := range allowed {
		if method == m {
			return true
		}
	}
	w.Header().Set("Allow", strings.Join(allowed, ", "))
	writeAPIError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
	return false
}
