import os
from functools import lru_cache

from supabase import Client, create_client


class SupabaseNotConfigured(RuntimeError):
    pass


@lru_cache
def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SupabaseNotConfigured(
            "Supabase isn't configured yet. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in backend/.env (see README.md)."
        )
    return create_client(url, key)
