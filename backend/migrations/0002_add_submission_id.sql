-- Run once in the Supabase SQL editor against the existing project.
-- Adds the idempotency key used to stop duplicate-submission bugs (see
-- POST /api/reports in main.py). Safe on a table that already has rows —
-- submission_id is nullable, and Postgres allows multiple NULLs under a
-- unique constraint, so existing rows are left untouched.

alter table reports add column if not exists submission_id uuid;
alter table reports add constraint reports_submission_id_key unique (submission_id);
