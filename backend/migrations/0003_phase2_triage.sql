-- Additive Phase 2 migration. Apply once after 0002; existing media stays untouched.
begin;
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
set local search_path = public, extensions, pg_temp;

alter table public.reports
 add column processing_status text not null default 'not_queued'
   check (processing_status in ('not_queued','pending','transcribing','extracting','matching','retry_wait','complete','needs_review','failed')),
 add column processing_stage text check (processing_stage in ('transcribing','extracting','matching')),
 add column processing_attempts integer not null default 0 check (processing_attempts >= 0),
 add column next_attempt_at timestamptz,
 add column lease_token uuid,
 add column lease_expires_at timestamptz,
 add column processing_error_code text check (processing_error_code ~ '^[a-z_]{1,64}$'),
 add column review_reasons jsonb not null default '[]' check (jsonb_typeof(review_reasons) = 'array'),
 add column pipeline_version text,
 add column processing_updated_at timestamptz not null default now(),
 add column processed_at timestamptz;
-- Old rows retain not_queued; only future rows default to pending.
alter table public.reports alter column processing_status set default 'pending';
create index reports_claimable on public.reports(processing_status, next_attempt_at, lease_expires_at);

create table public.report_analysis (
 report_id uuid primary key references public.reports(id),
 transcript_original text, transcript_en text, language_code text, duration_seconds double precision,
 speech_model text, warnings jsonb not null default '[]',
 category text check(category in ('sewage','pothole','garbage','streetlight','water','other')),
 severity text check(severity in ('low','medium','high','critical')),
 title text check(length(btrim(title)) between 1 and 100),
 summary_en text check(length(btrim(summary_en)) between 1 and 1200),
 location_mention text check(length(location_mention)<=200),
 duration_days_claimed double precision check(duration_days_claimed>=0 and duration_days_claimed<'Infinity'::float8),
 severity_signals jsonb not null default '[]', review_reasons jsonb not null default '[]',
 extraction_model text, analysis_schema_version text, pipeline_version text,
 embedding vector(384), embedding_model text, embedding_revision text, embedding_text_version text,
 embedding_text text, embedding_text_hash text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(duration_seconds > 0 and duration_seconds < 'Infinity'::float8),
 check(embedding is null or abs(vector_norm(embedding)-1)<0.0001),
 check(jsonb_typeof(review_reasons)='array' and jsonb_typeof(severity_signals)='array' and jsonb_typeof(warnings)='array')
);
create table public.issues (
 id uuid primary key default gen_random_uuid(), seed_report_id uuid not null unique references public.reports(id),
 title text not null check(length(btrim(title)) between 1 and 100), description text not null,
 category text not null check(category in ('sewage','pothole','garbage','streetlight','water','other')),
 status text not null default 'open' check(status in ('open','in_progress','resolved')),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 address_label text, location_source text not null check(location_source in ('browser','approximate')),
 anchor_embedding vector(384) not null check(abs(vector_norm(anchor_embedding)-1)<0.0001),
 embedding_model text not null, embedding_revision text not null, embedding_text_version text not null,
 estimated_affected_population integer check(estimated_affected_population>=0),
 population_source text, population_estimated_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_report_at timestamptz not null default now(),
 check(estimated_affected_population is null or (length(btrim(population_source))>0 and population_source is not null and population_estimated_at is not null))
);
create index issues_candidates on public.issues(category,status);
create table public.issue_reports (
 report_id uuid primary key references public.reports(id), issue_id uuid not null references public.issues(id),
 outcome text not null check(outcome in ('created','merged')),
 semantic_similarity double precision check(semantic_similarity between -1 and 1),
 distance_meters double precision check(distance_meters>=0 and distance_meters<'Infinity'::float8),
 combined_score double precision check(combined_score between -1 and 1),
 policy_version text not null, linked_at timestamptz not null default now(),
 check((outcome='created' and semantic_similarity is null and distance_meters is null and combined_score is null)
    or (outcome='merged' and semantic_similarity is not null and distance_meters is not null and combined_score is not null))
);
create index issue_reports_issue on public.issue_reports(issue_id);
alter table public.report_analysis enable row level security;
alter table public.issues enable row level security;
alter table public.issue_reports enable row level security;

