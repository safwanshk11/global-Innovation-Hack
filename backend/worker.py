"""Single-process, database-backed worker. Run separately from the FastAPI app."""
import argparse
import json
import logging
import signal
import threading
import time
from pathlib import Path
from tempfile import TemporaryDirectory

from settings import WorkerSettings, load_environment
from contracts import SpeechResult, SAFE_ERROR_CODES
from repositories.triage import TriageRepository, LostLease
from services.embeddings import EmbeddingError
from services.errors import UnderstandingError

logger=logging.getLogger('civicpulse.worker')

class LeaseGuard:
    """Renew during blocking inference; any uncertainty fences this worker."""
    def __init__(self, repo, report_id, token, seconds):
        self.repo,self.report_id,self.token,self.seconds=repo,report_id,token,seconds
        self.stop=threading.Event(); self.lost=threading.Event()
        self.thread=threading.Thread(target=self._run,daemon=True)
    def _run(self):
        while not self.stop.wait(min(60,self.seconds/3)):
            try:self.repo.renew(self.report_id,self.token,self.seconds)
            except Exception:
                self.lost.set();return
    def __enter__(self): self.thread.start();return self
    def check(self):
        if self.lost.is_set():raise LostLease('lost_lease')
    def __exit__(self,*args):
        self.stop.set();self.thread.join(timeout=2)

class Runtime:
    def __init__(self):
        from services.extraction import JsonEndpoint,extract_complaint
        from services.speech import _runtime
        from services.embeddings import _load_model,model_identity
        # Validate the configured JSON service before loading speech models.
        self.endpoint=JsonEndpoint()
        probe=SpeechResult(transcript_original='There is a small pothole by gate 10.',
            transcript_en='There is a small pothole by gate 10.',language_code='en',
            duration_seconds=2.0,speech_model='configuration-probe')
        extract_complaint(probe,endpoint=self.endpoint)
        _runtime()
        self.model,self.revision=model_identity()
        _load_model(self.model,self.revision)
    def transcribe(self,path):
        from services.speech import transcribe_audio
        return transcribe_audio(path)
    def extract(self,speech):
        from services.extraction import extract_complaint
        return extract_complaint(speech,endpoint=self.endpoint)
    def embed(self,analysis):
        from services.embeddings import embed_record
        try:
            return embed_record(analysis)
        except EmbeddingError:
            raise
        except Exception:
            raise UnderstandingError('embedding_runtime_unavailable',retryable=True) from None

class Pipeline:
    def __init__(self,client,runtime,settings=None,*,repo=None,lease_repo=None,stop_event=None):
        self.client,self.runtime=client,runtime
        self.settings=settings or WorkerSettings.from_env()
        self.repo=repo or TriageRepository(client)
        self.lease_repo=lease_repo or self.repo
        self.stop_event=stop_event or threading.Event()

    def _log(self,row,stage,started,outcome,code=None):
        logger.info(json.dumps(dict(report_id=row['id'],stage=stage,duration_seconds=round(time.monotonic()-started,3),
            attempt=row['processing_attempts'],outcome=outcome,pipeline_version=self.settings.pipeline_version,
            policy_version='phase2-v1',error_code=code)))

    def process(self,row):
        rid,token=row['id'],row['lease_token'];stage='transcribing';started=time.monotonic()
        with LeaseGuard(self.lease_repo,rid,token,self.settings.lease_seconds) as guard:
            def check():
                guard.check()
                if self.stop_event.is_set():raise LostLease('worker_stopping')
            def transition(value):
                nonlocal stage,started
                check()
                if stage!=value:self._log(row,stage,started,'stage_complete')
                stage=value;started=time.monotonic();self.repo.write_state(rid,token,value)
                self._log(row,stage,started,'started')
            try:
                # Deliberately recompute on retry. This avoids reusing persisted
                # output from a different model/schema/recipe revision.
                transition('transcribing')
                with TemporaryDirectory(prefix='civicpulse-audio-') as folder:
                    try: audio=self.client.storage.from_('complaint-audio').download(row['audio_path'])
                    except Exception:raise UnderstandingError('storage_unavailable',retryable=True) from None
                    check()
                    if not audio or len(audio)>10*1024*1024:raise UnderstandingError('invalid_media')
                    path=Path(folder)/'recording';path.write_bytes(audio)
                    speech=self.runtime.transcribe(path)
                check();self.repo.save_analysis(rid,token,speech=speech)
                transition('extracting')
                analysis=self.runtime.extract(speech)
                analysis.pipeline_version=self.settings.pipeline_version
                check();self.repo.save_analysis(rid,token,analysis=analysis)
                reasons=list(analysis.review_reasons)
                if row['location_source']=='approximate' and 'approximate_location' not in reasons:
                    reasons.append('approximate_location')
                if reasons:
                    self.repo.write_state(rid,token,'needs_review',reasons=reasons)
                    self._log(row,stage,started,'needs_review');return
                transition('matching')
                embedding=self.runtime.embed(analysis)
                check();self.repo.save_analysis(rid,token,embedding=embedding)
                check();decision=self.repo.finalize(rid,token,model=embedding.model,revision=embedding.revision)
                self._log(row,stage,started,decision['outcome'])
            except LostLease:
                self._log(row,stage,started,'ownership_lost')
            except Exception as exc:
                try:check()
                except LostLease:
                    self._log(row,stage,started,'ownership_lost');return
                code=getattr(exc,'code',None)
                if isinstance(exc,EmbeddingError):code=str(exc)
                code=code if code in SAFE_ERROR_CODES else ('database_unavailable' if not isinstance(exc,(UnderstandingError,EmbeddingError)) else 'processing_failed')
                review=getattr(exc,'review',False) or code=='embedding_input_too_long'
                retryable=getattr(exc,'retryable',False) or code=='database_unavailable'
                if review:
                    state='needs_review'
                    reason=code if code in {'unclear_speech','invalid_extraction'} else 'insufficient_detail'
                elif retryable and row['processing_attempts']<self.settings.max_attempts:state='retry_wait'
                else:state='failed'
                try:
                    self.repo.write_state(rid,token,state,error_code=code,reasons=[reason] if review else [],
                        retry_seconds=5 if row['processing_attempts']==1 else 20)
                except Exception:
                    # State persistence failed: leave ownership to expire, never
                    # claim a terminal outcome succeeded or log raw DB exceptions.
                    self._log(row,stage,started,'state_unavailable',code);return
                self._log(row,stage,started,state,code)


