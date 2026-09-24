"""Disposable PostgreSQL harness. Never clears an existing database."""
import json
import os
import uuid
from contextlib import contextmanager
from pathlib import Path
import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

@contextmanager
def disposable_database(admin_dsn):
    name = 'civicpulse_eval_' + uuid.uuid4().hex
    config = conninfo_to_dict(admin_dsn)
    if config.get('host') not in {'localhost', '127.0.0.1', '::1'}:
        raise ValueError('evaluation_requires_explicit_local_database')
    with psycopg.connect(admin_dsn, autocommit=True) as admin:
        admin.execute(sql.SQL('create database {}').format(sql.Identifier(name)))
        dsn = make_conninfo(admin_dsn, dbname=name)
        try:
            with psycopg.connect(dsn, autocommit=True) as db:
                db.execute(Path(__file__).parents[1].joinpath('schema.sql').read_text(), prepare=False)
                # Supabase normally supplies these existing baseline permissions.
                db.execute('grant usage on schema public,extensions to service_role; grant select,insert,update,delete on public.reports to service_role')
            yield dsn
        finally:
            admin.execute(sql.SQL('drop database {} with (force)').format(sql.Identifier(name)))

def saved_report(db, *, latitude=13.08, longitude=80.27, source='browser', **unused):
    return db.execute("insert into reports(audio_path,photo_path,latitude,longitude,location_source,submission_id) values('test/audio','test/photo',%s,%s,%s,%s) returning id", (latitude,longitude,source,uuid.uuid4())).fetchone()[0]

def claim(db):
    return db.execute('select claim_next_report()').fetchone()[0]

def persist(db, report_id, token, *, vector=None, category='pothole', location='gate 10', model='test', revision='test-revision', title='Pothole', summary='Pothole beside gate 10', language='en', review=None):
    vector = vector or [1.0]+[0.0]*383
    payload = dict(transcript_original=summary,transcript_en=summary,language_code=language,duration_seconds=10,
                   speech_model='test',category=category,severity='medium',title=title,summary_en=summary,
                   location_mention=location,severity_signals=[],review_reasons=review or [],extraction_model='test',
                   analysis_schema_version='1',pipeline_version='phase2-v1',embedding=str(vector),embedding_model=model,
                   embedding_revision=revision,embedding_text_version='phase2-text-v1',embedding_text=summary,
                   embedding_text_hash=__import__('hashlib').sha256(summary.encode()).hexdigest())
    db.execute('select triage_save_analysis(%s,%s,%s::jsonb)',(report_id,token,json.dumps(payload)))

def ready(db, **kwargs):
    rid = saved_report(db, **kwargs)
    c = claim(db)
    assert c['id'] == str(rid)
    accepted = {k:v for k,v in kwargs.items() if k not in {'latitude','longitude','source'}}
    persist(db,rid,c['lease_token'],**accepted)
    return rid,c['lease_token']

def finalize(db, rid, token, model='test', revision='test-revision'):
    return db.execute('select finalize_triage(%s,%s,%s,%s)',(rid,token,model,revision)).fetchone()[0]
