import os
import threading
import time
from datetime import datetime,timezone
from types import SimpleNamespace
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
import pytest
import psycopg
from fastapi.testclient import TestClient
import main
from contracts import SpeechResult,AnalysisResult
from services.embeddings import EmbeddingRecord
from services.errors import UnderstandingError
from repositories.triage import TriageRepository
from repositories.reports import ReportsRepository
from repositories.issues import IssuesRepository
from settings import WorkerSettings
from worker import Pipeline
from evaluation.db_harness import disposable_database
from pipeline_support import Client

@pytest.fixture
def client():
    dsn=os.getenv('TRIAGE_TEST_ADMIN_DSN')
    if not dsn:pytest.skip('TRIAGE_TEST_ADMIN_DSN required for worker integration')
    with disposable_database(dsn) as db:yield Client(db)
@pytest.fixture
def api(client,monkeypatch):
    monkeypatch.setattr(main,'get_supabase_client',lambda:client)
    with TestClient(main.app) as app:yield app

def submit(api,submission=None):
    return api.post('/api/reports',data=dict(latitude=13.08,longitude=80.27,location_source='browser',submission_id=str(submission or uuid4())),files=dict(audio=('voice.wav',b'controlled-test-audio','audio/wav'),photo=('photo.png',b'controlled-test-photo','image/png')))
class Runtime:
    def __init__(self,*,review=False,error=None):self.review,self.error=review,error;self.path=None
    def transcribe(self,path):
        self.path=path
        if self.error:raise self.error
        return SpeechResult(transcript_original='Pothole at gate 10.',transcript_en='Pothole at gate 10.',duration_seconds=2.0,speech_model='test',language_code='en')
    def extract(self,speech):
        return AnalysisResult(category='pothole',severity='critical',title='Pothole at gate 10',summary_en='Pothole at gate 10.',
            location_mention='gate 10',severity_signals=[],review_reasons=['multiple_issues'] if self.review else [],extraction_model='test',pipeline_version='phase2-v1')
    def embed(self,analysis):return EmbeddingRecord([1.0]+[0.0]*383,'test','test-revision','Pothole','hash')

def process(client,runtime=None):
    repo=TriageRepository(client);row=repo.claim();assert row
    Pipeline(client,runtime or Runtime(),WorkerSettings(),repo=repo).process(row)
    return row['id']

def test_saved_report_to_real_ranked_api(api,client):
    response=submit(api);assert response.status_code==200
    rid=response.json()['report_id']
    assert api.get('/api/reports/'+rid).json()['processing_status']=='pending'
    runtime=Runtime();assert process(client,runtime)==rid
    assert not runtime.path.exists()
    receipt=api.get('/api/reports/'+rid).json()
    assert receipt['processing_status']=='complete'
    assert set(receipt)=={'report_id','status','created_at','processing_status','processing_updated_at','issue_id','match_outcome','error_code','review_reasons'}
    queue=api.get('/api/issues').json()
    assert queue['items'][0]['priorityScore']>=90 and queue['summary']['linkedReportCount']==1
    detail=api.get('/api/issues/'+receipt['issue_id']).json()
    assert detail['priorityExplanation']['finalScore']==queue['items'][0]['priorityScore']
    assert detail['estimatedAffectedPopulation'] is None

def test_duplicate_concurrent_uploads(api,client):
    client.select_barrier=threading.Barrier(2);sid=uuid4()
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:submit(api,sid),range(2)))
    client.select_barrier=None
    assert all(r.status_code==200 for r in results)
    assert results[0].json()==results[1].json() and len(client.storage.files)==2
    with client.connection() as db:assert db.execute('select count(*) as n from reports').fetchone()['n']==1
    process(client)
    receipt=api.get('/api/reports/'+results[0].json()['report_id']).json()
    assert submit(api,sid).json()==results[0].json()
    assert api.get('/api/reports/'+receipt['report_id']).json()==receipt
    assert len(client.storage.files)==2

