# Atmos — Global Weather Intelligence Platform

Atmos is a global weather platform: search any city, region, country, or
coordinates for real-time weather, hourly/daily/16-day forecasts, air
quality, astronomy, historical weather, computed climatology, marine
weather (coastal locations), official alerts (US via NWS), and multi-city
comparison — all on an interactive world map.

## Stack

- **Frontend:** static HTML5 + CSS3 + vanilla JavaScript (no build step),
  Chart.js for charts, Leaflet.js for the map — served from `public/`.
- **Backend:** Netlify Functions (`netlify/functions/*.mts`), one function
  per API endpoint, proxied at clean `/api/*` paths via `netlify.toml`
  redirects.
- **Data sources:** Open-Meteo (weather, air quality, geocoding, historical,
  marine — free, no API key) and the US National Weather Service (official
  alerts, free, no API key). No API keys are required for anything in this
  build.

## Running locally

```bash
netlify dev
```

This serves the static site and emulates the functions locally. Visit the
printed local URL and search for a city, click the map, or use "Use my
location" to get started.

## Project structure

```
public/                    # Static site (served as-is, no build step)
  index.html
  css/main.css
  js/app.js
netlify/functions/         # One serverless function per API endpoint
  geocode.mts
  weather-current.mts
  weather-hourly.mts
  weather-daily.mts
  air-quality.mts
  alerts.mts
  astronomy.mts
  marine.mts
  historical.mts
  climate.mts
  health.mts
  utils/                   # Shared HTTP, caching, and normalization helpers
netlify.toml                # Publish dir, functions dir, /api/* redirects
```

## API reference

All responses are normalized JSON: `{"success": true, "data": {...}}` on
success, `{"success": false, "message": "..."}` on failure.

```
GET /api/geocode?q=<query>
GET /api/weather/current?lat=&lon=
GET /api/weather/hourly?lat=&lon=&hours=72
GET /api/weather/daily?lat=&lon=&days=7        (1-16)
GET /api/weather/historical?lat=&lon=&start_date=&end_date=
GET /api/climate?lat=&lon=&years=10            (computed monthly climatology)
GET /api/air-quality?lat=&lon=
GET /api/alerts?lat=&lon=                      (US via NWS; elsewhere: honest "unavailable")
GET /api/astronomy?lat=&lon=
GET /api/marine?lat=&lon=                      (coastal locations only)
```

## What's real vs. computed vs. not yet available

- **Real, live data:** current/hourly/daily weather, air quality, historical
  weather, marine weather, US alerts, sunrise/sunset — fetched live on
  every request (subject to a short in-memory cache per warm function
  instance).
- **Computed (not fabricated):** climatology monthly averages (computed from
  real historical data, labeled with the year range used), moon phase and
  illumination (standard synodic-month formula), solar noon and daylight
  duration (derived from real sunrise/sunset).
- **Explicitly not available:** moonrise/moonset times, and official alerts
  outside the US — both say so directly in the UI rather than showing wrong
  or fabricated values.
