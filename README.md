# CivicPulse

CivicPulse saves voice/photo/location reports, analyzes speech in a separate worker,
and conservatively groups reports into ranked civic issues. A report is a submission;
an issue is one physical problem. Submission IDs deduplicate retries, not people.

## Current integration state

- **Intake:** existing React form, private Supabase uploads, durable receipt and
  duplicate-request recovery remain intact.
- **Member 1:** multilingual speech/English translation and validated extraction
  adapters. English, Tamil and Hindi are selected for the human-recording evaluation.
- **Member 2:** additive schema, leased claims, fixed-anchor embeddings, atomic
  geographic/semantic matching and isolated evaluation.
- **Member 3:** separate worker, safe retries/recovery, operator commands,
  deterministic explained priority, and real issue/receipt API reads.
- **Member 4 is still pending:** the current staff UI still imports sample issues,
  and citizen pages still need real-state polling. A running backend does not make
  the existing dashboard a live-data view. Inspect `/docs` or `/api/issues` for the
  real backend results meanwhile.

Authentication, authorization, reporter ownership, abuse controls, dispatch,
closure and notifications remain later work. Run this phase with controlled test
reports. Public API responses exclude raw transcripts and media URLs, but issue
summaries are still model-produced and are not a substitute for access control.

## Setup

Use Node compatible with the existing lockfile and Python 3.13 (the tested local
worker used Python 3.13.7, macOS arm64). No frontend dependencies were upgraded.

Frontend:

```sh
cd frontend
npm ci
# Copy .env.example to .env only if no .env exists.
npm run dev
```

Frontend needs only `VITE_API_URL` (default `http://localhost:8000`). Browser audio
and geolocation require localhost or HTTPS. Set backend `FRONTEND_ORIGIN` to the
actual frontend origin, including its port; the current local review uses 5174.

API environment, from `backend/`:

```sh
python3.13 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
# Copy .env.example to .env only if no .env exists; preserve existing secrets.
uvicorn main:app --host 127.0.0.1 --port 8000
```

On Windows activate with `venv\Scripts\Activate.ps1`. All backend entry points load
`backend/.env` by absolute module-relative path. `/api/health` checks API liveness,
not provider/database readiness. The API never imports speech/embedding models.

### Supabase

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in backend `.env` only. Create
**private** buckets `complaint-audio` and `complaint-images`. Never commit or expose
the privileged key. Intake limits remain audio 10 MB and JPEG/PNG/WebP photo 5 MB.

- Fresh project: run `backend/schema.sql` once.
- Existing Phase 1 project: run `0002_add_submission_id.sql` if not already applied,
  then `0003_phase2_triage.sql`, in that order.
- Already migrated project: do not rerun schema.sql or 0003. Member 3 adds no new
  migration and uses Member 2's tables/functions.

Migration 0003 preserves old rows as `not_queued`; future rows default to `pending`.
RLS and RPC execution grants keep private analysis server-only. A designated owner
should apply migrations once, with disposable projects used for repeatability tests.

### Worker and models

Install the separate inference requirements in a worker environment (it may share
an environment with the API, but processes remain separate):

```sh
python -m pip install -r requirements-worker.txt
python worker.py --check   # checks database/model setup, claims nothing
python worker.py           # processes pending reports until stopped
```

`python worker.py --once` processes at most one claim. The first model download can
take several minutes. Preload before a demonstration. If Hugging Face's optional
Xet download stalls, `HF_HUB_DISABLE_XET=1` selects its standard download path.
Model caches remain outside Git.

The tested extraction runtime is the existing local Ollama service, using
`qwen2.5:7b` (digest `845dbda0ea48ed749caafd9e6037047aa19acfcfd82e704d7ca97d631a0b697e`).
Configure it explicitly; example files do not silently choose a provider:

```dotenv
EXTRACTION_BASE_URL=http://127.0.0.1:11434/v1
EXTRACTION_MODEL=qwen2.5:7b
EXTRACTION_API_KEY=
```

This uses the endpoint's Chat Completions JSON-object mode with Pydantic validation,
zero temperature and at most one corrective retry. Remote endpoints require HTTPS;
loopback runtimes may use HTTP. A coding-tool login is not an inference credential.
The runtime preflight exercises extraction on a synthetic sentence before claiming.
No real transcript is sent in that preflight.

Speech defaults to faster-whisper multilingual `small`, CPU/int8, pinned revision
`536b0662742c02347bc0e980a01041f333bce120`. Original text and English translation are
stored separately. The analysis limit is 120 seconds. Overlong speech is saved for
review (`insufficient_detail` with error `audio_too_long`).

