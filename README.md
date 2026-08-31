# FanAtlas — Option 3 Starter

Mobile-first React app for World Cup tourists.

## Includes
- Contextual Home command center
- Match Center
- FanAtlas AI
- Trip Day / Today
- SOS
- Map / navigation
- Explore
- Travel Guides
- Profile / Premium placeholder
- Supabase schema
- API-Football service file
- FanAtlas AI server endpoint

## Run locally

```bash
npm install
npm run dev
```

## Developer quality commands

FanAtlas uses npm, TypeScript, ESLint, Vitest, and Playwright for local and CI validation.

```bash
npm run typecheck      # TypeScript only, no build output
npm run lint           # ESLint quality checks
npm run lint:fix       # ESLint auto-fix, review the diff afterwards
npm run test           # Vitest unit tests
npm run test:ai-evals  # deterministic offline FanAtlas AI safety evaluations
npm run test:ai-coordination # AI usage, idempotency, lock, and circuit contract tests
npm run test:ai-tools  # server-only current-information tool tests
npm run check:ai-coordination # non-mutating live coordination readiness check
npm run e2e:auth:setup # create ignored nonproduction Playwright auth state
npm run test:e2e:authenticated # authenticated private-route and FanAtlas AI E2E
npm run check:ai-release-gate # fail-closed AI release readiness gate
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest with V8 coverage
npm run build          # TypeScript plus production Vite build
npm run test:e2e       # Playwright browser smoke tests
npm run validate       # typecheck, lint, unit tests, AI evals, build
npm run validate:full  # validate plus Playwright
```

Trip Day / Today is a private execution view for dated trips. It derives the current trip day from Trip Draft dates and supports explicit user-triggered live context for weather, currency, official destination updates, and route-to-next-place handoff. It does not auto-fetch live information on page load. Map owns route presentation and only exposes truthful supported modes. Current location is explicit and ephemeral. The production service worker caches the shell for repeat visits. FanAtlas still does not ship offline map downloads or offline route computation in production; the long-term map architecture decision is documented in [docs/offline-map-decision.md](docs/offline-map-decision.md).

Home is the contextual travel front door. It derives a deterministic trip-aware state from the same Trip Draft, Today, Preparation, Destination Intelligence, Passport, Journal, Explorer, SOS, and connectivity sources and does not own a second persistence layer. The detailed model is documented in [docs/travel-home-architecture.md](docs/travel-home-architecture.md).

Offline trip support is intentionally narrower than full offline navigation. FanAtlas keeps local Trip Draft essentials, Today execution, Destination Intelligence static data, Travel Preparation, and locally verified SOS information available when the browser is offline. Live weather, exchange rates, official updates, routing, geocoding, and map tiles remain online-dependent and degrade with explicit unavailable states instead of pretending to work from cache.

Install Chromium for local browser tests when needed:

```bash
npx playwright install chromium
```

Before release, run the clean validation sequence:

```bash
npm ci
npm run validate
npx playwright install chromium
npm run test:e2e
```

Manual checks that are not fully automated live in [docs/qa-checklist.md](docs/qa-checklist.md).

### Testing guidance

- Add unit tests for new pure domain helpers and derivation rules.
- Use deterministic fixtures with fixed IDs, timestamps, and `YYYY-MM-DD` dates.
- Do not use real credentials, real journal content, uploaded user photos, or private coordinates in tests.
- Unit and integration tests should not depend on network services or Supabase.
- Browser tests should use synthetic storage state or current route behavior, never production accounts.
- Keep assertions behavior-focused; avoid full-page snapshots.

## Environment variables

Copy `.env.example` to `.env` and fill:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_EXCHANGE_RATES_URL=

# Backend/serverless only. Never expose this with a VITE_ prefix.
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_API_FOOTBALL_KEY=