create function public.triage_distance_meters(a float8,b float8,c float8,d float8)
returns float8 language sql immutable strict set search_path=public,extensions,pg_temp as $$
 select 6371000.0 * 2 * asin(sqrt(least(1.0,greatest(0.0,
 power(sin(radians(c-a)/2),2)+cos(radians(a))*cos(radians(c))*power(sin(radians(d-b)/2),2)))));
$$;
create function public.triage_asset_conflict(a text,b text)
returns boolean language sql immutable set search_path=public,extensions,pg_temp as $$
 -- Deliberately narrow exact identifiers. No inferred street/landmark knowledge.
 with x as (select m[1] kind, m[2] ident from regexp_matches(lower(coalesce(a,'')), '(drain|pole|lamp|asset|building|gate|road)[[:space:]#:-]*([a-z]*[0-9]+[a-z]*)','g') m),
 y as (select m[1] kind, m[2] ident from regexp_matches(lower(coalesce(b,'')), '(drain|pole|lamp|asset|building|gate|road)[[:space:]#:-]*([a-z]*[0-9]+[a-z]*)','g') m)
 select exists(select 1 from x join y using(kind) where x.ident<>y.ident
   and not exists(select 1 from x xx join y yy using(kind,ident) where xx.kind=x.kind));
$$;

create function public.claim_next_report(lease_seconds integer default 600,max_attempts integer default 3)
returns jsonb language plpgsql volatile set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare r public.reports;
begin
 if lease_seconds not between 1 and 3600 or max_attempts not between 1 and 10 then raise exception 'invalid_claim_configuration'; end if;
 -- Also sweep expired final attempts; they must not remain stuck forever.
 update public.reports set processing_status='failed', processing_error_code='attempts_exhausted',
 lease_token=null,lease_expires_at=null,next_attempt_at=null,processing_updated_at=clock_timestamp()
 where processing_attempts>=max_attempts and
 (processing_status in ('pending','retry_wait') or (processing_status in ('transcribing','extracting','matching') and lease_expires_at<=clock_timestamp()));
 select * into r from public.reports where processing_attempts<max_attempts and
 (processing_status='pending' or (processing_status='retry_wait' and next_attempt_at<=clock_timestamp()) or
 (processing_status in ('transcribing','extracting','matching') and lease_expires_at<=clock_timestamp()))
 order by created_at,id for update skip locked limit 1;
 if not found then return null; end if;
 update public.reports set processing_attempts=processing_attempts+1,lease_token=gen_random_uuid(),
 lease_expires_at=clock_timestamp()+make_interval(secs=>lease_seconds),processing_status='transcribing',
 processing_stage='transcribing',next_attempt_at=null,processing_error_code=null,processing_updated_at=clock_timestamp()
 where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
create function public.renew_report_lease(report_id uuid,lease_token uuid,lease_seconds integer default 600)
returns boolean language plpgsql volatile set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
begin
 if lease_seconds not between 1 and 3600 then raise exception 'invalid_lease_duration'; end if;
 update public.reports r set lease_expires_at=clock_timestamp()+make_interval(secs=>lease_seconds)
 where r.id=report_id and r.lease_token=renew_report_lease.lease_token and r.lease_expires_at>clock_timestamp()
 and r.processing_status in ('transcribing','extracting','matching');
 return found;
end $$;
create function public.triage_write_state(report_id uuid,lease_token uuid,state text,error_code text default null,reasons jsonb default '[]',retry_seconds integer default 5)
returns boolean language plpgsql volatile set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
begin
 if state not in ('transcribing','extracting','matching','retry_wait','needs_review','failed') or retry_seconds not between 1 and 3600
 or jsonb_typeof(reasons)<>'array' or exists(select 1 from jsonb_array_elements_text(reasons) x where x not in ('approximate_location','unclear_speech','insufficient_detail','multiple_issues','uncertain_category','invalid_extraction')) then raise exception 'invalid_state'; end if;
 update public.reports r set processing_status=state, processing_updated_at=clock_timestamp(),
 processing_stage=case when state in ('transcribing','extracting','matching') then state else r.processing_stage end,
 processing_error_code=error_code,review_reasons=reasons,
 next_attempt_at=case when state='retry_wait' then clock_timestamp()+make_interval(secs=>retry_seconds) end,
 lease_token=case when state in ('transcribing','extracting','matching') then r.lease_token end,
 lease_expires_at=case when state in ('transcribing','extracting','matching') then r.lease_expires_at end
 where r.id=report_id and r.lease_token=triage_write_state.lease_token and r.lease_expires_at>clock_timestamp()
 and r.processing_status in ('transcribing','extracting','matching');
 if not found then raise exception 'lost_lease'; end if;
 return true;
