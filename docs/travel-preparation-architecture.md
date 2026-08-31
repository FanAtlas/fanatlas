# Travel Preparation Architecture

Step 58 adds a private Travel Preparation Center for Trip Drafts. It is a derived workflow layer over existing FanAtlas systems, not a new planning or checklist product.

## Checklist Reuse

The authoritative checklist model for Travel Preparation is the existing Trip Draft planning-action system:

- `TripDraft.planningActions`
- `PlanningAction { id, text, completed, createdAt }`
- `addTripPlanningAction`
- `updateTripPlanningAction`
- `toggleTripPlanningAction`
- `removeTripPlanningAction`
- the existing local Trip Draft persistence and storage-event synchronization in `useTripDrafts`
- the existing planning-action editor controls

The legacy standalone checklist page remains separate and global. Travel Preparation does not write to `fanatlas.travelChecklist` and does not introduce a parallel checklist key, completion model, ordering model, or task persistence layer.

## Source Of Truth

Travel Preparation composes:

- Trip Draft destination, dates, and planning actions
- Destination Intelligence static and slow-changing metadata
- existing navigation surfaces: Destination Hub, Currency Converter, Translator, SOS, and Explorer

The pure domain helper is `deriveTravelPreparation(...)` in `src/lib/travelPreparation.ts`. It is React-free, storage-free, network-free, AI-free, and deterministic.

## Template Derivation

The default template is conservative. Suggested items are generated from known trip and destination metadata:

- essentials and date confirmation
- document review without visa eligibility claims
- destination currency review when static currency metadata exists
- translator preparation when destination language metadata exists
- power compatibility review when plug, voltage, or frequency metadata exists
- emergency/SOS review when emergency metadata exists
- transport review when destination capability metadata exists
- timezone review when the destination has multiple IANA zones
- generic packing for the planned duration

Unknown destinations get generic essentials and source-aware safety review only.

## Reconciliation

`reconcileTravelPreparation(...)` ensures applicable FanAtlas-suggested items exist while preserving user-controlled state:

- completion is preserved by stable normalized suggestion text
- user-created planning actions are preserved
- duplicate suggestions are reported
- obsolete FanAtlas suggestions are identified but not deleted automatically
- custom user items are never removed because destination metadata changed

The page adds missing suggestions through the existing Trip Draft planning-action mutation and does not persist derived progress.

## Preparation Phases

Step 58 Part 2 adds deterministic timing guidance. Phases are derived from Trip Draft travel dates using date-only semantics:

- no start date: `anytime`
- more than 7 days before start: `early`
- 7 through 2 days before start: `week_before`
- 1 day before start: `day_before`
- start date: `departure_day`
- after start date while the trip end date is today or future: `trip_started`
- after trip end date: `trip_ended`

Phases describe when an item is especially relevant. They are not persisted legal deadlines. Step 58 Part 3 reuses the same phase model for optional local reminders.

## Suggested Item Timing

FanAtlas-suggested items have stable internal identities such as `prep.documents.review-entry-info`, `prep.money.review-currency.EUR`, and `prep.packing.basic-review`. These IDs are not displayed in the UI and timing does not depend on localized text.

Default timing is conservative:

- early: destination guide, travel documents, official entry review, power compatibility
- week before: currency, translator, emergency/SOS, transport, multi-timezone review
- day before: confirmations and packing
- departure day: represented by the current phase; no extra persisted departure-day task model yet
- user-created items: `anytime`

Changing trip dates recomputes phase and grouping immediately without rewriting actions or resetting completion. Changing destination reconciles suggested items through the same existing text-based planning-action path and does not delete user-created items.

## Readiness

`deriveTravelPreparationReadiness(...)` produces a derived readiness model:

- checklist completion percent
- current phase
- items that need attention now
- unresolved information notices
- ready state: `getting_started`, `in_progress`, `nearly_ready`, `ready_with_notices`, or `ready`

The percentage is checklist completion only. High-stakes notices are separate. A 100% checklist with unresolved entry or emergency information renders as checklist complete with notices, not as everything confirmed.

## Timing Groups

The page groups existing planning actions into:

- Focus now: incomplete items whose recommended phase is current or earlier, plus anytime custom items
- Coming up: incomplete items for the next phase
- Later: incomplete items beyond the next phase
- Completed: completed items that remain visible and reversible

Semantic sections still exist on each item. Timing and category are separate fields.

## Opt-In Reminders

Preparation reminders are local, optional, and trip-owned. They do not create a second checklist or reminder store. Settings live on the Trip Draft as additive metadata:

- `preparationReminderSettings.enabled`
- selected quiet reminder phases: `week_before`, `day_before`, `departure_day`
- optional occurrence metadata in `preparationReminderOccurrences`

Defaults are disabled. FanAtlas does not request browser notification permission on page load. Permission is requested only after the traveler presses "Enable reminders." If permission is denied or unsupported, the preparation page still shows in-app reminders when FanAtlas is open.

Reminder copy is generic and privacy-safe. It does not include Journal body, planning notes, passport/legal details, emergency numbers, email, raw IDs, photo data, precise location, or provider data.

Occurrence identity is deterministic:

`prep-reminder:<tripId>:<startDate>:<phase>:<kind>`

Acknowledging a reminder marks only that occurrence. It does not complete checklist items, change readiness, mutate planning actions, or suppress reminders for a new start date. Duplicated Trip Drafts may copy reminder settings, but occurrence history is reset.

## Browser Notification Boundary

FanAtlas may show a browser notification for a due reminder only during an active session and only when browser permission is already granted. This is not guaranteed future background scheduling. The current architecture does not add push subscriptions, service-worker scheduled notifications, email, SMS, calendar writes, server jobs, timers, polling, or background sync.

## Trip Ownership

Preparation state is trip-scoped because it lives inside the selected Trip Draft's planning actions. Route state uses `/preparation/:tripDraftId`, but raw IDs are not shown as user-facing text.

## Privacy Boundary

Travel Preparation may use trip name, destination, dates, and checklist completion. It must not display or derive from Journal body, planning notes, account email, auth tokens, photo IDs, precise location history, AI provider data, or raw storage records.

## No-AI Boundary

Step 58 does not call FanAtlas AI, OpenAI, live current-information tools, or any paid provider. Packing suggestions are static and conservative. Weather-personalized packing, push reminders, and AI-generated preparation can be added later only after their source, freshness, privacy, and cost boundaries are explicit.

## High-Stakes Boundary

The Documents section can remind a traveler to review official entry requirements, but it must not state visa eligibility, passport validity duration, health requirements, legal requirements, or travel-advisory conclusions. Emergency information is routed to source-aware SOS and Destination Hub surfaces.

## Page

The lazy private page is `/preparation/:tripDraftId`. It shows:

- trip and destination context
- travel-date summary and days-until/duration derivation
- progress and readiness from existing checklist completion
- current phase and timing groups
- source/current-information notices
- high-stakes/current-information warning when source review is still required
- sectioned planning actions
- custom item add/edit/remove where the existing planning-action model supports it
- shortcuts to Destination Hub, Currency Converter, Translator, SOS, and Explorer

Normal page render performs no new external network request and no AI call. Reminder derivation is local and O(number of planning actions + selected reminder phases).

## Future Extensions

Future steps may add opt-in push infrastructure, weather-backed packing, authoritative entry/visa integrations, device-specific power compatibility, or AI-assisted preparation. Those extensions should reuse this trip-scoped checklist adapter and preserve the no-fabrication, provenance, and privacy boundaries.
