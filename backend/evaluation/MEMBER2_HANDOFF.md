# Member 2 — database, embeddings, matching and evaluation

Integrated with Member 3 on branch `feature/phase-2-pipeline`, based on Member 1 commit `1d2380f`. Originally developed on `feature/phase-2-triage`.

## Implemented

- Additive migration 0003 preserves old report/media rows as not_queued. Future rows start pending. Fresh schema includes identical migration SQL; an automated parity test prevents drift.
- report_analysis, issues, issue_reports and server-only triage_issue_facts. Counts, highest severity and languages derive from membership. Population is null unless an explicitly sourced/timestamped estimate is supplied.
- Atomic claim/renew, guarded partial analysis writes, processing/retry/terminal states, expiry recovery and max-attempt cleanup. Tokens fence stale workers.
- Short READ COMMITTED finalization transaction with one advisory lock and a fresh candidate snapshot. Repeated finalization returns the same membership. A forced-contention test proves two distinct reports for one new problem create one issue and two memberships.
- Exact category, 300-metre radius, active-status, embedding model/revision/text-version and asset-identifier guards. Cosine floor 0.80; combined score = 0.75*cosine + 0.25*spatial, minimum 0.82. Runner-up must meet hard guards/semantic floor; gap must be strictly greater than 0.05 to merge. A plausible runner-up may fall below the combined acceptance threshold. Ambiguity creates a new issue. Other-category reports do not auto-merge.
- Fixed seed coordinates and vectors. No centroids, approximate-coordinate map pins, or blind counters.
- Lazy CPU sentence-transformer; exact 384-dimensional finite normalized vectors. Explicit pinned commit required. Versioned deterministic embedding text and SHA-256. Inputs beyond the model's 128-token limit go to a typed failure, never silent landmark truncation.
- Supabase RPC repository, matcher-only corpus/evaluator, SQL integration tests, and actual six-report demonstration.

## Interfaces and configuration

`TriageRepository(client)` supplies claim, renew, save_analysis, write_state and finalize. `finalize_triage(report_id, lease_token)` uses the existing server-side Supabase client. Only RPCs perform production state/finalization mutations. No direct issue insert path exists in the repository.

`embed_record(AnalysisResult)` returns vector and reproducibility metadata; use it when persisting. `embed_analysis` offers the plan's list[float] interface. Reuse matching.py MatchPolicy for environment thresholds. SQL remains the only matcher, including in evaluation.

Required embedding settings:

```
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBEDDING_REVISION=e8f8c211226b894fcb81acc59f3b34ba3efd5f42
```

Optional MATCH_RADIUS_METERS, MATCH_MIN_SEMANTIC, MATCH_MIN_COMBINED, MATCH_MIN_MARGIN retain plan defaults. Policy version phase2-v1 and text version phase2-text-v1 are recorded. Changing policy/recipe requires version updates, not silently reinterpreting old links.

Migration prerequisites: existing reports schema and 0002 submission-ID migration, pgvector, Supabase roles anon/authenticated/service_role. Apply 0003 once to an existing project; fresh projects run schema.sql only. It is intentionally not an automatic startup migration. No shared/remote database was changed.

All new functions use fixed search paths and SECURITY INVOKER. PUBLIC/anon/authenticated execution is explicitly revoked; service_role alone receives execution. New tables have RLS and private access. The local fixture emulates Supabase baseline reports-table/schema grants for service_role.

## Actual verification

65 tests passed: 24 Member 1 tests and 41 Member 2 tests, including real PostgreSQL/pgvector transactions, migration, permission, lease, model-space, matching guard, and contention checks. No integration cases skipped in the recorded run. PostgreSQL 17.11 and pgvector 0.8.6 ran in an isolated local cluster. Supabase-hosted/PostgREST transport tests were NOT performed because the project credentials are absent. The repository RPC payloads have unit coverage; PostgreSQL functions have live integration coverage.

262 safe synthetic text reports: 150 development, 112 held-out (106 automatically grouped, six approximate-location review cases). Three seeded orders per split. All runs yielded pairwise precision=1.0, recall=1.0, F1=1.0. Review routing was 6/6 in held-out runs. Thresholds were not tuned on held-out results.

This is a controlled, templated benchmark with explicit asset IDs and supplied structured analysis. Original Tamil/Hindi text is stored with reference English translations; embeddings use the English analysis, as designed. No STT, translation or extraction model is evaluated here. Perfect results on these fixtures do NOT establish city-deployment or multilingual-audio accuracy. A broader independently authored corpus is needed before any such claim. The benchmark includes recurrence and ambiguous-candidate setups; separate DB tests enforce category/distance/approximate guards.

Results in evaluation/results include hashes, base commit plus dirty-tree flag, SQL implementation hash, pinned model, package versions, hardware, timestamp, seeds, pair counts, per-category/language/scenario metrics and error examples. Model files and environments remain outside Git. Dependency pins are in evaluation/requirements.txt for Member 3 to review; shared requirements/env/README were not changed.

## Reproduce

Use a local disposable PostgreSQL server with vector extension binaries and roles anon, authenticated and service_role (BYPASSRLS). An admin connection must be allowed to create databases. The harness creates random civicpulse_eval_* databases and drops only the ones it creates, never clears existing tables.

From backend, in the evaluation environment:

```
export TRIAGE_TEST_ADMIN_DSN='host=127.0.0.1 port=55432 dbname=postgres'
export EMBEDDING_REVISION=e8f8c211226b894fcb81acc59f3b34ba3efd5f42
python -m pytest tests -q
python -m evaluation.run_matching --admin-dsn "$TRIAGE_TEST_ADMIN_DSN" --output evaluation/results/new-run.json
python -m evaluation.demo_triage --admin-dsn "$TRIAGE_TEST_ADMIN_DSN" --output evaluation/results/new-demo.json
```

The corpus generator is deterministic. Ground-truth labels are read only by the metric function, never by embeddings or SQL matching. analysis_input is explicitly a controlled fixture, not an LLM result. The local server used for this run binds only 127.0.0.1:55432. Tests skip PostgreSQL cases if TRIAGE_TEST_ADMIN_DSN is absent; do not report those skipped tests as passed.

## Handoff to Member 3 / limitations

Review and apply the migration to a disposable Supabase project, verify the RPCs through the real backend client, then apply once to the team's shared development project. Configure model pins, map EmbeddingError input-length/review errors into review reasons, and preflight models before claiming. Claim returns the saved row including attempt, token and stage; renew periodically; save speech/extraction/embedding stages with the token; never finalize a review result. Member 3 still owns worker lifecycle, provider retries, operator tooling, priority and API wiring. Member 4 owns live dashboard integration. No live UI behavior has been changed.

Asset contradiction detection deliberately supports a narrow set of English exact identifiers (gate/pole/drain/lamp/asset/building/road plus alphanumeric number). It does not recognize arbitrary translated landmark synonyms or infer identities from coordinates. Browser coordinates are not verified. The repository relies on the server's validation and role; it does not establish reporter trust.