# Authenticated E2E, nonproduction only. Never commit these values or the storage state.
FANATLAS_E2E_NONPRODUCTION=false
FANATLAS_E2E_AUTH_EMAIL=
FANATLAS_E2E_AUTH_PASSWORD=
FANATLAS_E2E_AUTH_STORAGE_STATE=tests/e2e/.auth/fanatlas-nonproduction.storage-state.json
```

### Currency integration

`VITE_EXCHANGE_RATES_URL` is optional. If omitted, FanAtlas uses the live free endpoint:

```text
https://open.er-api.com/v6/latest/USD
```

If that request fails, FanAtlas tries:

```text
https://api.exchangerate.host/latest
```

The endpoint should be browser-accessible and return JSON in either shape:

```json
{ "rates": { "USD": 1, "CAD": 1.37, "MXN": 18.2 } }
```

or:

```json
{ "conversion_rates": { "USD": 1, "CAD": 1.37, "MXN": 18.2 } }
```

If both endpoints fail or return invalid data, the app shows: "Unable to load exchange rates. Please try again."

### FanAtlas AI integration

FanAtlas AI uses the authenticated `POST /api/fanatlas-ai` endpoint. The browser sends only the provider-neutral FanAtlas AI request contract, a visible conversation window, explicit context consent flags, and a minimized safe context snapshot. Provider calls, provider model configuration, auth validation, rate limiting, orchestration, and output validation happen server-side.

`OPENAI_API_KEY` is read only by the server endpoint. It is never read by frontend code and must never use a `VITE_` prefix. The legacy `/api/ai` endpoint is retired with a 410 response so it cannot bypass authentication or context policy.

Server-side configuration:

```bash
FANATLAS_AI_RELEASE_MODE=disabled
FANATLAS_AI_ENABLED=false
FANATLAS_AI_MOCK=false
FANATLAS_AI_KILL_SWITCH=false
FANATLAS_AI_INTERNAL_ALLOWLIST=
FANATLAS_AI_BETA_ALLOWLIST=
FANATLAS_AI_TASK_ALLOWLIST=
FANATLAS_AI_TOOL_ALLOWLIST=
FANATLAS_AI_MAX_REQUESTS_PER_MINUTE=10
FANATLAS_AI_MAX_REQUESTS_PER_DAY=50
FANATLAS_AI_TIMEOUT_MS=25000
FANATLAS_AI_TOTAL_TIMEOUT_MS=25000
FANATLAS_AI_MAX_MODEL_CALLS_PER_REQUEST=1
FANATLAS_AI_MAX_TOOL_CALLS_PER_REQUEST=2
FANATLAS_AI_MAX_COST_CLASS=medium
FANATLAS_AI_MAX_CONTEXT_SIZE_CLASS=medium
FANATLAS_AI_MAX_OUTPUT_CHARACTERS=3000
FANATLAS_AI_OPERATIONAL_TELEMETRY=
FANATLAS_AI_COORDINATION_BACKEND=memory
FANATLAS_AI_ALLOW_MEMORY_COORDINATION_IN_PRODUCTION=false
FANATLAS_AI_LOCK_TTL_MS=60000
FANATLAS_AI_IDEMPOTENCY_TTL_MS=21600000
FANATLAS_AI_PROVIDER_COOLDOWN_MS=60000
FANATLAS_AI_RESEARCH_ENABLED=false
FANATLAS_AI_PRIMARY_MODEL=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

For Vercel:

```text
Project Settings → Environment Variables:
FANATLAS_AI_RELEASE_MODE
FANATLAS_AI_ENABLED
FANATLAS_AI_MOCK
FANATLAS_AI_KILL_SWITCH
FANATLAS_AI_INTERNAL_ALLOWLIST
FANATLAS_AI_BETA_ALLOWLIST
FANATLAS_AI_TASK_ALLOWLIST
FANATLAS_AI_TOOL_ALLOWLIST
FANATLAS_AI_MAX_REQUESTS_PER_MINUTE
FANATLAS_AI_MAX_REQUESTS_PER_DAY
FANATLAS_AI_TIMEOUT_MS
FANATLAS_AI_TOTAL_TIMEOUT_MS
FANATLAS_AI_MAX_MODEL_CALLS_PER_REQUEST
FANATLAS_AI_MAX_TOOL_CALLS_PER_REQUEST
FANATLAS_AI_MAX_COST_CLASS
FANATLAS_AI_MAX_CONTEXT_SIZE_CLASS
FANATLAS_AI_MAX_OUTPUT_CHARACTERS
FANATLAS_AI_OPERATIONAL_TELEMETRY
FANATLAS_AI_COORDINATION_BACKEND
FANATLAS_AI_LOCK_TTL_MS
FANATLAS_AI_IDEMPOTENCY_TTL_MS
FANATLAS_AI_PROVIDER_COOLDOWN_MS
FANATLAS_AI_RESEARCH_ENABLED
FANATLAS_AI_PRIMARY_MODEL
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Plain `npm run dev` runs Vite only, so `/api/fanatlas-ai` may be unavailable locally unless a local serverless runtime is also serving the `api/` directory. For deterministic local endpoint tests, set `FANATLAS_AI_MOCK=true`; tests must not require a real provider key.

### Favorites table

FanAtlas favorites are stored in Supabase. Create this table before using the Favorites page:

```sql
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('stadium', 'restaurant', 'hotel', 'fan-zone')),
  item_id text not null,
  name text not null,
  city text,
  image text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists favorites_user_id_idx on public.favorites(user_id);

alter table public.favorites enable row level security;

create policy "Users can manage own favorites"
on public.favorites
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## GitHub setup

Create a new GitHub repo named:

```bash
fanatlas
```

Then upload this project.

## Global Travel Explorer

The Global Travel Explorer is a private derived view built from existing FanAtlas data. It does not store Explorer statistics, create a new database, call remote geocoding, load map tiles, or send travel history to a map provider.

Source-of-truth boundaries:

- Trip Drafts own trip metadata, itinerary, visit status, journal entries, and photo references.
- Travel Passport owns completed-trip destination eligibility.
- Travel Insights owns aggregate statistics and rankings.
- Travel Explorer owns only map-ready read models, layers, route projections, coordinate validation, and UI selection state.

