# FanAtlas Manual QA Checklist

Use this checklist for release validation that is not fully automated.

## Viewports

- 320px mobile width
- 375px mobile width
- 768px tablet width
- 1024px desktop width
- 1440px wide desktop width
- 200% browser zoom

## Navigation And Persistence

- Home launches without runtime errors.
- Home renders a contextual travel state instead of a generic dashboard.
- Home does not auto-fetch weather, currency, routes, or destination research on render.
- Home primary action changes across no-trip, upcoming, departure-day, active, day-complete, ended, and multiple-trip states.
- Home RTL and 200% zoom keep the hero, actions, and memory card readable without overlap.
- Profile opens and shows Passport, Journal, and Insights entries.
- Direct `/passport`, `/journal`, and `/insights` routes resolve through the current private-route behavior.
- Direct `/ai` resolves through the private-route behavior and does not show FanAtlas AI without authentication.
- Direct `/today`, `/trip-day/:tripDraftId`, and `/map` resolve through the current private-route behavior.
- Browser Back and Forward work after visiting Passport, Journal, and Insights.
- Refresh preserves local Trip Draft data.
- Cross-tab Trip Draft updates appear without manual refresh.

## Trip Day / Today

- `/today` and `/trip-day/:tripDraftId` resolve through the private route behavior.
- The current trip day is derived from Trip Draft dates, not persisted on the itinerary day.
- Today loads local trip data without weather, currency, official-update, routing, or AI requests.
- Weather, currency, and official-update checks happen only after explicit user action.
- The next-place hero advances when a place is marked visited or skipped, and the day-complete state appears only when the selected day has no remaining actionable places.
- Today keeps unresolved preparation notices compact and does not replace the Preparation Center.
- "Next in your plan" skips visited and skipped places while preserving block order.
- Day navigation works for previous, today, and next day states without losing visit status.
- Route / Map handoff uses the canonical navigation request, opens the existing map view, and stays explicit and ephemeral.
- Map exposes only truthful routing modes and does not fabricate transit routing.
- Route origin is request-only and is not persisted.
- `/map?lat=...&lng=...` restores safe destination state without private data.
- Arabic RTL renders the Today page, live-context controls, and progress correctly.

## Offline Travel

- After the app shell is cached, Today remains usable offline with trip essentials, next place, status updates, progress, and day navigation.
- Travel Preparation, Destination Intelligence static data, and locally verified SOS numbers remain available offline where the data has already been bundled.
- Live weather, currency rates, official updates, and route requests show explicit offline or unavailable states instead of pretending to be current.
- Map still accepts safe destination handoff offline, but route and map tiles remain explicitly unavailable unless the browser already has the relevant assets. If a route was already retrieved before disconnect, it is labeled as retrieved earlier rather than current.
- No background retry loop, geolocation watch, or auto-refetch storm starts when connectivity changes.
- The app does not claim full offline map download support yet.
- A cached shell is not the same as a supported cold-offline PWA install. If the Playwright path is against the Vite dev server, document the limitation instead of faking a PWA cache test.
- Existing authenticated users may continue using locally available private data when Supabase session state is already present, but there is no generic offline auth bypass.
- Offline feature labels stay honest: live data may remain visible only if it was already loaded in the current session, and it must not be relabeled as current once the provider is unreachable.

## Product Areas

