# FanAtlas Travel Intelligence Architecture

FanAtlas Travel Intelligence is a provider-neutral foundation for FanAtlas AI. Part 1 added no provider calls. Step 53 Part 2 added a secure user-facing FanAtlas AI concierge behind a server boundary. Step 53 Part 3 hardens that concierge for controlled beta use with release modes, entitlement, deterministic evaluations, quota controls, hallucination checks, and privacy validation.

## Source Of Truth

```
Trip Drafts
  -> Travel Passport
  -> Travel Insights
  -> Global Travel Explorer
  -> Travel Context Engine
  -> Tool Planner
  -> AI Orchestrator
  -> Provider Gateway
  -> Provider Adapters
```

Trip Drafts continue to own trip planning data, itinerary, places, journal entries, photo references, and completion state. Passport owns completed-travel eligibility. Insights own derived statistics. Explorer owns geographic read models. Travel Intelligence owns only ephemeral context composition, permission enforcement, minimization, tool planning, capability matching, usage estimates, and safe trace metadata.

## FanAtlas AI Request Lifecycle

```
User
  -> FanAtlas AI UI
  -> Authenticated FanAtlas AI API
  -> Context and Policy Engine
  -> Orchestrator
  -> Provider Gateway
  -> Approved Tools
  -> Provider-Neutral Response
  -> Validated UI Components
```

The `/ai` page calls only `POST /api/fanatlas-ai`. Browser code never imports provider SDKs, never reads provider keys, and never chooses a provider or model. The API validates the Supabase bearer token, request version, message length, locale, IDs, scopes, consent, feature flags, and rate limits before any provider work.

The legacy `/api/ai` endpoint is retired with a 410 response so it cannot bypass the authenticated FanAtlas AI contract.

Production request lifecycle:

```
Browser
  -> FanAtlas server endpoint
  -> Authentication
  -> Release mode and entitlement
  -> Request validation
  -> Shared idempotency start
  -> Shared quota reservation
  -> Shared concurrency lock
  -> Rate limit, concurrency, idempotency
  -> Context policy and minimization
  -> Orchestration and tool allowlist
  -> Shared provider-health check and gateway
  -> Output validation, citation validation, redaction
  -> Usage finalization and idempotency completion
  -> Lock release
  -> Provider-neutral response
  -> FanAtlas AI UI
```

The browser never receives provider credentials, hidden prompts, internal traces, raw provider payloads, or unrestricted tool access.

## Context Pipeline

1. A `TravelIntelligenceRequest` declares the task, scope, locale, permissions, usage constraints, and normalized user intent.
2. `buildTravelContext()` selects only requested records and creates minimized projections.
3. Field-level policies classify and gate personal, sensitive, and highly sensitive data.
4. Context budgeting trims optional sections first, starting with memory metadata and oversized saved-place lists.
5. The resulting context includes provenance, warnings, a privacy summary, and an estimated character size.

Context is never written to localStorage, sessionStorage, IndexedDB, Supabase, URLs, or provider logs.

The FanAtlas AI page persists only visible local conversation messages and consent state for continuity. It does not persist minimized TravelContext snapshots, provider prompts, tool payloads, precise location, Journal body, photo IDs, or hidden provider metadata.

## Privacy Classes

- `public`: destination facts such as canonical country names.
- `application`: feature state and nonprivate route names.
- `personal`: trip titles, saved places, itinerary summaries, preferences.
- `sensitive`: travel dates, precise location, Journal body, document metadata.
- `highly_sensitive`: identity documents, payment details, authentication tokens, medical details.

Highly sensitive fields are modeled but not allowed through the Part 1 context pipeline.

## Tool Planning

The static tool registry defines anticipated tools with privacy level, read/suggest classification, permission requirements, network requirements, and enabled state. The Part 2 server endpoint validates tool plans but does not execute write tools.

Network-backed tools are disabled by default unless future policy explicitly enables external research. Current-information tasks such as visa, customs, emergency, weather, currency, transport, and availability-dependent guidance fail closed with clarification when source-backed research is unavailable.

