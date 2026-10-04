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

## What it does

- Two overview modes: all services, or categories with favorites.
- Ten favorite slots and a Continue list of recently opened services.
- Search by service or category name, plus custom search commands such as `:g linux`.
- A JSON editor with configuration validation, import, export and automatic backups.
- Seven dark and three light themes, with English, German, French and Spanish translations.
- Local images, image URLs, Lucide and Iconify icons.
- Desktop and mobile layouts, with PWA installation and offline access to the dashboard.
- A Lit frontend bundled with a Go server, available as a standalone executable or Docker container. No database needed.

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
| `--config-dir` | None; required | Existing writable directory containing configuration and backups. |
| `--icons-dir` | None; required | Existing directory containing custom icons. Can be empty. |
| `--copy-default-config` | `false` | Copy the embedded example to `services.json` if missing. |
| `--help` | — | Show command-line usage. |

The server exposes `GET /healthz` for health checks. Configuration uploads are limited to 2 MiB. Settings are provided through command-line flags; there are no application-specific environment-variable equivalents.

## Service actions and mobile layout

Open **⋮** on a service tile to edit it, add or remove it from favorites, or copy its URL. The button is always visible on mobile and appears on hover or keyboard focus on desktop. Use `Tab` to reach it. Actions open in a bottom sheet on mobile and beside the button on desktop. Desktop category/grid tiles show the assigned favorite number next to the star; favorite tiles already show it beside the name. Pressing and holding a tile still works as before.

**Edit service** opens the same form used for adding links, with the current values filled in. You can change the name, URL, icon, shortcut, or category, including creating a new destination category. The service keeps its ID, favorites, and history. Its position stays the same within a category; moving it appends it to the destination category. Duplicate URL and shortcut checks exclude the service being edited. Renaming does not replace its shortcut; conflicts in the destination category must be resolved before saving. Categories themselves are still edited in the JSON editor.

On small screens, shortcuts are hidden, tiles use more of the available width, and category headers show service counts. **Back to overview** returns from a category or recent-services view.

## Adding links

Press `+` on the dashboard or use the desktop plus button. On mobile, choose **Add link** from the menu. Paste a URL, choose a category (or create one), and save with `Ctrl+Enter`. The name defaults to the hostname. The suggested shortcut can be edited; icons are optional. New links are appended to the category. Duplicate URLs are rejected within the selected category by this dialog; the JSON editor remains unrestricted.

On desktop, open **Settings → Import & Export** and drag **Add to JumpKey** to your bookmarks bar. Click it on a page to open JumpKey in a new tab with the URL and page title filled in. Choose a category and save; no category is remembered.

On supported Android browsers, an installed JumpKey PWA can receive links through **Share → JumpKey**. Review the shared link before saving. Sharing support depends on the browser and OS.

The mobile installation banner can be dismissed permanently for this browser. Installation remains available from the menu. When a native prompt is unavailable, JumpKey shows browser instructions. The controls are hidden when running as an installed app. Use HTTPS (or localhost) for PWA features.

## Configuration

The browser loads `/config/services.json`. The server reads it from `--config-dir`, with optional filename selection through the `Remote-User` header described below.

Open settings with `Ctrl + ,`. The JSON editor and import function use the same configuration structure. Importing a file loads it into the editor; save to apply it. Export downloads the current configuration, without browser-local favorites or preferences.

