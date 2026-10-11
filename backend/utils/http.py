"""Shared HTTP helpers for migrated API routes."""
from __future__ import annotations

from typing import Any
from fastapi.responses import JSONResponse


class WeatherServiceError(Exception):
    """Raised when an upstream weather provider cannot serve a request."""


def json_response(body: Any, status_code: int = 200) -> JSONResponse:
    """Return JSON using the shared response helper pattern."""
    return JSONResponse(content=body, status_code=status_code)


def parse_lat_lon(lat_value: str | None, lon_value: str | None) -> tuple[float, float]:
    """Validate latitude/longitude like the existing Netlify helper.

    Raises ValueError with the existing API's user-facing validation message.
    """
    if lat_value is None or lon_value is None:
        raise ValueError("Query parameters 'lat' and 'lon' are required and must be numbers.")
    try:
        lat = float(lat_value)
        lon = float(lon_value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Query parameters 'lat' and 'lon' are required and must be numbers.") from exc

    if not (-90 <= lat <= 90):
        raise ValueError("'lat' must be between -90 and 90.")
    if not (-180 <= lon <= 180):
        raise ValueError("'lon' must be between -180 and 180.")
    return lat, lon
