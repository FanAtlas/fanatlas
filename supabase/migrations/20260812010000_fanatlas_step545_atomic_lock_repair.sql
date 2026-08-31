-- Step 54.5 live validation repair: make AI concurrency lock acquisition
-- atomic across server instances.
--
-- PostgreSQL row locks do not protect a missing row. The transaction-scoped
-- advisory lock below serializes contenders for the same lock_key before row
-- inspection/upsert. Unrelated lock keys remain independent except for the
-- practical risk of a 64-bit hash collision from hashtextextended().

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
  perform pg_advisory_xact_lock(hashtextextended(p_lock_key, 0));

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

  return jsonb_build_object(
    'status',
    case when v_had_existing then 'stale_lock_recovered' else 'acquired' end,
    'lockKey',
    p_lock_key,
    'expiresAt',
    v_expires_at
  );
end;
$$;

revoke execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) to service_role;