def test_upload_rollback(api,client):
    client.fail_insert=True
    assert submit(api).status_code==502 and not client.storage.files

def test_corrupt_media_is_saved_failure(api,client):
    rid=submit(api).json()['report_id']
    process(client,Runtime(error=UnderstandingError('invalid_media')))
    receipt=api.get('/api/reports/'+rid).json()
    assert receipt['processing_status']=='failed' and receipt['error_code']=='invalid_media'
    assert len(client.storage.files)==2

def test_review_and_approximate(api,client):
    rid=submit(api).json()['report_id'];process(client,Runtime(review=True))
    assert api.get('/api/reports/'+rid).json()['processing_status']=='needs_review'
    second=submit(api).json()['report_id']
    client.table('reports').update(dict(location_source='approximate')).eq('id',second).execute()
    process(client)
    assert api.get('/api/reports/'+second).json()['review_reasons']==['approximate_location']
    assert api.get('/api/issues').json()['totalCount']==0

def test_retry_same_report_recovers(api,client):
    rid=submit(api).json()['report_id']
    process(client,Runtime(error=UnderstandingError('extraction_unavailable',retryable=True)))
    assert api.get('/api/reports/'+rid).json()['processing_status']=='retry_wait'
    assert TriageRepository(client).claim() is None
    with client.connection() as db:db.execute("update reports set next_attempt_at=now()-interval '1 second'")
    assert process(client)==rid
    assert api.get('/api/reports/'+rid).json()['processing_status']=='complete' and len(client.storage.files)==2

def test_restart_and_stale_worker(api,client):
    rid=submit(api).json()['report_id'];old=TriageRepository(client).claim()
    with client.connection() as db:db.execute("update reports set lease_expires_at=now()-interval '1 second'")
    process(client)
    Pipeline(client,Runtime(),WorkerSettings()).process(old)
    assert api.get('/api/issues').json()['summary']['linkedReportCount']==1
    assert api.get('/api/reports/'+rid).json()['processing_status']=='complete'

def test_operator_retry_conditions(api,client):
    rid=submit(api).json()['report_id'];repo=ReportsRepository(client)
    assert repo.retry(uuid4())=='unknown_report' and repo.retry(rid)=='refused_active'
    process(client,Runtime(error=UnderstandingError('invalid_media')))
    assert repo.retry(rid)=='queued'
    process(client)
    assert repo.retry(rid)=='refused_completed'

@pytest.mark.parametrize('url',['/api/reports/','/api/issues/'])
def test_get_outages_are_not_not_found(api,client,url):
    assert api.get(url+'not-a-uuid').status_code==404
    assert api.get(url+str(uuid4())).status_code==404
    client.down=True
    response=api.get(url+str(uuid4()))
    assert response.status_code==503 and 'private' not in response.text

def test_filters_limits_and_no_fixtures(api,client):
    assert api.get('/api/issues').json()['items']==[]
    assert api.get('/api/issues?limit=0').status_code==422
    assert api.get('/api/issues?limit=501').status_code==422
    assert api.get('/api/issues?category=invalid').status_code==422
    assert api.get('/api/issues?status=invalid').status_code==422
    client.down=True
    assert api.get('/api/issues').status_code==503

def test_api_responsive_while_inference_runs(api,client):
    submit(api);entered=threading.Event();release=threading.Event()
    class Slow(Runtime):
        def transcribe(self,path):entered.set();release.wait(timeout=5);return super().transcribe(path)
    with ThreadPoolExecutor(max_workers=1) as pool:
        job=pool.submit(process,client,Slow());assert entered.wait(timeout=5)
        try:
            assert api.get('/api/health').json()=={'status':'ok'}
            assert api.get('/api/issues').status_code==200 and not job.done()
        finally:release.set()
        job.result(timeout=5)

