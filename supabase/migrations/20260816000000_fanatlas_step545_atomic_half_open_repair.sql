-- Step 54.5 live validation repair: make provider circuit-breaker
-- half-open probe leases atomic across Supabase/Postgres-backed instances.
--
-- A row lock alone is not enough when later contenders observe the row after
-- the first contender has moved it to half_open. Those contenders must be
-- blocked while the lease is active, not allowed to probe. The
-- transaction-scoped advisory lock serializes contenders for one provider
-- profile only and is automatically released when the RPC transaction ends.

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
  v_lease_until timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('fanatlas_ai_provider_health:' || p_provider_profile_id, 0));

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
  end if;

  if v_record.state = 'half_open'
    and v_record.half_open_lease_until is not null
    and v_record.half_open_lease_until > p_now then
    return jsonb_build_object('allowed', false, 'state', 'half_open');
  end if;

  if v_record.state in ('open', 'half_open') then
    v_lease_until := p_now + make_interval(secs => least(p_cooldown_ms, 30000) / 1000.0);
    update fanatlas_ai_provider_health
    set state = 'half_open',
        half_open_lease_until = v_lease_until,
        updated_at = p_now
    where provider_profile_id = p_provider_profile_id
      and (
        state = 'open'
        or (
          state = 'half_open'
          and (half_open_lease_until is null or half_open_lease_until <= p_now)
        )
      );

    if found then
      return jsonb_build_object('allowed', true, 'state', 'half_open');
    end if;

    return jsonb_build_object('allowed', false, 'state', 'half_open');
  end if;

  return jsonb_build_object('allowed', true, 'state', v_record.state);
end;
$$;

revoke execute on function fanatlas_ai_before_provider_call(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function fanatlas_ai_before_provider_call(text, timestamptz, integer) to service_role;
