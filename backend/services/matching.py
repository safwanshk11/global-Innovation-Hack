"""Matching configuration only. SQL is the single production/evaluation matcher."""
import math
import os
from dataclasses import dataclass

@dataclass(frozen=True)
class MatchPolicy:
    radius_meters: float = 300.0
    min_semantic: float = 0.80
    min_combined: float = 0.82
    min_margin: float = 0.05
    policy_version: str = 'phase2-v1'

    def __post_init__(self):
        values = (self.radius_meters, self.min_semantic, self.min_combined, self.min_margin)
        if not all(math.isfinite(v) for v in values) or not 0 < self.radius_meters <= 10000 or not all(0 <= v <= 1 for v in values[1:]) or not self.policy_version:
            raise ValueError('invalid_matching_configuration')

    @classmethod
    def from_env(cls):
        return cls(float(os.getenv('MATCH_RADIUS_METERS', '300')),
                   float(os.getenv('MATCH_MIN_SEMANTIC', '0.80')),
                   float(os.getenv('MATCH_MIN_COMBINED', '0.82')),
                   float(os.getenv('MATCH_MIN_MARGIN', '0.05')))
