"""Versioned embeddings. No model import/download at API import time."""
import hashlib
import math
import os
import re
from dataclasses import dataclass
from functools import lru_cache

from contracts import AnalysisResult

MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
TEXT_VERSION = 'phase2-text-v1'

class EmbeddingError(ValueError):
    """Safe configuration or input failure; worker must not substitute fake vectors."""

@dataclass(frozen=True)
class EmbeddingRecord:
    vector: list[float]
    model: str
    revision: str
    text: str
    text_hash: str
    text_version: str = TEXT_VERSION

    def payload(self):
        return dict(embedding=self.vector, embedding_model=self.model,
                    embedding_revision=self.revision, embedding_text_version=self.text_version,
                    embedding_text=self.text, embedding_text_hash=self.text_hash)

def validate_vector(vector):
    if len(vector) != 384 or any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) for x in vector):
        raise EmbeddingError('invalid_vector')
    if abs(math.sqrt(sum(x*x for x in vector))-1) >= 0.0001:
        raise EmbeddingError('unnormalized_vector')
    return [float(x) for x in vector]

def model_identity():
    model = os.getenv('EMBEDDING_MODEL', MODEL)
    revision = os.getenv('EMBEDDING_REVISION', '')
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise EmbeddingError('embedding_revision_must_be_pinned_commit')
    return model, revision

@lru_cache(maxsize=1)
def _load_model(model, revision):
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(model, revision=revision, device='cpu', trust_remote_code=False)

def embedding_text(analysis: AnalysisResult, runtime):
    if analysis.review_reasons:
        raise EmbeddingError('review_required')
    normalize = lambda value: ' '.join(value.split())
    # Place distinguishing location before summary, and reject overflow rather than
    # silently truncating a landmark away. Worker maps this to review.
    text = '\n'.join([analysis.category, normalize(analysis.title),
                       normalize(analysis.location_mention or ''), normalize(analysis.summary_en)])
    token_count = len(runtime.tokenizer(text, add_special_tokens=True, truncation=False)['input_ids'])
    if token_count > runtime.max_seq_length:
        raise EmbeddingError('embedding_input_too_long')
    return text

def embed_record(analysis: AnalysisResult) -> EmbeddingRecord:
    model, revision = model_identity()
    runtime = _load_model(model, revision)
    text = embedding_text(analysis, runtime)
    vector = validate_vector(runtime.encode(text, normalize_embeddings=True, show_progress_bar=False).tolist())
    return EmbeddingRecord(vector, model, revision, text, hashlib.sha256(text.encode()).hexdigest())

def embed_analysis(analysis: AnalysisResult) -> list[float]:
    return embed_record(analysis).vector
