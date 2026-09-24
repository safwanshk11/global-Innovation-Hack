"""Phase 2 understanding contracts; other pipeline contracts remain to be added."""
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
