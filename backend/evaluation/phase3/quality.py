"""Phase 3 evidence runner. Run from backend: python -m evaluation.phase3.quality ..."""
import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def write(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

def git_head():
    try:
        return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT.parent, text=True, stderr=subprocess.DEVNULL).strip()
    except (OSError, subprocess.CalledProcessError):
        return None

def freeze(args):
    from services.matching import MatchPolicy
    from services.embeddings import model_identity
    model, revision = model_identity()  # refuses an unpinned embedding revision
    if not os.getenv('STT_REVISION') or not os.getenv('STT_MODEL') or not os.getenv('EXTRACTION_MODEL') or not os.getenv('EXTRACTION_BASE_URL'):
        raise ValueError('Set STT_MODEL, STT_REVISION, EXTRACTION_MODEL, EXTRACTION_BASE_URL before freezing')
    policy = MatchPolicy.from_env().__dict__
    policy['policy_version'] = MatchPolicy().policy_version
    if not args.independent or not args.audio or not args.vision:
        raise ValueError('Supply independent matching cases, human audio manifest, and vision pairs')
    paths = {'existing_matching': ROOT / 'evaluation/matching_corpus.json', 'independent_matching': Path(args.independent), 'audio_manifest': Path(args.audio), 'vision_pairs': Path(args.vision), 'matching_sql': ROOT / 'migrations/0003_phase2_triage.sql', 'speech_code': ROOT / 'services/speech.py', 'extraction_code': ROOT / 'services/extraction.py'}
    for name, path in paths.items():
        if not path.is_file(): raise ValueError(f'Missing {name}: {path}')
    versions = {}
    for name in ('pydantic', 'psycopg', 'sentence-transformers', 'torch', 'transformers', 'faster-whisper', 'ctranslate2', 'av'):
        try: versions[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError: versions[name] = None
    result = {'created_at': datetime.now(timezone.utc).isoformat(), 'commit': git_head(), 'python': platform.python_version(), 'platform': platform.platform(), 'packages': versions, 'embedding_model': model, 'embedding_revision': revision, 'speech_model': os.environ['STT_MODEL'], 'speech_revision': os.environ['STT_REVISION'], 'extraction_model': os.environ['EXTRACTION_MODEL'], 'extraction_base_url': os.environ['EXTRACTION_BASE_URL'], 'pipeline_version': os.getenv('PIPELINE_VERSION', 'phase2-v1'), 'policy': policy, 'sha256': {name: digest(path) for name, path in paths.items()}}
    write(args.output, result)
    print(args.output)

def verify(freeze_file, independent, audio, vision):
    frozen = load(freeze_file)
    paths = {'existing_matching': ROOT / 'evaluation/matching_corpus.json', 'independent_matching': independent, 'audio_manifest': audio, 'vision_pairs': vision, 'matching_sql': ROOT / 'migrations/0003_phase2_triage.sql', 'speech_code': ROOT / 'services/speech.py', 'extraction_code': ROOT / 'services/extraction.py'}
    for name, path in paths.items():
        if digest(Path(path)) != frozen['sha256'][name]: raise ValueError(f'Frozen input changed: {name}; create a new freeze and report')
    return frozen

def matching(args):
    from contracts import AnalysisResult
    from services.embeddings import embed_record
    from evaluation.run_matching import run
    frozen = verify(args.freeze, args.independent, args.audio, args.vision)
    results = {'timestamp': datetime.now(timezone.utc).isoformat(), 'freeze_sha256': digest(Path(args.freeze)), 'freeze': frozen, 'datasets': {}}
    for label, path in [('existing', ROOT / 'evaluation/matching_corpus.json'), ('independent', Path(args.independent))]:
        cases = load(path)
        if not isinstance(cases, list) or not cases: raise ValueError(f'Empty/invalid {label} corpus')
        if len({r['case_id'] for r in cases}) != len(cases): raise ValueError(f'Duplicate case IDs in {label}')
        results['datasets'][label] = {}
        for split in ('development', 'held_out'):
            subset = [r for r in cases if r['split'] == split]
            if not subset: raise ValueError(f'No {split} cases in {label}')
            records = {r['case_id']: embed_record(AnalysisResult.model_validate(r['analysis_input'])) for r in subset}
            results['datasets'][label][split] = [run(subset, records, args.admin_dsn, seed) for seed in (11, 29, 47)]
            print(label, split, 'completed', flush=True)
    write(args.output, results)

def audio(args):
    from services.understanding import understand_audio
    from services.errors import UnderstandingError
    frozen = verify(args.freeze, args.independent, args.audio, args.vision)
    entries = load(args.audio)['recordings']
    if len(entries) != 12 or any(sum(r.get('language') == language for r in entries) != 4 for language in ('en', 'ta', 'hi')):
        raise ValueError('Require exactly four consented recordings each in en, ta, hi')
    if len({r['id'] for r in entries}) != len(entries): raise ValueError('Duplicate audio IDs')
    rows = []
    for r in entries:
        if r.get('consent') is not True or not r.get('speaker_reviewer') or not r.get('reference_transcript') or not r.get('expected_category'):
            raise ValueError(f'Missing consent, reviewer or reference labels: {r["id"]}')
        path = Path(args.media_dir) / r['file']
        if not path.is_file() or digest(path) != r['sha256']: raise ValueError(f'Audio missing or hash mismatch: {r["id"]}')
        outcome = {'id': r['id'], 'language': r['language'], 'file_sha256': r['sha256'], 'speaker_reviewer': r['speaker_reviewer'], 'human_review': 'pending', 'reference_transcript': r['reference_transcript'], 'expected_category': r['expected_category']}
        try:
            speech, analysis = understand_audio(path)
            outcome.update(status='processed', speech=speech.model_dump(), analysis=analysis.model_dump())
        except UnderstandingError as exc:
            outcome.update(status='review' if exc.review else 'failed', error_code=exc.code)
        rows.append(outcome)
    write(args.output, {'timestamp': datetime.now(timezone.utc).isoformat(), 'freeze_sha256': digest(Path(args.freeze)), 'model': frozen['speech_model'], 'results': rows, 'note': 'Speaker review is pending until each output is checked and annotated by its named reviewer.'})

def vision(args):
    frozen = verify(args.freeze, args.independent, args.audio, args.vision)
    rows = load(args.vision)['pairs']
    if not rows: raise ValueError('Add real paired vision observations before recording results')
    if len({r['id'] for r in rows}) != len(rows): raise ValueError('Duplicate vision pair IDs')
    for r in rows:
        if r.get('consent') is not True or r.get('outcome') not in ('true_positive', 'false_positive', 'true_negative', 'false_negative', 'inconclusive'):
            raise ValueError(f'Missing consent or explicit outcome: {r["id"]}')
        for key in ('first_image', 'second_image'):
            image = Path(args.media_dir) / r[key]['file']
            if not image.is_file() or digest(image) != r[key]['sha256']: raise ValueError(f'Missing/changed {key}: {r["id"]}')
        if not r.get('reviewer') or not r.get('rationale') or not r.get('prediction') or not r.get('ground_truth'):
            raise ValueError(f'Missing reviewer, prediction, truth or rationale: {r["id"]}')
    counts = {key: sum(r['outcome'] == key for r in rows) for key in ('true_positive', 'false_positive', 'true_negative', 'false_negative', 'inconclusive')}
    write(args.output, {'timestamp': datetime.now(timezone.utc).isoformat(), 'freeze_sha256': digest(Path(args.freeze)), 'counts': counts, 'pairs': rows, 'note': 'These are reviewed observations; the repository has no automated vision matching model.'})

def card(args):
    frozen = verify(args.freeze, args.independent, args.audio, args.vision)
    matching_result = load(args.matching_result) if args.matching_result else None
    audio_result = load(args.audio_result) if args.audio_result else None
    vision_result = load(args.vision_result) if args.vision_result else None
    for result in (matching_result, audio_result, vision_result):
        if result and result['freeze_sha256'] != digest(Path(args.freeze)): raise ValueError('Results use different frozen inputs')
    lines = ['# Phase 3 quality evidence', '', f"Freeze: `{digest(Path(args.freeze))}`; commit: `{frozen['commit']}`", '', '## Matching', '']
    if matching_result:
        for label, splits in matching_result['datasets'].items():
            for split, runs in splits.items():
                lines.append(f"- {label} / {split}: " + ', '.join(f"seed {r['seed']}: P={r['precision']:.3f}, R={r['recall']:.3f}, F1={r['f1']:.3f}, FP={r['fp']}, FN={r['fn']}, review={r['review_count']}" for r in runs))
    else: lines.append('Pending a PostgreSQL/pgvector matching run.')
    lines += ['', '## Human audio', '']
    if audio_result:
        counts = {k: sum(r['status'] == k for r in audio_result['results']) for k in ('processed', 'review', 'failed')}
        lines.append(f"12 consented recordings: {counts}; speaker-reviewed: {sum(r['human_review'] != 'pending' for r in audio_result['results'])}/12.")
    else: lines.append('Pending 12 consented recordings (4 each: English, Tamil, Hindi) and speaker review.')
    lines += ['', '## Vision pairs', '']
    lines.append(str(vision_result['counts']) if vision_result else 'Pending real image pairs, predictions and reviewer judgments.')
    lines += ['', '## Limits', '', '- Existing matching corpus is controlled synthetic text and bypasses speech and extraction.', '- The independent corpus must be authored without tuning on held-out labels. Keep held-out inputs untouched during tuning.', '- Audio results require native speaker review; generated model output is not a quality verdict.', '- Vision outcomes are manual evidence unless an actual vision system produces recorded predictions. Inconclusive observations remain inconclusive.', '- Never publish identifiable media, names or private location details in the result bundle.', '']
    Path(args.output).parent.mkdir(parents=True, exist_ok=True); Path(args.output).write_text('\n'.join(lines), encoding='utf-8')

def main():
    p = argparse.ArgumentParser(); s = p.add_subparsers(dest='command', required=True)
    for name in ('freeze', 'matching', 'audio', 'vision', 'card'):
        q=s.add_parser(name); q.add_argument('--output', required=True); q.add_argument('--independent', required=True); q.add_argument('--audio', required=True); q.add_argument('--vision', required=True)
        if name != 'freeze': q.add_argument('--freeze', required=True)
        if name == 'matching': q.add_argument('--admin-dsn', required=True)
        if name in ('audio', 'vision'): q.add_argument('--media-dir', required=True)
        if name == 'card':
            for key in ('matching-result', 'audio-result', 'vision-result'): q.add_argument('--'+key)
    args=p.parse_args(); globals()[args.command](args)

if __name__ == '__main__':
    try: main()
    except (ValueError, KeyError, OSError) as exc:
        print(f'Phase 3: {exc}', file=sys.stderr); sys.exit(2)
