# CivicPulse Phase 3: Member 1 quality evidence

Copy the `backend/evaluation/phase3/` directory from this ZIP into the repo root. It contains only new files and does not replace any existing source. Run commands from `backend/` in the project's worker environment. This package records evidence; it does not claim that the real audio or vision evaluations have happened.

## Inputs and freeze

1. Keep the supplied independently written matching cases separate from the existing templated corpus. Add more cases to `independent_matching.json` **before** freezing, and keep `held_out` untouched while tuning. The included ten English text cases are a small independent smoke set, not enough to claim general matching quality.
2. Add 12 consented human recordings: four English, four Tamil and four Hindi. Put only local paths, SHA-256 hashes and de-identified references in `human_audio_manifest.json`. Fill `recordings` from the example shape and retain consent and language-speaker reviewer IDs. Do not commit audio or personally identifying transcripts.
3. Add real image pairs to `vision_pairs.json` with a documented system prediction, ground truth, reviewer and one of `true_positive`, `false_positive`, `true_negative`, `false_negative`, `inconclusive`. Preserve false positives and inconclusives. The existing repo has a photo upload but **no vision matcher**; this is an evidence register for a separately tested vision method, not a fabricated inference pipeline. Do not commit private images.
4. Configure the project's local PostgreSQL/pgvector admin DSN, extraction provider and pinned models as documented in the existing backend handoffs. Set `STT_MODEL`, `STT_REVISION` (resolved revision), `EXTRACTION_MODEL`, `EXTRACTION_BASE_URL`, `EMBEDDING_REVISION`, and applicable MATCH_* values. Never commit credentials. Install `backend/requirements-worker.txt` and use a disposable database as described in `backend/evaluation/MEMBER2_HANDOFF.md`.

Commands (fill media paths and credentials locally):

```bash
P=evaluation/phase3
python -m evaluation.phase3.quality freeze --independent "$P/independent_matching.json" --audio "$P/human_audio_manifest.json" --vision "$P/vision_pairs.json" --output "$P/results/freeze.json"
python -m evaluation.phase3.quality matching --freeze "$P/results/freeze.json" --independent "$P/independent_matching.json" --audio "$P/human_audio_manifest.json" --vision "$P/vision_pairs.json" --admin-dsn "$TRIAGE_TEST_ADMIN_DSN" --output "$P/results/matching.json"
python -m evaluation.phase3.quality audio --freeze "$P/results/freeze.json" --independent "$P/independent_matching.json" --audio "$P/human_audio_manifest.json" --vision "$P/vision_pairs.json" --media-dir /path/to/private/media --output "$P/results/audio.json"
python -m evaluation.phase3.quality vision --freeze "$P/results/freeze.json" --independent "$P/independent_matching.json" --audio "$P/human_audio_manifest.json" --vision "$P/vision_pairs.json" --media-dir /path/to/private/media --output "$P/results/vision.json"
python -m evaluation.phase3.quality card --freeze "$P/results/freeze.json" --independent "$P/independent_matching.json" --audio "$P/human_audio_manifest.json" --vision "$P/vision_pairs.json" --matching-result "$P/results/matching.json" --audio-result "$P/results/audio.json" --vision-result "$P/results/vision.json" --output "$P/results/metrics-card.md"
```

`audio` writes pending speaker-review status. A language speaker must compare each transcript, translation, complaint and failure against the reference and document their verdict in a separate reviewed record; don't mark pending outputs as accepted. Treat the manifest and results as private if they contain sensitive details. Do not publish model endpoint credentials. Re-freeze and re-run development after any policy, model, code or dataset change; do not tune on held-out results. The matching command uses the production SQL matcher in fresh disposable databases and three randomized input orders for each split. A failed model or missing database prevents a result, rather than producing guessed metrics.

The metrics card cites actual supplied run files, discloses pending evidence, and distinguishes synthetic matching from real media. Images alone do not establish visual quality without a recorded model prediction and reviewed ground truth.
