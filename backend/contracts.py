"""Phase 2 understanding, processing, priority and public API contracts."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Category = Literal['sewage', 'pothole', 'garbage', 'streetlight', 'water', 'other']
Severity = Literal['low', 'medium', 'high', 'critical']
ReviewReason = Literal['approximate_location', 'unclear_speech', 'insufficient_detail',
                       'multiple_issues', 'uncertain_category', 'invalid_extraction']

class Contract(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False, strict=True)

class SpeechResult(Contract):
    transcript_original: str = Field(min_length=1, max_length=16000)
    transcript_en: str = Field(min_length=1, max_length=16000)
    language_code: str | None = Field(default=None, max_length=16)
    duration_seconds: float = Field(gt=0)
    speech_model: str = Field(min_length=1, max_length=300)
    warnings: list[Literal['translation_applied']] = Field(default_factory=list)

class SeveritySignal(Contract):
    code: Literal['immediate_danger', 'reported_injury', 'health_risk', 'road_obstruction',
                  'service_disruption', 'vulnerable_site', 'persistence', 'minor_inconvenience']
    evidence: str = Field(min_length=1, max_length=240)

class ComplaintFields(Contract):
    category: Category
    severity: Severity
    title: str = Field(min_length=1, max_length=100)
    summary_en: str = Field(min_length=1, max_length=1200)
    location_mention: str | None = Field(default=None, max_length=200)
    duration_days_claimed: float | None = Field(default=None, ge=0)
    severity_signals: list[SeveritySignal] = Field(max_length=10)
    review_reasons: list[ReviewReason] = Field(max_length=6)

class AnalysisResult(ComplaintFields):
    schema_version: Literal['1'] = '1'
    extraction_model: str = Field(min_length=1)
    pipeline_version: str = Field(min_length=1)

# Phase 2 integration contracts. Internal validation accepts parsed API/DB values;
# public serializers explicitly whitelist fields instead of returning DB rows.
from datetime import datetime
from enum import Enum
from uuid import UUID
from pydantic import model_validator

class IssueStatus(str, Enum):
    open = 'open'
    in_progress = 'in_progress'
    resolved = 'resolved'

class ProcessingStatus(str, Enum):
    not_queued = 'not_queued'
    pending = 'pending'
    transcribing = 'transcribing'
    extracting = 'extracting'
    matching = 'matching'
    retry_wait = 'retry_wait'
    complete = 'complete'
    needs_review = 'needs_review'
    failed = 'failed'

class IssueFacts(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    id: UUID
    title: str = Field(min_length=1,max_length=100)
    description: str = Field(min_length=1,max_length=1200)
    category: Category
    severity: Severity
    status: IssueStatus
    corroboration_count: int = Field(ge=1)
    estimated_affected_population: int | None = Field(default=None,ge=0)
    population_source: str | None = None
    population_estimated_at: datetime | None = None
    latitude: float = Field(ge=-90,le=90)
    longitude: float = Field(ge=-180,le=180)
    address_label: str | None = None
    location_source: Literal['browser','approximate']
    reported_languages: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    last_report_at: datetime

    @model_validator(mode='after')
    def require_provenance_and_timezone(self):
        if self.estimated_affected_population is not None and (not self.population_source or not self.population_source.strip() or self.population_estimated_at is None):
            raise ValueError('population_provenance_required')
        if any(value.tzinfo is None for value in [self.created_at,self.updated_at,self.last_report_at]):
            raise ValueError('timezone_required')
        return self

class PriorityResult(BaseModel):
    score: int = Field(ge=0,le=100)
    tier: Literal['low','medium','high','critical']
    explanation: dict

class ReportReceipt(BaseModel):
    report_id: UUID
    status: Literal['received']
    created_at: datetime
    processing_status: ProcessingStatus
    processing_updated_at: datetime
    issue_id: UUID | None = None
    match_outcome: Literal['created','merged'] | None = None
    error_code: str | None = None
    review_reasons: list[ReviewReason] = Field(default_factory=list)

SAFE_ERROR_CODES = frozenset({
    'invalid_media','unclear_speech','audio_too_long','invalid_extraction','speech_inference_failed',
    'extraction_provider_error','extraction_unavailable','storage_unavailable','database_unavailable',
    'attempts_exhausted','invalid_vector','unnormalized_vector','embedding_input_too_long',
    'embedding_runtime_unavailable','invalid_analysis','processing_failed','model_unavailable',
})

class WireModel(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class IssueLocation(WireModel):
    lat: float = Field(ge=-90,le=90)
    lng: float = Field(ge=-180,le=180)
    address: str | None
    source: Literal['browser','approximate']

class IssueSummary(WireModel):
    id: UUID
    title: str
    description: str
    category: Category
    severity: Severity
    status: IssueStatus
    corroborationCount: int = Field(ge=1)
    estimatedAffectedPopulation: int | None = Field(ge=0)
    daysOpen: int = Field(ge=0)
    location: IssueLocation
    reportedLanguages: list[str]
    priorityScore: int = Field(ge=0,le=100)
    priorityTier: Literal['low','medium','high','critical']
    priorityVersion: str
    createdAt: datetime
    updatedAt: datetime

class IssueSummaryCounts(WireModel):
    activeIssueCount: int = Field(ge=0)
    criticalPriorityCount: int = Field(ge=0)
    linkedReportCount: int = Field(ge=0)
    averageDaysOpen: float | None = Field(ge=0)

class IssueListResponse(WireModel):
    items: list[IssueSummary]
    totalCount: int = Field(ge=0)
    truncated: bool
    summary: IssueSummaryCounts
    calculatedAt: datetime

class IssueDetail(IssueSummary):
    priorityExplanation: dict
    populationSource: str | None
    matchingPolicyVersion: str
    reportCountMeaning: str
