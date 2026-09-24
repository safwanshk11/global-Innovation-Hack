import math
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import psycopg
import pytest
from evaluation.db_harness import disposable_database, ready, finalize, saved_report, claim, persist
from services.embeddings import validate_vector, EmbeddingError, embedding_text
from services.matching import MatchPolicy

@pytest.fixture
def dsn():
    admin = os.getenv('TRIAGE_TEST_ADMIN_DSN')
    if not admin: pytest.skip('TRIAGE_TEST_ADMIN_DSN required for real PostgreSQL tests')
    with disposable_database(admin) as value: yield value
@pytest.fixture
def db(dsn):
    with psycopg.connect(dsn,autocommit=True) as c: yield c

def test_create_merge_and_idempotency(db):
    rid,token=ready(db); first=finalize(db,rid,token)
    assert first['outcome']=='created' and first['combined_score'] is None
    assert finalize(db,rid,token)==first
    rid2,token2=ready(db,summary='A hole in the road beside gate 10')
    second=finalize(db,rid2,token2)
    assert second['issue_id']==first['issue_id'] and second['outcome']=='merged'
    assert db.execute('select corroboration_count from triage_issue_facts').fetchone()[0]==2
    assert db.execute('select processing_status from reports where id=%s',(rid2,)).fetchone()[0]=='complete'

@pytest.mark.parametrize('change',[{'category':'garbage'},{'latitude':14.0},{'location':'gate 11'},{'category':'other'}])
def test_hard_guards(db,change):
    rid,t=ready(db); first=finalize(db,rid,t)
    rid,t=ready(db,**change); second=finalize(db,rid,t)
    assert first['issue_id']!=second['issue_id']

def test_resolved_not_reopened(db):
    rid,t=ready(db); first=finalize(db,rid,t)
    db.execute("update issues set status='resolved'")
    rid,t=ready(db); assert finalize(db,rid,t)['issue_id']!=first['issue_id']

@pytest.mark.parametrize('kwargs',[{'source':'approximate'},{'review':['multiple_issues']}])
def test_review_no_link(db,kwargs):
    rid,t=ready(db,**kwargs)
    with pytest.raises(psycopg.Error,match='review_required'): finalize(db,rid,t)
    assert db.execute('select count(*) from issue_reports').fetchone()[0]==0
    db.execute("select triage_write_state(%s,%s,'needs_review',null,'[\"approximate_location\"]')",(rid,t))
    assert claim(db) is None

def test_ambiguous_candidate_creates(db):
    rid,t=ready(db,location='gate 10'); finalize(db,rid,t)
    rid,t=ready(db,location='gate 11'); finalize(db,rid,t)
    rid,t=ready(db,location=None); assert finalize(db,rid,t)['outcome']=='created'
    assert db.execute('select count(*) from issues').fetchone()[0]==3

def test_wrong_model(db):
    rid,t=ready(db,revision='different')
    with pytest.raises(psycopg.Error,match='invalid_analysis'): finalize(db,rid,t)

def test_model_space_not_compared(db):
    rid,t=ready(db); finalize(db,rid,t)
    rid,t=ready(db,revision='new')
    assert finalize(db,rid,t,revision='new')['outcome']=='created'

def test_stale_lease_and_recovery(db):
    rid,old=ready(db)
    db.execute("update reports set lease_expires_at=now()-interval '1 second' where id=%s",(rid,))
    new=claim(db)
    assert new['lease_token']!=old and new['processing_attempts']==2
    assert db.execute('select renew_report_lease(%s,%s)',(rid,old)).fetchone()[0] is False
    with pytest.raises(psycopg.Error,match='lost_lease'): persist(db,rid,old)
    with pytest.raises(psycopg.Error,match='lost_lease'): finalize(db,rid,old)
    assert finalize(db,rid,new['lease_token'])['outcome']=='created'

def test_attempt_limit(db):
    rid,t=ready(db)
    db.execute("update reports set processing_attempts=3,lease_expires_at=now()-interval '1 second'")
    assert claim(db) is None
    assert db.execute('select processing_status from reports').fetchone()[0]=='failed'

def test_retry_wait_and_renew(db):
    rid,t=ready(db)
    assert db.execute('select renew_report_lease(%s,%s)',(rid,t)).fetchone()[0]
    db.execute("select triage_write_state(%s,%s,'retry_wait','provider_timeout','[]',5)",(rid,t))
    assert claim(db) is None
    db.execute("update reports set next_attempt_at=now()-interval '1 second'")
    assert claim(db)['processing_attempts']==2