Country identity is matched deterministically by ISO alpha-2 code first, then a small explicit alias table for known naming differences. City identity includes country context, using the same Passport city-key rule where possible.

Explorer map behavior uses locally available destination coordinates from the bundled FanAtlas destination table and structured Trip Draft destination fields. There is no bundled world-country geometry dataset yet, so countries without trusted local coordinates remain available in the destination browser and data-quality notice instead of being guessed.

Routes connect known trip destination points in itinerary order. They are not turn-by-turn directions and do not represent exact physical travel paths.

The interactive Explorer experience supports country, city, trip and route selection, local search, status and year filters, status/frequency/travel-day/route modes, a keyboard-accessible destination browser, and manual Travel Replay. Replay never autoplays and respects reduced-motion preferences. Explorer memory integration uses aggregate photo, journal and favorite counts only; it does not load photo Blobs or render journal body text.

Step 52 release notes:

- Source-of-truth chain: Trip Drafts -> Passport -> Insights -> Explorer -> Explorer view helpers -> Explorer UI.
- Year membership currently uses the trip start year. Cross-year trips are not expanded into every intersected year in Step 52.
- Route-point deduplication removes only consecutive identical coordinates. Repeated visits separated by another destination remain visible.
- Antimeridian-aware bounds may use a wrapped box where `east < west`; route lines remain straight SVG segments and are labeled as approximate itinerary connections.
- Frequency mode is based on completed-trip counts. Travel Days mode is based on completed trips with valid inclusive durations.
- Wishlist remains empty unless a future canonical structured wishlist destination source is added. Saved Places are not inferred as wishlist destinations.
- Country polygon geometry is deferred. The current release uses local marker projection, local route lines, and the Destination Browser as the accessible full alternative. This avoids adding a new map dependency, a large geometry bundle, licensing review, and accessibility risk late in Step 52.
- Authenticated Explorer Playwright coverage is deferred until FanAtlas has a safe nonproduction auth strategy. The current E2E suite verifies private route behavior through the existing auth gate, while component and domain tests cover seeded Explorer interactions.
- Explorer must not create remote map, geocoding, routing, analytics, AI, IndexedDB Blob, or photo-CDN requests during initial render.

## FanAtlas Travel Intelligence Foundation

FanAtlas Travel Intelligence is the provider-neutral foundation for future FanAtlas AI. Part 1 adds no live AI calls, no provider SDKs, no chatbot UI, no streaming, no tool execution, and no context persistence.

Architecture:

- FanAtlas UI creates a structured `TravelIntelligenceRequest`.
- The Travel Context Engine builds minimized projections from Trip Drafts, Passport, Insights, Explorer, Journal metadata, Memory metadata, Saved Places, profile preferences, and current-location context only when explicitly scoped and permitted.
- Field policies classify data as public, application, personal, sensitive, or highly sensitive.
- Tool planning uses a static read/suggest registry and blocks disabled network tools by default.
- The AI Orchestrator matches tasks to provider-neutral capabilities and model profiles without exposing provider brands to users.
- Usage estimates are planning classes only; no fake currency amounts are shown.
- Safe logs and traces contain reason codes and aggregate context presence only, never raw prompts, Journal body, photo IDs, precise coordinates, documents, storage keys, tokens, or API keys.

Default feature flags fail closed. Only `travelIntelligenceFoundation` is enabled by default; provider calls, tool execution, image understanding, document analysis, external research, write actions, developer diagnostics, and the future FanAtlas AI user experience remain disabled.

High-stakes and current-information tasks such as emergency, visa, customs, transportation, and availability-dependent guidance are marked as requiring current information or authoritative tools in future phases. Stored FanAtlas data is not treated as enough for those tasks.

See `docs/travel-intelligence-architecture.md` for the source-of-truth, privacy, tool-planning, orchestration, and logging boundaries.

## FanAtlas AI Concierge

Step 53 Part 2 adds the first private FanAtlas AI experience on `/ai`. The user-facing product name is always FanAtlas AI; provider names and model IDs remain internal and are not shown in the UI.

Architecture:

- `/ai` is a lazy private route and is also reachable from Home and Profile.
- `useFanAtlasAI()` manages local visible conversation state, cancellation, retry, context controls, and safe context snapshots.
- Visible conversation persistence is local-only and stores visible messages plus consent state. It does not store minimized TravelContext snapshots, provider prompts, tool payloads, precise location, Journal body, photo IDs, or provider metadata.
- `POST /api/fanatlas-ai` authenticates the Supabase bearer token, validates the provider-neutral request, enforces feature flags and message limits, rebuilds server-side permissions from consent, runs the Travel Intelligence orchestrator, validates tool plans, invokes the provider gateway, validates output, and returns a provider-neutral response.
- The OpenAI-compatible adapter is server-side only and uses direct HTTPS behind the gateway. No provider SDK package is added and no provider secret is bundled into the browser.
- `FANATLAS_AI_ENABLED` must be `true` for live provider calls. `FANATLAS_AI_MOCK=true` enables deterministic nonproduction mock responses for tests and local server checks.
- External current-information research remains disabled unless `FANATLAS_AI_RESEARCH_ENABLED=true` and a reliable source-backed tool is implemented. Visa, customs, emergency, weather, currency, transport, and availability-dependent requests fail closed with clarification instead of being answered from stale model memory.
- Approved application tools are read-only or suggest-only. Write, booking, purchase, deletion, sharing, and itinerary-editing actions remain blocked.
- Citations use a validated `http`/`https` link model. The UI renders citations as text and safe external links only.
- Structured provider HTML and raw Markdown are not rendered. Messages and structured data are rendered as React text.
- The in-product privacy notice states that permitted context is minimized, sensitive context is off by default, current facts may require external checks, AI can make mistakes, and users can clear visible conversation history.