- Trip Planner create, rename, delete, duplicate.
- Visit Status changes.
- Trip Completion changes.
- Planning Notes and Planning Actions.
- Local photo attach, remove, and permanent deletion cleanup.
- Trip Memory Gallery.
- Travel Passport summary, stamps, timeline, empty state.
- Travel Journal create, edit, favorite, status, delete, search, filters.
- Travel Insights summary, filters, sorting, rankings, data-quality notice.
- Global Travel Explorer opens from Profile and direct `/explorer`.
- Explorer lifetime mode shows summary, map, Destination Browser, routes, highlights, and Data Quality where relevant.
- Explorer year strip supports All Years, each available year, Previous, Next, and Reset.
- Explorer country selection opens the Country Panel and keeps the browser row selected.
- Explorer city selection opens the City Panel and preserves parent country context.
- Explorer trip selection opens the Trip Panel with deterministic route points.
- Explorer Routes mode shows the route disclaimer and distinguishes completed/planned/partial routes.
- Explorer Frequency mode and Travel Days mode remain understandable without relying on color alone.
- Explorer Travel Replay does not autoplay, supports start, pause, next, stop, and resets safely when year/search/status changes.
- Explorer search covers country, city, trip, and structured place labels only.
- Explorer sorting works for country, city, and trip tabs.
- Explorer privacy check: seeded Journal body text and raw photo IDs do not appear in visible text, DOM attributes, URLs, replay labels, panels, or console output.
- Explorer local-only check: no map tile, geocoding, OSRM, AI, or analytics request is triggered by opening or using `/explorer`.
- Explorer cross-tab check: Trip Draft changes in another tab update derived Explorer data through existing storage synchronization.
- Travel Intelligence context minimization excludes unrelated trips, Journal body by default, raw photo IDs, authentication data, and precise location unless explicitly permitted for a compatible task.
- Travel Intelligence tool plans block disabled network tools and all write/external-action behavior.
- Travel Intelligence orchestration uses provider-neutral model profiles and rejects incapable fallbacks.
- Travel Intelligence feature flags fail closed: provider calls, tool execution, diagnostics, image analysis, document analysis, research, and write actions are disabled unless explicitly enabled in a future step.
- Travel Intelligence safe trace/log review contains only reason codes, aggregate context presence, cost/latency classes, warning codes, and tool/model IDs.
- Travel Intelligence local-only check: no OpenAI, Anthropic, Gemini, AI gateway, geocoding, weather, visa, routing, external logging, or analytics request is introduced by the foundation.
- FanAtlas AI opens from Home and Profile with the unified FanAtlas AI label.
- FanAtlas AI empty state shows supported prompt categories without promising booking, purchasing, live navigation, or write actions.
- FanAtlas AI active-trip selector supports no trip and existing Trip Drafts.
- FanAtlas AI context controls default sensitive context off and expose Journal content as explicit consent.
- FanAtlas AI context preview shows only safe summaries, not hidden context snapshots.
- FanAtlas AI ordinary prompt sends only to `/api/fanatlas-ai`.
- FanAtlas AI clarification flow appears for current-information requests when research tools are unavailable.
- FanAtlas AI tool activity shows user-readable stages without raw IDs, provider names, or tool arguments.
- FanAtlas AI citations render only validated `http` or `https` links with safe external-link attributes.
- FanAtlas AI cancellation stops pending UI state and allows retry.
- FanAtlas AI retry rebuilds context from current app state.
- FanAtlas AI clear conversation removes visible local messages and does not leave hidden context snapshots.
- FanAtlas AI long-message validation blocks oversized requests before send.
- FanAtlas AI privacy fixture check: Journal body, precise location, raw photo IDs, provider prompts, and auth tokens do not appear in visible text, DOM attributes, URLs, console output, localStorage conversation records, or server logs.
- FanAtlas AI provider abstraction check: OpenAI, GPT, Gemini, Claude, provider model IDs, cost internals, and fallback chains are not shown in user UI.
- FanAtlas AI production feature flag check: the server endpoint fails closed when `FANATLAS_AI_ENABLED` and `FANATLAS_AI_MOCK` are not enabled.
- FanAtlas AI release-mode check: `disabled` rejects all generation, `internal` allows only server allowlisted test/internal accounts, `beta` allows only beta allowlisted accounts, and malformed release modes fail closed.
- FanAtlas AI entitlement check: browser-supplied user IDs, roles, or trip ownership claims do not grant access.
- FanAtlas AI kill-switch check: `FANATLAS_AI_KILL_SWITCH=true` disables provider calls without frontend changes.
- FanAtlas AI internal activation check: `internal` mode requires explicit server release configuration, Supabase coordination, validated nonproduction live coordination, and an internal allowlist before live behavior is available.
- FanAtlas AI task allowlist check: initial production mode permits only ordinary travel planning, itinerary suggestions, comparisons, packing, budget guidance, insights explanation, saved-place organization, language, and translation tasks.
- FanAtlas AI tool allowlist check: write, booking, purchase, location sharing, image, document, and unrestricted research tools remain blocked.
- FanAtlas AI live-tool policy check: weather, currency, emergency information, and controlled destination research are independently disableable, and disabled tools fail closed without model fabrication.
- FanAtlas AI telemetry privacy check: operational telemetry includes only sanitized counts/classes/IDs and never includes raw prompts, raw responses, Journal body, precise private trip content, photo IDs, auth tokens, provider secrets, Supabase keys, or storage state.
- FanAtlas AI cost guardrail check: model calls, tool calls, context size, output size, cost class, per-minute quota, and per-day quota fail closed before duplicate provider execution.
- FanAtlas AI latency-budget check: total request, provider, live tool, and current-information timeouts are enforced server-side and reported as provider-neutral errors.
- FanAtlas AI eval check: `npm run test:ai-evals` runs offline and requires no provider API key.
- FanAtlas AI hallucination check: fake booking, trip edit, save-place, purchase, contact, or location-share completions are blocked or corrected.
- FanAtlas AI current-fact check: fake current weather, exchange-rate, visa, customs, transport, availability, or safety-alert claims are blocked unless approved tool evidence exists.
- FanAtlas AI citation-integrity check: invented citation IDs, unsafe URLs, duplicate citations, and high-stakes unknown sources are rejected or normalized.
- FanAtlas AI prompt-injection check: malicious user text, trip titles, Journal body, saved-place descriptions, tool output, citation titles, and provider output cannot reveal hidden prompts, broaden permissions, call unapproved tools, change models, or bypass quotas.
- FanAtlas AI output-redaction check: provider keys, bearer/JWT-like tokens, Supabase key assignments, storage paths, photo IDs, and internal policy markers are redacted or rejected.
- FanAtlas AI Unicode/bidi check: mixed Arabic/Latin text, right-to-left override characters, zero-width characters, combining marks, and very long unbroken strings do not overflow UI or affect security decisions.
- FanAtlas AI conversation-storage limit check: stored visible history is bounded by message count, citation count, and serialized size; malformed storage normalizes safely.
- FanAtlas AI deletion check: clear conversation removes visible local messages and does not affect Trip Drafts, Passport, Insights, Journal, Memory Gallery, or Planner data.
- FanAtlas AI quota check: per-minute, per-day, one-active-request-per-conversation, and provider-turn/tool-call/output-size limits produce localized safe failure states.
- FanAtlas AI idempotency check: duplicate `clientRequestId` delivery returns the cached safe response without duplicate provider calls.
- FanAtlas AI timeout/circuit-breaker check: provider timeout and repeated provider failures return provider-neutral errors and do not expose provider details.
- FanAtlas AI fallback check: no incapable fallback answers image, document, tool-calling, structured-output, or high-stakes current-information tasks.
- FanAtlas AI memory-backend check: memory coordination works only for local/tests and is rejected in production unless explicitly overridden.
- FanAtlas AI shared-backend check: Supabase coordination uses service-role server access only; browser clients cannot read or mutate coordination tables.
- FanAtlas AI quota check: final minute and daily slots are reserved atomically and duplicate delivery does not consume another slot.
- FanAtlas AI daily reset check: usage dates reset by UTC calendar date, not local midnight.
- FanAtlas AI concurrency check: same-conversation requests collide on the shared lock and stale locks recover by expiration.
- FanAtlas AI idempotency check: same user/request/fingerprint replays the safe response, same user/request/different fingerprint conflicts, and different users remain isolated.
- FanAtlas AI provider circuit check: open state is shared, cooldown is respected, and only one half-open probe is allowed.
- FanAtlas AI backend-outage check: production fails closed with no provider call when coordination storage is unavailable.
- FanAtlas AI cleanup check: expired minute buckets, locks, and idempotency records are removed by cleanup.
- FanAtlas AI migration check: coordination tables, indexes, constraints, RLS, revokes, and RPC functions are present before enabling the Supabase backend.
- FanAtlas AI rollback check: kill switch and disabled release mode work even with stale clients and unavailable coordination storage.
- FanAtlas AI legacy endpoint check: `/api/ai` and `/api/ai-chat` do not execute provider calls.
- FanAtlas AI secret scan: provider API keys, test tokens, private fixture strings, and environment dumps are absent from frontend source and `dist`.
- FanAtlas AI network check: the browser never calls provider, research, weather, visa, currency, map, geocoding, routing, or analytics services directly for AI requests.
- FanAtlas AI authenticated E2E strategy check: seeded authenticated AI browser tests run only with `FANATLAS_E2E_NONPRODUCTION=true`, a nonproduction Supabase Auth project, and ignored Playwright storage state under `tests/e2e/.auth/`.
- FanAtlas AI live database gate check: apply coordination migrations to local/nonproduction Supabase before enabling live tools.
- FanAtlas AI live database contract check: run memory and Supabase store contracts for quota, idempotency, locks, provider circuit, expiration cleanup, and concurrent final-slot races.
- FanAtlas AI RLS check: anon and authenticated clients cannot read, insert, update, delete, or invoke privileged coordination/cache storage.
- FanAtlas AI weather check: trusted destination coordinates, current/near-future forecast, horizon rejection, freshness label, source citation, stale cache, timeout, and no private context leakage.
- FanAtlas AI currency check: supported ISO codes, USD/EUR pair, same-currency conversion, zero amount, invalid amount rejection, rate timestamp, rates-may-change notice, stale cache, and citation.
- FanAtlas AI emergency check: supported country, unsupported country, general/police/ambulance/fire categories, reviewed date, SOS link, concise phone display, and no automatic calling or location sharing.
- FanAtlas AI current research check: approved source category, source allowlist, safe URL, concise finding, source quality, no arbitrary URLs, no visa/customs determination, and no unrestricted browsing.
- FanAtlas AI cache freshness check: weather, currency, emergency information, and destination current information use their own TTL/stale policies; emergency and high-stakes current information do not silently serve stale claims.
- FanAtlas AI citation check: current claims reference only citations from executed tool output; fake citation IDs and unsafe links are rejected.
- FanAtlas AI cache check: cache keys exclude user ID, raw prompt, Journal text, trip title, precise location, photo IDs, and auth tokens.
- FanAtlas AI tool kill-switch check: weather, currency, emergency, and research flags disable each tool without a frontend deployment.
- FanAtlas AI tool circuit check: weather/currency/research provider failures do not open the AI model circuit.
- FanAtlas AI browser network check: AI current-information prompts call only FanAtlas endpoints from the browser, never external tool or provider domains.
- FanAtlas AI internal live precheck: `npm run check:ai-internal-activation` reports `READY` only with internal mode, shared validated coordination, explicit internal entitlement, provider configuration, task/tool allowlists, quotas, and nonproduction project guards.
- FanAtlas AI internal live sessions: `npm run test:ai-internal-live` records only aggregate evidence in `docs/fanatlas-ai-internal-qa.md` and proves provider generation, current tools, citations, kill switch, quotas, idempotent retry, prompt-injection handling, and Journal privacy before beta.
- FanAtlas AI beta threshold check: do not enter beta until ordinary internal requests exceed 95% success excluding intentional blocks, current claims have 100% valid tool evidence, secret/privacy tests pass 100%, unsupported write actions remain 100% blocked, and live coordination/idempotency remain regression-free.

