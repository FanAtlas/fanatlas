create table if not exists profiles (
  id uuid primary key,
  email text unique,
  name text,
  username text,
  country text,
  favorite_team text,
  language text default 'en',
  interests text[] default '{}',
  notifications boolean default true,
  onboarding_complete boolean default false,
  membership_type text default 'free',
  created_at timestamp with time zone default now()
);

alter table profiles add column if not exists username text;
alter table profiles add column if not exists interests text[] default '{}';
alter table profiles add column if not exists notifications boolean default true;
alter table profiles add column if not exists onboarding_complete boolean default false;

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  team1 text,
  team2 text,
  stadium text,
  city text,
  match_date text,
  status text,
  weather text,
  fan_zone_id uuid,
  created_at timestamp with time zone default now()
);

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text,
  category text,
  city text,
  latitude double precision,
  longitude double precision,
  rating numeric,
  busy_level text,
  safety_score integer,
  image text,
  description text,
  created_at timestamp with time zone default now()
);

create table if not exists fan_zones (
  id uuid primary key default gen_random_uuid(),
  name text,
  city text,
  capacity integer,
  latitude double precision,
  longitude double precision,
  description text,
  opening_hours text,
  safety_score integer,
  family_friendly boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists emergency_services (
  id uuid primary key default gen_random_uuid(),
  name text,
  category text,
  city text,
  phone text,
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text,
  severity text,
  city text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists travel_guides (
  id uuid primary key default gen_random_uuid(),
  title text,
  country text,
  city text,
  phase text,
  category text,
  content text,
  created_at timestamp with time zone default now()
);

-- FanAtlas AI coordination records.
-- These tables store only operational counters and safe response snapshots.
-- They must be accessed by trusted server code or SECURITY DEFINER RPC
-- functions, never directly by browser clients.

create table if not exists fanatlas_ai_usage_daily (
  user_id uuid not null,
  usage_date date not null,
  request_count integer not null default 0,
  provider_call_count integer not null default 0,
  tool_call_count integer not null default 0,
  input_size_units integer not null default 0,
  output_size_units integer not null default 0,
  blocked_count integer not null default 0,
  failed_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create table if not exists fanatlas_ai_usage_minute (
  user_id uuid not null,
  minute_bucket timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  primary key (user_id, minute_bucket)
);

create table if not exists fanatlas_ai_concurrency_locks (
  lock_key text primary key,
  user_id uuid not null,
  conversation_id text not null,
  request_id text not null,
  acquired_at timestamptz not null,
  expires_at timestamptz not null
);

create table if not exists fanatlas_ai_idempotency (
  user_id uuid not null,
  client_request_id text not null,
  request_fingerprint text not null,
  status text not null check (status in ('processing', 'completed', 'failed_retryable', 'failed_final', 'cancelled')),
  response_snapshot jsonb,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (user_id, client_request_id)
);

create table if not exists fanatlas_ai_provider_health (
  provider_profile_id text primary key,
  state text not null check (state in ('closed', 'open', 'half_open')),
  recent_successes integer not null default 0,
  recent_failures integer not null default 0,
  timeout_count integer not null default 0,
  opened_at timestamptz,
  cooldown_until timestamptz,
  half_open_lease_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists fanatlas_ai_tool_cache (
  cache_key text primary key,
  tool_id text not null,
  result jsonb not null,
  source_quality text not null,
  freshness_class text not null,
  retrieved_at timestamptz not null,
  stale_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fanatlas_ai_tool_cache_no_private_fields check (
    result::text not ilike '%journal%'
    and result::text not ilike '%provider prompt%'
    and result::text not ilike '%access_token%'
    and result::text not ilike '%service_role%'
  )
);

create index if not exists fanatlas_ai_usage_minute_expires_idx on fanatlas_ai_usage_minute (expires_at);
create index if not exists fanatlas_ai_locks_user_idx on fanatlas_ai_concurrency_locks (user_id, expires_at);
create index if not exists fanatlas_ai_locks_expires_idx on fanatlas_ai_concurrency_locks (expires_at);
create index if not exists fanatlas_ai_idempotency_expires_idx on fanatlas_ai_idempotency (expires_at);
create index if not exists fanatlas_ai_provider_health_cooldown_idx on fanatlas_ai_provider_health (cooldown_until);
create index if not exists fanatlas_ai_tool_cache_expires_idx on fanatlas_ai_tool_cache (expires_at);
create index if not exists fanatlas_ai_tool_cache_tool_idx on fanatlas_ai_tool_cache (tool_id, expires_at);

alter table fanatlas_ai_usage_daily enable row level security;
alter table fanatlas_ai_usage_minute enable row level security;
alter table fanatlas_ai_concurrency_locks enable row level security;
alter table fanatlas_ai_idempotency enable row level security;
alter table fanatlas_ai_provider_health enable row level security;
alter table fanatlas_ai_tool_cache enable row level security;

revoke all on fanatlas_ai_usage_daily from public, anon, authenticated;
revoke all on fanatlas_ai_usage_minute from public, anon, authenticated;
revoke all on fanatlas_ai_concurrency_locks from public, anon, authenticated;
revoke all on fanatlas_ai_idempotency from public, anon, authenticated;
revoke all on fanatlas_ai_provider_health from public, anon, authenticated;
revoke all on fanatlas_ai_tool_cache from public, anon, authenticated;

grant select, insert, update, delete on fanatlas_ai_usage_daily to service_role;
grant select, insert, update, delete on fanatlas_ai_usage_minute to service_role;
grant select, insert, update, delete on fanatlas_ai_concurrency_locks to service_role;
grant select, insert, update, delete on fanatlas_ai_provider_health to service_role;
grant select, insert, update, delete on fanatlas_ai_tool_cache to service_role;

create or replace function fanatlas_ai_reserve_quota(
  p_user_id uuid,
  p_request_id text,
  p_usage_date date,
  p_minute_bucket timestamptz,
  p_max_requests_per_minute integer,
  p_max_requests_per_day integer,
  p_now timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minute_count integer;
  v_daily_count integer;
begin
  insert into fanatlas_ai_usage_minute (user_id, minute_bucket, request_count, expires_at)
  values (p_user_id, p_minute_bucket, 0, p_minute_bucket + interval '90 seconds')
  on conflict (user_id, minute_bucket) do nothing;

  update fanatlas_ai_usage_minute
  set request_count = request_count + 1
  where user_id = p_user_id
    and minute_bucket = p_minute_bucket
    and request_count < p_max_requests_per_minute
  returning request_count into v_minute_count;

  if v_minute_count is null then
    return jsonb_build_object('allowed', false, 'limitCategory', 'minute', 'retryAfterSeconds', 60);
  end if;

  insert into fanatlas_ai_usage_daily (user_id, usage_date, request_count, updated_at)
  values (p_user_id, p_usage_date, 0, p_now)
  on conflict (user_id, usage_date) do nothing;

  update fanatlas_ai_usage_daily
  set request_count = request_count + 1,
      updated_at = p_now
  where user_id = p_user_id
    and usage_date = p_usage_date
    and request_count < p_max_requests_per_day
  returning request_count into v_daily_count;

  if v_daily_count is null then
    update fanatlas_ai_usage_minute
    set request_count = greatest(0, request_count - 1)
    where user_id = p_user_id and minute_bucket = p_minute_bucket;
    return jsonb_build_object('allowed', false, 'limitCategory', 'daily', 'resetAt', (p_usage_date + 1)::text);
  end if;

  return jsonb_build_object('allowed', true);
end;
$$;

create or replace function fanatlas_ai_finalize_usage(
  p_user_id uuid,
  p_usage_date date,
  p_provider_call_count integer,
  p_tool_call_count integer,
  p_input_size_units integer,
  p_output_size_units integer,
  p_blocked_count integer,
  p_failed_count integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into fanatlas_ai_usage_daily (user_id, usage_date, updated_at)
  values (p_user_id, p_usage_date, now())
  on conflict (user_id, usage_date) do nothing;

  update fanatlas_ai_usage_daily
  set provider_call_count = provider_call_count + greatest(0, p_provider_call_count),
      tool_call_count = tool_call_count + greatest(0, p_tool_call_count),
      input_size_units = input_size_units + greatest(0, p_input_size_units),
      output_size_units = output_size_units + greatest(0, p_output_size_units),
      blocked_count = blocked_count + greatest(0, p_blocked_count),
      failed_count = failed_count + greatest(0, p_failed_count),
      updated_at = now()
  where user_id = p_user_id and usage_date = p_usage_date;
end;
$$;

create or replace function fanatlas_ai_acquire_lock(
  p_lock_key text,
  p_user_id uuid,
  p_conversation_id text,
  p_request_id text,
  p_now timestamptz,
  p_ttl_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing fanatlas_ai_concurrency_locks%rowtype;
  v_had_existing boolean := false;
  v_expires_at timestamptz := p_now + make_interval(secs => p_ttl_ms / 1000.0);
begin
  select * into v_existing from fanatlas_ai_concurrency_locks where lock_key = p_lock_key for update;
  v_had_existing := found;
  if v_had_existing and v_existing.expires_at > p_now then
    return jsonb_build_object('status', 'already_locked', 'lockKey', p_lock_key, 'expiresAt', v_existing.expires_at);
  end if;

  insert into fanatlas_ai_concurrency_locks (lock_key, user_id, conversation_id, request_id, acquired_at, expires_at)
  values (p_lock_key, p_user_id, p_conversation_id, p_request_id, p_now, v_expires_at)
  on conflict (lock_key) do update
  set user_id = excluded.user_id,
      conversation_id = excluded.conversation_id,
      request_id = excluded.request_id,
      acquired_at = excluded.acquired_at,
      expires_at = excluded.expires_at;

  return jsonb_build_object('status', case when v_had_existing then 'stale_lock_recovered' else 'acquired' end, 'lockKey', p_lock_key, 'expiresAt', v_expires_at);
end;
$$;

create or replace function fanatlas_ai_release_lock(p_lock_key text, p_request_id text) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from fanatlas_ai_concurrency_locks
  where lock_key = p_lock_key and request_id = p_request_id;
end;
$$;

create or replace function fanatlas_ai_start_idempotency(
  p_user_id uuid,
  p_client_request_id text,
  p_request_fingerprint text,
  p_now timestamptz,
  p_ttl_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing fanatlas_ai_idempotency%rowtype;
  v_expires_at timestamptz := p_now + make_interval(secs => p_ttl_ms / 1000.0);
begin
  delete from fanatlas_ai_idempotency where expires_at <= p_now;
  select * into v_existing
  from fanatlas_ai_idempotency
  where user_id = p_user_id and client_request_id = p_client_request_id
  for update;

  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint then
      return jsonb_build_object('status', 'conflict');
    end if;
    if v_existing.status = 'completed' and v_existing.response_snapshot is not null then
      return jsonb_build_object('status', 'replay', 'response', v_existing.response_snapshot);
    end if;
    if v_existing.status = 'processing' then
      return jsonb_build_object('status', 'processing');
    end if;
    update fanatlas_ai_idempotency
    set status = 'processing', expires_at = v_expires_at
    where user_id = p_user_id and client_request_id = p_client_request_id;
    return jsonb_build_object('status', 'started');
  end if;

  insert into fanatlas_ai_idempotency (user_id, client_request_id, request_fingerprint, status, created_at, expires_at)
  values (p_user_id, p_client_request_id, p_request_fingerprint, 'processing', p_now, v_expires_at);
  return jsonb_build_object('status', 'started');
end;
$$;

create or replace function fanatlas_ai_complete_idempotency(
  p_user_id uuid,
  p_client_request_id text,
  p_request_fingerprint text,
  p_status text,
  p_response_snapshot jsonb,
  p_now timestamptz,
  p_ttl_ms integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update fanatlas_ai_idempotency
  set status = p_status,
      response_snapshot = case when p_status = 'completed' then p_response_snapshot else null end,
      expires_at = p_now + make_interval(secs => p_ttl_ms / 1000.0)
  where user_id = p_user_id
    and client_request_id = p_client_request_id
    and request_fingerprint = p_request_fingerprint;
end;
$$;

create or replace function fanatlas_ai_before_provider_call(
  p_provider_profile_id text,
  p_now timestamptz,
  p_cooldown_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record fanatlas_ai_provider_health%rowtype;
begin
  insert into fanatlas_ai_provider_health (provider_profile_id, state, updated_at)
  values (p_provider_profile_id, 'closed', p_now)
  on conflict (provider_profile_id) do nothing;

  select * into v_record from fanatlas_ai_provider_health
  where provider_profile_id = p_provider_profile_id
  for update;

  if v_record.state = 'open' then
    if v_record.cooldown_until is not null and v_record.cooldown_until > p_now then
      return jsonb_build_object('allowed', false, 'state', 'open');
    end if;
    if v_record.half_open_lease_until is not null and v_record.half_open_lease_until > p_now then
      return jsonb_build_object('allowed', false, 'state', 'half_open');
    end if;
    update fanatlas_ai_provider_health
    set state = 'half_open',
        half_open_lease_until = p_now + make_interval(secs => least(p_cooldown_ms, 30000) / 1000.0),
        updated_at = p_now
    where provider_profile_id = p_provider_profile_id;
    return jsonb_build_object('allowed', true, 'state', 'half_open');
  end if;

  return jsonb_build_object('allowed', true, 'state', v_record.state);
end;
$$;

create or replace function fanatlas_ai_record_provider_success(
  p_provider_profile_id text,
  p_now timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into fanatlas_ai_provider_health (provider_profile_id, state, recent_successes, updated_at)
  values (p_provider_profile_id, 'closed', 1, p_now)
  on conflict (provider_profile_id) do update
  set state = 'closed',
      recent_successes = fanatlas_ai_provider_health.recent_successes + 1,
      recent_failures = greatest(0, fanatlas_ai_provider_health.recent_failures - 1),
      timeout_count = 0,
      opened_at = null,
      cooldown_until = null,
      half_open_lease_until = null,
      updated_at = p_now;
end;
$$;

create or replace function fanatlas_ai_record_provider_failure(
  p_provider_profile_id text,
  p_failure text,
  p_now timestamptz,
  p_cooldown_ms integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failures integer;
  v_timeouts integer;
  v_state text;
begin
  insert into fanatlas_ai_provider_health (provider_profile_id, state, updated_at)
  values (p_provider_profile_id, 'closed', p_now)
  on conflict (provider_profile_id) do nothing;

  update fanatlas_ai_provider_health
  set recent_failures = recent_failures + 1,
      timeout_count = timeout_count + case when p_failure = 'timeout' then 1 else 0 end,
      updated_at = p_now
  where provider_profile_id = p_provider_profile_id
  returning recent_failures, timeout_count, state into v_failures, v_timeouts, v_state;

  if v_failures >= 3 or v_timeouts >= 2 or v_state = 'half_open' then
    update fanatlas_ai_provider_health
    set state = 'open',
        opened_at = p_now,
        cooldown_until = p_now + make_interval(secs => p_cooldown_ms / 1000.0),
        half_open_lease_until = null,
        updated_at = p_now
    where provider_profile_id = p_provider_profile_id;
  end if;
end;
$$;

create or replace function fanatlas_ai_cleanup_coordination(p_now timestamptz) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from fanatlas_ai_usage_minute where expires_at <= p_now;
  delete from fanatlas_ai_concurrency_locks where expires_at <= p_now;
  delete from fanatlas_ai_idempotency where expires_at <= p_now;
  delete from fanatlas_ai_tool_cache where expires_at <= p_now;
end;
$$;

revoke execute on function fanatlas_ai_reserve_quota(uuid, text, date, timestamptz, integer, integer, timestamptz) from public, anon, authenticated;
revoke execute on function fanatlas_ai_finalize_usage(uuid, date, integer, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_release_lock(text, text) from public, anon, authenticated;
revoke execute on function fanatlas_ai_start_idempotency(uuid, text, text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_complete_idempotency(uuid, text, text, text, jsonb, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_before_provider_call(text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_record_provider_success(text, timestamptz) from public, anon, authenticated;
revoke execute on function fanatlas_ai_record_provider_failure(text, text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_cleanup_coordination(timestamptz) from public, anon, authenticated;

grant execute on function fanatlas_ai_reserve_quota(uuid, text, date, timestamptz, integer, integer, timestamptz) to service_role;
grant execute on function fanatlas_ai_finalize_usage(uuid, date, integer, integer, integer, integer, integer, integer) to service_role;
grant execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_release_lock(text, text) to service_role;
grant execute on function fanatlas_ai_start_idempotency(uuid, text, text, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_complete_idempotency(uuid, text, text, text, jsonb, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_before_provider_call(text, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_record_provider_success(text, timestamptz) to service_role;
grant execute on function fanatlas_ai_record_provider_failure(text, text, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_cleanup_coordination(timestamptz) to service_role;
