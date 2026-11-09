<p align="center">
  <img src="./public/jump-key.png" alt="JumpKey logo" width="80" height="80" />
</p>

<h1 align="center">JumpKey</h1>

JumpKey is a keyboard-first dashboard for your self-hosted apps and bookmarks.

<p align="center">
  <img src="screenshots/screenshot_1.png?v=3" alt="Grid dashboard">
</p>

[Try the demo](https://desirevolution.github.io/jump-key/)

https://github.com/user-attachments/assets/b2c4290e-f371-44eb-b47c-44d5a73de379

## Features

- **Keyboard-first launcher:** two overview modes, category/service shortcuts, ten favorite slots, recently opened services and searchable service/category lists.
- **Workspaces:** independent JSON configurations, display names, user-specific ordering, duplication, rename (including technical IDs) and deletion with a permanent backup. Manage workspaces, categories and services in a responsive three/two/one-column view.
- **Service management:** one editor for dashboard and management; edit name, URL, icon, category, position and shortcuts (automatic, manual or disabled). Drag handles reorder items with mouse, touch or keyboard. Reordering is staged until explicitly saved; dragging between columns is not supported.
- **Customization:** seven dark and three light themes, core UI translations for English/German/French/Spanish, Lucide/Iconify icons and local/remote images.
- **Configuration safety:** JSON editor, validation, import/export, per-file backups and ETag-protected writes to detect conflicting changes.
- **Installable PWA:** user-approved update prompts, release version in **Settings → Info**, and locally cached accessible workspaces for read-only offline use.
- **Small deployment:** Lit frontend embedded in a Go executable; Docker image for linux/amd64 and linux/arm64. No database required on the server.

## Screenshots

<p align="center">
  <a href="screenshots/screenshot_1.png">
    <img src="screenshots/screenshot_1.png?v=2" width="300">
  </a>
  <a href="screenshots/screenshot_3.png">
    <img src="screenshots/screenshot_3.png?v=2" width="300">
  </a>
  <a href="screenshots/screenshot_4.png">
    <img src="screenshots/screenshot_4.png?v=2" width="300">
  </a>
  <a href="screenshots/screenshot_5.png">
    <img src="screenshots/screenshot_5.png?v=2" width="300">
  </a>
  <a href="screenshots/screenshot_6.png">
    <img src="screenshots/screenshot_6.png?v=2" width="300">
  </a>
</p>

## Quick start

> [!WARNING]
> **Upgrading an older Caddy/Authelia or other reverse-proxy installation? Check authentication before exposing JumpKey.** The default `JUMPKEY_AUTH_MODE=local` **ignores** `Remote-User` and serves a shared workspace, even when a proxy is authenticating visitors. If you require separate per-user files, explicitly configure `JUMPKEY_AUTH_MODE=proxy`, set `JUMPKEY_TRUSTED_PROXIES` to the **immediate trusted proxy address**, and have that proxy **replace** client-supplied `Remote-User` and `X-Forwarded-Proto` with validated values. HTTPS enforcement is enabled automatically in proxy mode. Incorrect settings can cause **401/403 responses**. Keep the backend port inaccessible to untrusted clients. See [Proxy-authentication migration](#proxy-authentication-and-migration) below.

Before upgrading, back up your entire `config/` directory and deploy updated frontend and backend together: configuration saves now require `If-Match` (an ETag), so an older open browser tab may need reloading.

### Docker Compose

Place [compose.yml](compose.yml) in your installation directory. Create `config` and `icons` alongside it, then copy your configuration to `config/services.json`. You can start with the small [example configuration](public/config/services.json).

```bash
mkdir -p config icons
docker compose up -d
```

The supplied Compose file uses these mappings:

| Host | Container | Purpose |
| --- | --- | --- |
| `./config` | `/app/config` | Configuration files and automatic backups; must be writable. |
| `./icons` | `/app/icons` | Custom icon images; the directory is required even when empty. |
| Port `8080` | Port `8080` | HTTP interface. |

Open `http://localhost:8080`, or use the server's address from another device. The image listens on `0.0.0.0:8080` and is built for Linux amd64 and arm64. It does not create a default configuration unless `--copy-default-config` is supplied.

**Proxy deployment:** The example's `8080:8080` publishes the backend on all host interfaces. If Caddy runs on the same host, bind the port to `127.0.0.1:8080:8080`; if Caddy is in the same isolated Docker network, remove the published port and proxy to the container's port `8080` instead. Do **not** expose the writable backend directly to untrusted clients.

To generate a default configuration through Compose, add the following under the `jump-key` service. A Compose `command` replaces the image's default arguments, so include all required options:

```yaml
command:
  - --host=0.0.0.0
  - --port=8080
  - --config-dir=/app/config
  - --icons-dir=/app/icons
  - --copy-default-config
```

### Standalone executable

Download and extract the release for your platform. Release archives are built for Linux amd64, arm64 and ARMv6, macOS arm64, and Windows amd64.

Create both directories before starting the server:

```bash
mkdir -p config icons
./jump-key --config-dir ./config --icons-dir ./icons --copy-default-config
```

Open `http://localhost:8080`. On Windows, run `jump-key.exe` with the same options. Add `--host 0.0.0.0` to listen on all IPv4 interfaces instead of localhost.

`--copy-default-config` copies the embedded example only when `services.json` does not exist. It never overwrites an existing file and does not create the directories.

### Server options

| Option | Default | Description |
| --- | --- | --- |
| `--host` | `127.0.0.1` | Listen address: an IP address or `localhost`. Docker overrides this to `0.0.0.0`. |
| `--port` | `8080` | HTTP port, from 1 to 65535. |
| `--config-dir` | None; required | Existing configuration directory. Must be writable unless read-only mode is enabled. |
| `--icons-dir` | None; required | Existing directory containing custom icons. Can be empty. |
| `--copy-default-config` | `false` | Copy the embedded example to `services.json` if missing. |
| `--read-only` | `false` | Disable writes and publish only the workspace allowlist. Environment: `JUMPKEY_READ_ONLY`. |
| `--public-workspaces` | Empty | Comma-separated workspace IDs, required in read-only mode. Environment: `JUMPKEY_PUBLIC_WORKSPACES`. |
| `--config-user` | Empty | Optional fixed user for read-only file selection. Environment: `JUMPKEY_CONFIG_USER`. |
| `--require-https` | `true` in read-only **or proxy-auth** mode; otherwise `false` | Reject insecure requests. Environment: `JUMPKEY_REQUIRE_HTTPS`. |
| `--trusted-proxies` | Empty | Trusted immediate proxy IPs/CIDRs. Environment: `JUMPKEY_TRUSTED_PROXIES`. |
| `--auth-mode` | `local` | `local` ignores identity headers; `proxy` requires a trusted immediate peer and valid `Remote-User`. Environment: `JUMPKEY_AUTH_MODE`. |
| `--backup-keep` | `20` | Number of previous configuration backups retained after saves (1–1000). Environment: `JUMPKEY_BACKUP_KEEP`. |
| `--help` | — | Show command-line usage. |

### Notes when upgrading from earlier phases

- **Phase 1:** CI checks, declared Node 26 / Go 1.27 toolchains, dependency maintenance and multi-architecture publishing.
- **Phase 2:** explicit proxy authentication, trusted-proxy HTTPS enforcement, ETag/`If-Match` writes, structured errors, backups and modular Go backend. Old custom API clients must send the returned ETag on writes (`428` missing, `412` stale).
- **Phase 3:** centralized responsive management, staged drag-and-drop ordering, workspace creation/duplication/renaming/deletion and a unified editor. Workspace ordering is stored in per-user server metadata rather than browser settings.
- **Phase 4:** PWA update prompts, a version/update section under **Settings → Info**, and browser-local offline copies of accessible workspaces. Editing remains online-only.

Existing JSON configurations require no database migration. Preserve service IDs when changing entries, and verify filesystem permissions and backup access after updating.

The server exposes `GET /healthz` for health checks. Configuration uploads are limited to 2 MiB. The read-only and HTTPS options also accept the environment variables listed above. Explicit command-line flags override their environment values. Invalid boolean environment values cause a startup error.

## Public read-only installation

Use a separate read-only instance to publish selected workspaces. The entire instance is read-only; there is no separate `/read-only/` route. A private instance or a local editor can maintain the files.

```bash
./jump-key --config-dir ./config --icons-dir ./icons \
  --read-only --public-workspaces default,home --config-user arthur \
  --trusted-proxies 127.0.0.1,::1
```

This publishes only `services.arthur.json` and `home.workspace.arthur.json`. Omit `--config-user` to use `services.json` and `home.workspace.json`. Request headers cannot change this selection: `Remote-User` is ignored. The allowlist applies to both workspace discovery and direct configuration requests; adding another file does not publish it.

Read-only startup requires a non-empty allowlist and readable, regular configuration files for every listed workspace. Invalid IDs, duplicates, missing files and config symlinks cause a startup error. `--config-user` and `--public-workspaces` require `--read-only`; `--copy-default-config` is incompatible with it. No write check, automatic config save or backup creation runs in this mode. IDs missing from old files are generated in memory.

On a first visit, Default opens if allowed; otherwise the first listed workspace opens. A remembered workspace is reused if it is still allowed. An explicit link to a blocked workspace fails instead of showing a different one.

The UI hides adding, editing, moving, deleting, the JSON editor, import/export and the bookmarklet. Write shortcuts and incoming shared links cannot open the editor. Favorites, recent history, themes, view modes and timing preferences remain browser-local. The PWA manifest omits link sharing. Help reflects the available actions.

For Docker, use [compose.read-only.yml](compose.read-only.yml):

```bash
docker compose -f compose.read-only.yml up -d
```

Set the workspace list and optional user in that file. Config and icons are mounted read-only, and the container runs without root privileges or Linux capabilities. Directories and published files must be readable by UID 65532. The example binds to localhost for a reverse proxy on the same host; adjust networking for a containerized or remote proxy. Use an image built from this version or newer.

### HTTPS enforcement

HTTPS is required by default in read-only **and proxy-authenticated** modes. Writable local-mode installations keep their existing HTTP behavior unless `--require-https` is enabled. Explicit flags override environment values. For local testing, use `--require-https=false` or `JUMPKEY_REQUIRE_HTTPS=false`.

JumpKey currently listens on HTTP; terminate TLS at a reverse proxy. Set `--trusted-proxies` / `JUMPKEY_TRUSTED_PROXIES` to the proxy’s immediate source IP as seen by JumpKey, or a dedicated trusted CIDR. For a proxy connecting directly over host loopback, `127.0.0.1,::1` is appropriate. Docker port publishing may instead present a bridge gateway address. Do not copy the loopback example without checking your network setup. Configure the Compose example through `.env`, for example `JUMPKEY_TRUSTED_PROXIES=192.0.2.10` with the actual proxy address replacing this documentation address.

The proxy must overwrite `X-Forwarded-Proto` with the original connection protocol. JumpKey accepts exactly one value, `https`, from a listed peer. It ignores `X-Forwarded-For`, `Forwarded`, the Host header and the requested URL’s scheme for this decision. Never trust `0.0.0.0/0`, `::/0` or a network containing untrusted clients: any trusted peer can assert HTTPS. Direct TLS connections would also be recognized, but this server does not currently offer certificate/TLS listener options.

With HTTPS enforcement enabled, unverified requests receive **403**; JumpKey does not redirect. Configure HTTP-to-HTTPS redirects at the proxy. An empty proxy list trusts no forwarded headers, so HTTP access is denied even if the browser reached a proxy over HTTPS. Only GET/HEAD requests to `/healthz` remain accessible over HTTP for internal health checks. The check runs on every server request; it does not erase previously cached offline dashboards.

Put the public instance behind an HTTPS reverse proxy such as Caddy. Keep the private writable instance on a separate, authenticated origin and prevent direct public access to its port. Request-rate and connection limits belong at the proxy or hosting layer. JumpKey has no built-in authentication or DDoS protection.

The public server rejects methods other than GET/HEAD, blocks config backup URLs, restricts icon files to supported image types and confines file reads to their configured directories. Icon directory listings and symlink escapes are blocked. Served SVG icons are sandboxed. Security headers restrict scripts and framing; service and search links accept only HTTP(S), including relative web links. Dynamic icons use Iconify’s public API hosts; remote images must use HTTPS. All supported images in the mounted icons directory are public, so mount only icons intended for this instance.

**Published configuration is public data.** Visitors can download the JSON even without an export button, including custom fields. Do not include secrets or private URLs. Browsers can retain offline copies; removing a workspace from the allowlist prevents new server access but cannot revoke data already downloaded. Prefer a dedicated hostname instead of converting a previously private origin into a public one.

## Dashboard, favorites and service actions

The dashboard is for launching services, using keyboard shortcuts and switching workspaces. The workspace picker provides a subdued **Manage workspaces** link to open **Settings → Management**.

Open the **⋮** action button on a service tile to **add/remove a favorite** or **edit the service**. Deleting a service and copying its URL are **not** options in this dashboard menu. Service actions appear beside the tile on desktop and in a bottom sheet on mobile. The action button is keyboard-accessible.

Favorites retain their number (`1`–`0`) beside a slightly enlarged, filled star in the **current theme accent color**. Favorite tiles no longer have a gold aura or special gold background. Holding a service tile can also initiate favorite assignment; a quick tap still opens the service.

The **service editor** opens inside the same full-page settings shell used for workspace and category editing, with the desktop settings navigation visible. The form supports name, URL, category, icon, and shortcut mode (**Automatic / Manual / No shortcut**); a category can be created when adding or moving a service. The editor offers **Position → First / After [service] / Last** below the category selector. Existing services keep their position by default; switching categories defaults to **Last**. You can also reorder within a category using drag handles under **Management**. Service IDs remain stable when editing or moving, so local favorite/history references can survive.

The icon field accepts a Lucide/Iconify name, local icon filename or supported image URL, with a compact preview; there is no built-in icon search grid. For existing services, **Delete** sits in the editor footer, is confirmed separately, and removes the service from local favorite/history references after a successful save. An optional checkbox can remove a category left empty by that operation. Unsaved edits are preserved if a save fails; leaving a dirty form asks whether to save, discard or keep editing.

The responsive dashboard shows fewer details on small screens. Pressing **Back to overview** leaves a category or recently opened services view.

## Adding links

Use the dashboard **+** control (or the mobile **Add link** action). Enter or paste a URL, select an existing category or create a new one, choose a shortcut mode, and save (`Ctrl/Cmd + Enter`). The service name defaults to the hostname; an icon is optional. New services are appended to the category. The editor checks for duplicate URLs within the selected category and conflicting shortcuts; the raw JSON editor remains available for advanced editing.

On desktop, drag **Add to JumpKey** from **Settings → General** to your bookmarks bar. Clicking the bookmarklet on another page opens JumpKey with its URL and title prefilled. On supported Android browsers, the installed JumpKey PWA can also receive links through **Share → JumpKey**; availability depends on the browser/OS.

The install prompt can be dismissed on that browser profile. Installation and service-worker updates need HTTPS or localhost.

## Configuration

The server reads configuration files from `--config-dir`. The browser requests `/config/services.json`, with a `workspace` query parameter when selecting a workspace. In explicitly enabled proxy-authentication mode, the verified `Remote-User` identity selects user-specific files; see [Authentication](#proxy-authentication-and-migration).

Open settings with `Ctrl + ,`. The JSON editor and import function use the same configuration structure. Importing a file loads it into the editor; save to apply it. The editor shows the current workspace’s filename. Editing, import and export apply to that workspace. Export downloads its configuration, without browser-local favorites or preferences.

### Workspaces

Each workspace is a separate JSON configuration file in `--config-dir`. Use **Settings → Management** to create, duplicate, rename, reorder or delete workspaces. The workspace switcher on the dashboard is for switching workspaces; **Manage workspaces** opens the management view.

| Workspace | Local mode | Authenticated proxy user `arthur` |
| --- | --- | --- |
| Default | `services.json` | `services.arthur.json` |
| Work | `work.workspace.json` | `work.workspace.arthur.json` |

Workspace IDs use lowercase ASCII letters, digits and single hyphens between words. `default` is reserved. By default, names come from filenames; the Default label is translated by the app. Each configuration may override its **display name** with an optional top-level `workspaceName` string, for example:

```json
{
  "workspaceName": "My Services",
  "categories": [],
  "searchEngines": []
}
```

The custom name appears in the header, workspace menu and keyboard-switch feedback. It also works in read-only mode. Omit `workspaceName` or use `""` to keep the usual label (`Standard` in German for the default workspace). Names are trimmed, limited to 64 characters and cannot contain control characters. **Only the label changes:** the workspace ID, filename (`services.json`, etc.), URLs, favorites and browser settings stay the same. The name is stored in that workspace's JSON file, so it is shared across browsers. New or unlisted workspaces use a stable default ordering until an explicit order is saved. The user-specific workspace order is stored in `.jumpkey-workspaces.json` (local mode) or `.jumpkey-workspaces.<user>.json` (proxy mode), not in the workspace JSON. Backups are excluded from the list.

With multiple workspaces, the header shows a selector. On mobile it is visible only at the top of the page. Click or tap a name to switch immediately, or use `Backspace` to cycle with a short delay. Press it again to advance, `Enter` to switch immediately, or `Esc` to cancel. The shortcut also works in the workspace menu, but not in other dialogs or input fields.

JumpKey remembers the last workspace. A link such as `?workspace=work` opens one directly. Change technical workspace IDs through **Workspace editor → Advanced** rather than manually renaming files; the backend records an old→new mapping for migration of browser-local references on the next authenticated sync. Changing only `workspaceName` never changes the ID. Deleting a workspace requires confirmation and successfully writing a **permanent deletion backup** before the file is removed. The last remaining workspace cannot be deleted. To use a workspace configuration independently on another installation, copy the file as `services.json`; its contents need no changes. Frontend-only deployments without the workspace endpoint keep single-config behavior.

### Browser preferences

**Settings → General** saves changes immediately in this browser.

| Setting | Default | Range |
| --- | --- | --- |
| Category timeout | 2 seconds | 0–30 seconds, in whole seconds |
| Keyboard launch delay | 0.7 seconds | 0–5 seconds, in steps of 0.1 |

Set either value to zero or turn it off to disable the timer. Existing saved values are kept when upgrading. The category timeout returns to the overview after keyboard selection, including the Continue view opened with `_`. Its countdown does not pause on hover or focus. Categories opened by clicking stay open. The launch delay applies to keyboard service launches and workspace cycling; clicking launches or switches immediately.

**Separate workspace preferences** is off by default. All workspaces then share Default’s theme, view mode and timing settings. Enable it to keep these settings separately: a workspace without saved preferences copies Default once, then changes independently. Turning the switch off preserves individual preferences for later use. Configuration files, favorites and Continue history remain separate either way.

The **Add to JumpKey** bookmarklet is in General; see [Adding links](#adding-links).

At the bottom of General, **Reset local data** clears JumpKey’s favorites, history, preferences, workspace selection, installation-banner dismissal and offline configurations for all workspaces and users on this browser origin. It is available in writable and read-only mode. Confirmation also warns about any unsaved JSON editor changes. Before deleting data, JumpKey requests the workspace list and initial configuration from the server; if that fails, nothing is deleted. The page then reloads with default settings and server data. Server files and backups are untouched. The PWA stays installed; application assets and image/font caches remain available. Storage belonging to other applications is not cleared. JumpKey installations sharing an origin also share the reset scope.

### Configuration fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `workspaceName` | String | No | Optional workspace display name (up to 64 characters). Empty/omitted uses the default label. |
| `categories` | Array | Yes | Category objects. May be empty. |
| `categories[].category` | String | Yes | Non-empty category name. |
| `categories[].categoryKey` | String | No | One letter `a`–`z`, unique across categories, ignoring case. Omit or leave empty for automatic assignment when not disabled. |
| `categories[].shortcutDisabled` | Boolean | No | `true` disables the category shortcut, even after reload. |
| `categories[].icon` | String | No | Category icon; see [Icons](#icons). |
| `categories[].services` | Array | Yes | Service objects. May be empty. |
| `categories[].services[].name` | String | Yes | Non-empty display name. |
| `categories[].services[].url` | String | Yes | Non-empty destination URL. Use an absolute URL for external services; relative URLs resolve against JumpKey. |
| `categories[].services[].id` | String | No for new entries | Stable, non-empty identity, unique across all services. Added automatically when missing. Preserve existing IDs. |
| `categories[].services[].key` | String | No | One letter `a`–`z`, unique within the category, ignoring case. Omit or leave empty for automatic assignment when not disabled. |
| `categories[].services[].shortcutDisabled` | Boolean | No | `true` disables this service shortcut, even after reload. |
| `categories[].services[].icon` | String | No | Service icon; see [Icons](#icons). |
| `searchEngines` | Array | Yes | Search engine objects. Use `[]` if none are needed. |
| `searchEngines[].name` | String | Yes | Non-empty display name. |
| `searchEngines[].prefix` | String | Yes | Non-empty command prefix, unique ignoring case. Use a token without spaces, such as `g`. |
| `searchEngines[].url` | String | Yes | Non-empty search URL. Include `%s` where the URL-encoded query should go. |
| `searchEngines[].icon` | String | No | Search engine icon; see [Icons](#icons). |

Automatic shortcuts prefer letters in the entry's name and reserve all explicit keys first. There are 26 letter keys at each level; entries beyond the available keys remain accessible by mouse, touch or search. The category editor now offers the same **Automatic / Manual / No shortcut** selector as the service editor, including an A–Z grid and duplicate validation. Explicitly disabled category shortcuts remain disabled after reload (`shortcutDisabled: true`). Set keys explicitly if you want them to remain unchanged when renaming or reordering entries.

Names do not have to be unique. Service IDs do. When copying a service to create a new one, remove its `id` field and adjust or remove its `key`. The app generates the new ID when saving. Keep the ID when editing or moving an existing service so favorites and Continue references stay attached to it.

Additional JSON fields are preserved, but do not add behavior unless the app supports them. Preferences such as theme, favorites, Continue history and view mode are stored in the browser, not in `services.json`.

### Example `services.json`

```json
{
  "categories": [
    {
      "category": "Development",
      "categoryKey": "d",
      "icon": "code",
      "services": [
        {
          "name": "GitHub",
          "url": "https://github.com",
          "key": "g",
          "icon": "github.png"
        },
        {
          "name": "Local Host",
          "url": "http://localhost:8080",
          "key": "l",
          "icon": "globe"
        }
      ]
    },
    {
      "category": "Monitoring",
      "categoryKey": "m",
      "icon": "activity",
      "services": [
        {
          "name": "Grafana",
          "url": "https://grafana.example.com",
          "key": "g",
          "icon": "trending-up"
        }
      ]
    }
  ],
  "searchEngines": [
    {
      "name": "Google",
      "prefix": "g",
      "url": "https://www.google.com/search?q=%s",
      "icon": "iconify:logos:google-icon"
    },
    {
      "name": "Wikipedia",
      "prefix": "w",
      "url": "https://en.wikipedia.org/wiki/Special:Search?search=%s",
      "icon": "lucide:book-open"
    }
  ]
}
```


The example intentionally omits service IDs. They are generated automatically. `github.png` refers to a file you place in the icons directory.

## Search and keyboard controls

Press `Space` to search service and category names. Enter `:` to list search engines, or type a command such as `:g jumpkey`. Use the arrow keys to select a result and `Enter` to open it.

### Dashboard

| Shortcut | Action |
| --- | --- |
| `Ctrl+E`, category key, service key | Choose a service to edit in the shared settings editor; `Esc` cancels the selection. |
| `+` | Add a link. |
| `Backspace` | Cycle workspaces; `Enter` switches immediately, `Esc` cancels. |
| `A`–`Z` | Select a category from the overview. |
| Category letter, then service letter | Open a service in the selected category. |
| `1`–`9`, `0` | Open a favorite from the overview. |
| `Ctrl + 1`–`9`, `0` | Assign an empty favorite slot by choosing a category and service; remove the favorite if the slot is occupied. |
| `Shift + 1`–`9`, `0` | Open the corresponding Continue entry. |
| `_` | Open the Continue overview. |
| `-` | Cycle through recent services; press again before the pending launch to advance. |
| `Space` | Open search. |
| `#` | Switch overview modes when no category is selected. |
| `Esc` | Cancel the current input, close search or cancel a pending launch. |
| `Shift + Click` | Open a service in the current tab. |
| `Ctrl + ,` | Open settings. |
| `?` | Show keyboard help. |

### Search and settings

| Context | Shortcut | Action |
| --- | --- | --- |
| Add/edit service | `Tab` / `Shift+Tab` | Move between fields and actions. |
| Add/edit service | `Ctrl/Cmd + Enter` | Save valid changes. |
| Add/edit service | `Esc` | Go back from a confirmation or close; ask before discarding changes. |
| Search | `↑` / `↓` | Select the previous or next result. |
| Search | `Enter` | Open the selected result or select a search engine. |
| Search | `Shift + Enter` | Open the selected service or search query in the current tab. |
| Settings | `Ctrl/Cmd + 1`–`6` | General, Management, Appearance, Data, JSON or Info respectively (where available). |
| JSON editor | `Ctrl/Cmd + S` | Save valid changes. |
| Settings | `Esc` | Close settings; ask before discarding unsaved changes. |

## Icons

| Value | Source | Description |
| --- | --- | --- |
| `hammer` | Lucide | Shorthand for `lucide:hammer`. |
| `lucide:hammer` | Lucide via Iconify | Dynamically loaded icon. |
| `iconify:mdi:home` | Iconify | Icon from the specified collection. |
| `https://example.com/icon.svg` | Remote image | Image URL, including optional query parameters. |
| `my-service.svg` | Local image | File in `--icons-dir`, served under `/icons/`. |

Local image filenames support `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg` and `.gif`. For available names, browse [Lucide](https://lucide.dev/icons/) or [Iconify](https://icon-sets.iconify.design/) in your browser. For an Iconify name such as `mdi:home`, enter `iconify:mdi:home`. Leave the field empty to use the default link icon.

Dynamic icons require access to the icon provider when not already cached. A built-in fallback is shown while loading or if a dynamic icon cannot be loaded. Local images are useful when you want to avoid external icon requests.

## Saving and backups

The server backs up the old configuration before saving a replacement. Backups are stored next to the configuration, using its filename stem: for example, `services.backup-<timestamp>.json` or `work.workspace.backup-<timestamp>.json`. If the backup fails, the server keeps the old file. If saving fails, the editor stays open with your changes.

The server retains the newest 20 backup files per configuration by default (`--backup-keep` / `JUMPKEY_BACKUP_KEEP` can change this). Older matching backups are deleted only after a successful save; unrelated files are never rotated. Category deletion saves a backup before removing the category and its services. Workspace deletion requires a separate, permanent `<workspace>.deleted-<timestamp>.json` backup of the latest bytes, which does **not** count toward the rotating 20. Deleting the last workspace is blocked.

To restore a configuration, stop JumpKey, copy the appropriate backup over its workspace JSON file, restart, and reload the page online. There is no in-app restore or recycle bin. Back up the entire config directory (including hidden workspace-order metadata), not only `services.json`.

### Upgrading older configurations

Missing service IDs are generated when loading a configuration and included when it is saved. Keep existing IDs so favorites and Continue references stay attached to their services. Older references stored by name are converted to IDs in each browser; if several services share a name, the first match is used.

Existing browser preferences initialize Default. Existing favorites and Continue history are adopted once by the first Default workspace loaded after upgrading. You do not need to clear browser data.

### Offline PWA and updates (phase 4)

With a successful authenticated workspace-list request, JumpKey **prefetches all accessible workspace configurations** (two at a time) into browser-local storage. IndexedDB is used when available, with localStorage as a fallback. The **Settings → Info** page shows the available offline copies and the installed app version.

After a workspace has been cached, the launcher can show it without network access: select a cached workspace, browse services, search and use browser-local favorites and Continue history. **Editing, creating, deleting, sorting and saving are unavailable offline**; there is no write queue or automatic merge. Service destinations, remote icons and other externally hosted resources still need their own connection. Browser storage can be evicted, so offline use is not guaranteed. Use separate browser profiles for users who must not see one another's cached data.

When connectivity returns, JumpKey checks the authenticated server workspace list and configuration before enabling writes. Deleted workspace IDs are removed from the local cache; server-recorded ID renames migrate local references. A currently opened tab should not be mistaken for a secure offline user session. **Offline data cannot be remotely revoked once downloaded.**

The service worker checks for app updates on startup, when the tab becomes active, approximately hourly while visible, and on request under **Settings → Info**. New versions offer **Update now / Later** rather than an automatic reload; unsaved forms or sort drafts block an unsafe reload. Version display comes from the GitHub Release tag for release builds, `dev-<short-sha>` for `main` builds, or `package.json` for local builds. PWA updates are detected from changed application assets, independently of the version label.

Concurrent writes remain protected by ETags: a save must include `If-Match` from the current server response. Missing revision yields HTTP `428`, stale revision yields `412`. In either case, unsaved edits must not be silently overwritten. See the [phase 4 guide](docs/phase-4-pwa-offline.md) for a browser-level acceptance checklist.

## Proxy authentication and migration

> [!CAUTION]
> **A reverse proxy login does not automatically enable JumpKey per-user mode.** If a previous deployment relied on `Remote-User` without setting `JUMPKEY_AUTH_MODE=proxy`, upgrading changes which JSON files are selected: JumpKey now defaults to **shared local files**. Configure and test proxy authentication **before** exposing a writable instance. Never let unauthenticated clients reach its backend directly.

The writable application is intended for trusted networks or a properly secured external authentication proxy such as Caddy with Authelia. JumpKey has **no built-in login**. For a public-facing catalogue without authenticated editing, use the [public read-only installation](#public-read-only-installation).

For per-user workspaces, enable `--auth-mode=proxy --trusted-proxies=<immediate proxy IP/CIDR>` (or `JUMPKEY_AUTH_MODE=proxy` and `JUMPKEY_TRUSTED_PROXIES`). Only then does JumpKey accept a valid `Remote-User` header **from that trusted peer**, and select a user-specific filename. By default, `--auth-mode=local` ignores `Remote-User` and uses shared files:

| `Remote-User` | Configuration | Backup pattern |
| --- | --- | --- |
| Local mode | `services.json` | `services.backup-<timestamp>.json` |
| `arthur` | `services.arthur.json` | `services.arthur.backup-<timestamp>.json` |

User values may contain ASCII letters, digits, dots, underscores and hyphens. The server does not automatically fall back to `services.json` when a user-specific file is missing. The `--copy-default-config` flag only initializes the shared `services.json`.

The authentication proxy must discard any client-supplied `Remote-User`, authenticate the client, then set **exactly one** validated `Remote-User` header. If the upstream identity provider uses `X-Forwarded-User`, map the *verified* value to `Remote-User` at the proxy; JumpKey does not use `X-Forwarded-User` as identity. The proxy must similarly overwrite `X-Forwarded-Proto: https` for HTTPS requests. Prevent clients from bypassing the proxy. Proxy mode rejects untrusted peers and missing/invalid identities before reaching any private resource. It does not provide an independent login mechanism. See the [full proxy setup and migration notes](docs/phase-2-backend.md). The configured peer must be the **immediate TCP peer** seen by JumpKey (for Docker, often a bridge/container IP, not `127.0.0.1`). Proxy mode requires a nonempty trusted proxy list and rejects `0.0.0.0/0` and `::/0`. By default HTTPS checks also apply: untrusted/missing `X-Forwarded-Proto: https` yields **403**, untrusted immediate peers yield **403**, and a missing/invalid `Remote-User` from a trusted peer yields **401**. Only GET/HEAD `/healthz` bypasses these checks.

For a writable Compose deployment behind a proxy, add for example (replace the illustrative IP with the **actual immediate source**):

```yaml
services:
  jump-key:
    environment:
      JUMPKEY_AUTH_MODE: proxy
      JUMPKEY_TRUSTED_PROXIES: 192.0.2.10
      # JUMPKEY_REQUIRE_HTTPS defaults to true in proxy mode.
```

A `403` immediately after upgrading usually means the HTTPS check or trusted peer is misconfigured, while a `401` points to a missing/invalid verified identity. Inspect the reverse-proxy configuration and the backend-visible client address; **do not disable security checks as a production workaround**. For local HTTP-only tests, `JUMPKEY_REQUIRE_HTTPS=false` is possible, but ensure the backend remains unreachable from untrusted networks.

Configuration caches, favorites and history are partitioned by account and workspace in the browser. Offline access uses the last known identity; use separate browser profiles when accounts need isolation.

## Development

Use Node.js 26 LTS and Go 1.27, matching `.nvmrc`, the Docker build and `go.mod`.

```bash
npm ci
npm run check:syntax
npm test
npm audit --audit-level=high
npm run build
go vet ./...
go test -race ./...
CGO_ENABLED=0 go build -o jump-key .
```

Build the frontend before compiling or testing Go: `dist` is embedded in the executable.

The reusable [quality workflow](.github/workflows/ci.yml) runs for pull requests and can also be started manually. Docker publication (on `main` and releases), release archives and GitHub Pages demo deployment must pass the same quality checks first. The Go race detector requires CGO and a C compiler in the test runner, but production binaries remain CGO-disabled. Dependabot groups minor and patch updates; major upgrades stay in separate pull requests. The CI vulnerability audit fails on high or critical advisories.

For a reproducible npm upgrade, update **both** `package.json` and `package-lock.json` on a Node.js 26 machine with registry access. `scripts/update-npm-dependencies.sh` contains the vetted version targets and runs the tests afterwards. Do not hand-edit lockfile integrity values. Do not treat a package.json version bump as complete until the matching lockfile has been regenerated and `npm ci` succeeds.

`npm run dev` and [compose.dev.yml](compose.dev.yml) run the frontend development server. They do not implement configuration writes; use the Go server to verify persistence. `npm run preview` previews the frontend build only.

The frontend version displayed under **Settings → Info** comes from the published GitHub Release tag for release builds (e.g. `v1.2.0` → `1.2.0`). `main` Docker builds show `dev-<short-sha>`; local builds fall back to `package.json`. See [release versioning](docs/github-release-version.md).

After building the frontend, `scripts/build-release.sh VERSION` creates standalone release archives in `release`. Its optional second argument changes the output directory; the script clears that directory before building. The GitHub Pages demo is maintained separately on the `demo` branch.

## About this project

This project was built with AI assistance. I'm a lazy dev.

## License

[MIT](LICENSE).