## Step 57 Destination Intelligence

- Destination identity check: countries resolve to ISO 3166-1 alpha-2 keys and cities resolve to country-scoped keys such as `city:MA:marrakech`.
- Destination normalization check: accents, aliases, capitalization, whitespace, and duplicate city names across countries normalize deterministically.
- Destination unknown check: unresolved destinations remain unresolved and never fall back to US, a nearby country, or a default emergency number.
- Destination classification check: static, slow-changing, current-information, and high-stakes current-information fields are explicitly classified.
- Destination provenance check: sourced fields can carry source ID, authority, reviewed/retrieved date, freshness class, URL/reference, and verification state.
- Destination emergency check: emergency information is high-stakes, requires provenance/review metadata, and unknown is preferred over inferred values.
- Destination privacy check: Journal body, private trip notes, account emails, auth tokens, photo IDs, precise live GPS history, and private location history do not enter destination intelligence.
- Destination AI boundary check: destination intelligence derivation remains pure, network-free, storage-free, and AI-free; future AI context must preserve provenance and freshness for high-stakes fields.
- Destination Hub route check: private `/destination/:destinationId` supports encoded canonical country and city IDs and fails closed to the auth gate when unauthenticated.
- Destination Hub sparse-state check: missing capital, timezone, electrical, customs, and high-stakes current fields render as unavailable, unverified, or current-information-required without fabricated placeholders.
- Destination Hub provenance check: emergency, entry, official-info, and current/high-stakes fields show source/freshness context without exposing internal enum names.
- Destination Hub integration check: Explorer country/city panels, Passport stamps/city rows, and resolved Trip Draft detail pages offer a destination action only for canonical identities.
- Destination Hub privacy check: personal counts may render, but Journal body, planning notes, photo IDs, raw canonical IDs, storage IDs, auth tokens, and provider payloads stay out of visible UI.
- Destination Hub network check: ordinary Hub render performs no network request, geocoding, live weather, live currency, current research, or AI generation.
- Destination Hub accessibility check: one visible H1, semantic sections, accessible source disclosures, named buttons/links, visible focus, and no clickable divs.
- Destination Hub responsive/RTL check: 320px, mobile, and Arabic RTL layouts have no horizontal body overflow and do not mirror geographic meaning.
- Destination Hub authenticated E2E check: synthetic Lisbon/Portugal data opens the Hub from Explorer, Passport, Trip Drafts, direct country/city URLs, and existing Currency/Translator/SOS actions.
- Destination curated coverage check: the initial country/city cohort validates through `src/lib/destinationCoverage.ts` with no duplicate identities, malformed ISO/currency/language/timezone/electrical values, missing source references, or missing emergency provenance.
- Destination source registry check: every curated static/slow-changing field references a stable source ID with authority class and reviewed date; no source is labeled official unless justified.
- Destination emergency adapter check: SOS, Destination Hub, and the AI emergency-information tool consume canonical emergency metadata and unsupported countries render/fail unavailable without a 911, nearby-country, or generic local-services fallback.
- Destination currency compatibility check: curated country currency codes are accepted by the existing Currency Converter allowlist, while live exchange rates remain separate current-information data.
- Destination current/high-stakes boundary check: visa rules, entry determinations, travel advisories, weather, exchange rates, transport disruptions, airport closures, health alerts, and subjective safety scores are absent from static curated records.
- Destination maintenance check: adding a destination requires canonical identity, trusted metadata, source IDs, reviewed date, coverage validation, Hub smoke review, and no unsupported current/high-stakes claims.