## Orchestration

The orchestrator matches task requirements to provider-neutral model capabilities. It can select a capable model profile, use a capable fallback, block when tools are unavailable, or mark a task unsupported. It never falls back to an incapable model just to produce an answer.

Provider roles are internal:

- primary concierge role for conversation, planning, itinerary generation, and multilingual responses
- visual/location role for future image and map reasoning
- long-document role for future visa, customs, and document analysis
- local low-risk role for future low-cost summaries and categorization

The user-facing UI shows only FanAtlas AI. Provider names, model IDs, fallback chains, and cost internals are not rendered to users.

## Provider Gateway

Part 2 introduces a provider-neutral gateway interface that accepts bounded messages, locale, selected internal model profile, and output limits. The first production adapter is OpenAI-compatible and runs only in the serverless API route through direct HTTPS. No provider SDK package is added.

Server configuration:

- `FANATLAS_AI_RELEASE_MODE` accepts `disabled`, `internal`, `beta`, or `production`. Missing or invalid values fail closed unless legacy `FANATLAS_AI_ENABLED=true` or mock mode is explicitly set.
- `FANATLAS_AI_ENABLED=true` enables live provider calls.
- `FANATLAS_AI_MOCK=true` enables deterministic mock responses for tests and nonproduction local checks.
- `FANATLAS_AI_KILL_SWITCH=true` disables generation without a frontend deployment.
- `FANATLAS_AI_INTERNAL_ALLOWLIST` and `FANATLAS_AI_BETA_ALLOWLIST` are server-side entitlement inputs.
- `FANATLAS_AI_TASK_ALLOWLIST` and `FANATLAS_AI_TOOL_ALLOWLIST` restrict rollout by task and tool.
- `FANATLAS_AI_MAX_REQUESTS_PER_MINUTE`, `FANATLAS_AI_MAX_REQUESTS_PER_DAY`, and `FANATLAS_AI_TIMEOUT_MS` bound request volume and duration.
- `FANATLAS_AI_MAX_MODEL_CALLS_PER_REQUEST`, `FANATLAS_AI_MAX_TOOL_CALLS_PER_REQUEST`, `FANATLAS_AI_MAX_COST_CLASS`, `FANATLAS_AI_MAX_CONTEXT_SIZE_CLASS`, and `FANATLAS_AI_MAX_OUTPUT_CHARACTERS` bound internal cost and response size before provider execution.
- `FANATLAS_AI_OPERATIONAL_TELEMETRY=console` enables sanitized server operational events only.
- `FANATLAS_AI_RESEARCH_ENABLED=true` is reserved for source-backed current-information tools.
- `FANATLAS_AI_PRIMARY_MODEL` is read server-side only.
- `OPENAI_API_KEY` is read server-side only and must never use a `VITE_` prefix.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` allow the API to validate the authenticated user.

The browser cannot provide arbitrary provider configuration.

## Prompt Boundaries

Provider requests preserve separate sections:

- system policy
- structured context
- recent visible conversation
- current user message

User-authored trip titles, saved-place names, Journal text, external facts, and tool results are untrusted data. They are never concatenated into system policy and must not broaden permissions, request hidden prompts, call unapproved tools, or perform writes.

## Safety And Current Information

Emergency, visa, customs, transportation, place-recommendation, and budget tasks are marked as current-information dependent where stored FanAtlas data is insufficient. Part 1 returns warnings and blocked plans; it does not generate substantive high-stakes advice.

Part 2 keeps these safeguards. If current-information tools are unavailable or disabled, the API returns a provider-neutral clarification/blocking response instead of asking the model to answer from memory.

Part 3 adds deterministic current-fact checks. Provider text is rejected when it claims live verification, current weather, exchange rates, visa rules, entry requirements, or similar time-sensitive facts without approved tool evidence. High-stakes citations must come from an authoritative source category such as official government, embassy, transport, emergency, recognized weather, or authoritative health.

## Evaluations

Offline evaluations live in `src/lib/fanAtlasAIEvaluations.ts` with synthetic fixtures in `src/test/fixtures/fanAtlasAIEvaluationFixtures.ts`. They run through `npm run test:ai-evals` and are included in `npm run validate`.

Evaluation categories cover ordinary travel, clarification, current information, high-stakes safeguards, privacy, prompt injection, citation integrity, output validation, and provider-neutral behavior. The runner uses deterministic mock orchestration and mocked provider outputs; it never calls a live model and never requires provider credentials.

## Hallucination Controls

The output validator blocks or rejects:

- claims that FanAtlas AI booked, purchased, saved, deleted, shared, contacted, or modified anything
- fake current-source or live-weather claims when no current-information tool succeeded
- exact high-stakes claims without authoritative citations
- invented citations that were not produced by approved tool output
- unsafe `javascript:` or `data:` links and script-like markup
- excessively long provider output

When validation fails, the API returns a normalized provider-neutral error instead of rendering partial unsafe output.

## Prompt-Injection Threat Model

Untrusted content includes user messages, trip titles, itinerary text, Planning Notes, Journal body, saved-place descriptions, uploaded documents in future flows, external websites, tool results, provider output, and citation titles. Only server-owned policy and validated tool schemas are trusted instructions.

Provider requests preserve separate system policy, structured context, visible conversation, and user-message sections. Tool results remain data and cannot redefine permissions, broaden context, choose provider models, request hidden prompts, execute writes, or bypass rate limits.

## Citations And Links

External citations use a provider-neutral `TravelCitation` model with title, source, URL, retrieval time, and category. URLs are normalized and only `http` or `https` links are rendered. The UI uses ordinary text and safe anchors with `rel="noopener noreferrer"`; provider HTML is never rendered.

Citation integrity requires IDs to match executed approved tool output when tool evidence exists. Duplicate citations are normalized, unsafe URLs are discarded, and high-stakes responses cannot rely only on unknown or ordinary secondary sources.

## Error Flow

Provider and server failures are normalized into safe codes such as `ai_disabled`, `unauthenticated`, `invalid_request`, `provider_unavailable`, `provider_rate_limited`, `provider_timeout`, `tool_unavailable`, `usage_limit_reached`, `request_cancelled`, and `server_error`. Responses do not include provider stack traces, raw payloads, API key names, or private context.

## Cancellation And Retry

The client uses `AbortController` for cancellation, prevents stale UI updates, keeps the visible user message, and marks stopped assistant messages as stopped. Retry reuses the visible user request while rebuilding current context from local application state.

## Logging And Traces

Safe logs may include request ID, task type, capability requirements, model IDs, tool IDs, reason codes, warning codes, context section presence, size class, latency class, and cost class.

Safe logs must not include raw user prompts, Journal body, precise coordinates, document content, photo IDs, authentication data, provider keys, or full Trip Draft payloads.

Safe event names are controlled: `fanatlas_ai_request_started`, `fanatlas_ai_request_completed`, `fanatlas_ai_request_blocked`, `fanatlas_ai_request_failed`, `fanatlas_ai_request_cancelled`, `fanatlas_ai_clarification_required`, `fanatlas_ai_tool_planned`, `fanatlas_ai_tool_blocked`, and `fanatlas_ai_output_rejected`. The current implementation does not add third-party analytics.

Step 56 Part 1 adds opt-in server operational events for controlled internal testing. Events include only request class metadata: release mode, task, model profile ID, requested and executed tool IDs, tool success/failure counts, cache hit count, total/provider latency, estimated model/tool calls, cost class, quota outcome, provider circuit state, failure category, and validation outcome. Request IDs and user IDs are reduced to short local hashes for correlation. Raw prompts, raw AI responses, Journal body, private trip content, precise coordinates, photo IDs, auth tokens, service-role keys, provider keys, and storage state are not event fields.

User-facing failures may include a short support reference derived from the request ID, such as `FA-ABC123`. It does not encode user IDs, trip IDs, provider IDs, timestamps, or secrets.

## Feature Flags

The server endpoint returns `ai_disabled` unless release configuration permits the authenticated user. Release modes are `disabled`, `internal`, `beta`, and `production`. Entitlement is checked server-side through internal/beta allowlists or production eligibility. The kill switch disables generation across all modes.

Tool execution, image understanding, document analysis, travel research, write actions, and developer diagnostics remain disabled unless explicitly added later.

## Data Retention

Part 2 uses local visible conversation persistence only. Part 3 bounds that storage by visible message count, per-message citation count, and serialized character size. Users can clear the current conversation from the AI page. Clearing removes visible local messages and resets tool/error state. The implementation does not store provider prompts, hidden context snapshots, tool internals, provider responses, or safe traces in Supabase.

## Quotas, Idempotency, And Provider Resilience

Step 54 Part 1 replaces the endpoint's instance-local coordination path with server-only coordination interfaces:

```
FanAtlas AI API
  -> AIUsageStore
  -> AIIdempotencyStore
  -> AIConcurrencyStore
  -> AIProviderHealthStore
  -> AICoordinationReadiness
    -> memory backend for local tests
    -> Supabase/Postgres backend for shared production coordination