### Configuration fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `categories` | Array | Yes | Category objects. May be empty. |
| `categories[].category` | String | Yes | Non-empty category name. |
| `categories[].categoryKey` | String | No | One letter `a`–`z`, unique across categories, ignoring case. Omit or leave empty for automatic assignment. |
| `categories[].icon` | String | No | Category icon; see [Icons](#icons). |
| `categories[].services` | Array | Yes | Service objects. May be empty. |
| `categories[].services[].name` | String | Yes | Non-empty display name. |
| `categories[].services[].url` | String | Yes | Non-empty destination URL. Use an absolute URL for external services; relative URLs resolve against JumpKey. |
| `categories[].services[].id` | String | No for new entries | Stable, non-empty identity, unique across all services. Added automatically when missing. Preserve existing IDs. |
| `categories[].services[].key` | String | No | One letter `a`–`z`, unique within its category, ignoring case. Omit or leave empty for automatic assignment. |
| `categories[].services[].icon` | String | No | Service icon; see [Icons](#icons). |
| `searchEngines` | Array | Yes | Search engine objects. Use `[]` if none are needed. |
| `searchEngines[].name` | String | Yes | Non-empty display name. |
| `searchEngines[].prefix` | String | Yes | Non-empty command prefix, unique ignoring case. Use a token without spaces, such as `g`. |
| `searchEngines[].url` | String | Yes | Non-empty search URL. Include `%s` where the URL-encoded query should go. |
| `searchEngines[].icon` | String | No | Search engine icon; see [Icons](#icons). |

Automatic shortcuts prefer letters in the entry's name and reserve all explicit keys first. There are 26 letter keys at each level; entries beyond the available keys remain accessible by mouse, touch or search. Set keys explicitly if you want them to remain unchanged when renaming or reordering entries.

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
| Search | `↑` / `↓` | Select the previous or next result. |
| Search | `Enter` | Open the selected result or select a search engine. |
| Search | `Shift + Enter` | Open the selected service or search query in the current tab. |
| Settings | `Ctrl/Cmd + 1`, `2`, `3` | Select Appearance, Data or JSON editor. |
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

Local image filenames support `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg` and `.gif`. Browse icons at [Iconify](https://icon-sets.iconify.design/).

Dynamic icons require access to the icon provider when not already cached. A built-in fallback is shown while loading or if a dynamic icon cannot be loaded. Local images are useful when you want to avoid external icon requests.

## Saving and backups

The server backs up the old configuration before saving a replacement. Backups are stored next to the configuration as `services.backup-<timestamp>.json`. If the backup fails, the server keeps the old file. If saving fails, the editor stays open with your changes.

Backups are not deleted automatically. To restore one, stop JumpKey, copy the backup over the configuration file, restart, and reload the page while online.

### Upgrading older configurations

The app adds missing service IDs when it loads a configuration and saves the result to the server. This save also creates a backup. Favorites and Continue entries stored by name are converted to IDs in each browser. If several services have the same name, the first match is used, as before. You do not need to clear browser data.

If the migration cannot be saved, the app uses it locally and tries again on the next online load.

### Browser storage and offline use

The browser keeps the last loaded or saved configuration for offline use. Load the app online first. The linked services still need to be reachable; caching the dashboard does not cache those services.

Favorites, Continue history, theme and view mode stay in the browser. They are not included in the JSON export or synchronized between devices.

Concurrent edits are not detected. If two devices save different versions, the last save wins.

## Authentication and user-specific files

JumpKey is intended for trusted environments, such as a local network or an authentication proxy setup using Authelia or Authentik. It does not provide its own authentication. Hardening it as a public Internet-facing service is outside the project's scope; if you expose it publicly, you are responsible for authentication and security.

If the proxy supplies `Remote-User`, the server selects a user-specific filename:

| `Remote-User` | Configuration | Backup pattern |
| --- | --- | --- |
| Absent | `services.json` | `services.backup-<timestamp>.json` |
| `arthur` | `services.arthur.json` | `services.arthur.backup-<timestamp>.json` |

User values may contain ASCII letters, digits, dots, underscores and hyphens. The server does not automatically fall back to `services.json` when a user-specific file is missing. The `--copy-default-config` flag only initializes the shared `services.json`.

The authentication proxy must set the identity header itself and prevent clients from bypassing it. The header is a filename selector, not proof of authentication. Browser storage and offline caches are not separated by account: use one account per browser profile for this installation.

## Development

Use Node 24 and Go 1.26, matching the Docker build and `go.mod`.

```bash
npm ci
npm test
npm run build
go test ./...
go build -o jump-key .
```

Build the frontend before compiling or testing Go: `dist` is embedded in the executable.

`npm run dev` and [compose.dev.yml](compose.dev.yml) run the frontend development server. They do not implement configuration writes; use the Go server to verify persistence. `npm run preview` previews the frontend build only.

After building the frontend, `scripts/build-release.sh VERSION` creates standalone release archives in `release`. Its optional second argument changes the output directory; the script clears that directory before building. The GitHub Pages demo is maintained separately on the `demo` branch.

## Ideas / TODOs

- Workspaces for separate work and personal links.
- ~~Iconify icon support.~~ Implemented.
- ~~Standalone Go server to replace the Caddy setup.~~ Implemented.

## About this project

This project was built with AI assistance. I'm a lazy dev.

## License

[MIT](LICENSE).
