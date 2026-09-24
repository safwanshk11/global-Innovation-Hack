"""Generate a controlled matcher-only corpus, not a speech-quality benchmark."""
import json
from pathlib import Path

FACTS = {
 'pothole': ('a deep hole in the road','சாலையில் ஆழமான பள்ளம் உள்ளது','सड़क पर गहरा गड्ढा है'),
 'sewage': ('wastewater overflowing from a blocked drain','அடைபட்ட வடிகாலில் இருந்து கழிவுநீர் வெளியேறுகிறது','बंद नाली से गंदा पानी बह रहा है'),
 'garbage': ('an uncollected pile of rubbish','குப்பை அகற்றப்படாமல் குவிந்துள்ளது','कचरे का ढेर उठाया नहीं गया है'),
 'streetlight': ('a streetlight that stays dark at night','இரவில் தெருவிளக்கு எரியவில்லை','रात में सड़क की बत्ती नहीं जलती'),
 'water': ('a leaking drinking water pipe','குடிநீர் குழாயில் கசிவு உள்ளது','पीने के पानी की पाइप से रिसाव हो रहा है'),
}
DEV = ['There is {fact} beside gate {asset}.', 'Please inspect gate {asset}: {fact}.',
       'By gate {asset}, residents report {fact}.', '{fact} is the problem near gate {asset}.', 'I noticed {fact} next to gate {asset}.']
TEST = ['At the entrance marked gate {asset} we found {fact}.', 'Gate {asset} is where I am reporting {fact}.',
        'The area adjoining gate {asset} has {fact}.', 'My complaint concerns {fact}, close to gate {asset}.', 'Can someone check {fact} outside gate {asset}?']

def generate():
    rows=[]
    # 50 distinct physical issues, 5 reports each. Different gate identifiers and
    # spatial sites across splits; different sentence families across splits.
    for group in range(50):
        category=list(FACTS)[group%5]; fact,ta,hi=FACTS[category]
        split='development' if group<30 else 'held_out'
        asset=100+group
        lat=13.0+(group//10)*0.012
        lng=80.2+(group%2)*0.0004
        for j in range(5):
            language=['en','ta','hi','en','ta'][j]
            text=(DEV if split=='development' else TEST)[j].format(fact=fact,asset=asset)
            original=text if language=='en' else (f'வாயில் {asset} அருகில் {ta}.' if language=='ta' else f'गेट {asset} के पास {hi}।')
            rows.append(dict(case_id=f'g{group:02d}-r{j}',text_original=original,text_en_reference=text,
                language=language,latitude=lat+j*0.000015,longitude=lng+j*0.00001,location_source='browser',
                expected_category=category,expected_severity='medium',ground_truth_issue_id=f'physical-{group}',split=split,
                scenario_tags=['nearby_paraphrase','nearby_unrelated','exact_asset_identifier'],
                analysis_input=dict(category=category,severity='medium',title=f'{category} near gate {asset}',summary_en=text,
                    location_mention=f'gate {asset}',duration_days_claimed=None,severity_signals=[],review_reasons=[],
                    extraction_model='controlled-text-fixture',pipeline_version='phase2-v1')))
    # Explicitly unusable/approximate cases have a separate review denominator.
    for j in range(6):
        row=json.loads(json.dumps(rows[150+j*5]))
        row.update(case_id=f'approx-{j}',location_source='approximate',split='held_out',ground_truth_issue_id=f'review-{j}',scenario_tags=['approximate_location'])
        rows.append(row)
    for j in range(4):
        row=json.loads(json.dumps(rows[150+j*5]))
        row.update(case_id=f'singleton-{j}',latitude=13.20+j*0.012,ground_truth_issue_id=f'singleton-{j}',scenario_tags=['singleton','similar_text_far_apart'])
        rows.append(row)
    for j,scenario in enumerate(['resolved_recurrence','ambiguous_candidates']):
        row=json.loads(json.dumps(rows[150]))
        row.update(case_id=scenario,latitude=13.4+j*0.012,ground_truth_issue_id=scenario,scenario_tags=[scenario])
        if scenario=='ambiguous_candidates':
            row['analysis_input']['location_mention']=None
        rows.append(row)
    return rows

if __name__=='__main__':
    path=Path(__file__).with_name('matching_corpus.json')
    path.write_text(json.dumps(generate(),ensure_ascii=False,indent=2)+'\n')
    print(f'Wrote {len(generate())} cases to {path}')