Known limitations:

- Authenticated seeded Playwright AI content tests remain deferred until a safe nonproduction auth strategy exists. The current suite uses domain, server, hook-adjacent, and component tests plus private-route E2E coverage.
- No live weather, currency, visa, customs, or web-research tool is executed in Part 2.
- No cloud conversation persistence, streaming, file uploads, images, voice, write tools, booking, or provider selection UI is included.

### Step 53 Part 3 production hardening

FanAtlas AI now has server-side release modes: `disabled`, `internal`, `beta`, and `production`. Invalid or missing mode configuration fails closed. `internal` and `beta` require server-owned allowlists; the browser cannot grant entitlement. `FANATLAS_AI_KILL_SWITCH=true` disables provider calls without a frontend deployment.

Initial controlled-beta task allowlist:

- general travel questions
- trip planning and itinerary suggestions
- destination comparisons
- packing and budget guidance
- Travel Insights explanations
- saved-place organization suggestions
- language and translation assistance

Live weather, visa determinations, customs determinations, transport status, availability, booking, purchasing, image analysis, document analysis, and write actions remain disabled until source-backed tools and explicit confirmation flows exist.

Production hardening added:

- deterministic offline AI evaluations through `npm run test:ai-evals`
- server-side entitlement, task allowlist, tool allowlist, and kill switch
- per-user minute and daily request caps, one active request per conversation, and short idempotency caching by `clientRequestId`
- provider timeout propagation and an in-memory provider health circuit breaker
- output rejection for fake booking/write completions, fake current-information claims, unsafe markup, unsafe links, invented citations, and oversized responses
- expanded redaction for provider keys, bearer/JWT-like tokens, Supabase key assignments, storage paths, photo IDs, and internal policy markers
- bounded local visible conversation persistence with message, citation, and serialized-size limits

Current distributed-limit decision: production-oriented coordination uses the committed Supabase/Postgres store and service-role RPCs. The memory backend remains for local development and deterministic tests only, and production release mode rejects memory coordination by default. Operational activation still requires the Step 54.5 live validation gate to pass against local Supabase or a dedicated nonproduction Supabase project.

Rollout plan:

- Stage 0 `disabled`: no AI generation.
- Stage 1 `internal`: allowlisted internal accounts, mock or low-volume live provider calls, offline evals required.
- Stage 2 `beta`: explicit beta allowlist, conservative quotas, read-only local tools only.
- Stage 3 broader beta: expanded cohort, monitored output-validation and provider-failure rates.
- Stage 4 production: generally eligible authenticated users after current-information tools, shared quotas, and authenticated seeded E2E are complete.

Incident response:

- Secret exposure: enable kill switch, rotate affected keys, scan logs/dist, add a regression fixture.
- Private context leak: disable AI release mode, preserve safe request references, audit local conversation storage, add context-leak tests.
- Hallucinated current facts: disable affected task/tool allowlist, require citations/tool evidence, add eval cases.
- Unsafe tool request or provider outage: disable selected tool/model, review safe observability events, restore only after regression coverage.

Authenticated seeded E2E now uses real Supabase Auth storage state instead of an app bypass. Run `npm run e2e:auth:setup` with a dedicated synthetic nonproduction user whose email starts with `fanatlas-validation-e2e-` and ends with `@example.test`; the command refuses the known production Supabase project, requires `FANATLAS_E2E_NONPRODUCTION=true`, redacts credentials from output, and writes only under the gitignored `tests/e2e/.auth/` directory. Then run `npm run test:e2e:authenticated`. Without that state, authenticated browser tests skip with a clear reason while unauthenticated route-gate smoke tests still run.

### Step 54 Part 1 coordination infrastructure

FanAtlas AI now has server-only coordination stores for usage, idempotency, concurrency, and provider health. The selected production backend is Supabase/Postgres because the app already uses Supabase authentication, the expected beta load is modest, Postgres supports atomic updates and row locks, cleanup can be implemented with SQL functions, and no additional vendor is needed.

Backends:

- `FANATLAS_AI_COORDINATION_BACKEND=memory`: local development and deterministic tests only.
- `FANATLAS_AI_COORDINATION_BACKEND=supabase`: production-oriented shared coordination through service-role RPC functions.

