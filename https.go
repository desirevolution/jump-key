package main

import (
	"flag"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"strings"
)

// An unset value follows the final read-only flag, including CLI overrides.
type optionalBool struct {
	value bool
	set   bool
}

func (b *optionalBool) String() string   { return strconv.FormatBool(b.value) }
func (b *optionalBool) IsBoolFlag() bool { return true }
func (b *optionalBool) Set(raw string) error {
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return err
	}
	b.value, b.set = value, true
	return nil
}
func (o options) httpsRequired() bool {
	if o.requireHTTPS.set {
		return o.requireHTTPS.value
	}
	return o.readOnly
}
func registerHTTPSOptions(flags *flag.FlagSet, opts *options, env func(string) string) error {
	var err error
	if raw := env("JUMPKEY_REQUIRE_HTTPS"); raw != "" {
		if e := opts.requireHTTPS.Set(raw); e != nil {
			err = fmt.Errorf("invalid JUMPKEY_REQUIRE_HTTPS: %w", e)
		}
	}
	flags.Var(&opts.requireHTTPS, "require-https", "Require HTTPS (defaults to read-only mode); use --require-https=false for local HTTP")
	flags.StringVar(&opts.trustedProxies, "trusted-proxies", env("JUMPKEY_TRUSTED_PROXIES"), "Comma-separated trusted proxy IPs or CIDRs; empty trusts no forwarded headers")
	return err
}
func parseTrustedProxies(raw string) ([]netip.Prefix, error) {
	var result []netip.Prefix
	if strings.TrimSpace(raw) == "" {
		return result, nil
	}
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if addr, err := netip.ParseAddr(part); err == nil && addr.Zone() == "" {
			addr = addr.Unmap()
			result = append(result, netip.PrefixFrom(addr, addr.BitLen()))
			continue
		}
		prefix, err := netip.ParsePrefix(part)
		if err != nil {
			return nil, fmt.Errorf("invalid trusted proxy IP/CIDR: %q", part)
		}
		if prefix.Addr().Is4In6() {
			if prefix.Bits() < 96 {
				return nil, fmt.Errorf("invalid mapped IPv4 proxy range: %q", part)
			}
			prefix = netip.PrefixFrom(prefix.Addr().Unmap(), prefix.Bits()-96)
		}
		result = append(result, prefix.Masked())
	}
	return result, nil
}
func requestIsHTTPS(r *http.Request, trusted []netip.Prefix) bool {
	if r.TLS != nil {
		return true
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return false
	}
	peer, err := netip.ParseAddr(host)
	if err != nil {
		return false
	}
	peer = peer.Unmap()
	allowed := false
	for _, prefix := range trusted {
		if prefix.Contains(peer) {
			allowed = true
			break
		}
	}
	if !allowed {
		return false
	}
	// Trust only the immediate peer's single value. Never infer trust from XFF,
	// Forwarded, Host, the URL scheme, or a comma-separated proxy chain.
	values := r.Header.Values("X-Forwarded-Proto")
	return len(values) == 1 && values[0] == "https"
}
func enforceHTTPS(next http.Handler, required bool, trusted []netip.Prefix) http.Handler {
	if !required {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		health := r.URL.Path == "/healthz" && (r.Method == http.MethodGet || r.Method == http.MethodHead)
		if !health && !requestIsHTTPS(r, trusted) {
			w.Header().Set("Cache-Control", "no-store")
			http.Error(w, "HTTPS required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