## Step 58 Travel Preparation

- Checklist reuse check: Travel Preparation uses Trip Draft `planningActions` and the existing planning-action mutations; it does not write a second checklist store or use `fanatlas.travelChecklist`.
- Trip ownership check: preparation state is scoped to the selected Trip Draft and no global preparation checklist is shared across trips.
- Template safety check: suggested items derive from Trip Draft dates/destination and Destination Intelligence only; no visa eligibility, legal, medical, live weather, exchange-rate, or AI-generated claim appears.
- Reconciliation check: missing FanAtlas suggestions are added through the existing planning-action mutation, duplicate suggestions are detected, obsolete suggestions are not deleted automatically, and user-created items are preserved.
- Progress check: total, completed, remaining, percent, and section counts are derived from planning-action completion and are not persisted separately.
- Privacy check: the page does not display Journal body, planning notes, account email, auth tokens, photo IDs, raw storage IDs, precise location history, or AI/provider payloads.
- Network check: ordinary Preparation render performs no new external network request, geocoding, current weather, live currency, current research, or FanAtlas AI call.
- Navigation check: Trip Draft detail opens "Prepare for this trip"; Preparation shortcuts route to Destination Guide, Currency Converter, Translator, SOS, and Explorer.
- Accessibility check: the page has one H1, native checkboxes, named shortcut buttons, labeled custom-item input, progressbar semantics, visible focus, and no clickable divs.
- Responsive/RTL check: 320px and Arabic RTL layouts have no horizontal body overflow and maintain readable progress, checklist rows, custom-item controls, and shortcuts.
- Authenticated E2E check: synthetic Lisbon/Portugal data opens Preparation from Trip Drafts, completes an item, persists through refresh, adds a custom item, uses shortcuts, and keeps private Journal/planning-note content out of visible UI.
- Timing phase check: no dates, >7 days, exactly 7 days, 2 days, 1 day, departure day, trip started, and trip ended derive deterministic phases using date-only semantics.
- Readiness check: 100% checklist completion with unresolved entry/emergency information shows a notice and does not say all current travel information is confirmed.
- Grouping check: Focus now contains incomplete current-or-earlier items, Coming up contains next-phase items, Later contains future items, and Completed remains accessible and reversible.
- Date-change check: changing synthetic Trip Draft dates updates phase/grouping without deleting actions, resetting completion, or duplicating suggestions.
- Reminder opt-in check: Preparation reminders default off, request browser notification permission only after "Enable reminders," and keep checklist use available when permission is denied or unsupported.
- Reminder persistence check: settings and acknowledged/notified occurrence metadata live on the Trip Draft; no `fanatlas.travelChecklist`, global reminder key, push subscription, or second checklist store is introduced.
- Reminder due-state check: 7-day, 1-day, and travel-day reminders derive from date-only Trip Draft travel dates and selected phases; trip-started/ended and complete-checklist cases do not create ordinary checklist reminders.
- Reminder duplicate check: occurrence IDs include trip, start date, phase, and reminder kind; dismissing one occurrence does not suppress reminders after a start-date change or duplicated trip.
- Reminder privacy check: reminder copy is generic and does not include Journal body, planning notes, legal/passport details, emergency numbers, account email, raw IDs, photo data, precise location, auth tokens, or AI/provider content.
- Reminder boundary check: Part 3 adds no push provider, email, SMS, calendar writes, service-worker scheduled delivery, polling, background intervals, live weather/currency/current-info fetch, or OpenAI call.

