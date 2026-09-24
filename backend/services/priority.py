"""Deterministic priority. No model calls, database calls or wall-clock reads."""
import math
from datetime import datetime
from contracts import IssueFacts, PriorityResult

PRIORITY_VERSION = 'phase2-v1'
SEVERITY = {'low':0.20,'medium':0.45,'high':0.75,'critical':1.0}
FLOORS = {'low':0,'medium':0,'high':65,'critical':90}

def priority_tier(score: int):
    return 'critical' if score>=90 else 'high' if score>=65 else 'medium' if score>=40 else 'low'

def compute_priority(issue_facts: IssueFacts, now: datetime) -> PriorityResult:
    if now.tzinfo is None:
        raise ValueError('timezone_required')
    age = max(0.0,(now-issue_facts.created_at).total_seconds()/86400)
    values = {'severity':SEVERITY[issue_facts.severity],
              'corroboration':min(math.log2(issue_facts.corroboration_count)/math.log2(20),1.0),
              'age':min(age/14,1.0)}
    weights = {'severity':0.45,'corroboration':0.25,'age':0.15}
    if issue_facts.estimated_affected_population is not None:
        values['population']=min(issue_facts.estimated_affected_population/1000,1.0)
        weights['population']=0.15
    else:
        weights={key:value/0.85 for key,value in weights.items()}
    points={key:100*weights[key]*value for key,value in values.items()}
    raw=sum(points.values())
    floor_adjustment=max(0.0,FLOORS[issue_facts.severity]-raw)
    score=math.floor(min(100,max(0,raw+floor_adjustment))+0.5)
    return PriorityResult(score=score,tier=priority_tier(score),explanation={
        'priorityVersion':PRIORITY_VERSION,'calculatedAt':now.isoformat(),
        'inputs':{'severity':issue_facts.severity,'linkedReports':issue_facts.corroboration_count,
                  'ageDays':age,'population':issue_facts.estimated_affected_population},
        'normalizedComponents':values,'effectiveWeights':weights,'weightedPoints':points,
        'severityFloor':FLOORS[issue_facts.severity],'severityFloorAdjustment':floor_adjustment,
        'rawScore':raw,'roundingAdjustment':score-(raw+floor_adjustment),'finalScore':score,
        'omittedPopulationReason':None if 'population' in values else 'No sourced population estimate is available.',
        'limitations':'Severity describes reported conditions. Linked reports count submissions, not verified unique people.'})
