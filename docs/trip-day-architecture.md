# Trip Day Architecture

Step 59 Part 1 adds FanAtlas Today / Trip Day as a local execution layer over Trip Drafts.

## Source Of Truth

Trip Day does not store a second itinerary, completion model, reminder model, map model, or journal model. The source-of-truth chain is:

- Trip Drafts own destination, travel dates, itinerary days, place order, time blocks, visit status, planning notes, planning actions, journal entries, and photo references.
- Travel Preparation owns checklist readiness and due reminder acknowledgement.
- Destination Intelligence owns static destination essentials and destination identifiers.
- Trip Day owns only derived read models and page UI state such as the selected day.

The pure helper is `deriveTripDayExperience(...)` in `src/lib/tripDay.ts`. It is React-free, storage-free, network-free, AI-free, and deterministic when `currentDate` is injected.

## Active Trip Resolution

`/today` uses `resolveTripForDay(...)`:

- one active dated trip on `currentDate`: select it
- multiple overlapping active trips: return candidates and require user choice
- no active trip but one or more upcoming dated trips: select the nearest upcoming trip
- no active or upcoming dated trip: return candidates without silently selecting a past or undated draft
- explicit `/trip-day/:tripDraftId`: use that trip if it exists and is not archived

Archived drafts are excluded from automatic resolution.

## Day Resolution

Itinerary dates are derived from Trip Draft date-only semantics. Day order `0` maps to the trip start date, order `1` to the next date, and so on. Dates are not persisted on itinerary days.

States are:

- `before_trip`
- `today`
- `future_day`
- `past_day`
- `trip_ended`
- `undated`

When trip date count and itinerary day count differ, Trip Day surfaces a data-quality notice. If the current date has no matching itinerary day because there are fewer itinerary days than travel dates, the nearest existing day remains viewable rather than inventing a day.

## Itinerary And Progress

The selected day is hydrated through existing Trip Draft hydration and then grouped into:

- Unassigned: assigned to the selected itinerary day with no time block
- Morning
- Afternoon
- Evening

Global Trip Draft Unscheduled remains separate: places with `dayId === "unscheduled"` are shown as "Still unscheduled" and are not merged into Today's Unassigned section.

Progress is derived, never persisted:

- total scheduled today
- visited today
- skipped today
- remaining planned today
- completion percent using the existing Trip Draft visited-only completion semantics

Unavailable place references remain represented by their logical place reference and count toward progress like existing Trip Draft progress.

## Execution Loop

Trip Day Part 3 keeps a separate derived execution view over the selected day so the page can answer "what is next" without inventing a live presence model. The derived execution state is pure and deterministic and includes:

- next planned place
- later planned places in stored order
- completed places
- skipped places
- unscheduled places
- day-complete state

"Next in your plan" still prefers Morning, then Afternoon, then Evening. Unassigned items stay visible in their own section and do not become the primary next-place hero.

## What's Next

"Next in your plan" is deterministic plan order, not real-time scheduling. It scans Morning, Afternoon, then Evening, preserving stored place order. Places marked `visited` or `skipped` are excluded. Unassigned places are still visible but are not promoted as the next timed item.

Trip Day does not infer a current time block from the clock in Part 1.

The page's route handoff is explicit. Today can open the existing Map route for the next planned place, but it does not auto-request geolocation, watch location, or persist route origin. If the traveler chooses a location-aware action, the existing Map/Location flow handles it.

## Integrations

Visit status uses the existing Trip Draft mutation path and the existing `planned | visited | skipped` model. Today does not create journal entries, planning actions, bookings, routes, or provider writes.

Nearby groups reuse the existing Step 40 local geographic grouping helper. Trip Day does not calculate walking time or create a new clustering model.

Planning notes are displayed only from the authenticated trip-owned Trip Draft place reference. Photo integration is limited to memory/photo counts from existing metadata; full blobs and raw photo IDs are not loaded or rendered.

Preparation integration is compact. Before and at trip start, Today can surface unresolved preparation attention and current-information verification notices. Acknowledgement remains owned by Travel Preparation.

Destination context uses existing Destination Intelligence identity and trip destination metadata. Today links to Destination Guide, Map, Translator, Currency, SOS, Journal, and Edit itinerary using existing app routes.

## Privacy And Boundaries

Trip Day must not display account email, auth tokens, raw trip IDs, raw photo IDs, journal body, unrelated trip data, precise location history, or provider payloads.

Ordinary Today render must not request FanAtlas AI, OpenAI, current weather, live exchange rates, current research, transport disruption data, map tiles, geocoding, routing, or GPS. Existing authenticated app and local-storage behavior remains allowed.

Part 2 may add explicit current-information actions, but not automatic current-info fetches on page load.

## Step 59 Part 2 Live Context

Part 2 adds a separate live-context boundary for explicit user-triggered checks:

- Weather
- Currency
- Official destination updates
- Route to next place / Map handoff

The live-context layer is provider-neutral. It normalizes source, freshness, and citation data returned by the existing server-side tool stack and keeps those results separate from the pure Trip Day experience model.

The fetch policy is explicit:

- no weather, currency, or official-update request on page load
- no hidden useEffect fetch
- no background GPS
- no autonomous route lookup
- no AI requirement for current-information checks

Weather and official updates use destination identity plus the minimum safe destination details. Currency uses only currency codes and amount. Route handoff uses the existing Map screen and only uses location when the user explicitly chooses a location-aware action.

If live information is unavailable, Today stays usable with local trip data and shows a labeled unavailable/error state instead of fabricating current claims.

## Step 60 Part 1 Unified Navigation

Step 60 adds the canonical navigation domain that Today and Map share.

- Today hands off only a normalized `NavigationRequest` for the next planned place.
- Map owns destination summary, route validation, route presentation, and explicit location requests.
- Trusted coordinates are validated in range and preserve provenance when available.
- Only truthful route modes are exposed. Cycling and transit stay unavailable unless a real provider supports them.
- Route origin remains ephemeral and is not persisted.
- Direct map URLs may carry only safe, minimal fields such as latitude, longitude, mode, source, and a safe label.
- Route failures degrade safely and do not block Today or Map.
- Offline app shell support exists, but offline map tile download is still a future step.

## Step 60 Part 2 Offline Travel

Step 60 Part 2 keeps the same Trip Day model but adds honest offline degradation:

- Trip essentials, Today execution, static Destination Intelligence, Travel Preparation, and verified SOS data remain available offline when already stored locally
- Live weather, current exchange rates, official updates, routing, geocoding, and map tiles remain online-dependent and show explicit unavailable states
- No second offline trip snapshot is introduced; existing Trip Draft, Passport, Journal, and preparation storage remain the source of truth
- Connectivity state is a UX hint only. Trip Day does not poll, auto-refresh, or silently refetch live context when connectivity changes
- The offline shell cache can help repeat visits start faster, but Trip Day does not equate shell availability with feature availability
- Current live data may remain visible only within the current session and must not be labeled as offline-safe or current after the provider is unreachable

Step 60 Part 3 keeps the same boundary and hardens route staleness: when connectivity drops after a route has already been retrieved, Today/Map may keep the textual route summary as "Route retrieved earlier" but must not imply active rerouting, location tracking, or offline route computation. The long-term offline-map path is documented separately in `docs/offline-map-decision.md`.
