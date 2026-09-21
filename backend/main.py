import os
import uuid

from dotenv import load_dotenv

load_dotenv()  # must run before any os.getenv() calls below, including in other modules

from fastapi import FastAPI, File, Form, HTTPException, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from fixtures import SAMPLE_ISSUES, get_issue_by_id  # noqa: E402
from supabase_client import SupabaseNotConfigured, get_supabase_client  # noqa: E402

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app = FastAPI(title="CivicPulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_AUDIO_BYTES = 10 * 1024 * 1024
ACCEPTED_PHOTO_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
VALID_LOCATION_SOURCES = {"browser", "approximate"}

AUDIO_BUCKET = "complaint-audio"
PHOTO_BUCKET = "complaint-images"


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/reports")
async def create_report(
    audio: UploadFile = File(...),
    photo: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_source: str = Form(...),
    submission_id: str = Form(...),
):
    if location_source not in VALID_LOCATION_SOURCES:
        raise HTTPException(status_code=400, detail="Invalid location_source.")
    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Coordinates are out of range.")
    try:
        uuid.UUID(submission_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid submission_id.") from exc

    try:
        supabase = get_supabase_client()
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Idempotency: if this exact submission attempt (same client-generated
    # submission_id) already saved successfully — e.g. a retry after a
    # dropped response, or a duplicate request from the client — return the
    # existing report instead of uploading and inserting again.
    try:
        existing = (
            supabase.table("reports")
            .select("id, status")
            .eq("submission_id", submission_id)
            .execute()
        )
    except Exception as exc:
        if "submission_id" in str(exc) and "does not exist" in str(exc):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Database schema is out of date: run "
                    "backend/migrations/0002_add_submission_id.sql in the "
                    "Supabase SQL editor."
                ),
            ) from exc
        raise
    if existing.data:
        row = existing.data[0]
        return {"report_id": row["id"], "status": row["status"]}

    if photo.content_type not in ACCEPTED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail="Photo must be JPEG, PNG, or WebP.")
    photo_bytes = await photo.read()
    if len(photo_bytes) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Photo must be 5 MB or smaller.")

    if not (audio.content_type or "").startswith("audio/"):
        raise HTTPException(status_code=400, detail="Audio file must be an audio type.")
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Audio must be 10 MB or smaller.")

    report_id = str(uuid.uuid4())
    photo_ext = ACCEPTED_PHOTO_TYPES[photo.content_type]
    audio_ext = (audio.content_type or "audio/webm").split(";")[0].split("/")[-1] or "webm"
    photo_path = f"{report_id}/photo.{photo_ext}"
    audio_path = f"{report_id}/audio.{audio_ext}"

    uploaded: list[tuple[str, str]] = []
    try:
        supabase.storage.from_(PHOTO_BUCKET).upload(
            photo_path, photo_bytes, {"content-type": photo.content_type}
        )
        uploaded.append((PHOTO_BUCKET, photo_path))

        supabase.storage.from_(AUDIO_BUCKET).upload(
            audio_path, audio_bytes, {"content-type": audio.content_type or "audio/webm"}
        )
        uploaded.append((AUDIO_BUCKET, audio_path))

        supabase.table("reports").insert(
            {
                "id": report_id,
                "submission_id": submission_id,
                "audio_path": audio_path,
                "photo_path": photo_path,
                "latitude": latitude,
                "longitude": longitude,
                "location_source": location_source,
                "status": "received",
            }
        ).execute()
    except Exception as exc:
        # Two requests for the same submission_id can both pass the
        # idempotency check above before either has inserted (a real race,
        # not just the common retry case). The unique constraint on
        # submission_id then rejects the loser here — recover by returning
        # the winner's row instead of erroring, and clean up only this
        # request's now-redundant uploaded files.
        if _is_unique_violation(exc):
            for bucket, path in uploaded:
                try:
                    supabase.storage.from_(bucket).remove([path])
                except Exception:
                    pass
            winner = (
                supabase.table("reports")
                .select("id, status")
                .eq("submission_id", submission_id)
                .execute()
            )
            if winner.data:
                row = winner.data[0]
                return {"report_id": row["id"], "status": row["status"]}

        for bucket, path in uploaded:
            try:
                supabase.storage.from_(bucket).remove([path])
            except Exception:
                pass
        raise HTTPException(status_code=502, detail="Failed to save report. Please try again.") from exc

    return {"report_id": report_id, "status": "received"}


def _is_unique_violation(exc: Exception) -> bool:
    return getattr(exc, "code", None) == "23505" or "duplicate key value" in str(exc)


@app.get("/api/reports/{report_id}")
def get_report(report_id: str):
    try:
        supabase = get_supabase_client()
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        result = (
            supabase.table("reports")
            .select("id, status, created_at")
            .eq("id", report_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Report not found.") from exc

    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Report not found.")

    row = rows[0]
    return {"report_id": row["id"], "status": row["status"], "created_at": row["created_at"]}


@app.get("/api/issues")
def list_issues():
    return SAMPLE_ISSUES


@app.get("/api/issues/{issue_id}")
def get_issue(issue_id: str):
    issue = get_issue_by_id(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")
    return issue
