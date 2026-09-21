-- CivicPulse reports table.
-- Run this once in the Supabase SQL editor for a new project.

create extension if not exists pgcrypto;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  -- Client-generated id for one submission attempt, reused across retries
  -- of that same attempt so the backend can no-op instead of double-saving.
  -- Nullable only so this column can be added to a table with existing
  -- rows; every new insert always sets it (see main.py).
  submission_id uuid unique,
  audio_path text not null,
  photo_path text not null,
  latitude double precision not null,
  longitude double precision not null,
  location_source text not null check (location_source in ('browser', 'approximate')),
  status text not null default 'received',
  created_at timestamptz not null default now()
);

-- Row Level Security is enabled with no policies, so anonymous/browser
-- clients get zero access by default. The backend talks to Supabase with
-- the service-role key, which bypasses RLS, so it needs no policy either.
alter table reports enable row level security;