Production release mode rejects the memory backend unless `FANATLAS_AI_ALLOW_MEMORY_COORDINATION_IN_PRODUCTION=true` is explicitly set. That override is for emergency/internal previews only and should not be used for broad beta or production.

Coordination semantics:

- Daily usage buckets use UTC calendar dates.
- Minute limits use fixed UTC minute buckets.
- Quota reservation counts accepted AI requests and is separated from provider/tool finalization.
- Duplicate delivery with the same authenticated user, `clientRequestId`, and safe request fingerprint replays the completed safe response within the idempotency window.
- Same user plus same `clientRequestId` but a different fingerprint is rejected as an idempotency conflict.
- One active request is allowed per conversation lock; locks expire automatically by TTL and stale locks can be recovered.
- Provider health supports closed, open, and half-open states. Half-open probes are leased so multiple instances do not all probe at once.

The committed Supabase schema and baseline migration add `fanatlas_ai_usage_daily`, `fanatlas_ai_usage_minute`, `fanatlas_ai_concurrency_locks`, `fanatlas_ai_idempotency`, `fanatlas_ai_provider_health`, and `fanatlas_ai_tool_cache`, plus atomic RPC functions for quota reservation, usage finalization, lock acquisition/release, idempotency start/complete, provider circuit transitions, and cleanup. Coordination/cache tables have RLS enabled, client table grants revoked, and privileged RPC execution revoked from `public`, `anon`, and `authenticated`; server code must use `SUPABASE_SERVICE_ROLE_KEY`.

Retention and cleanup:

- Minute buckets expire after short windows.
- Locks expire by `FANATLAS_AI_LOCK_TTL_MS`.
- Idempotency records expire by `FANATLAS_AI_IDEMPOTENCY_TTL_MS`.
- Provider health stores rolling state only.
- `fanatlas_ai_cleanup_coordination()` removes expired minute buckets, locks, and idempotency records. Run it opportunistically or from a platform schedule.

Deployment order:

1. Apply migrations from `supabase/migrations` to an empty nonproduction database.
2. Run `npm run check:ai-coordination`.
3. Run `npm run test:ai-coordination:live`.
4. Verify RLS/revokes and RPC function execution with service role only.
5. Deploy API code with `FANATLAS_AI_COORDINATION_BACKEND=memory` in internal mode.
6. Switch internal environment to `supabase` backend and run coordination checks.
7. Enable beta allowlist with conservative quotas.
8. Expand slowly after monitoring quota, lock, idempotency, cache, and circuit behavior.

Rollback:

- Set `FANATLAS_AI_KILL_SWITCH=true` or `FANATLAS_AI_RELEASE_MODE=disabled` to stop provider execution.
- Narrow `FANATLAS_AI_TASK_ALLOWLIST` or `FANATLAS_AI_TOOL_ALLOWLIST` for scoped rollback.
- Revert to internal-only mode before switching coordination backend.

Authenticated seeded browser testing decision:

- Supabase local or a dedicated nonproduction Supabase project is required for authenticated E2E.
- A browser-only auth bypass was not added.
- Test-only server sessions were not added.
- `tests/e2e/helpers/auth.ts` requires `FANATLAS_E2E_NONPRODUCTION=true`, rejects the known production project, and accepts only an existing ignored storage-state JSON under `tests/e2e/.auth/`.
- The authenticated suite seeds deterministic synthetic Trip Draft data in browser storage only. It covers `/ai`, `/passport`, `/journal`, `/insights`, `/explorer`, mobile accessibility smoke checks, and Trip Draft cross-tab storage sync when nonproduction auth state exists.
- Default CI does not require auth secrets. Protected/manual CI can run `npm run e2e:auth:setup` and `npm run test:e2e:authenticated` after configuring nonproduction Supabase Auth credentials.

### Step 54 Part 2 current-information tools

FanAtlas AI now has a server-only current-information tool executor. Browser code still calls only `/api/fanatlas-ai`; it never calls weather, currency, emergency, research, or AI providers directly.

Current tool backends:

- `weather_lookup`: server-side Open-Meteo adapter with deterministic mock mode, trusted local destination coordinate resolution, 16-day forecast-horizon validation, source citation, and freshness metadata.
- `currency_conversion`: server-side exchange-rate adapter using the existing currency-code conventions, deterministic mock mode, finite amount validation, rate timestamp, and “rates may change” disclosure.
- `emergency_services_lookup`: server-side lookup against the verified FanAtlas emergency-number dataset, reviewed date metadata, official-emergency citation, and `/sos` path in structured output.
- `destination_current_information`: tightly scoped allowlist-based source model for official destination updates. It does not provide unrestricted browsing and does not determine visa or customs rules.

Live tool gate:

- Real live tools require `FANATLAS_AI_COORDINATION_BACKEND=supabase`, `FANATLAS_AI_COORDINATION_LIVE_VALIDATED=true`, and a passing server-side coordination readiness check.
- Without the validation flag and readiness check, non-mock live tools fail closed with `current_information_unavailable`.
- Mock tools are available only through server-side mock/internal test configuration and are not activated by the browser.