```

The selected production backend is Supabase/Postgres. It fits the current deployment because FanAtlas already uses Supabase authentication, service-role server access can be kept out of browser bundles, Postgres supports atomic updates and row locks, and expected beta load does not justify adding Redis or another infrastructure vendor.

Coordination data models:

- `fanatlas_ai_usage_daily`: user ID, UTC usage date, request/provider/tool counts, input/output size units, blocked/failed counts, updated time.
- `fanatlas_ai_usage_minute`: user ID, UTC minute bucket, request count, expiration.
- `fanatlas_ai_concurrency_locks`: lock key, user ID, conversation ID, request ID, acquired/expiration time.
- `fanatlas_ai_idempotency`: user ID, client request ID, safe request fingerprint, status, safe response snapshot, created/expiration time.
- `fanatlas_ai_provider_health`: provider profile ID, closed/open/half-open state, rolling success/failure/timeout counters, cooldown, half-open lease.
- `fanatlas_ai_tool_cache`: public normalized tool cache key, validated result envelope, source quality, freshness, retrieval/stale/expiration timestamps.

Raw user prompts, assistant answers outside safe idempotent response snapshots, Journal text, trip content, precise location, tool results, provider prompts, citations, and secrets are not stored in coordination records.

Atomic operations:

- `fanatlas_ai_reserve_quota()` reserves the minute and daily quota slot in one server-side operation and rolls back the minute increment if the daily quota is exhausted.
- `fanatlas_ai_acquire_lock()` uses row locking and TTLs to prevent overwriting a valid active lock while allowing stale-lock recovery.
- `fanatlas_ai_start_idempotency()` detects replay, processing, conflict, expired records, and retryable failures without storing message text.
- `fanatlas_ai_before_provider_call()` controls open and half-open circuit state so only one half-open probe is leased at a time.

Failure behavior is fail-closed for production. If shared coordination is unavailable or production is configured with the memory backend, the API returns `coordination_unavailable` and does not call the provider.

The memory backend remains only for local development and deterministic tests. It follows the same contract as the Supabase backend and is covered by `npm run test:ai-coordination`.

The Step 54.5 readiness gate is represented by `AICoordinationReadiness`. Live tool activation requires more than `FANATLAS_AI_COORDINATION_LIVE_VALIDATED=true`; the API also performs a cached server-side readiness check against the Supabase backend. The readiness cycle checks connectivity, quota RPC execution, idempotency, locks, provider health, cleanup, and tool-cache write/read/delete behavior with synthetic records.

## Rollout And Rollback

- Stage 0: `disabled`
- Stage 1: `internal` allowlist
- Stage 2: small `beta` allowlist with Supabase coordination and conservative quotas
- Stage 3: broader beta with monitored validation, provider, and quota metrics
- Stage 4: production after shared quotas, source-backed current-information tools, and authenticated seeded E2E are ready

Rollback can be performed with `FANATLAS_AI_KILL_SWITCH=true`, by setting `FANATLAS_AI_RELEASE_MODE=disabled`, or by narrowing task/tool allowlists. No frontend deployment is required to disable unsafe provider behavior.

Deployment sequence:

1. Apply migrations from `supabase/migrations` to an empty nonproduction database.
2. Run `npm run check:ai-coordination`.
3. Run `npm run test:ai-coordination:live`.
4. Verify client roles cannot read or mutate coordination/cache tables or execute privileged RPCs.
5. Deploy API code with shared backend disabled.
6. Enable Supabase coordination for internal accounts.
7. Observe quota, idempotency, lock, cache, and provider-health behavior.
8. Run `npm run e2e:auth:setup`, `npm run test:e2e:authenticated`, and `FANATLAS_AI_RELEASE_GATE_RUN_LIVE=true npm run check:ai-release-gate` in the protected nonproduction/internal environment.
9. Expand beta slowly.

Cleanup uses the committed `fanatlas_ai_cleanup_coordination()` RPC for expired minute buckets, locks, idempotency records, and tool-cache rows. It can run opportunistically or from a deployment-platform schedule; no always-running worker is required.

## Source-Backed Current Information

Step 54 Part 2 adds a server-only tool execution boundary:

```
User request
  -> FanAtlas AI API
  -> Context and policy
  -> Tool plan
  -> Release-mode tool allowlist
  -> Server-only tool executor
  -> Tool cache
  -> External source adapter or verified local data
  -> Validated tool result
  -> Citation and freshness envelope
  -> Provider or direct grounded response
  -> Output validation
  -> FanAtlas UI
