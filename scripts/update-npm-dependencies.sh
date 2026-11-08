#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split("." )[0]')" != "26" ]]; then
  echo "Node.js 26 LTS is required to update dependencies." >&2
  exit 1
fi

# These are the confirmed stable versions at the start of phase 1 (2026-11-08).
# Run on a machine with npm registry access; commits must include BOTH manifest and lockfile.
npm install --save '@lucide/icons@^1.70.0' 'iconify-icon@^3.0.5' 'lit@^3.3.3' 'prism-code-editor@^5.4.0'
npm install --save-dev '@tailwindcss/vite@^4.3.5' 'tailwindcss@^4.3.5' 'vite@^8.3.6' 'vite-plugin-pwa@^2.0.0'
npm ci
npm run check
npm audit --audit-level=high

echo "Dependency update and checks succeeded; review package.json and package-lock.json together."