Tool configuration:

```bash
FANATLAS_WEATHER_ENABLED=false
FANATLAS_WEATHER_PROVIDER=open_meteo
FANATLAS_CURRENCY_ENABLED=false
FANATLAS_CURRENCY_PROVIDER=open_er_api
FANATLAS_EMERGENCY_INFO_ENABLED=false
FANATLAS_CURRENT_RESEARCH_ENABLED=false
FANATLAS_CURRENT_RESEARCH_PROVIDER=configured_allowlist
FANATLAS_TOOL_TIMEOUT_MS=8000
FANATLAS_AI_COORDINATION_LIVE_VALIDATED=false
```

The committed schema also includes `fanatlas_ai_tool_cache` with RLS enabled, client-role revocation, expiration indexes, and cleanup through `fanatlas_ai_cleanup_coordination()`. The runtime cache currently uses a server-only in-memory implementation until live Supabase validation is performed in a nonproduction database. Cache keys are normalized public query keys and exclude user IDs, raw prompts, Journal content, trip titles, precise location, and authentication data.

### Step 54.5 live infrastructure validation gate

The live gate is executable and has passed against a dedicated nonproduction Supabase project after the Step 54.5 atomic coordination repairs. Do not set `FANATLAS_AI_COORDINATION_LIVE_VALIDATED=true` in any environment until that environment has the latest migrations applied and the following commands pass there:

```bash
supabase --version
supabase db reset
FANATLAS_E2E_NONPRODUCTION=true \
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run check:ai-coordination

FANATLAS_E2E_NONPRODUCTION=true \
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run test:ai-coordination:live
```

The live command uses only synthetic IDs and safe response snapshots. It validates readiness, live contract parity, parallel quota/lock/idempotency races, half-open circuit leases, RLS/client denial, cleanup, tool-cache read/write/expiry, and controlled backend outage behavior. It refuses the known production Supabase project and redacts long token-like values from errors.

If live validation returns SQLSTATE `23505` from `fanatlas_ai_start_idempotency` during the parallel idempotency phase, the nonproduction database is missing the Step 54.5 atomic idempotency migration. Apply `supabase/migrations/20260816010000_fanatlas_step545_atomic_idempotency_repair.sql` before rerunning the gate; do not weaken the primary key.

### Step 55 authenticated nonproduction release gate

Authenticated nonproduction E2E is guarded by `FANATLAS_E2E_NONPRODUCTION=true`, production-project rejection, a reserved synthetic auth identity, and a gitignored Playwright storage-state file. The synthetic Trip Draft fixture is local/browser-owned, namespaced as `fanatlas-e2e-*`, and contains only fabricated Lisbon/Portugal travel data. Tests do not truncate tables, delete real user data, expose service-role credentials to the browser, or add query-string/session bypasses.

Activation flow:

```bash
FANATLAS_E2E_NONPRODUCTION=true \
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
FANATLAS_E2E_AUTH_EMAIL=fanatlas-validation-e2e-<name>@example.test \
FANATLAS_E2E_AUTH_PASSWORD=... \
npm run e2e:auth:setup

npm run test:e2e:authenticated
FANATLAS_AI_RELEASE_GATE_RUN_LIVE=true \
npm run check:ai-release-gate
```

`npm run check:ai-release-gate` is intentionally fail-closed. It requires normal validation, coordination tests, server-boundary security checks, live coordination evidence only when explicitly opted in with `FANATLAS_AI_RELEASE_GATE_RUN_LIVE=true`, and authenticated E2E evidence when storage state is configured. A `ready` result means the codebase has the expected nonproduction/internal evidence to manually decide whether to set `FANATLAS_AI_COORDINATION_LIVE_VALIDATED=true`; the command does not set the flag.

Pre-existing browser data calls: the production bundle still contains standalone non-AI weather and exchange-rate chunks that call public external endpoints directly. No secrets are exposed there, and the FanAtlas AI route chunk does not import the new server tool modules or call external tool providers directly. A future cleanup should migrate those standalone pages behind the server tool layer if unified rate limiting is required.

### Step 56 Part 1 controlled internal activation

Controlled internal activation uses the existing release-mode system. It requires `FANATLAS_AI_RELEASE_MODE=internal`, `FANATLAS_AI_ENABLED=true`, `FANATLAS_AI_COORDINATION_BACKEND=supabase`, a validated nonproduction/internal database, `FANATLAS_AI_COORDINATION_LIVE_VALIDATED=true` in that environment only, and an explicit server-side `FANATLAS_AI_INTERNAL_ALLOWLIST`. Production remains disabled unless it is configured separately.

The kill switch remains the fastest shutdown path: set `FANATLAS_AI_KILL_SWITCH=true` or `FANATLAS_AI_RELEASE_MODE=disabled` to stop new model/tool execution without a frontend deployment or schema change. Narrow `FANATLAS_AI_TASK_ALLOWLIST` or `FANATLAS_AI_TOOL_ALLOWLIST` to roll back a specific task or live-tool class.

