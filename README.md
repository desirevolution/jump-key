<p align="center">
  <img src="./public/jump-key.png" alt="logo" width="80" height="80" />
</p>

<h1 align="center">JumpKey</h1>

####  JumpKey — A minimalist, keyboard-driven local first PWA homepage for your services.

<p align="center">
  <img src="screenshots/screenshot_2.png" alt="Grid dashboard">
</p>

## Features

- **Keyboard-Centric Navigation**: Navigate categories and launch services using sequential keyboard shortcuts.
- **Instant Search**: Filter services in real time while typing.
- **Category Organization**: Group services into configurable categories.
- **Favorites**: Automatically surface frequently used services for quick access.
- **Search Engine Integration**: Configure multiple search engines for quick web searches.
- **Built-in Configuration Editor**: Edit the configuration directly from the web interface.
- **Configuration Validation**: Validate JSON before applying changes.
- **Responsive User Interface**: Optimized for desktop and mobile devices.
- **Localization Support**: Automatic language detection with internationalization support.
- **Lucide Icons**: Use the Lucide icon set for services and actions.([https://lucide.dev/icons/](https://lucide.dev/icons/))
- **Docker Ready**: Deploy using the included Docker Compose configuration.
- **Lightweight Architecture**: Built with Lit for fast rendering and minimal resource usage.


## Screenshots

<p align="center">
  <a href="screenshots/screenshot_1.png">
    <img src="screenshots/screenshot_1.png" width="300">
  </a>
  <a href="screenshots/screenshot_3.png">
    <img src="screenshots/screenshot_3.png" width="300">
  </a>
  <a href="screenshots/screenshot_4.png">
    <img src="screenshots/screenshot_4.png" width="300">
  </a>
  <a href="screenshots/screenshot_5.png">
    <img src="screenshots/screenshot_5.png" width="300">
  </a>
  <a href="screenshots/screenshot_6.png">
    <img src="screenshots/screenshot_6.png" width="300">
  </a>
</p>

## Quick Start

Copy/adjust [compose.yml](compose.yml) and /config/[services.json](services.example.json) and put all your custome icon images in /icon.

Then run:

```bash
# caddy webdav container needs write access to the config directory
chown -R  100 config

docker compose up -d
```

## Configuration

The application is configured through the `config/services.json` file.

### Available Options

| Key | Type | Description |
| :--- | :--- | :--- |
| `categories` | `Array` | List of category objects grouping your web services. |
| `categories[].category` | `String` | The visible display name of the category block. |
| `categories[].categoryKey` | `String` | *(Optional)* The keyboard hotkey character to activate this category. Auto-assigned if omitted. |
| `categories[].icon` | `String` | Lucide icon identifier (e.g., `layout-grid`) or filename matching an image in `./icons/`. |
| `categories[].services` | `Array` | Array of links belonging inside this group. |
| `categories[].services[].name` | `String` | Title of the specific web application or website. |
| `categories[].services[].url` | `String` | Full destination URL (e.g., `https://github.com`). |
| `categories[].services[].key` | `String` | *(Optional)* Specific hotkey to launch this item once its category is open. |
| `categories[].services[].icon` | `String` | Lucide icon identifier or image filename for the link. |
| `searchEngines` | `Array` | Custom query shortcuts available inside the unified search bar using the `:` indicator. |
| `searchEngines[].name` | `String` | Display name of the external search provider. |
| `searchEngines[].prefix` | `String` | The keyword trigger text (e.g., `g` maps to searching via `:g <query>`). |
| `searchEngines[].url` | `String` | Search engine query URL string containing `%s` as the search term placeholder. |
| `searchEngines[].icon` | `String` | Icon reference for the search engine overlay listing. |
 
### Sample `services.json`

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
      "icon": "search"
    },
    {
      "name": "Wikipedia",
      "prefix": "w",
      "url": "https://en.wikipedia.org/wiki/Special:Search?search=%s",
      "icon": "book-open"
    }
  ]
}
```

## Disclaimer

Project was build with AI support. I am a lazy dev...
