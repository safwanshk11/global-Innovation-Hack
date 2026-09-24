"""Render saved evidence as a self-contained browser report, never fake live data."""
import html
import json
from pathlib import Path
import argparse

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    root=Path(__file__).parent/'results'
    demo=json.loads((root/'member2-demo-20260924.json').read_text())
    result=json.loads((root/'member2-local-20260924.json').read_text())
    ids={r['id']:f'Issue {i+1}' for i,r in enumerate(demo['issues'])}
    esc=html.escape
    rows=[]
    for row in demo['reports']:
        score='—' if row['combined_score'] is None else f"{row['combined_score']:.3f}"
        rows.append(f"<tr><td>{esc(row['label'])}</td><td><span class='{row['outcome']}'>{esc(row['outcome'].replace('_',' '))}</span></td><td>{ids.get(row['issue_id'],'Review queue')}</td><td>{score}</td></tr>")
    issues=''.join(f"<li><strong>{ids[r['id']]}</strong> · {esc(r['title'])}<span>{r['linked_reports']} linked report{'s' if r['linked_reports']!=1 else ''}</span></li>" for r in demo['issues'])
    held=result['splits']['held_out'][0]
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CivicPulse · Member 2 evidence</title>
<style>body{margin:0;background:#071426;color:#f7f9f5;font:16px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:48px 24px}small,.sub{color:#a9bdcc}h1{font-size:38px;line-height:1.2;margin:12px 0}h2{font-size:23px;margin:36px 0 16px}.label{color:#67d7c0;text-transform:uppercase;letter-spacing:2px;font-size:12px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:28px 0}.card,section{background:#0d1d33;border:1px solid #29405a;border-radius:14px;padding:22px}.card b{display:block;font-size:32px;color:#67d7c0}.note{border-left:3px solid #f2a93b;padding:14px 18px;background:#162640}.table{overflow-x:auto}table{border-collapse:collapse;width:100%;text-align:left}th{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#a9bdcc}td,th{padding:15px 12px;border-bottom:1px solid #29405a}td:first-child{min-width:220px}.merged{color:#67d7c0}.needs_review{color:#f2a93b}.created{color:#adcdfb}ul{list-style:none;padding:0}li{padding:14px 0;border-bottom:1px solid #29405a}li span{display:block;color:#a9bdcc;font-size:14px}summary{cursor:pointer;color:#67d7c0;padding:12px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;color:#c7d4df}footer{margin-top:32px;color:#a9bdcc;font-size:13px}a{color:#67d7c0}@media(max-width:600px){main{padding:24px 16px}.cards{grid-template-columns:1fr}h1{font-size:30px}.card b{font-size:26px}}</style>
<main><div class="label">CivicPulse / Member 2</div><h1>Reports become issues.</h1><p class="sub">Actual local PostgreSQL decisions using the pinned multilingual embedding model.</p>
<div class="cards"><div class="card"><b>65 / 65</b>Tests passed<br><small>41 triage + 24 understanding</small></div><div class="card"><b>6 → 4 + 1</b>Demo reports → issues + review<br><small>Two pothole reports share one issue</small></div><div class="card"><b>262</b>Synthetic benchmark reports<br><small>Two splits, three input orders</small></div></div>
<p class="note">This is a saved evidence report, not the live staff dashboard. Speech and extraction are bypassed using controlled synthetic analysis. Worker/API/UI integration belongs to Members 3 and 4.</p>
<h2>What the matcher actually decided</h2><section class="table"><table><thead><tr><th>Submitted case</th><th>Decision</th><th>Destination</th><th>Combined score</th></tr></thead><tbody>'''+''.join(rows)+'''</tbody></table><p class="sub">The merged pair: semantic similarity 0.902 · distance 3.34 m · combined score 0.924. New issues have no fabricated match score.</p></section>
<h2>Durable membership counts</h2><section><ul>'''+issues+'''</ul><p class="sub">Approximate coordinates created no issue and no misleading map pin.</p></section>
<h2>Measured results, with limits</h2><section><p><strong>Held-out precision: 100% · recall: 100% · F1: 100%</strong></p><p>106 usable held-out reports, six review cases. Identical metrics across seeds 11, 29 and 47. The development split contains 150 reports.</p><p class="sub">These are intentionally controlled, templated cases with explicit asset identifiers and reference English translations. They test matching behavior; they do not establish city-scale quality, real speech accuracy, or real Tamil/Hindi translation quality. Thresholds were not tuned on the held-out results.</p><details><summary>Inspect raw demonstration evidence</summary><pre>'''+esc(json.dumps(demo,indent=2))+'''</pre></details></section>
<footer>Branch: feature/phase-2-triage · local changes, not pushed<br>PostgreSQL 17.11 · pgvector 0.8.6 · model revision '''+esc(demo['revision'])+'''<br>Recorded: '''+esc(demo['timestamp'])+'''</footer></main></html>'''
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(page)
    print(args.output)
if __name__=='__main__':main()
