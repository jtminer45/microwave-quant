# Deploying Longon Capital (React + FastAPI)

This is a two-service deploy: a FastAPI backend on **Render** and a React (Vite) frontend
on **Vercel**. The existing Streamlit app (`app.py` / `src/`) is untouched and deploys
separately on Streamlit Community Cloud as before — this is a new, parallel product.

## 1. Backend → Render

1. Push this repo to GitHub (if not already).
2. In the [Render dashboard](https://dashboard.render.com), click **New → Blueprint**,
   pick this repo. Render will detect `backend/render.yaml` automatically.
3. Render creates one web service (`longon-capital-api`) with a persistent disk mounted
   at `/var/data` for the user database — this is what survives redeploys.
4. Before the first deploy finishes, set the **`ANTHROPIC_API_KEY`** secret in the
   service's Environment tab (get one at [console.anthropic.com](https://console.anthropic.com)).
   Everything else (`JWT_SECRET`, `USERS_DB_PATH`) is generated/set automatically by the
   blueprint.
5. Once deployed, note the service URL — something like `https://longon-capital-api.onrender.com`.
6. Update `CORS_ORIGINS` in the Render environment settings to your Vercel domain once you
   have it (step 2 below), e.g. `https://longon-capital.vercel.app`. Comma-separate if you
   need more than one origin (e.g. a preview URL and the production domain).
7. Sanity check: `curl https://longon-capital-api.onrender.com/api/health` should return
   `{"status":"ok","service":"longon-capital-api"}`.

**Note:** Render's free tier spins down after inactivity — the first request after idle
takes ~30-60s to wake up. Fine for a review; upgrade the plan for always-on if needed.

## 2. Frontend → Vercel

1. In the [Vercel dashboard](https://vercel.com/new), import this repo.
2. Set the **Root Directory** to `frontend`.
3. Framework preset: **Vite** (auto-detected).
4. Add an environment variable: `VITE_API_BASE_URL` = your Render backend URL from step
   1.5 above (no trailing slash), e.g. `https://longon-capital-api.onrender.com`.
5. Deploy. Vercel builds with `npm run build` and serves `dist/` — `vercel.json` handles
   SPA client-side routing so refreshing on e.g. `/portfolio` doesn't 404.
6. Once live, go back to Render and set `CORS_ORIGINS` to this Vercel URL (step 1.6 above),
   then let the backend redeploy so the CORS headers match.

## 3. Verify end-to-end

1. Open the Vercel URL, create an account (username + password, no email).
2. Confirm the Market Overview page loads live NGX data.
3. Build a small portfolio on the Portfolio page, refresh, confirm it persisted.
4. If `ANTHROPIC_API_KEY` is set, confirm AI Commentary / Portfolio Analysis / the
   Assistant chat all respond. If not, they should show the "AI feature locked" panel
   instead of erroring.

## Local development

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET=dev-secret ANTHROPIC_API_KEY=sk-ant-...   # key optional locally
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173, reads .env.local for VITE_API_BASE_URL
```

Locally, both the FastAPI backend and the Streamlit app read the *same*
`data/users.db` (unless `USERS_DB_PATH` is set), so an account created in one works in
the other during local development. In production they're separate — the backend's
database lives on the Render persistent disk.
