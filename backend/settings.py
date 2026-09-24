"""Validated lightweight settings. Importing these never imports model libraries."""
import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).with_name('.env')

def load_environment():
    load_dotenv(ENV_PATH)

@dataclass(frozen=True)
class WorkerSettings:
    poll_seconds: float = 2
    lease_seconds: int = 600
    max_attempts: int = 3
    pipeline_version: str = 'phase2-v1'

    def __post_init__(self):
        if not 0.1 <= self.poll_seconds <= 60 or not 3 <= self.lease_seconds <= 3600 or not 1 <= self.max_attempts <= 10 or not self.pipeline_version:
            raise ValueError('invalid_worker_configuration')

    @classmethod
    def from_env(cls):
        return cls(float(os.getenv('WORKER_POLL_SECONDS','2')), int(os.getenv('WORKER_LEASE_SECONDS','600')),
                   int(os.getenv('WORKER_MAX_ATTEMPTS','3')),os.getenv('PIPELINE_VERSION','phase2-v1'))
