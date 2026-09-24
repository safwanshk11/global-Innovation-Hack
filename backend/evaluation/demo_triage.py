"""Produce an actual SQL/embedding evidence snapshot, independent of the UI."""
import argparse
import json
from pathlib import Path
from datetime import datetime,timezone
import psycopg
from contracts import AnalysisResult
from services.embeddings import embed_record,model_identity
from evaluation.db_harness import disposable_database,ready,finalize

CASES=[
 ('First pothole','pothole','Deep pothole at gate 10','A deep hole in the road next to gate 10 is disrupting traffic.','gate 10',13.08,'browser'),
 ('Same problem, new wording','pothole','Road damage beside gate 10','There is a deep pothole by gate 10 and vehicles must swerve around it.','gate 10',13.08003,'browser'),
 ('Different category nearby','garbage','Rubbish at gate 10','A pile of garbage has not been collected outside gate 10.','gate 10',13.08,'browser'),
 ('Different physical asset','pothole','Pothole at gate 11','A deep hole in the road next to gate 11 is disrupting traffic.','gate 11',13.0801,'browser'),
 ('Similar complaint far away','pothole','Deep pothole at gate 10','A deep hole in the road next to gate 10 is disrupting traffic.','gate 10',13.10,'browser'),
 ('Approximate coordinates','pothole','Deep pothole at gate 10','A deep hole in the road next to gate 10 is disrupting traffic.','gate 10',13.08,'approximate'),
]
def main():
    p=argparse.ArgumentParser();p.add_argument('--admin-dsn',required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    model,revision=model_identity();rows=[]
    with disposable_database(args.admin_dsn) as dsn:
        with psycopg.connect(dsn,autocommit=True) as db:
            for label,category,title,summary,landmark,lat,source in CASES:
                a=AnalysisResult(category=category,severity='medium',title=title,summary_en=summary,location_mention=landmark,
                    severity_signals=[],review_reasons=[],extraction_model='controlled-demo-input',pipeline_version='phase2-v1')
                embedding=embed_record(a)
                rid,token=ready(db,latitude=lat,longitude=80.27,source=source,category=category,title=title,summary=summary,
                    location=landmark,vector=embedding.vector,model=model,revision=revision)
                if source=='approximate':
                    db.execute("select triage_write_state(%s,%s,'needs_review',null,'[\"approximate_location\"]')",(rid,token))
                    decision=dict(outcome='needs_review',issue_id=None,semantic_similarity=None,distance_meters=None,combined_score=None)
                else: decision=finalize(db,rid,token,model,revision)
                rows.append(dict(decision, label=label, report_id=str(rid)))
            counts=db.execute('select id,title,corroboration_count from triage_issue_facts order by created_at').fetchall()
    result=dict(timestamp=datetime.now(timezone.utc).isoformat(),model=model,revision=revision,
        method='Actual pinned embeddings and PostgreSQL finalization. Controlled synthetic analysis bypasses speech/extraction.',
        reports=rows,issues=[dict(id=str(i),title=t,linked_reports=n) for i,t,n in counts])
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
if __name__=='__main__': main()
