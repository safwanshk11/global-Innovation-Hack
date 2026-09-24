from types import SimpleNamespace
import pytest
from repositories.issues import IssuesRepository,SnapshotLimitError

class Query:
    def select(self,*a,**k):return self
    def order(self,*a,**k):return self
    def range(self,*a,**k):return self
    def execute(self):return SimpleNamespace(data=[],count=1001)
class Client:
    def table(self,name):return Query()

def test_partial_snapshot_is_not_a_fake_empty_queue():
    with pytest.raises(SnapshotLimitError):IssuesRepository(Client()).snapshot()

def test_limit_does_not_truncate_summary(monkeypatch):
    from datetime import datetime,timedelta,timezone
    from uuid import UUID
    from contracts import IssueFacts
    now=datetime(2026,9,24,tzinfo=timezone.utc)
    facts=[IssueFacts(id=UUID(int=i+1),title='Test issue',description='Test description',category='pothole',severity='critical',status='open',
             corroboration_count=2,latitude=13,longitude=80,location_source='browser',created_at=now-timedelta(hours=12),updated_at=now,last_report_at=now) for i in range(600)]
    repo=IssuesRepository(None);monkeypatch.setattr(repo,'snapshot',lambda **kw:facts)
    result=repo.list(now=now,limit=500)
    assert len(result['items'])==500 and result['totalCount']==600 and result['truncated']
    assert result['summary']==dict(activeIssueCount=600,criticalPriorityCount=600,linkedReportCount=1200,averageDaysOpen=0.5)
    assert [item['id'] for item in result['items']]==sorted(item['id'] for item in result['items'])