```

The browser never calls weather, currency, emergency, research, or model providers directly. Tool adapters live under `src/server/tools` and are covered by the same server-only boundary scan as the coordination stores.

Current tools:

- `weather_lookup` uses trusted structured coordinates from the selected destination or local destination dataset, validates latitude/longitude and forecast horizon, and returns Open-Meteo citation/freshness metadata. It does not infer coordinates from Journal or notes.
- `currency_conversion` validates ISO-style currency codes, finite nonnegative amounts, same-currency conversion, rate timestamp, and source citation. It reuses the existing app currency conventions but moves AI live rate access behind the server.
- `emergency_services_lookup` uses the FanAtlas emergency-number dataset with a reviewed date and `/sos` handoff. It never places calls or shares location.
- `destination_current_information` is an allowlist-based source model for official advisories, airport, transport, tourism, health, and event sources. It is not unrestricted browsing and does not answer visa or customs determinations.

All tool results use a common envelope with status, citations, `retrievedAt`, freshness class, warnings, source quality, and cache state. Tool results are untrusted external data for prompting; they cannot modify system policy, broaden permissions, call other tools, or claim write actions.

Current claims require tool evidence. The endpoint passes executed citation IDs to output validation, and provider-invented citations or current-fact claims without executed tool evidence are rejected. Direct weather, currency, emergency, and research responses are rendered from validated structured tool output rather than raw provider HTML.

The tool cache is server-only. Cache keys contain public normalized query fields such as tool ID, destination identity, date bucket, units, currency pair, locale, and provider version. They do not contain user IDs, trip titles, raw prompts, Journal content, photo data, precise location beyond the normalized tool need, or auth tokens.

The schema includes `fanatlas_ai_tool_cache`, RLS, client-role revocation, expiration indexes, and cleanup in `fanatlas_ai_cleanup_coordination()`. Runtime tool execution remains fail-closed for live providers until the Step 54.5 validation gate passes in a real nonproduction database.

Live tool execution is gated by:

- shared Supabase coordination backend
- completed nonproduction database validation
- release-mode tool allowlist
- tool-specific server enable flag
- provider-specific server configuration
- cached server-side readiness result

If any gate is missing, tools fail closed with provider-neutral unavailable responses and no model is asked to fabricate current information.

Step 56 Part 1 internal activation keeps this surface read-only. The only live-tool IDs eligible for internal testing are `weather_lookup`, `currency_conversion`, `emergency_services_lookup`, and `destination_current_information`. Tool activation remains independent from AI release activation through `FANATLAS_AI_TOOL_ALLOWLIST`, `FANATLAS_WEATHER_ENABLED`, `FANATLAS_CURRENCY_ENABLED`, `FANATLAS_EMERGENCY_INFO_ENABLED`, `FANATLAS_CURRENT_RESEARCH_ENABLED`, provider-specific configuration, and the live coordination readiness cache. Write, booking, payment, reservation, messaging, calendar, profile, trip, navigation, and autonomous action tools remain unavailable.

Tool cache policy is explicit by tool:

- Weather is cacheable for a short forecast window and may show bounded stale data with freshness labeling.
- Currency is cacheable for a shorter rate window and may show bounded stale data with a rates-may-change notice.
- Emergency information is high stakes, not stale-cache eligible, and depends on reviewed source data.
- Destination current information is high stakes, limited to approved sources, and not stale-cache eligible for current claims.

Cost guardrails are provider-neutral. Per-request model calls, tool calls, context size class, output characters, and cost class are checked before provider execution; shared per-minute and per-day quotas remain in the coordination store. Estimates are operational safeguards, not exact billing records.

Latency budgets are server-side. Total request, provider call, live tool call, and current-information call budgets are configured separately. Timeouts return normalized provider-neutral errors and are recorded only as sanitized failure categories.

Provider health remains shared through `fanatlas_ai_provider_health`. Closed allows normal provider requests, open blocks until cooldown, half-open grants exactly one probe lease through the Step 54.5 atomic repair, success closes the circuit, and failure reopens with cooldown. Provider implementation details are never shown in traveler UI.

Step 56 Part 2 adds a controlled internal live-session harness, not a new product capability. `npm run check:ai-internal-activation` loads local server configuration, rejects production projects, and returns `READY` only when internal mode, validated Supabase coordination, an explicit internal allowlist, provider configuration, task/tool allowlists, quotas, and source settings are all present. `npm run test:ai-internal-live` runs the internal matrix through the server endpoint with the synthetic nonproduction account and writes only aggregate evidence to `docs/fanatlas-ai-internal-qa.md`.

The internal matrix covers ordinary provider generation, active-trip context, weather, currency, emergency information, controlled destination research, missing-information clarification, disabled tools, entitlement denial, provider/tool failure, quota limits, cancellation/idempotent retry, prompt injection, Journal privacy, kill switch, and safe telemetry. It does not persist raw prompts, raw provider responses, Journal bodies, private trip notes, auth tokens, provider keys, service-role keys, or storage state.

Beta entry requires measurable evidence: 100% auth and ownership enforcement, 100% current claims backed by valid executed-tool citations, 100% secret/privacy adversarial checks, 0 direct browser provider calls, 0 known cross-user leaks, 0 live coordination/idempotency regressions, verified kill switch and quotas, bounded cost classes, acceptable internal latency, and more than 95% successful ordinary internal requests excluding intentionally blocked scenarios.

## Step 54.5 Live Validation

The live validation commands are:

```bash
supabase --version
supabase db reset
npm run check:ai-coordination
npm run test:ai-coordination:live
```

`npm run test:ai-coordination:live` requires `FANATLAS_E2E_NONPRODUCTION=true`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. It refuses the known production Supabase project and uses only synthetic identifiers. It validates live contract parity, genuinely parallel quota/lock/idempotency races, half-open circuit lease control, RLS/client denial, cleanup, tool-cache privacy/expiry, and controlled backend outage behavior.

If live validation returns SQLSTATE `23505` from `fanatlas_ai_start_idempotency` during concurrent startup, the database is missing the Step 54.5 atomic idempotency repair. Apply `supabase/migrations/20260816010000_fanatlas_step545_atomic_idempotency_repair.sql` to the nonproduction project and rerun the live gate; do not weaken the `(user_id, client_request_id)` primary key.

Authenticated Playwright is storage-state based. `tests/e2e/helpers/auth.ts` requires `FANATLAS_E2E_NONPRODUCTION=true`, an ignored `FANATLAS_E2E_AUTH_STORAGE_STATE` JSON under `tests/e2e/.auth/`, and a Supabase URL that does not match the known production project. `npm run e2e:auth:setup` signs in or creates a reserved synthetic nonproduction user through normal Supabase Auth and writes storage state without logging credentials or tokens. No browser auth bypass route exists.

Authenticated Step 55 coverage seeds a browser-local synthetic Trip Draft fixture rather than adding product tables. The fixture uses `fanatlas-e2e-*` identifiers, fabricated Lisbon/Portugal content, one completed trip, one visited place, one planned place, and one journal entry. It supports `/ai`, `/passport`, `/journal`, `/insights`, `/explorer`, mobile smoke checks, and Trip Draft cross-tab storage-event synchronization while keeping Journal body text off unrelated derived pages.

Default CI remains secret-free for ordinary unit, build, and unauthenticated browser smoke validation. The authenticated E2E job is manual/protected and runs only when nonproduction Supabase URL, anon key, service-role key, synthetic E2E email/password, and `FANATLAS_E2E_NONPRODUCTION=true` are configured. Missing auth evidence causes authenticated tests to skip locally and causes the release gate to report `not_ready`, not a false pass.

`npm run check:ai-release-gate` is the deterministic AI release gate. It reruns the core static/unit/security checks, requires live coordination evidence only when explicitly opted in with `FANATLAS_AI_RELEASE_GATE_RUN_LIVE=true`, requires authenticated E2E evidence when configured, and prints `ready` or `not_ready` without changing `FANATLAS_AI_COORDINATION_LIVE_VALIDATED`.

The production bundle scan found existing standalone non-AI weather and exchange-rate chunks that call public provider URLs directly. They do not expose secrets and are not used by FanAtlas AI. A future infrastructure cleanup can migrate those standalone pages behind the server tool layer if shared quota or observability is required for those tools.

## Incident Response

- Suspected secret exposure: enable kill switch, rotate keys, scan source/dist/logs, and add a regression fixture.
- Private context leak: disable release mode, inspect safe support references, verify conversation storage, and add a context-leak evaluation.
- Repeated hallucinated current facts: disable affected tasks/tools and require citation/tool evidence before re-enabling.
- Unsafe tool request: block the tool ID in the allowlist and add tool-adversarial coverage.
- Provider outage or cost spike: allow circuit breaker cooldown, lower quotas, disable fallback or model profile, and review safe aggregate metrics.

## Known Limitations

- The first production provider adapter is server-side and OpenAI-compatible.
- No AI SDK packages are installed.
- No diagnostic UI route was added because the current app does not have a production-isolated developer route convention.
- Token estimation uses deterministic character-size classes rather than provider tokenizers.
- Tool schemas are TypeScript-friendly placeholder contracts, not executable validators.
- Authenticated seeded AI Playwright content tests are implemented but skip unless safe nonproduction auth storage state exists.
- Current-information tools are implemented behind server-side release/config/database gates; visa, customs, and unrestricted web research remain blocked.
- Supabase coordination migrations and live validation commands are committed, but each nonproduction database must be migrated before the live gate can pass.
- `tests/e2e/helpers/auth.ts` supports authenticated Playwright storage-state reuse only when `FANATLAS_E2E_NONPRODUCTION=true` and `FANATLAS_E2E_AUTH_STORAGE_STATE` points to a synthetic nonproduction session under `tests/e2e/.auth/`.
- The current Playwright dev server is Vite-only, so authenticated AI E2E validates the browser-to-`/api/fanatlas-ai` boundary with a Playwright route fixture and leaves serverless endpoint behavior to Vitest and live coordination checks.
