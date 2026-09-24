from datetime import datetime,timedelta,timezone
from uuid import uuid4
import pytest
from contracts import IssueFacts
from services.priority import compute_priority,priority_tier

NOW=datetime(2026,9,24,tzinfo=timezone.utc)
def facts(**changes):
    data=dict(id=uuid4(),title='Reported pothole',description='A pothole near the entrance.',category='pothole',severity='low',
        status='open',corroboration_count=1,latitude=13.0,longitude=80.0,location_source='browser',created_at=NOW,updated_at=NOW,last_report_at=NOW)
    data.update(changes);return IssueFacts(**data)
@pytest.mark.parametrize('severity,expected',[('low',11),('medium',24),('high',65),('critical',90)])
def test_new_issue_floors(severity,expected):
    assert compute_priority(facts(severity=severity),NOW).score==expected
@pytest.mark.parametrize('score,tier',[(0,'low'),(39,'low'),(40,'medium'),(64,'medium'),(65,'high'),(89,'high'),(90,'critical'),(100,'critical')])
def test_tier_boundaries(score,tier):assert priority_tier(score)==tier

def test_missing_population_renormalized():
    p=compute_priority(facts(),NOW)
    assert sum(p.explanation['effectiveWeights'].values())==pytest.approx(1)
    assert 'population' not in p.explanation['weightedPoints']
    assert p.explanation['inputs']['population'] is None

def test_population_requires_source():
    with pytest.raises(ValueError):facts(estimated_affected_population=10)

def test_score_reconciles():
    p=compute_priority(facts(severity='critical',corroboration_count=3),NOW)
    e=p.explanation
    assert sum(e['weightedPoints'].values())+e['severityFloorAdjustment']+e['roundingAdjustment']==pytest.approx(p.score)

def test_age_moves_without_scheduled_updates():
    f=facts(created_at=NOW-timedelta(hours=12))
    early=compute_priority(f,NOW);late=compute_priority(f,NOW+timedelta(days=5))
    assert early.explanation['inputs']['ageDays']==0.5 and late.score>early.score

def test_corroboration_monotonic_and_saturates():
    scores=[compute_priority(facts(corroboration_count=n),NOW).score for n in range(1,101)]
    assert scores==sorted(scores) and len(set(scores[19:]))==1

def test_max_and_future_age():
    p=compute_priority(facts(severity='critical',corroboration_count=200,created_at=NOW-timedelta(days=100),
        estimated_affected_population=10000,population_source='Manual test estimate',population_estimated_at=NOW),NOW)
    assert p.score==100
    assert compute_priority(facts(created_at=NOW+timedelta(days=1)),NOW).explanation['inputs']['ageDays']==0