def test_bounded_retries(api,client):
    rid=submit(api).json()['report_id']
    for attempt in range(3):
        process(client,Runtime(error=UnderstandingError('extraction_unavailable',retryable=True)))
        if attempt<2:
            assert api.get('/api/reports/'+rid).json()['processing_status']=='retry_wait'
            with client.connection() as db:db.execute("update reports set next_attempt_at=now()-interval '1 second'")
    assert api.get('/api/reports/'+rid).json()['processing_status']=='failed'
    assert TriageRepository(client).claim() is None and len(client.storage.files)==2

def test_database_write_outage_recovers_after_expiry(api,client,caplog):
    rid=submit(api).json()['report_id']
    class Outage(Runtime):
        def transcribe(self,path):
            value=super().transcribe(path);client.down=True;return value
    process(client,Outage());client.down=False
    assert api.get('/api/reports/'+rid).json()['processing_status']=='transcribing'
    assert 'private database details' not in caplog.text
    with client.connection() as db:db.execute("update reports set lease_expires_at=now()-interval '1 second'")
    process(client)
    assert api.get('/api/reports/'+rid).json()['processing_status']=='complete'

def test_lease_renews_during_long_stage(api,client):
    rid=submit(api).json()['report_id'];repo=TriageRepository(client)
    row=repo.claim(lease_seconds=3);entered=threading.Event();release=threading.Event()
    class Slow(Runtime):
        def transcribe(self,path):entered.set();release.wait(timeout=6);return super().transcribe(path)
    with ThreadPoolExecutor(max_workers=1) as pool:
        job=pool.submit(Pipeline(client,Slow(),WorkerSettings(lease_seconds=3)).process,row)
        assert entered.wait(timeout=2)
        try:
            time.sleep(3.2)
            with client.connection() as db:
                assert db.execute('select lease_expires_at>now() as alive from reports where id=%s',(rid,)).fetchone()['alive']
        finally:release.set()
        job.result(timeout=5)
    assert api.get('/api/reports/'+rid).json()['processing_status']=='complete'

def test_preflight_failure_does_not_claim(api,client,monkeypatch):
    import worker
    submit(api)
    monkeypatch.setattr('supabase_client.get_supabase_client',lambda:client)
    monkeypatch.setattr('sys.argv',['worker.py','--check'])
    def failed():raise UnderstandingError('invalid_extraction',review=True)
    monkeypatch.setattr(worker,'Runtime',failed)
    assert worker.main()==1
    with client.connection() as db:
        row=db.execute('select processing_status,processing_attempts from reports').fetchone()
        assert row=={'processing_status':'pending','processing_attempts':0}

def test_summary_before_limit_and_filters(api,client):
    for _ in range(3):submit(api);process(client)
    # Three reports merge into one issue; create a second by resolving the first.
    with client.connection() as db:db.execute("update issues set status='resolved'")
    submit(api);process(client)
    result=api.get('/api/issues?limit=1').json()
    assert len(result['items'])==1 and result['truncated'] and result['totalCount']==2
    assert result['summary']['activeIssueCount']==1 and result['summary']['linkedReportCount']==1
    assert api.get('/api/issues?status=resolved').json()['totalCount']==1
    assert api.get('/api/issues?category=water').json()['items']==[]

def test_stop_discards_late_model_output(api,client):
    rid=submit(api).json()['report_id'];row=TriageRepository(client).claim();stop=threading.Event()
    class Stopped(Runtime):
        def transcribe(self,path):
            output=super().transcribe(path);stop.set();return output
    runtime=Stopped();Pipeline(client,runtime,WorkerSettings(),stop_event=stop).process(row)
    assert not runtime.path.exists()
    assert api.get('/api/reports/'+rid).json()['processing_status']=='transcribing'
    assert api.get('/api/issues').json()['items']==[]

def test_storage_outage_does_not_repeat_upload(api,client):
    rid=submit(api).json()['report_id'];client.storage.fail_download=True
    process(client)
    assert api.get('/api/reports/'+rid).json()['processing_status']=='retry_wait'
    assert len(client.storage.files)==2
