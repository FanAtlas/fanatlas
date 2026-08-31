# Offline Travel Architecture

Step 60 Part 2 adds FanAtlas' first trustworthy offline travel layer.

## Offline Inventory

### Already Works Offline

These local capabilities stay available without a network connection:

- Trip Draft essentials: trip name, destination, dates, itinerary days, time blocks, planned places, planning actions, visit status, and progress
- Today / Trip Day execution: next place, day navigation, nearby planned groups, planning notes metadata, quick actions, and local trip progress
- Travel Preparation: checklist, readiness, reminder state, and destination-static preparation context
- Destination Intelligence: curated static and slow-changing destination data that is already bundled locally
- SOS: locally verified emergency numbers and emergency-contact metadata where the destination is supported
- Passport, Journal, and Explorer derived views when their source data is already local
- App shell navigation when the browser already has the production service worker cache populated

### Partially Available

- Translator: local phrasebook-style content is available, but full translation remains online-dependent
- Map: destination handoff and destination text remain available, but route geometry and tiles are not trustworthy offline
- Global Places / discovery surfaces: locally cached starter data can render, but live refresh is online-dependent
- Current-information cards may keep previously fetched session data visible, but must label it as current/session data rather than offline-safe content

### Requires Network

These features remain online-dependent:

- Live weather
- Current exchange rates
- Current official destination updates
- Route requests and route geometry from the routing provider
- Uncached map tiles
- AI
- Current transport disruption data
- Remote geocoding and discovery requests

### Fails Badly When Offline Unless Explicitly Guarded

These paths need honest degradation and should not silently spin or fabricate results:

- first-ever offline launch with no cached shell
- authenticated route boot when Supabase session hydration cannot complete offline
- live context checks that retry automatically
- map route rendering when no route data is present
- current-info cards that would otherwise label old data as current

### Must Stay Online-Only

These are intentionally not promoted as offline features:

- live weather
- live exchange rates
- current official updates
- routing engine access
- background geolocation or route origin persistence
- arbitrary offline map-region downloads
- AI generation

## Capability Model

Offline support is represented explicitly with `OfflineCapability` and `OfflineCapabilityStatus`.

The model distinguishes:

- `available`
- `partially_available`
- `online_required`
- `stale`
- `unavailable`

It does not treat a cached app shell as proof that every feature works offline.

## Connectivity Behavior

- `online` / `offline` / `unknown` are treated as UX hints, not authoritative Internet health checks
- No polling loop is introduced
- No background retry storm is introduced
- When the app goes offline, local trip data remains usable and live context degrades independently
- When the app comes back online, FanAtlas does not auto-fetch live context; explicit-fetch behavior remains in force
- Offline transitions do not mutate or duplicate the Trip Draft store

## App Shell And Storage

The production service worker precaches the shell and serves same-origin app assets from cache when appropriate. That helps repeat visits, but it is not a promise that every page or feature works offline.

FanAtlas does not assume unlimited storage and does not create a second persistent trip snapshot for offline mode. Existing Trip Draft, Passport, and Journal storage remain the source of truth.

The service worker should not cache sensitive authenticated payloads such as:

- Journal bodies
- auth endpoints
- AI responses
- current-info provider responses that include private context
- precise location
- route origin

The app does not rely on background sync, polling, or repeated retry loops to keep offline data fresh.

## Map Reality

FanAtlas does not claim offline map tile download support in this step.

Offline map behavior is intentionally honest:

- destination handoff still works
- route unavailability is explicit
- map tiles may be unavailable offline
- location remains explicit and ephemeral

Leaflet assets may load from the shell cache, but browser cache is not treated as a supported offline map layer.

## Future Offline Map Strategy

Possible future directions, evaluated separately from this step:

- packaged vector offline maps
- commercial SDKs with offline region support
- self-hosted vector tiles or PMTiles/MBTiles-compatible delivery

Any future offline-map implementation must weigh:

- licensing
- download UX
- storage pressure
- mobile support
- route compatibility
- update strategy
- accessibility

Step 60 Part 3 documents the decision in [offline-map-decision.md](./offline-map-decision.md). The current web app still uses Leaflet plus a public raster tile source, but the long-term offline-map path now points to MapLibre plus PMTiles with a native seam for future Capacitor support. Part 2 only documented the tradeoffs; Part 3 adds the provider-neutral pack domain and route-hardening foundation without shipping offline map downloads yet.

## Privacy Boundary

Offline support must not expand sensitive persistence.

Do not add:

- current GPS history
- route-origin history
- AI content
- provider payloads
- raw photo blobs
- private Journal bodies outside the existing Journal store

## Storage Ownership

Inventory the browser-owned stores as follows:

- Trip Drafts: local app state and derived persistence already used by Today, Preparation, Destination Hub, Passport, Explorer, and Journal summaries
- Passport: derived from Trip Drafts, not a separate offline snapshot
- Journal: existing local Journal store only; do not duplicate full bodies elsewhere
- Preferences: language, UI, and small app settings in browser storage
- Notifications: reminder settings and browser permission state
- Auth-managed state: Supabase session state and existing auth storage
- Cache / service worker storage: shell assets only, not arbitrary private JSON

Cleanup semantics stay narrow:

- app cache updates may evict old shell assets
- user-owned local trip and Journal data are not wiped by cache version changes
- stale live data is discarded by feature-level logic, not by deleting user stores