The initial live-tool surface is read-only: `weather_lookup`, `currency_conversion`, `emergency_services_lookup`, and `destination_current_information`. Each tool still requires its own server enable flag and provider configuration. Disabled tools fail closed and the model is not asked to invent current information. Booking, purchase, reservation, message, calendar, profile, trip mutation, navigation mutation, and autonomous write tools remain unavailable.

Privacy-safe operational telemetry is opt-in with `FANATLAS_AI_OPERATIONAL_TELEMETRY=console`. It records sanitized operational metadata such as release mode, task, model profile ID, requested/executed tool IDs, cache hit counts, latency, quota outcome, cost class, failure category, and validation outcome. It does not record raw prompts, raw answers, Journal body, precise private trip content, photo IDs, auth tokens, provider keys, Supabase keys, or storage state.

Internal cost and usage guardrails are server-side. `FANATLAS_AI_MAX_MODEL_CALLS_PER_REQUEST`, `FANATLAS_AI_MAX_TOOL_CALLS_PER_REQUEST`, `FANATLAS_AI_MAX_COST_CLASS`, `FANATLAS_AI_MAX_CONTEXT_SIZE_CLASS`, and `FANATLAS_AI_MAX_OUTPUT_CHARACTERS` bound each request before provider execution. Existing shared quotas continue to enforce `FANATLAS_AI_MAX_REQUESTS_PER_MINUTE` and `FANATLAS_AI_MAX_REQUESTS_PER_DAY`.

Latency budgets remain server-enforced through `FANATLAS_AI_TOTAL_TIMEOUT_MS`, `FANATLAS_AI_TIMEOUT_MS`, `FANATLAS_TOOL_TIMEOUT_MS`, and `FANATLAS_CURRENT_INFORMATION_TIMEOUT_MS`. Timeout failures are normalized and provider-neutral.

Cache and freshness policy is tool-specific. Weather may use short stale cache, currency may use a shorter rate cache, emergency information must meet reviewed/source requirements without stale fallback, and current destination research must have approved-source fresh evidence.

### Step 56 Part 2 controlled internal live sessions

Internal live-session validation is intentionally separate from the release gate. It exercises the internal product with real server configuration and writes only aggregate evidence to `docs/fanatlas-ai-internal-qa.md`.

```bash
npm run check:ai-internal-activation
npm run test:ai-internal-live
```

`npm run check:ai-internal-activation` loads `.env.local`, prints only safe boolean/reason-code diagnostics, and returns `READY` only when internal mode, shared Supabase coordination, the validated-live flag, internal entitlement, provider configuration, task/tool allowlists, quotas, and tool source settings are all explicitly configured. It rejects the known production Supabase project and does not print URLs, keys, JWTs, passwords, storage state, prompts, or user content.

`npm run test:ai-internal-live` is live-only and skipped by ordinary `npm run test`. It uses the synthetic nonproduction auth user, real server-side FanAtlas AI endpoint behavior, current-information tools, quota/kill-switch drills, idempotent retry checks, and privacy canaries. The harness records aggregate pass/fail counts, latency observations, tool/model call counts, citation counts, and safe failure categories. Raw prompts, raw AI output, Journal body, trip notes, auth tokens, provider keys, service-role keys, and storage state are never written to the QA report.

Beta entry requires 100% auth/ownership enforcement, 100% current-claim citation evidence, 100% secret/privacy adversarial tests, 0 direct browser provider calls, 0 known cross-user leaks, 0 coordination/idempotency regressions, verified kill switch and quotas, bounded cost classes, acceptable internal latency, and more than 95% successful ordinary internal requests excluding intentional blocked scenarios.

## Global Destination Intelligence

Step 57 Part 1 adds a provider-neutral destination intelligence foundation in `src/lib/destinationIntelligence.ts`. It derives canonical country and city identities from existing local FanAtlas data, using ISO 3166-1 alpha-2 country codes and country-scoped city keys such as `country:MA` and `city:MA:marrakech`.

The layer is pure, deterministic, React-free, storage-free, network-free, and AI-free. It classifies fields as `STATIC`, `SLOW_CHANGING`, `CURRENT_INFORMATION`, or `HIGH_STAKES_CURRENT_INFORMATION`; carries provenance-capable field envelopes; models unknown fields explicitly; and produces non-persisted data-quality counters. It does not build a destination page, geocode dynamically, call OpenAI, call live travel providers, or create visa/advisory/safety engines.

Step 57 Part 2 adds the first read-only Destination Hub at `/destination/:destinationId`. The route is private and lazy-loaded, accepts encoded canonical IDs such as `/destination/country%3APT` and `/destination/city%3APT%3Alisbon`, and renders only local/derived metadata from the Destination Intelligence model. It does not fetch live data on page open, call FanAtlas AI, create a visa engine, or add any new network provider.

