"""Safe worker-facing failures; no provider bodies or transcript text."""
class UnderstandingError(Exception):
    def __init__(self, code: str, *, retryable: bool = False, review: bool = False):
        super().__init__(code)
        self.code = code
        self.retryable = retryable
        self.review = review