def test_rpc_permissions(db):
    for role in ('anon','authenticated'):
        db.execute('set role '+role)
        with pytest.raises(psycopg.errors.InsufficientPrivilege): db.execute('select claim_next_report()')
        with pytest.raises(psycopg.errors.InsufficientPrivilege): db.execute('select * from report_analysis')
        db.execute('reset role')
    rid,t=ready(db)
    db.execute('set role service_role')
    assert finalize(db,rid,t)['outcome']=='created'
    db.execute('reset role')

def test_distance_boundaries(db):
    assert db.execute('select triage_distance_meters(0,0,0,0)').fetchone()[0]==0
    assert db.execute('select triage_distance_meters(0,0,1,0)').fetchone()[0]==pytest.approx(111194.9266)
    for distance in (299.999,300.001):
        latitude=math.degrees(distance/6371000)
        assert db.execute('select triage_distance_meters(0,0,%s,0)',(latitude,)).fetchone()[0]==pytest.approx(distance)

def test_invalid_vectors_at_database(db):
    rid=saved_report(db); t=claim(db)['lease_token']
    for vector in ([1.0]*383,[0.0]*384,[float('nan')]+[0.0]*383):
        with pytest.raises(psycopg.Error): persist(db,rid,t,vector=vector)
    assert db.execute('select count(*) from report_analysis').fetchone()[0]==0

def test_concurrent_finalization_proves_waiters(db,dsn):
    a=ready(db); b=ready(db)
    # Force both transactions into the advisory lock wait, then release.
    blocker=psycopg.connect(dsn,autocommit=True)
    blocker.execute('select pg_advisory_lock(7240293102::bigint)')
    def run(pair):
        with psycopg.connect(dsn,autocommit=True) as conn: return finalize(conn,*pair)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            jobs=[pool.submit(run,pair) for pair in (a,b)]
            try:
                deadline=time.monotonic()+5
                while time.monotonic()<deadline:
                    # Full bigint lock also represented by classid; exact key below.
                    waiting=db.execute("select count(*) from pg_locks where locktype='advisory' and not granted and classid=1 and objid=2945325806").fetchone()[0]
                    if waiting==2: break
                    time.sleep(0.01)
                assert waiting==2, 'did not exercise actual lock contention'
            finally: blocker.execute('select pg_advisory_unlock(7240293102::bigint)')
            results=[j.result(timeout=10) for j in jobs]
        assert results[0]['issue_id']==results[1]['issue_id']
        assert sorted(r['outcome'] for r in results)==['created','merged']
        assert db.execute('select corroboration_count from triage_issue_facts').fetchone()[0]==2
    finally: blocker.close()

@pytest.mark.parametrize('vector',[[1]*383,[0]*384,[float('nan')]+[0]*383,[float('inf')]+[0]*383])
def test_vector_validation(vector):
    with pytest.raises(EmbeddingError): validate_vector(vector)
def test_policy_validation():
    with pytest.raises(ValueError): MatchPolicy(radius_meters=float('nan'))
    with pytest.raises(ValueError): MatchPolicy(min_margin=-1)

def test_fresh_schema_migration_parity():
    root=Path(__file__).parents[1]
    assert root.joinpath('schema.sql').read_text().split('-- Phase 2 fresh-install schema (same SQL as migration 0003).\n')[1]==root.joinpath('migrations/0003_phase2_triage.sql').read_text()

def test_incremental_migration_preserves_legacy(dsn):
    # A separate disposable database is needed to exercise pre-migration rows.
    from psycopg import sql
    from psycopg.conninfo import make_conninfo
    name='civicpulse_eval_legacy_'+uuid.uuid4().hex
    admin=os.environ['TRIAGE_TEST_ADMIN_DSN']
    root=Path(__file__).parents[1]
    with psycopg.connect(admin,autocommit=True) as owner:
        owner.execute(sql.SQL('create database {}').format(sql.Identifier(name)))
        try:
            with psycopg.connect(make_conninfo(admin,dbname=name),autocommit=True) as old:
                baseline=root.joinpath('schema.sql').read_text().split('-- Phase 2 fresh-install schema')[0]
                old.execute(baseline)
                rid=saved_report(old)
                old.execute(root.joinpath('migrations/0003_phase2_triage.sql').read_text(),prepare=False)
                row=old.execute('select processing_status,audio_path,submission_id from reports where id=%s',(rid,)).fetchone()
                assert row[0]=='not_queued' and row[1]=='test/audio' and row[2] is not None
                assert claim(old) is None
                new=saved_report(old)
                assert claim(old)['id']==str(new)
                with pytest.raises(psycopg.errors.UniqueViolation):
                    old.execute("insert into reports(audio_path,photo_path,latitude,longitude,location_source,submission_id) values('a','p',1,1,'browser',%s)",(row[2],))
        finally: owner.execute(sql.SQL('drop database {} with(force)').format(sql.Identifier(name)))

