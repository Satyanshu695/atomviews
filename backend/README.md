# AtomViews FastAPI backend (migration branch)

This directory is an isolated migration scaffold. The existing Netlify
Functions and frontend remain unchanged and continue to define production
behavior until migration and compatibility testing are complete.

## Run locally

From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

On Windows PowerShell, activate the environment with
`.venv\\Scripts\\Activate.ps1`.

- Render health check: `GET /healthz` returns `{"status":"ok"}`.
- Compatibility health route: `GET /api/health` returns `{"status":"ok"}`.
- Interactive API docs: `/docs`.

## Render preview configuration (do not deploy yet)

- Root directory: repository root
- Build command: `pip install -r backend/requirements.txt`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/healthz`
- Branch: `migration/fastapi-audit`

Do not create a Render service or change production routing until separately
approved. The remaining routes will be migrated in small groups with
response-compatibility tests before any preview deployment.