Embeddings use `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, pinned
revision `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`. Every vector is normalized, finite
and 384-dimensional. Embedding inputs exceeding 128 model tokens require review;
no landmark is silently truncated.

Worker defaults: 2-second polling, 600-second renewable leases, three maximum
claims, and retry waits of 5 then 20 seconds. The `.env.example` lists all settings.
Configuration/model-loading failure stops preflight and leaves the queue pending.
Temporary audio is removed after transcription. Renewals continue during blocking
inference; loss of ownership stops further writes. SIGINT/SIGTERM stops new claims
and discards in-flight results at the next stage boundary. Crashes recover after
lease expiry. Retries deliberately recompute analysis instead of reusing stages
with potentially incompatible model/schema versions. Saved analysis remains
available privately even when a later stage fails.

## API contracts

- `POST /api/reports`: unchanged multipart fields `audio`, `photo`, `latitude`,
  `longitude`, `location_source`, `submission_id`. Successful response remains
  `{ "report_id": "uuid", "status": "received" }`. Duplicate submissions never
  reset analysis or add memberships. Failed persistence rolls back uploaded files.
- `GET /api/reports/{id}`: receipt plus `processing_status`,
  `processing_updated_at`, nullable `issue_id`/`match_outcome`, safe `error_code`
  and `review_reasons`. No transcript, paths, signed URLs or provider errors.
- `GET /api/issues?category=pothole&status=open&limit=500`: real database results
  in `{items,totalCount,truncated,summary,calculatedAt}`. Filters are optional;
  invalid enum/limit returns 422. Limit is 1–500. Items use the existing frontend
  camelCase field names, with nullable population/address and backend priority.
- `GET /api/issues/{id}`: summary plus `priorityExplanation`, `populationSource`,
  `matchingPolicyVersion` and report-count meaning. Direct refresh works.

Malformed/unknown IDs return 404. Database outages return sanitized 503 responses,
never a fabricated empty queue or sample-data fallback. A database with no issues
returns an honest empty list and `averageDaysOpen: null`.

Lists read one database-statement snapshot and use one UTC calculation time.
Summaries cover all filtered active issues before the response limit. To avoid
inconsistent multi-request pagination, the prototype refuses an incomplete snapshot
when PostgREST's configured row cap truncates it (503). Its standard 1,000-row cap
covers the planned evaluation scale; larger datasets require an aggregate snapshot
RPC or a deliberately increased cap. API `limit=500` still correctly reports totals
and summaries for a larger complete snapshot.

### Priority

Severity/corroboration/age/population weights are 0.45/0.25/0.15/0.15. Missing
population is omitted and remaining weights renormalized. Corroboration saturates
at 20 linked reports, age at 14 days. High severity floors score at 65; critical
floors at 90. Tiers are low 0–39, medium 40–64, high 65–89, critical 90–100.
Scores are recalculated on read so age advances without scheduled updates.
Explanations include inputs, effective weights, component points, floor and rounding
adjustments, timestamp and `phase2-v1`. Ties sort by creation time, then UUID.

Population stays null without recorded provenance. Linked reports count
submissions, not verified distinct citizens; extra submissions are not proof of
truth. Approximate fallback coordinates require review rather than grouping.

## Operator commands

```sh
python -m tools.triage_admin list
python -m tools.triage_admin retry --report-id <uuid>
```

List shows up to 100 recent report states without transcripts/media. Retry only
requeues one `failed`, `needs_review` or legacy `not_queued` report; it refuses
completed/active/unknown IDs. It resets attempts for the explicit operator retry,
never deletes uploads, and uses a conditional update to avoid racing a worker.
There is no public administrative retry endpoint.

## Verification and measured limitations

```sh
python -m pip install -r requirements-test.txt
# Explicit disposable LOCAL PostgreSQL with pgvector and Supabase-equivalent roles:
export TRIAGE_TEST_ADMIN_DSN='host=127.0.0.1 port=55432 dbname=postgres'
python -m pytest tests -q
```

The harness creates/drops only its own random `civicpulse_eval_*` databases. Never
point test setup or corpus ingestion at a real report table. Without the test DSN,
PostgreSQL tests are explicitly skipped and must not be reported as passing.
Production uses Supabase; test adapters with in-memory media exist only in tests.

Member 2's controlled benchmark contains 262 synthetic text cases and three input
orders per development/held-out split. It measured precision/recall/F1 of 1.0,
with six approximate cases routed to review. This templated corpus supplies
validated analysis and English reference translations: it does not measure STT,
LLM extraction, or city deployment accuracy. See the committed evaluation JSON
for hashes, seeds, model revision and runtime metadata.

Member 3's verification record is in `backend/evaluation/results/member3-integration.json`.
The local real-model audio smoke test uses generated English speech, not a human
speaker accuracy benchmark. The required twelve consented English/Tamil/Hindi
recordings and speaker review remain outstanding. No claim of all-language or
public-deployment readiness is made.

Frontend regressions are separately checked with `npm run lint` and `npm run build`
when Member 4 wires the UI. The existing in-memory draft is still lost on a full
reload before obtaining a receipt ID; durable offline drafts are outside this phase.