## Step 59 Trip Day / Today

- Route check: `/today` and `/trip-day/:tripDraftId` are private lazy routes and unauthenticated users remain on the existing auth gate.
- Active trip check: one active dated trip resolves automatically, nearest upcoming dated trip resolves when no trip is active, and overlapping active trips require explicit user selection.
- Day resolution check: injected current date maps to derived itinerary dates for before trip, first day, middle day, final day, after trip, undated trip, fewer itinerary days than dates, and more itinerary days than dates.
- Itinerary check: Today's Unassigned, Morning, Afternoon, and Evening sections preserve existing Trip Draft order and unavailable references remain represented safely.
- Unscheduled check: global Trip Draft Unscheduled remains separate from Today's Unassigned.
- Progress check: total, visited, skipped, remaining, and completion percent derive locally and are not persisted.
- What's-next check: "Next in your plan" skips visited/skipped places, follows Morning/Afternoon/Evening order, and does not imply exact clock scheduling.
- Visit-status check: Mark visited, Skip, and Return to planned use the existing Trip Draft visit-status mutation and recompute next/progress after refresh.
- Nearby groups check: Today reuses existing nearby-place grouping only for scheduled day sections; no walking time or new clustering appears.
- Preparation check: Today surfaces only compact unresolved preparation/current-information notices and does not duplicate the Preparation Center or acknowledge reminders.
- Destination context check: Today uses Destination Intelligence identity for Destination Guide and existing Map, Translator, Currency, SOS, Journal, and Edit itinerary shortcuts.
- Privacy check: Today does not render account email, raw IDs, photo IDs, journal body, unrelated trip data, precise location history, or provider payloads.
- Network check: ordinary Today render performs no FanAtlas AI/OpenAI, current weather, exchange-rate, current research, routing, map tile, geocoding, or GPS request.
- Accessibility check: Today has one H1, section headings, progressbar semantics, named day/status buttons, visible focus, and mutation status feedback.
- Responsive/RTL check: Today has no horizontal overflow at 320px/375px/tablet/desktop/200% zoom, and Arabic RTL preserves semantic day and time-block order.
- Authenticated E2E check: synthetic Lisbon data opens Today, resolves Day 2, shows time blocks and next place, updates visit status, persists through refresh, navigates days, opens shortcuts, keeps Journal body private, passes 320px overflow, and smokes RTL.