Step 57 Part 3 adds the first curated static/slow-changing dataset in `src/data/destinationIntelligence/curatedData.ts`, covering United States, Canada, Mexico, Morocco, France, Spain, Portugal, United Kingdom, Italy, Germany, Japan, and Brazil plus a focused city cohort. The source registry tracks authority class and reviewed date. `src/lib/destinationCoverage.ts` validates source references, ISO/currency/language/timezone/electrical/emergency shapes, duplicate identities, privacy boundaries, and compatibility with the existing currency converter.

The Hub separates structured destination facts from personal FanAtlas context. Passport, Explorer, and Trip Drafts can link to the Hub when a destination resolves canonically; personal counts are derived from existing local trip data and never include Journal body, planning notes, photo IDs, auth tokens, raw storage IDs, or precise location history. Current-information actions route to existing safe surfaces such as SOS, Currency Converter, Translator, and Travel Tools.

SOS and the AI emergency-information tool consume the canonical emergency adapter. Unsupported countries are unavailable rather than inferred, and FanAtlas does not fall back to US `911` or a nearby country. Weather, exchange rates, visa/entry rules, travel advisories, transport disruptions, airport closures, health alerts, and other current/high-stakes topics remain outside the static dataset.

See `docs/destination-intelligence-architecture.md` for identity, provenance, emergency/high-stakes policy, privacy, and AI-boundary details.

## Travel Preparation

Step 58 Part 1 adds a private lazy Travel Preparation Center at `/preparation/:tripDraftId`. It reuses the existing Trip Draft planning-action checklist model as the source of truth: suggested preparation items and user-created items live in `TripDraft.planningActions`, use the existing local Trip Draft persistence, and keep existing completion, edit/remove, and storage-sync semantics.

The preparation domain in `src/lib/travelPreparation.ts` is pure, deterministic, local, and AI-free. It derives conservative sections from Trip Draft destination/dates plus Destination Intelligence metadata, including essentials, documents, money, language, power, safety, transportation, packing, and destination preparation. It also derives timing phases: anytime, early, week before, day before, departure day, trip started, and trip ended. It does not create visa eligibility, legal, medical, weather, exchange-rate, or AI-generated claims.

The page links to existing source-aware surfaces such as Destination Hub, Currency Converter, Translator, SOS, and Explorer. It groups existing planning actions into Focus now, Coming up, Later, and Completed, and shows readiness as checklist completion plus separate current/high-stakes notices.

## Trip Day / Today

Step 59 Part 1 adds the first on-trip execution surface at `/today` and explicit trip routes at `/trip-day/:tripDraftId`. Today is a private lazy route derived from existing Trip Drafts. It resolves one active dated trip for the injected current date, requires user choice when trips overlap, otherwise selects the nearest upcoming dated trip and avoids silently choosing a past or undated draft.

The Trip Day domain in `src/lib/tripDay.ts` is pure, deterministic, React-free, storage-free, network-free, and AI-free. It derives selected itinerary day, day state, Morning/Afternoon/Evening/Unassigned sections, separate global Still unscheduled places, progress, "Next in your plan", nearby planned-place groups, compact preparation notices, destination context, and quick actions.

Trip Day reuses existing Trip Draft visit status (`planned`, `visited`, `skipped`) and the existing status mutation path. It does not create a second completion model, persist percentages, create journal body, preload photo blobs, start GPS, add maps/routing, fetch weather/rates/research/advisories, or call FanAtlas AI/OpenAI. Future live-context work can add explicit current-information actions without changing the no-fetch-on-load boundary.

Step 59 Part 2 adds explicit live context for weather, currency, official destination updates, and route handoff. Those checks remain user-triggered, source-backed, and separate from the pure Trip Day model. They do not auto-fetch on load or mutate the itinerary.

Step 59 Part 3 tightens the execution loop around the next planned place: Today now emphasizes the current execution target, advances when a place is marked visited or skipped, shows a restrained completion state when the day is done, and keeps route/location handoff explicit and ephemeral. Unassigned places remain visible separately and do not replace the main next-place hero.

Step 58 Part 3 adds opt-in local preparation reminders. Reminder settings and acknowledgement metadata live on the Trip Draft, browser notification permission is requested only after the traveler explicitly enables reminders, and in-app reminders remain available when browser notifications are unsupported or blocked. The current implementation does not add push subscriptions, email, SMS, calendar writes, server jobs, polling, background sync, live data fetches, OpenAI calls, Journal body loading, photo blobs, or a second checklist persistence key. See `docs/travel-preparation-architecture.md` for phase boundaries, occurrence identity, reconciliation, privacy, and future-extension rules.

## Vercel deployment

1. Go to Vercel
2. Import GitHub repo
3. Add the environment variables
4. Deploy

## Next development steps

1. Connect Supabase Auth
2. Replace mock data with Supabase queries
3. Add API-Football fixtures to Match Center
4. Replace mock and demo integrations with production providers
5. Connect Mapbox or Google Maps for in-app directions
