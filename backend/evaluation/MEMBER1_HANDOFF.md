# Member 1 handoff

Implemented: lazy process-cached speech adapter; original transcript plus separate English translation; duration/decode checks; JSON endpoint adapter; strict schema/evidence validation with one corrective retry; typed safe errors; orchestration; 24 unit tests. English, Tamil and Hindi are selected for evaluation.

Files: contracts.py, services/{errors,speech,extraction,understanding}.py, tests/test_understanding.py, evaluation/audio_manifest.json. The minimal contracts.py supplies the absent Member 3 prerequisite and needs integration review. Intake, database and frontend remain untouched.

Call from backend/: `services.understanding.understand_audio(Path(...))` returns SpeechResult and AnalysisResult. Worker may call transcribe_audio/extract_complaint separately to persist stages. Caller loads dotenv. Results with review_reasons must not enter matching. UnderstandingError exposes safe code, retryable and review attributes; queue scheduling belongs to Member 3.

Configuration: STT_MODEL=small, STT_DEVICE=cpu, STT_COMPUTE_TYPE=int8, STT_MAX_DURATION_SECONDS=120, EXTRACTION_BASE_URL, EXTRACTION_MODEL, EXTRACTION_API_KEY, PIPELINE_VERSION=phase2-v1. Base URL is the versioned Chat Completions compatible root (normally ending /v1). No provider/model is assumed. Requires JSON object response mode. HTTPS required except local loopback. Request timeout 60 seconds; transient provider retries belong to worker. Preflight runtime/config before claiming reports.

Dependency request for Member 3: Pydantic 2; faster-whisper and its decoding dependencies; pytest for tests. Unit tests used Python 3.14.7, Pydantic 2.13.5, pytest 9.1.1. No speech dependency compatibility or inference benchmark has been established. Select supported Python/hardware and tested pins before creating requirements-worker.txt. No shared requirements were edited.

Tests: 24 passed; run `python -m pytest tests/test_understanding.py -q` from backend. All model tests use explicit doubles. They establish control flow, NOT real language quality or injection resistance. Live inference, database integration and the 12-recording benchmark were not run: extraction runtime and consented recordings are unavailable. Manifest is honestly empty.

Example success: category=sewage, severity=high, title=Drain overflow, evidence='overflowing onto the road', review_reasons=[]. Example failure: invalid_extraction, review=True after two invalid outputs; no guessed result. Original transcript is preserved for non-English inputs.

Limitations: configure a pinned local STT snapshot path for reproducible identity; resolved revision/package metadata still needs worker integration. Evidence substring checks cannot establish semantic entailment. AI removal of personal information is not a reliable access-control boundary. Full decode precedes duration check, so decoded-media resource limits need hardening. Review code audio_too_long needs a shared enum mapping. Unclear complaint fields currently remain required by the supplied plan; worker must obey review flags. No queue/API wiring is included in this package.

Next: agree contracts/review codes, provision extraction runtime, obtain four consented recordings per selected language, measure and review with language speakers, then hand adapters to Member 3. No commit/push performed.
