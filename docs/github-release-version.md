# Build/version source: GitHub release tags

JumpKey embeds its visible frontend version during `npm run build`. It does **not** call GitHub at runtime, and service-worker update detection remains independent of the version label.

Priority:

1. `JUMPKEY_RELEASE_TAG` if nonempty: strip an initial `v` before a digit (`v1.2.0` → `1.2.0`, `v1.3.0-rc.1` → `1.3.0-rc.1`).
2. `GITHUB_SHA` if nonempty: `dev-` plus the first eight characters (`abcdef1234` → `dev-abcdef12`).
3. The `version` in `package.json` if neither is available (`1.0.0` until manually changed).

The displayed version appears in **Settings → Info** and, in compact form, in the desktop header. A development build shows `dev-abcdef12` rather than `vdev-abcdef12`.

## GitHub Actions

- A **published GitHub Release** checks out the release **tag** rather than the possibly newer default-branch HEAD. It passes `JUMPKEY_RELEASE_TAG` to both native Docker build stages (`linux/amd64`, `linux/arm64`) and the `release-binaries` frontend build. Both architectures and the downloadable release archives therefore embed the same tag-derived version.
- A **push to `main`** supplies `GITHUB_SHA` to Docker and shows `dev-<short-sha>`; the GitHub Pages demo and quality checks already receive the runner's `GITHUB_SHA` environment variable.
- The Dockerfile accepts `ARG JUMPKEY_RELEASE_TAG` and `ARG GITHUB_SHA` immediately before `npm run build`, preserving the `npm ci` layer cache across version changes.
- No runtime API, backend JSON model, or additional GitHub token permission is required.

## Manual builds

```bash
# Release-like local frontend build:
JUMPKEY_RELEASE_TAG=v1.2.0 npm run build

# Local dev build tied to a specific commit:
GITHUB_SHA=$(git rev-parse HEAD) npm run build

# Docker release-like build:
docker build --build-arg JUMPKEY_RELEASE_TAG=v1.2.0 -t jumpkey:test .
```

## Acceptance checks

1. Publish `v1.2.0` and verify Settings → Info shows **1.2.0** in both GHCR architectures and all release archives.
2. Push to `main` and verify the built Docker image reports **dev-XXXXXXXX**, with the actual short commit hash.
3. Run a local build without GitHub environment variables and confirm the `package.json` version is used.
4. Verify a fresh release still prompts for PWA update when a new bundle is available, even if the visible version is unchanged.
5. Verify the release pipeline actually builds code from the published tag when it is behind the current main branch.
