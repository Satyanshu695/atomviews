"""AtomViews FastAPI backend scaffold.

The existing Netlify backend remains the production implementation until
all routes have been migrated and compatibility has been verified.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .utils.http import json_response

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
