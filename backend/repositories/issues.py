"""Read a consistent DB statement snapshot, then rank with a shared timestamp."""
from datetime import datetime, timezone
from contracts import IssueFacts
from services.priority import compute_priority, PRIORITY_VERSION

COLUMNS = ','.join(IssueFacts.model_fields)
COUNT_MEANING = 'Linked reports count submissions, not verified unique people or proof of truth.'

class SnapshotLimitError(RuntimeError):
    pass

class IssuesRepository:
    def __init__(self,client): self.client=client

    def snapshot(self, *, category=None,status=None,issue_id=None):
        query=self.client.table('triage_issue_facts').select(COLUMNS,count='exact')
        if category: query=query.eq('category',category)
        if status: query=query.eq('status',status)
        if issue_id: query=query.eq('id',str(issue_id))
        # One PostgREST statement keeps facts and total count consistent. Refuse
        # an incomplete snapshot instead of inventing summaries from a page.
        result=query.order('id').range(0,9999).execute()
        rows=result.data or []
        if result.count is None or result.count!=len(rows):
            raise SnapshotLimitError('Issue snapshot exceeds the configured database row limit.')
        return [IssueFacts.model_validate(row) for row in rows]

    def list(self, *, now: datetime,category=None,status=None,limit=500):
        facts=self.snapshot(category=category,status=status)
        items=[serialize_issue(fact,now) for fact in facts]
        items.sort(key=lambda item:(-item['priorityScore'],item['createdAt'],item['id']))
        active=[item for item in items if item['status'] in ('open','in_progress')]
        return dict(items=items[:limit],totalCount=len(items),truncated=len(items)>limit,
                    summary=dict(activeIssueCount=len(active),criticalPriorityCount=sum(i['priorityScore']>=90 for i in active),
                                 linkedReportCount=sum(i['corroborationCount'] for i in active),
                                 averageDaysOpen=sum(max(0,(now-f.created_at).total_seconds()/86400) for f in facts if f.status.value in ('open','in_progress'))/len(active) if active else None),
                    calculatedAt=now.isoformat())

    def detail(self,issue_id, *, now: datetime):
        facts=self.snapshot(issue_id=issue_id)
        if not facts:return None
        fact=facts[0]
        result=serialize_issue(fact,now)
        result.update(priorityExplanation=compute_priority(fact,now).explanation,populationSource=fact.population_source,
                      matchingPolicyVersion='phase2-v1',reportCountMeaning=COUNT_MEANING)
        return result

def serialize_issue(fact: IssueFacts,now):
    priority=compute_priority(fact,now)
    return dict(id=str(fact.id),title=fact.title,description=fact.description,category=fact.category,
                severity=fact.severity,status=fact.status.value,corroborationCount=fact.corroboration_count,
                estimatedAffectedPopulation=fact.estimated_affected_population,
                daysOpen=max(0,int((now-fact.created_at).total_seconds()//86400)),
                location=dict(lat=fact.latitude,lng=fact.longitude,address=fact.address_label,source=fact.location_source),
                reportedLanguages=fact.reported_languages,priorityScore=priority.score,priorityTier=priority.tier,
                priorityVersion=PRIORITY_VERSION,createdAt=fact.created_at.astimezone(timezone.utc).isoformat(),updatedAt=fact.updated_at.astimezone(timezone.utc).isoformat())
