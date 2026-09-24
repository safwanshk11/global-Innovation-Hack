"""Lazy, process-cached faster-whisper adapter, intended for a worker only."""
import os
from functools import lru_cache
from pathlib import Path

from contracts import SpeechResult
from services.errors import UnderstandingError

@lru_cache(maxsize=1)
def _runtime():
    try:
        from faster_whisper import WhisperModel
        from faster_whisper.audio import decode_audio
        model_name = os.getenv('STT_MODEL', 'small')
        model = WhisperModel(model_name, device=os.getenv('STT_DEVICE', 'cpu'),
                             compute_type=os.getenv('STT_COMPUTE_TYPE', 'int8'))
        return model, decode_audio, model_name
    except Exception:
        raise UnderstandingError('speech_runtime_unavailable') from None

def _text(segments):
    # Iterating is essential: faster-whisper inference is lazy.
    return ' '.join(segment.text.strip() for segment in segments if segment.text.strip()).strip()

def transcribe_audio(audio_path: Path) -> SpeechResult:
    model, decode, model_name = _runtime()
    try:
        samples = decode(str(audio_path), sampling_rate=16000)
    except Exception:
        raise UnderstandingError('invalid_media') from None
    duration = len(samples) / 16000
    try:
        limit = float(os.getenv('STT_MAX_DURATION_SECONDS', '120'))
        if not 0 < limit <= 3600:
            raise ValueError()
    except ValueError:
        raise UnderstandingError('invalid_speech_configuration') from None
    if duration <= 0:
        raise UnderstandingError('unclear_speech', review=True)
    if duration > limit:
        raise UnderstandingError('audio_too_long', review=True)
    try:
        segments, info = model.transcribe(samples, task='transcribe', vad_filter=True,
                                          condition_on_previous_text=False, beam_size=5)
        original = _text(segments)
        if not original:
            raise UnderstandingError('unclear_speech', review=True)
        language = info.language
        if not language:
            raise UnderstandingError('unclear_speech', review=True)
        english = original
        if language != 'en':
            translated, _ = model.transcribe(samples, task='translate', language=language,
                                             vad_filter=True, condition_on_previous_text=False,
                                             beam_size=5)
            english = _text(translated)
        if not english or max(len(original), len(english)) > 16000:
            raise UnderstandingError('unclear_speech', review=True)
        return SpeechResult(transcript_original=original, transcript_en=english,
                            language_code=language, duration_seconds=duration,
                            speech_model=model_name,
                            warnings=['translation_applied'] if language != 'en' else [])
    except UnderstandingError:
        raise
    except Exception:
        raise UnderstandingError('speech_inference_failed', retryable=True) from None
