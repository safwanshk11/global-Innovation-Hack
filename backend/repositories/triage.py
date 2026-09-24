"""Supabase RPC boundary; worker performs inference outside SQL transactions."""
from dataclasses import asdict
from uuid import UUID
from contracts import AnalysisResult, SpeechResult
from services.embeddings import EmbeddingRecord, TEXT_VERSION, model_identity, validate_vector
from services.matching import MatchPolicy

class LostLease(RuntimeError):
    pass

class TriageRepository:
    def __init__(self, client): self.client = client

    def _rpc(self, name, args):
        try:
            return self.client.rpc(name, args).execute().data
        except Exception as exc:
            if 'lost_lease' in str(exc): raise LostLease('lost_lease') from None
            raise

    def claim(self, lease_seconds=600, max_attempts=3):
        return self._rpc('claim_next_report', dict(lease_seconds=lease_seconds, max_attempts=max_attempts))

    def renew(self, report_id, lease_token, lease_seconds=600):
        result = self._rpc('renew_report_lease', dict(report_id=str(UUID(str(report_id))), lease_token=str(UUID(str(lease_token))), lease_seconds=lease_seconds))
        if not result: raise LostLease('lost_lease')
        return result

    def write_state(self, report_id, lease_token, state, *, error_code=None, reasons=None, retry_seconds=5):
        return self._rpc('triage_write_state', dict(report_id=str(report_id), lease_token=str(lease_token), state=state,
                         error_code=error_code, reasons=reasons or [], retry_seconds=retry_seconds))

    def save_analysis(self, report_id, lease_token, *, speech: SpeechResult | None = None,
                      analysis: AnalysisResult | None = None, embedding: EmbeddingRecord | None = None):
        payload = {}
        if speech: payload.update(SpeechResult.model_validate(speech.model_dump()).model_dump())
        if analysis:
            payload.update(AnalysisResult.model_validate(analysis.model_dump()).model_dump())
            payload['analysis_schema_version'] = payload.pop('schema_version')
        if embedding:
            validate_vector(embedding.vector)
            payload.update(embedding.payload())
            # pgvector's JSON input is its textual array representation.
            payload['embedding'] = str(embedding.vector)
        return self._rpc('triage_save_analysis', dict(report_id=str(report_id), lease_token=str(lease_token), payload=payload))

    def finalize(self, report_id, lease_token, *, model=None, revision=None, policy=None):
        if model is None or revision is None: model, revision = model_identity()
        return self._rpc('finalize_triage', dict(report_id=str(report_id), lease_token=str(lease_token), active_model=model,
                         active_revision=revision, text_version=TEXT_VERSION, **asdict(policy or MatchPolicy.from_env())))

def finalize_triage(report_id: UUID, lease_token: UUID):
    from supabase_client import get_supabase_client
    return TriageRepository(get_supabase_client()).finalize(report_id, lease_token)