## Step 54.5 Live Infrastructure Gate

- Automated offline: migration source exists in `supabase/migrations` and mirrors the committed schema baseline.
- Automated offline: production memory backend rejection is covered by `npm run test:ai-coordination`.
- Automated offline: readiness gate fails closed for memory or missing Supabase configuration.
- Automated live: run `supabase db reset` against local/nonproduction Supabase and confirm migrations apply from an empty database.
- Automated live: run `npm run check:ai-coordination` with `FANATLAS_E2E_NONPRODUCTION=true`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Automated live: run `npm run test:ai-coordination:live` for RPC contracts, parallel quota/lock/idempotency races, half-open circuit lease, RLS/client denial, cleanup, tool-cache live behavior, and backend outage.
- Automated live: verify anonymous and ordinary authenticated clients cannot read or mutate coordination/cache tables or execute privileged RPCs.
- Automated live: verify synthetic auth setup with `npm run e2e:auth:setup` and ignored Playwright storage state before running authenticated E2E.
- Automated live: run `npm run test:e2e:authenticated` for authenticated `/ai`, Passport, Journal, Insights, Explorer, mobile smoke, and Trip Draft cross-tab storage sync.
- Automated live: run `FANATLAS_AI_RELEASE_GATE_RUN_LIVE=true npm run check:ai-release-gate`; it must report `ready` before considering a manual live-validation flag change.
- Deferred here only when auth state is absent: authenticated tests skip rather than using a bypass or production account.
- Manual review: existing standalone browser weather and exchange-rate pages still call public provider URLs outside the AI path; no secrets are exposed, but server migration is a future infrastructure cleanup.

