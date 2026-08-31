# Navigation Architecture

Step 60 Part 1 introduces a single canonical navigation domain shared by Today, Trip Drafts, Destination Hub, Explore, stadium pages, SOS, and Map.

## Canonical Model

Navigation data is normalized before it reaches the Map page.

- `NavigationDestination`: destination identity, label, trusted coordinates, address, destination context, source
- `NavigationOrigin`: ephemeral origin coordinates, source, request timestamp
- `NavigationRequest`: destination, optional origin, supported mode, source, request timestamp
- `NavigationRoute`: normalized provider output with distance, duration, geometry, freshness, source, and status

Coordinate validation is strict:

- latitude must be within `-90..90`
- longitude must be within `-180..180`
- `0,0` is valid
- truthy checks are never used to reject zero coordinates

Coordinate provenance is preserved when possible, such as:

- Trip Draft place data
- Destination Intelligence
- curated destination seed data
- user-selected map points
- existing place datasets

## Supported Modes

FanAtlas only exposes travel modes that the configured route provider can truthfully support.

- driving: supported
- walking: supported
- cycling: unavailable unless a real provider is configured
- transit: unavailable unless a real provider is configured

Unsupported modes remain visible as unavailable controls instead of being simulated.

## Today Handoff

Today does not own route presentation. It builds a canonical navigation request for the next planned place and passes it to Map. Today stays execution-focused and does not auto-request geolocation.

## Map Ownership

Map owns:

- destination summary
- route request
- route status
- route distance
- route duration
- route geometry
- explicit location request
- safe fallback behavior

Map may open directly from a safe URL such as `/map?lat=...&lng=...&mode=...&source=...`.

## Location Privacy

Current position is ephemeral.

- no background GPS
- no watchPosition
- no stored route origin
- no exact location history in localStorage or Supabase

Location is only requested after an explicit user action.

## Route Lifecycle

Route state is keyed by trip, selected day, destination, origin when used, and mode.

- destination changes clear stale route state
- mode changes invalidate prior route output
- malformed provider responses fail closed
- route errors do not block Map or Today

Route freshness is explicit:

- `fresh`: the current request has a live route result
- `stale`: the route was retrieved earlier, the request no longer matches, or connectivity is gone
- `unavailable`: no safe route is available

When connectivity drops after a route is already visible, FanAtlas may keep the textual summary labeled "Route retrieved earlier" but must not imply active rerouting or background updates. The path polyline is only treated as live while the route remains fresh.

## Offline And Limits

FanAtlas does not claim offline tile download support in this step.

- the app shell remains usable offline/degraded
- same-origin shell assets may be cached by the production service worker
- route lookup requires the existing route provider
- no automatic rerouting or background refresh loop exists
- no turn-by-turn voice navigation exists yet
- destination handoff can survive offline, but route geometry and tile rendering are not guaranteed
- offline map-pack downloads are a separate future capability, documented in `docs/offline-map-decision.md`

## SOS Exception

SOS can keep its urgency-oriented flow when it needs location support. That path remains distinct from ordinary map navigation and should not be slowed down by generic route handoff behavior.
