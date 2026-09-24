"""Real embeddings + production SQL; requires explicit disposable local database.

Named offline harness bypasses STT/extraction using controlled analysis_input.
Ground-truth fields never enter embeddings, candidate lookup or SQL finalization.
"""
import argparse
import hashlib
import itertools
import json
import platform
import random
import subprocess
import time
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

import psycopg
from contracts import AnalysisResult
from evaluation.db_harness import disposable_database, ready, finalize
from services.embeddings import embed_record, model_identity
from services.matching import MatchPolicy

def metrics(cases, predicted):
    valid=[r for r in cases if r['location_source']=='browser']
    tp=fp=fn=0
    errors=[]
    for a,b in itertools.combinations(valid,2):
        truth=a['ground_truth_issue_id']==b['ground_truth_issue_id']
        same=predicted[a['case_id']]==predicted[b['case_id']]
        tp+=int(truth and same); fp+=int(not truth and same); fn+=int(truth and not same)
        if truth!=same and len(errors)<10: errors.append([a['case_id'],b['case_id'],'false_merge' if same else 'missed_merge'])
    precision=tp/(tp+fp) if tp+fp else 0.0
    recall=tp/(tp+fn) if tp+fn else 0.0
    return dict(tp=tp,fp=fp,fn=fn,precision=precision,recall=recall,f1=2*precision*recall/(precision+recall) if precision+recall else 0.0,
                raw_report_count=len(valid),predicted_issue_count=len({predicted[r['case_id']] for r in valid}),
                ground_truth_issue_count=len({r['ground_truth_issue_id'] for r in valid}),error_examples=errors)

def run(cases,records,dsn,seed):
    cases=list(cases);random.Random(seed).shuffle(cases)
    predictions={}; reviews=0
    model,revision=model_identity()
    with disposable_database(dsn) as target:
        with psycopg.connect(target,autocommit=True) as db:
            for row in cases:
                data=row['analysis_input']; record=records[row['case_id']]
                if 'resolved_recurrence' in row['scenario_tags'] or 'ambiguous_candidates' in row['scenario_tags']:
                    for landmark in (['gate 901'] if 'resolved_recurrence' in row['scenario_tags'] else ['gate 901','gate 902']):
                        seed_id,seed_token=ready(db,latitude=row['latitude'],longitude=row['longitude'],vector=record.vector,
                            category=data['category'],location=landmark,model=model,revision=revision,title=data['title'],summary=data['summary_en'])
                        seed_link=finalize(db,seed_id,seed_token,model,revision)
                        if 'resolved_recurrence' in row['scenario_tags']:
                            db.execute("update issues set status='resolved' where id=%s",(seed_link['issue_id'],))
                rid,token=ready(db,latitude=row['latitude'],longitude=row['longitude'],source=row['location_source'],
                    vector=record.vector,category=data['category'],location=data['location_mention'],model=model,revision=revision,
                    title=data['title'],summary=data['summary_en'],language=row['language'])
                if row['location_source']=='approximate':
                    db.execute("select triage_write_state(%s,%s,'needs_review',null,'[\"approximate_location\"]')",(rid,token))
                    predictions[row['case_id']]='review-'+row['case_id'];reviews+=1
                else:
                    predictions[row['case_id']]=finalize(db,rid,token,model,revision)['issue_id']
    result=metrics(cases,predictions)
    result.update(seed=seed,review_count=reviews,intended_review_count=sum(r['location_source']=='approximate' for r in cases),
        automatic_processing_coverage=(len(cases)-reviews)/len(cases),
        by_category={category:metrics([r for r in cases if r['expected_category']==category],predictions) for category in sorted({r['expected_category'] for r in cases})},
        by_language={lang:metrics([r for r in cases if r['language']==lang],predictions) for lang in sorted({r['language'] for r in cases})},
        by_scenario={tag:metrics([r for r in cases if tag in r['scenario_tags']],predictions) for tag in sorted({tag for r in cases for tag in r['scenario_tags']})})
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--admin-dsn',required=True)
    parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    corpus=Path(__file__).with_name('matching_corpus.json');cases=json.loads(corpus.read_text())
    started=time.monotonic();records={}
    for i,row in enumerate(cases):
        records[row['case_id']]=embed_record(AnalysisResult.model_validate(row['analysis_input']))
        if i%50==0: print(f'Embedded {i+1}/{len(cases)}',flush=True)
    result=dict(timestamp=datetime.now(timezone.utc).isoformat(),dataset_hash=hashlib.sha256(corpus.read_bytes()).hexdigest(),
        commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),working_tree_changes=True,
        implementation_hash=hashlib.sha256(Path(__file__).parents[1].joinpath('migrations/0003_phase2_triage.sql').read_bytes()).hexdigest(),
        model=model_identity(),hardware=platform.platform()+' '+platform.machine(),python=platform.python_version(),
        packages={p:version(p) for p in ('sentence-transformers','torch','transformers','psycopg')},
        policy=MatchPolicy().__dict__,limitations='Controlled templated matcher-only benchmark. Reference English translations and supplied analysis bypass STT/LLM. Not city or audio validation. No threshold tuning after held-out evaluation.',
        splits={})
    for split in ('development','held_out'):
        subset=[r for r in cases if r['split']==split]
        result['splits'][split]=[run(subset,records,args.admin_dsn,seed) for seed in (11,29,47)]
        print(split,[(r['precision'],r['recall']) for r in result['splits'][split]],flush=True)
    result['elapsed_seconds']=time.monotonic()-started
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(args.output)
if __name__=='__main__': main()
