"""Member 1 orchestration; persistence and retry scheduling belong to the worker."""
from pathlib import Path
from contracts import AnalysisResult, SpeechResult
from services.speech import transcribe_audio
from services.extraction import extract_complaint

def understand_audio(audio_path: Path) -> tuple[SpeechResult, AnalysisResult]:
    speech = transcribe_audio(audio_path)
    return speech, extract_complaint(speech)
