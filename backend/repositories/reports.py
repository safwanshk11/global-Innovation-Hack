"""Receipts and local-operator actions. No transcripts or media in public reads."""
from uuid import UUID
from contracts import ReportReceipt, SAFE_ERROR_CODES

RECEIPT_COLUMNS = 'id,status,created_at,processing_status,processing_updated_at,processing_error_code,review_reasons,issue_reports(issue_id,outcome)'

class ReportsRepository:
    def __init__(self, client): self.client=client

    def receipt(self, report_id):
        rows=self.client.table('reports').select(RECEIPT_COLUMNS).eq('id',str(report_id)).execute().data
        if not rows: return None
        row=rows[0]
        membership=row.get('issue_reports')
        if isinstance(membership,list): membership=membership[0] if membership else None
        if row['processing_status']=='complete' and not membership:
            raise ValueError('inconsistent_membership')
        code=None if membership else row.get('processing_error_code')
        return ReportReceipt(report_id=row['id'],status=row['status'],created_at=row['created_at'],
            processing_status='complete' if membership else row['processing_status'],
            processing_updated_at=row['processing_updated_at'],issue_id=membership['issue_id'] if membership else None,
            match_outcome=membership['outcome'] if membership else None,error_code=code if code in SAFE_ERROR_CODES else ('processing_failed' if code else None),
            review_reasons=[] if membership else row.get('review_reasons',[]))

    def operator_list(self):
        return self.client.table('reports').select('id,processing_status,processing_attempts,processing_error_code,review_reasons,processing_updated_at').order('created_at',desc=True).limit(100).execute().data

    def retry(self, report_id):
        report_id=str(UUID(str(report_id)))
        rows=self.client.table('reports').select('id,processing_status').eq('id',report_id).execute().data
        if not rows: return 'unknown_report'
        if rows[0]['processing_status']=='complete': return 'refused_completed'
        eligible=['failed','needs_review','not_queued']
        if rows[0]['processing_status'] not in eligible: return 'refused_active'
        from datetime import datetime,timezone
        # One conditional UPDATE. A concurrent claimant/finalizer cannot be reset.
        updated=self.client.table('reports').update(dict(processing_status='pending',processing_attempts=0,
            processing_stage=None,next_attempt_at=None,lease_token=None,lease_expires_at=None,
            processing_error_code=None,review_reasons=[],processed_at=None,
            processing_updated_at=datetime.now(timezone.utc).isoformat())).eq('id',report_id).in_('processing_status',eligible).is_('lease_token','null').execute().data
        return 'queued' if updated else 'refused_state_changed'