end $$;

create function public.triage_save_analysis(report_id uuid,lease_token uuid,payload jsonb)
returns boolean language plpgsql volatile set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare old public.report_analysis; a public.report_analysis;
begin
 perform 1 from public.reports r where r.id=report_id and r.lease_token=triage_save_analysis.lease_token
 and r.lease_expires_at>clock_timestamp() and r.processing_status in ('transcribing','extracting','matching') for update;
 if not found then raise exception 'lost_lease'; end if;
 if jsonb_typeof(payload)<>'object' or exists(select 1 from jsonb_object_keys(payload) k where k not in
 ('transcript_original','transcript_en','language_code','duration_seconds','speech_model','warnings','category','severity','title','summary_en','location_mention','duration_days_claimed','severity_signals','review_reasons','extraction_model','analysis_schema_version','pipeline_version','embedding','embedding_model','embedding_revision','embedding_text_version','embedding_text','embedding_text_hash')) then raise exception 'invalid_analysis_fields'; end if;
 insert into public.report_analysis(report_id) values(triage_save_analysis.report_id) on conflict do nothing;
 select * into old from public.report_analysis stored where stored.report_id=triage_save_analysis.report_id;
 select * into a from jsonb_populate_record(old,payload);
 update public.report_analysis x set transcript_original=a.transcript_original,transcript_en=a.transcript_en,
 language_code=a.language_code,duration_seconds=a.duration_seconds,speech_model=a.speech_model,warnings=a.warnings,
 category=a.category,severity=a.severity,title=a.title,summary_en=a.summary_en,location_mention=a.location_mention,
 duration_days_claimed=a.duration_days_claimed,severity_signals=a.severity_signals,review_reasons=a.review_reasons,
 extraction_model=a.extraction_model,analysis_schema_version=a.analysis_schema_version,pipeline_version=a.pipeline_version,
 embedding=a.embedding,embedding_model=a.embedding_model,embedding_revision=a.embedding_revision,
 embedding_text_version=a.embedding_text_version,embedding_text=a.embedding_text,embedding_text_hash=a.embedding_text_hash,
 updated_at=clock_timestamp() where x.report_id=triage_save_analysis.report_id;
 return true;
end $$;

create function public.finalize_triage(report_id uuid,lease_token uuid,active_model text,active_revision text,
 text_version text default 'phase2-text-v1',policy_version text default 'phase2-v1',radius_meters float8 default 300,
 min_semantic float8 default 0.80,min_combined float8 default 0.82,min_margin float8 default 0.05)