## Step 55 Authenticated Nonproduction E2E

- Nonproduction guard: `FANATLAS_E2E_NONPRODUCTION=true` is required, and the known production Supabase project is rejected.
- Auth identity: use only a dedicated synthetic user such as `fanatlas-validation-e2e-<name>@example.test`; do not use personal or production accounts.
- Auth state: `npm run e2e:auth:setup` creates or refreshes a Playwright storage-state JSON under `tests/e2e/.auth/`, which is gitignored.
- Synthetic data: authenticated tests seed only browser-local Trip Draft data with `fanatlas-e2e-*` identifiers and fabricated Lisbon/Portugal content.
- Isolation: tests must not truncate tables, delete non-test rows, commit passwords/tokens/storage state, or expose service-role credentials to browser code.
- CI: ordinary PR validation does not require auth secrets; protected/manual CI may opt in by configuring nonproduction Supabase secrets and running the auth setup plus authenticated Playwright command.
- Release flag: keep `FANATLAS_AI_COORDINATION_LIVE_VALIDATED=false` until live coordination and authenticated E2E both pass in the intended nonproduction/internal environment and the release gate reports `ready`.

## Accessibility

- Keyboard-only navigation reaches all visible controls.
- Focus indicators remain visible.
- Dialogs have accessible names and usable close/cancel actions.
- Headings are in a logical order.
- Screen reader smoke check covers Passport, Journal, and Insights.
- Screen reader smoke check covers Explorer heading, toolbar, year strip, replay controls, map description, Destination Browser tabs, selected panels, route disclaimer, and Data Quality disclosure.
- Explorer keyboard path reaches toolbar, year controls, replay controls, destination browser tabs, browser rows, panel actions, route rows, highlights, and Data Quality without unexpected focus jumps.
- Explorer reduced-motion check keeps replay manual and disables pulsing marker animation.
- FanAtlas AI keyboard path reaches heading, privacy notice, active-trip selector, context disclosure, context toggles, suggested prompts, conversation, citation disclosures, composer, stop, retry, and clear controls.
- FanAtlas AI screen reader smoke check covers message roles, loading state, errors, clarification card, citations, and privacy notice.
- FanAtlas AI focus remains stable when sending, receiving, cancelling, retrying, and clearing messages.

## Security

- Production service-worker output does not include service-role keys, provider secrets, synthetic auth fixtures, or private provider payloads.
- The service worker caches only shell assets and same-origin static resources needed for the app shell.
- Sensitive authenticated JSON, Journal bodies, auth endpoints, AI responses, current-info payloads, precise location, and route origins are not cached by the service worker.

## Localization

- English
- Spanish
- French
- Arabic
- Portuguese
- Arabic RTL layout has no horizontal overflow.
- Mixed-direction trip titles and journal text remain readable.
- Explorer Arabic RTL mirrors UI controls but does not mirror geography, marker coordinates, or route geometry.
- Explorer strings for modes, replay, panels, route disclaimer, sorting, highlights, and Data Quality are present in all supported languages.
- FanAtlas AI strings for title, privacy notice, context controls, suggested prompts, loading, citations, errors, and clarification are present in all supported languages.
- FanAtlas AI Arabic RTL mirrors interface layout but does not reverse ordered itinerary or citation content semantics.

## Visual Modes

- Dark mode readability for Profile, Planner, Passport, Journal, and Insights.
- Dark mode readability for Explorer map, markers, route lines, panels, tabs, legends, replay controls, and Data Quality.
- Reduced motion does not remove feature meaning.
- Cards, filters, timelines, and forms remain readable at 200% zoom.
- Explorer at 320px, 375px, tablet, desktop, and 200% zoom has no horizontal body overflow and no fixed-height clipping.
- FanAtlas AI at 320px, 375px, tablet, desktop, and 200% zoom keeps the composer reachable and does not cover messages, citations, errors, or context controls.
- FanAtlas AI dark mode keeps message bubbles, structured cards, citations, tool activity, context controls, disabled states, warnings, and focus rings readable.

## Release Command Checklist

For a clean release validation run:

```bash
npm ci
npm run validate
npm run test:ai-evals
npx playwright install chromium
npm run test:e2e
```