def test_read_committed_required(db):
    rid,t=ready(db)
    db.execute('begin isolation level repeatable read')
    try:
        with pytest.raises(psycopg.Error,match='read_committed_required'): finalize(db,rid,t)
    finally: db.execute('rollback')

def test_null_population_and_provenance(db):
    rid,t=ready(db);finalize(db,rid,t)
    assert db.execute('select estimated_affected_population from issues').fetchone()[0] is None
    with pytest.raises(psycopg.errors.CheckViolation): db.execute('update issues set estimated_affected_population=100')

def test_stage_patch_preserves_speech(db):
    rid,t=ready(db)
    db.execute('select triage_save_analysis(%s,%s,%s::jsonb)',(rid,t,'{"title":"Updated pothole title"}'))
    assert db.execute('select transcript_en,title from report_analysis').fetchone()==('Pothole beside gate 10','Updated pothole title')

def test_low_semantic_cannot_merge(db):
    rid,t=ready(db);first=finalize(db,rid,t)
    vector=[0.79,math.sqrt(1-0.79**2)]+[0.0]*382
    rid,t=ready(db,vector=vector)
    assert finalize(db,rid,t)['issue_id']!=first['issue_id']

def test_embedding_refuses_truncation():
    from types import SimpleNamespace
    from contracts import AnalysisResult
    a=AnalysisResult(category='water',severity='low',title='Leak',summary_en='Water leak',severity_signals=[],review_reasons=[],extraction_model='test',pipeline_version='v1')
    runtime=SimpleNamespace(tokenizer=lambda *a,**kw:{'input_ids':list(range(129))},max_seq_length=128)
    with pytest.raises(EmbeddingError,match='embedding_input_too_long'): embedding_text(a,runtime)

def test_invalid_claim_configuration(db):
    for seconds,attempts in ((0,3),(600,0),(600,11)):
        with pytest.raises(psycopg.Error,match='invalid_claim_configuration'):
            db.execute('select claim_next_report(%s,%s)',(seconds,attempts))

def test_matching_stage_required_analysis(db):
    rid=saved_report(db);t=claim(db)['lease_token']
    with pytest.raises(psycopg.Error,match='invalid_analysis'): finalize(db,rid,t)
    assert db.execute('select count(*) from issues').fetchone()[0]==0

def test_unknown_report(db):
    with pytest.raises(psycopg.Error,match='unknown_report'): finalize(db,uuid.uuid4(),uuid.uuid4())

def test_asset_normalization(db):
    for a,b,want in [('Pole #A12','pole-a12',False),('pole A12','pole A13',True),('bus stop','market',False),('gate 10','pole 11',False)]:
        assert db.execute('select triage_asset_conflict(%s,%s)',(a,b)).fetchone()[0]==want

def test_two_workers_cannot_claim_same_report(db,dsn):
    saved_report(db)
    with ThreadPoolExecutor(max_workers=2) as pool:
        def run():
            with psycopg.connect(dsn,autocommit=True) as conn: return claim(conn)
        results=list(pool.map(lambda _:run(),range(2)))
    assert sum(r is not None for r in results)==1

def test_rls_and_all_rpc_grants(db):
    rid,t=ready(db)
    assert db.execute("select bool_and(relrowsecurity) from pg_class where oid in ('report_analysis'::regclass,'issues'::regclass,'issue_reports'::regclass)").fetchone()[0]
    names=('claim_next_report','renew_report_lease','triage_write_state','triage_save_analysis','finalize_triage')
    assert db.execute("select bool_and(not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('authenticated',p.oid,'execute')) from pg_proc p where proname=any(%s)",(list(names),)).fetchone()[0]
    db.execute('grant select on report_analysis to anon')
    db.execute('set role anon')
    assert db.execute('select count(*) from report_analysis').fetchone()[0]==0
    db.execute('reset role')


def test_same_report_concurrent_finalize(db,dsn):
    pair=ready(db)
    def run():
        with psycopg.connect(dsn,autocommit=True) as conn: return finalize(conn,*pair)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:run(),range(2)))
    assert results[0]==results[1]
    assert db.execute('select corroboration_count from triage_issue_facts').fetchone()[0]==1
