<p align="center">
  <img src="./public/jump-key.png" alt="logo" width="80" height="80" />
</p>

<h1 align="center">JumpKey</h1>

####  A minimalist, keyboard-driven application startpage. Navigate and launch your web apps instantly without a mouse. 

## Screenshots

<p align="center">
  <img src="./screenshots/screenshot_1.png" alt="screenshot1" width="450" />
  <img src="./screenshots/screenshot_2.png" alt="screenshot2" width="450" />
  <img src="./screenshots/screenshot_3.png" alt="screenshot3" width="450" />
  <img src="./screenshots/screenshot_4.png" alt="screenshot4" width="450" />
</p>

## Quick Start

Copy/adjust [compose.yml](compose.yml) and [services.json](services.example.json) and run

```bash
docker compose up -d
```

## Configuration

The application fetches its dashboard data dynamically from `./services.json`. This file organizes your bookmarks into separate categories and individual services, while configuring your keyboard navigation layout automatically.

#### Sample Structure

Create a file named `services.json` in your root directory and format it as follows:

```json
[
  {
    "category": "Development",
    "icon": "code-2",
    "services": [
      {
        "name": "GitHub",
        "url": "https://github.com",
        "icon": "github"
      },
      {
        "name": "Vercel",
        "url": "https://vercel.com",
        "icon": "triangle",
        "key": "v"
      }
    ]
  },
  {
    "category": "Entertainment",
    "icon": "tv.png",
    "services": [
      {
        "name": "YouTube",
        "url": "https://youtube.com"
      }
    ]
  }
]
```


## Disclaimer
Project was build with AI support. I am a lazy dev...

