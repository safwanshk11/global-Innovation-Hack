# CivicPulse

A triage layer for civic complaints: citizens report issues by voice, photo, and
location instead of a text form; staff see a ranked, de-duplicated queue instead of a
flat ticket list.

## Project structure

```
CivicPulse/
├── frontend/   React + Vite + TypeScript
└── backend/    FastAPI + Supabase
```

## Running it locally

### Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173. Voice recording and location sharing require the page to
be served over `localhost` or HTTPS — that's satisfied automatically in local dev.

### Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --port 8000
```

Check http://localhost:8000/api/health — it should return `{"status": "ok"}`.

(macOS/Linux: replace `venv\Scripts\Activate.ps1` with `source venv/bin/activate`.)

### Connecting Supabase (required for saved reports)

Without this, the app still runs — citizens can record and submit, but the backend
returns a clear "not configured" error instead of saving anything.

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run everything in `backend/schema.sql`.
3. In Storage, create two **private** buckets: `complaint-audio` and
   `complaint-images` (leave "Public bucket" unchecked on both).
4. In Project Settings → API, copy the Project URL and the **service_role** key.
5. Fill in `backend/.env`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
6. Restart the backend.

The service-role key bypasses row-level security and must never be exposed to the
frontend, committed, or logged — it's read from the backend's own environment only.

**If you already ran `schema.sql` before this commit**, your `reports` table is
missing the `submission_id` column the idempotency fix below depends on. Run
`backend/migrations/0002_add_submission_id.sql` once in the Supabase SQL editor to
add it — it's additive and safe to run against a table that already has rows. A
fresh project only needs `schema.sql`, which already includes this column.

## What works now

**Citizen side** — `/`, `/report`, `/report/processing`, `/report/success/:id`
- Real in-browser audio recording (with a supported-format check, a live timer, and
  an upload fallback for unsupported browsers), photo upload with preview, and
  browser geolocation with permission-denied retry and an approximate-location
  fallback.
- Client-side validation (file type/size) backed by the same checks on the server.
- Submitting uploads the report to the backend; the receipt page independently
  re-fetches the report from the API, so refreshing it still confirms the same
  report was saved.

**Staff side** — `/dashboard`, `/dashboard/issues/:id`
- Nine fictional issues in one area ("Ward 7, Rivermill District") covering sewage,
  potholes, garbage, streetlights, and a water leak.
- A priority score computed from each issue's severity, corroboration count,
  estimated affected population, and days open — the queue and summary cards are
  sorted by this, not hardcoded.
- Category and status filters, a Leaflet map (markers sized/colored by priority,
  with a list-only fallback if the map fails to render), and an issue detail view.
- These pages currently render from a local fixture file, not a live fetch — the
  backend exposes the same fixtures at `GET /api/issues` for future wiring, but the
  dashboard doesn't call it yet.

**Backend**
- `GET /api/health`
- `POST /api/reports` — multipart audio + photo + coordinates + a client-generated
  `submission_id`. Validates file types, sizes, and coordinate ranges; uploads to
  Supabase Storage; writes a `reports` row; rolls back any uploaded files if the
  database write fails. Returns a report id only once everything is actually saved.
  Idempotent on `submission_id` (unique-constrained in the DB): retrying the same
  submission attempt — including two requests that arrive concurrently — returns the
  already-saved report instead of creating a duplicate row or a second audio/photo
  pair.
- `GET /api/reports/{id}` — looks up a saved report; 404 for unknown ids, 503 if
  Supabase isn't configured yet.
- `GET /api/issues`, `GET /api/issues/{id}` — the same fixture issues shown on the
  dashboard.

## Not implemented yet

- Transcription, translation, and structured extraction from the audio
- Embeddings, semantic/geographic matching, and priority computed from real reports
  (instead of the fixture issues)
- Evidence-gated closure and reporter notifications
- Authentication and deployment

## Tech

- **Frontend:** React 19, Vite, TypeScript, React Router, Tailwind CSS v4, Lucide
  icons, React Leaflet
- **Backend:** FastAPI, Uvicorn, Supabase (Postgres + Storage)
