"""AtomViews FastAPI backend scaffold.

The existing Netlify backend remains the production implementation until
all routes have been migrated and compatibility has been verified.
"""
from __future__ import annotations

import asyncio
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .utils.http import WeatherServiceError, json_response

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
UPSTREAM_TIMEOUT_SECONDS = 15


app = FastAPI(
    title="AtomViews API",
    description="Weather intelligence API for the AtomViews frontend.",
    version="0.1.0",
)

# Keep CORS permissive for initial local testing. Restrict allowed origins
# before exposing this API publicly or connecting a production frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/healthz", include_in_schema=False)
async def render_health_check():
    """Simple HTTP health endpoint for Render's service health check."""
    return {"status": "ok"}


@app.get("/api/health")
async def api_health():
    """Preserve the existing Netlify health endpoint's response shape."""
    return json_response({"status": "ok"})


def _fetch_geocode_json(query: str) -> dict:
    """Fetch geocoding results with the timeout and errors used by Netlify."""
    url = f"{GEOCODE_URL}?{urlencode({'name': query, 'count': 8, 'language': 'en', 'format': 'json'})}"
    try:
        with urlopen(url, timeout=UPSTREAM_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise WeatherServiceError(
            f"Weather service returned an error ({exc.code})"
        ) from exc
    except TimeoutError as exc:
        raise WeatherServiceError("Weather service timed out") from exc
    except URLError as exc:
        if isinstance(exc.reason, TimeoutError):
            raise WeatherServiceError("Weather service timed out") from exc
        raise WeatherServiceError(
            "Weather service is currently unavailable"
        ) from exc
    except (OSError, json.JSONDecodeError) as exc:
        raise WeatherServiceError(
            "Weather service is currently unavailable"
        ) from exc


@app.get("/api/geocode")
async def geocode(q: str | None = Query(default=None)):
    """Search Open-Meteo and preserve the existing Netlify response shape."""
    query = (q or "").strip()
    if not query:
        return json_response(
            {"success": False, "message": "Query parameter 'q' is required."},
            400,
        )

    try:
        data = await asyncio.to_thread(_fetch_geocode_json, query)
    except WeatherServiceError as exc:
        return json_response({"success": False, "message": str(exc)}, 503)

    results = [
        {
            "name": result.get("name"),
            "country": result.get("country"),
            "country_code": result.get("country_code"),
            "admin1": result.get("admin1"),
            "latitude": result.get("latitude"),
            "longitude": result.get("longitude"),
            "timezone": result.get("timezone"),
            "elevation": result.get("elevation"),
            "population": result.get("population"),
        }
        for result in (data.get("results") or [])
    ]

    if not results:
        return json_response(
            {"success": False, "message": f"No locations found for '{query}'."},
            404,
        )
    return json_response({"success": True, "results": results})
