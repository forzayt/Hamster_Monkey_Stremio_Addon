# PimpBunny Stremio Addon

A clean Stremio addon that lists and streams videos from **pimpbunny.com** — free, no API key, no proxy, no third-party scraping.

Built on the [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk) and modeled on the working demos [MalluFlix_stremio_addon](https://github.com/forzayt/MalluFlix_stremio_addon) and [kick_Streams_Addon_Stremio](https://github.com/forzayt/kick_Streams_Addon_Stremio).

## Features

- **Catalogs**: "Popular" + one catalog per pimpbunny category (Anal, Blowjob, Lesbian, MILF, Teen, etc.)
- **Search**: every catalog supports a search query
- **Pagination**: scroll down to load more videos (page 2, 3, etc.) — works on category and search catalogs
- **Meta**: title, poster, background, description
- **Streams**: one stream per video quality (360p, 720p, 1080p, 1440p, etc.) with direct MP4 URLs
- **Direct stream URLs** — Stremio plays them natively
- No proxy, no CORS relay, no external dependencies beyond the pimpbunny.com website

## Install & run locally

```bash
# 1. Install dependencies
npm install

# 2. Start the addon
npm start
# Addon runs on http://localhost:7000
# Manifest: http://localhost:7000/manifest.json
```

### Deploy
Deploy to any Node host (Render, Railway, Fly, VPS, etc.). Optional:

```
HOST_URL=https://your-addon.example.com
PORT=7000
```

## Install in Stremio

1. Open Stremio → **Addons** → **My addons** → **Install community addon** (or "Add URL")
2. Enter your manifest URL:
   - Local: `http://localhost:7000/manifest.json`
   - Deployed: `https://your-addon.example.com/manifest.json`
3. Enable the addon. "PimpBunny" appears under **Video addons** with its catalogs.

## Project structure

```
package.json        # dependencies (stremio-addon-sdk, axios, cheerio, express)
server.js           # Express server + Stremio SDK router
addon.js            # manifest + catalog / meta / stream handlers + pimpbunny scrapers
.gitignore
README.md
```

## How it works

- **Catalog handler** fetches the pimpbunny homepage (Popular) or a category page (`/categories/<slug>/?page=N`), parses `.ui-card-video` nodes and returns video metas. Supports Stremio's `extra.skip` for pagination.
- **Meta handler** fetches the video page (`/videos/<slug>/`), parses Open Graph tags for title/poster/description.
- **Stream handler** fetches the video page, extracts `get_file` MP4 URLs for each quality (360p, 720p, 1080p, 1440p, etc.), and returns one stream per quality.

## Notes

- pimpbunny.com is scraped directly. If the site changes its HTML structure, the selectors in `addon.js` may need updating.
- Streams are direct MP4 URLs from pimpbunny.com. Stremio handles playback natively.
- This addon only indexes pimpbunny.com videos. It does not host any content.
- Category and search catalogs support infinite scroll (pagination) — Stremio will load more videos as you scroll down.

## License

MIT. pimpbunny.com content remains subject to pimpbunny.com's own terms.
