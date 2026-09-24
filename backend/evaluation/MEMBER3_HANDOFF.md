# Member 3 — worker, priority, API and operations

Branch: `feature/phase-2-pipeline`, based on Member 1 commit `1d2380f`, including the Member 2 package and Member 3 integration. See Git history for the publication commit.

## Implemented behavior

The upload endpoint retains its multipart shape, storage rollback and submission-ID recovery. Storage SDK work now runs in FastAPI's sync endpoint thread pool, and media reads stop at each size limit plus one byte. A successful upload still returns only its durable receipt ID and `received` intake status.

The separately started worker performs model/configuration preflight before claiming. It privately downloads audio, transcribes/translates, validates extraction, embeds and finalizes through Member 2's RPCs. Temporary audio is removed. A separate client renews the lease during model inference. Stale/shutting-down workers discard late results. Transient failures wait 5 then 20 seconds, at most three claims. Saved reports/uploads survive all analysis failures. Retry recomputes stages rather than reusing mismatched model outputs.

Priority is a pure function with UTC elapsed age, saturating report counts, optional sourced population, severity floors, half-up rounding and shared badge boundaries. Read responses contain component points, weights, floor and rounding adjustments, calculation time and version.

Issue APIs read database facts, not fixtures. List filters/limits are validated; order and summary come from one complete database-statement snapshot. Infrastructure failures return sanitized 503, unknown/malformed IDs 404. Receipts expose only safe state/link fields. OpenAPI includes typed public response schemas.

Operator commands list bounded report states or explicitly retry one failed/review/legacy report. Retry refuses completed/active/unknown records and performs a conditional update; it never creates another upload.

## Interfaces for Member 4

- POST remains backward compatible.
- GET report adds processing_status, processing_updated_at, issue_id, match_outcome, error_code and review_reasons.
- GET issues returns items/totalCount/truncated/summary/calculatedAt, replacing the old fixture array. Summary describes all filtered active issues before the response limit.
- GET issue detail adds priorityExplanation, populationSource, matchingPolicyVersion and reportCountMeaning.
- Population and address are nullable. Status means municipal state on issues, intake state on reports, and separate processing_status for analysis.
- Only the backend calculates live priority. Remove runtime fixture imports and synthetic processing timers in Member 4; those frontend changes are intentionally not part of this package.

## Files and configuration

Added settings.py, worker.py, services/priority.py, repositories/reports.py, repositories/issues.py, tools/triage_admin.py, requirements-worker.txt, requirements-test.txt and focused tests. Extended contracts.py, main.py, README, .env.example, and backend dependency pins. Small integration fixes in Member 1's adapters add pinned speech identity and improve real-model JSON/evidence instructions; no guessed analysis fallback exists.

Supabase URL/key stay server-side. Existing local secrets were preserved. Missing local model settings were added to ignored backend/.env: loopback Ollama/qwen2.5:7b and pinned speech/embedding revisions. No model files or environments are in Git. The API imports successfully in the lightweight environment without torch/faster-whisper.

Member 2 migration 0003 is required. The configured project already had it; no new migration was applied. Both existing media buckets were found public and changed to private, as required by the project design.

## Verification

104 tests passed with no skips in the local PostgreSQL run. This includes 24 Member 1, 41 Member 2 and 39 Member 3 cases. The test suite uses real disposable PostgreSQL/pgvector and a test-only Supabase-shaped transport with memory-backed storage. It covers concurrent duplicate uploads, rollback, worker expiry/reclaim, stale results, heartbeat renewal during a blocked stage, database/storage outages, retries, operator restrictions, complete summary before limit and API responsiveness during inference. One upstream Starlette/AnyIO deprecation warning remains; unrelated API versions were not upgraded.

Real Supabase reads, bucket privacy, a generated-English-audio submission and real-model pipeline results are recorded separately in `results/member3-integration.json`. The saved report completed on its first claim, created a pothole issue with priority 11, and retained exactly one linked report after a repeated upload with the same submission ID. The worker is running locally. The audio is generated speech, not one of the twelve consented human recordings required for the full language benchmark. Never interpret the unit-test count or smoke test as English/Tamil/Hindi accuracy.

## Known limits and next work

- Member 4 must wire the existing UI. The old dashboard remains sample-driven.
- A one-query snapshot above PostgREST's configured row cap fails honestly with 503 rather than silently producing wrong summaries. The planned hundreds-of-reports dataset fits the standard cap; scaling needs an aggregate RPC or deliberately raised cap.
- Authentication, ownership, rate limits, misuse protection, verified identities, municipal resolution and notifications remain deferred. Reports linked are submissions, not proven unique people.
- Local Ollama must be running. Model hardware/download/runtime quality affects latency. Review/failed is a durable outcome, not a request to upload again.
- The worker must remain running for new pending reports to progress; API liveness does not mean model/database readiness. Use `python worker.py --check` for preflight.
- Twelve consented human recordings with English/Tamil/Hindi speaker review remain required for the full Phase 2 audio acceptance gate.