def process_claimed_report(report_id,lease_token):
    """Worker integration entry point; called only with an existing owned claim."""
    from supabase_client import get_supabase_client
    client=get_supabase_client()
    row=client.table('reports').select('*').eq('id',str(report_id)).eq('lease_token',str(lease_token)).execute().data
    if not row:raise LostLease('lost_lease')
    Pipeline(client,Runtime()).process(row[0])


def main():
    load_environment()
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Preflight runtime/database without claiming any report')
    parser.add_argument('--once',action='store_true',help='Claim and process at most one report')
    args=parser.parse_args()
    logging.basicConfig(level=logging.INFO,format='%(message)s')
    # External clients must not emit request URLs or response bodies in logs.
    for name in ('httpx','httpcore','faster_whisper','huggingface_hub'):logging.getLogger(name).setLevel(logging.ERROR)
    try:
        settings=WorkerSettings.from_env()
        from supabase_client import get_supabase_client
        client=get_supabase_client()
        client.table('reports').select('id,processing_status').limit(0).execute()
        client.table('report_analysis').select('report_id').limit(0).execute()
        runtime=Runtime()
    except Exception as exc:
        code=getattr(exc,'code',None)
        if code not in SAFE_ERROR_CODES: code='configuration_or_runtime_unavailable'
        logger.error(json.dumps(dict(outcome='preflight_failed',error_code=code)))
        return 1
    logger.info(json.dumps(dict(outcome='preflight_ok',pipeline_version=settings.pipeline_version)))
    if args.check:return 0
    stop=threading.Event()
    for sig in (signal.SIGINT,signal.SIGTERM):signal.signal(sig,lambda *_:stop.set())
    # A separate SDK client for the heartbeat avoids mutating shared requests.
    import os
    from supabase import create_client
    renewal_client=create_client(os.environ['SUPABASE_URL'],os.environ['SUPABASE_SERVICE_ROLE_KEY'])
    pipeline=Pipeline(client,runtime,settings,lease_repo=TriageRepository(renewal_client),stop_event=stop)
    while not stop.is_set():
        try:row=pipeline.repo.claim(settings.lease_seconds,settings.max_attempts)
        except Exception:
            logger.error(json.dumps(dict(outcome='claim_failed',error_code='database_unavailable')))
            if args.once:return 1
            stop.wait(settings.poll_seconds);continue
        if row:pipeline.process(row)
        if args.once:return 0
        if not row:stop.wait(settings.poll_seconds)
    return 0

if __name__=='__main__':raise SystemExit(main())