returns jsonb language plpgsql volatile set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare r public.reports; a public.report_analysis; link public.issue_reports; top_candidate record; target uuid;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'read_committed_required'; end if;
 if not (radius_meters>0 and radius_meters<=10000 and min_semantic between 0 and 1 and min_combined between 0 and 1 and min_margin between 0 and 1)
 or coalesce(length(active_model),0)=0 or coalesce(length(active_revision),0)=0 or coalesce(length(policy_version),0)=0 then raise exception 'invalid_matching_configuration'; end if;
 perform pg_advisory_xact_lock(7240293102::bigint);
 select * into r from public.reports where id=report_id for update;
 if not found then raise exception 'unknown_report'; end if;
 select * into link from public.issue_reports ir where ir.report_id=finalize_triage.report_id;
 if found then return to_jsonb(link); end if;
 if r.lease_token is distinct from lease_token or r.lease_expires_at is null or r.lease_expires_at<=clock_timestamp()
 or r.processing_status not in ('transcribing','extracting','matching') then raise exception 'lost_lease'; end if;
 select * into a from public.report_analysis ra where ra.report_id=finalize_triage.report_id;
 if not found or a.category is null or a.severity is null or a.title is null or a.summary_en is null
 or coalesce(length(btrim(a.transcript_original)),0)=0 or coalesce(length(btrim(a.transcript_en)),0)=0
 or a.speech_model is null or a.duration_seconds is null or a.extraction_model is null or a.analysis_schema_version is distinct from '1' or a.pipeline_version is null
 or a.embedding is null or a.embedding_model is distinct from active_model or a.embedding_revision is distinct from active_revision
 or a.embedding_text_version is distinct from text_version or a.embedding_text is null or a.embedding_text_hash is null then raise exception 'invalid_analysis'; end if;
 if r.location_source<>'browser' or a.review_reasons<>'[]'::jsonb or r.review_reasons<>'[]'::jsonb then raise exception 'review_required'; end if;
 -- VOLATILE/READ COMMITTED executes this statement with a fresh snapshot after the lock.
 -- A plausible runner-up meets the semantic floor and all hard guards, even if
 -- its combined score narrowly misses the acceptance threshold.
 with candidates as (
 select i.id, greatest(-1.0,least(1.0,1-(i.anchor_embedding <=> a.embedding))) semantic,
 public.triage_distance_meters(r.latitude,r.longitude,i.latitude,i.longitude) distance
 from public.issues i where i.status in ('open','in_progress') and i.category=a.category and a.category<>'other'
 and i.embedding_model=active_model and i.embedding_revision=active_revision and i.embedding_text_version=text_version
 and not public.triage_asset_conflict(a.location_mention,i.address_label)),
 scored as (select *,0.75*semantic+0.25*greatest(0,1-distance/radius_meters) score from candidates
 where distance<=radius_meters and semantic>=min_semantic)
 select *,lead(score) over(order by score desc,id) runner_up into top_candidate from scored order by score desc,id limit 1;
 if found and top_candidate.score>=min_combined and (top_candidate.runner_up is null or top_candidate.score-top_candidate.runner_up>min_margin) then
 target=top_candidate.id;
 insert into public.issue_reports(report_id,issue_id,outcome,semantic_similarity,distance_meters,combined_score,policy_version)
 values(r.id,target,'merged',top_candidate.semantic,top_candidate.distance,top_candidate.score,finalize_triage.policy_version) returning * into link;
 else
 insert into public.issues(seed_report_id,title,description,category,latitude,longitude,address_label,location_source,anchor_embedding,embedding_model,embedding_revision,embedding_text_version)
 values(r.id,a.title,a.summary_en,a.category,r.latitude,r.longitude,a.location_mention,r.location_source,a.embedding,a.embedding_model,a.embedding_revision,a.embedding_text_version)
 returning id into target;
 insert into public.issue_reports(report_id,issue_id,outcome,policy_version) values(r.id,target,'created',finalize_triage.policy_version) returning * into link;
 end if;
 update public.issues set updated_at=clock_timestamp(),last_report_at=clock_timestamp() where id=target;
 update public.reports set processing_status='complete',processed_at=clock_timestamp(),processing_updated_at=clock_timestamp(),
 pipeline_version=a.pipeline_version,lease_token=null,lease_expires_at=null,next_attempt_at=null,processing_error_code=null where id=r.id;
 return to_jsonb(link);
end $$;

-- Counts/severity derive from memberships, never an incremented counter.
create view public.triage_issue_facts with(security_invoker=true) as
 select i.*, count(ir.report_id)::integer as corroboration_count,
 (array_agg(a.severity order by case a.severity when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc))[1] severity,
 array_agg(distinct a.language_code) filter(where a.language_code is not null) reported_languages
 from public.issues i join public.issue_reports ir on ir.issue_id=i.id join public.report_analysis a on a.report_id=ir.report_id group by i.id;

revoke all on public.report_analysis,public.issues,public.issue_reports,public.triage_issue_facts from public,anon,authenticated;
grant select,insert,update,delete on public.report_analysis,public.issues,public.issue_reports to service_role;
grant select on public.triage_issue_facts to service_role;
-- Invoker functions: only service_role can call. No SECURITY DEFINER privilege escalation.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('triage_distance_meters','triage_asset_conflict','claim_next_report','renew_report_lease','triage_write_state','triage_save_analysis','finalize_triage') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
