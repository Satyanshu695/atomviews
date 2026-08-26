# AGENTS.md

## Architecture

Atmos is a static frontend (`public/`) backed by Netlify Functions
(`netlify/functions/*.mts`). There is no build step for the frontend — it's
plain HTML/CSS/JS served directly. Each backend endpoint is its own
serverless function file; `netlify.toml` redirects clean `/api/*` paths to
the underlying `/.netlify/functions/*` function names so the frontend and
any future clients never need to know the function filenames.

This mirrors an earlier Flask version of the same product one-to-one:
each Flask route became one Netlify Function, and each Flask
service module became a shared helper under `netlify/functions/utils/`.

## Key directories

- `public/` — the entire frontend. `index.html` is the single page; `js/app.js`
  drives all interactivity (search, map, tabs, charts) without a framework;
  `css/main.css` holds all styling.
- `netlify/functions/` — one file per API endpoint. Keep this mapping: a
  new weather data type gets its own function file, not a branch inside an
  existing one.
- `netlify/functions/utils/` — shared, provider-agnostic helpers:
  - `http.mts` — fetch-with-timeout JSON helper, shared error type, `lat`/`lon`
    query validation, and the JSON response helper. All functions should
    build responses through `jsonResponse` for consistent CORS headers.
  - `cache.mts` — a per-warm-instance in-memory TTL cache (not distributed;
    this is a deliberate trade-off for a small deployment, not an oversight).
  - `normalize.mts` — turns Open-Meteo's raw field names into the shared
    response shape the frontend depends on, plus the WMO weather-code →
    icon/condition mapping used everywhere a `weather_code` shows up.
  - `weather-service.mts` / `historical-service.mts` — the actual upstream
    Open-Meteo calls, kept separate from route handlers so a second provider
    could be added later without touching the functions themselves.

## Conventions

- Every function returns `{"success": true, "data": ...}` or
  `{"success": false, "message": "..."}` — the frontend only branches on
  `success`, never on HTTP status text.
- No fabricated data: when a data source has nothing for a location (e.g.
  marine data over land, alerts outside the US), the response says so
  explicitly (`available: false` + a message) rather than returning zeros
  or guesses. Preserve this when adding new data sources.
- All upstream calls go through `getJson` in `http.mts` so timeouts and
  upstream errors surface as a consistent `WeatherServiceError` → 503,
  instead of an unhandled exception.
- No API keys are required for any current data source (Open-Meteo, NWS).
  If a keyed provider is ever added, gate it behind an environment variable
  and keep the keyless path working as the default.
