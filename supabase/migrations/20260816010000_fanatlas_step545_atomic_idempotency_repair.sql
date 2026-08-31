-- Step 54.5 live validation repair: make idempotency start creation
-- atomic for concurrent callers of the same user/client request key.
--
-- SELECT ... FOR UPDATE does not protect a missing row. The transaction-scoped
-- advisory lock serializes only one idempotency key and releases automatically
-- at transaction end, preserving the existing unique constraint and conflict
-- semantics.

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
  perform pg_advisory_xact_lock(hashtextextended('fanatlas_ai_idempotency:' || p_user_id::text || ':' || p_client_request_id, 0));

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

revoke execute on function fanatlas_ai_start_idempotency(uuid, text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function fanatlas_ai_start_idempotency(uuid, text, text, timestamptz, integer) to service_role;
