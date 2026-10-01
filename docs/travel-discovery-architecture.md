# Travel Discovery Architecture

Step 61 Part 2 adds a provider-neutral discovery layer that decides which destination categories are relevant without claiming live popularity, proximity, or current availability that FanAtlas cannot prove.

## Geoapify production provider (Checkpoint C)

Geoapify is integrated behind the provider-neutral contract. Browser code calls the authenticated FanAtlas `POST /api/travel-discovery` endpoint; only that server endpoint calls `https://api.geoapify.com/v2/places`. The required server-only variable is `GEOAPIFY_API_KEY`; it must never use a `VITE_` prefix.

The endpoint resolves city geography from existing canonical Destination Intelligence coordinates. It does not geocode arbitrary text and fails closed when trusted coordinates are unavailable. Requests are bounded to 20 results and a 50 km radius, use an 8 second timeout, a five minute bounded in-memory cache (50 entries), and concurrent-request deduplication. The cache is an ephemeral optimization rather than durable provider storage.

Geoapify categories are mapped in one server adapter. Results normalize to `TravelDiscoveryPlace` with safe names, coordinates, labels, HTTP(S) websites, bounded descriptions, provider/source IDs, retrieval time, and attribution metadata. Rating, price, hours, accessibility, and image values remain unknown unless explicitly supplied in a future reviewed adapter; no travel time, popularity, or current-open claim is inferred. Provider terms may constrain caching, attribution, images, and derived storage.

The endpoint validates destination, category, query length, coordinates, radius, limit, and preference shapes; it is not an arbitrary URL proxy. Authentication follows the existing Supabase bearer-token pattern. Upstream authorization, rate-limit, timeout/network, malformed-response, and empty-result cases become structured FanAtlas errors. API keys and upstream URLs are never logged or returned. Geoapify failures never fall back to synthetic fixtures in production; fixtures remain development/test-only. Requests contain no email, reservations, private notes, or account data.

### Future provider decision matrix

| Criterion | Current Geoapify adapter | Future evaluation requirement |
|---|---|---|
| Coverage/categories | Places categories around trusted coordinates | Validate target destinations and taxonomy mapping |
| Ratings/hours/accessibility | Unknown unless explicitly supplied | Preserve source scale and freshness; never infer |
| Pricing/API cost | Bounded keyed service | Confirm quota, rate limits, and unit cost |
| Cache restrictions | Short-lived cache pending terms | Confirm retention and attribution rights |
| Photos | Not enabled | Confirm licensing and safe image delivery |
| Global coverage | Provider-dependent | Measure target-market completeness |
| Attribution | Provider metadata retained | Confirm required display text and placement |

## Source Of Truth

Discovery does not own persistence or ranking.

- Trip Drafts provide destination precedence when an active or upcoming trip exists.
- Destination Intelligence provides canonical destination identity and static context.
- Travel Location provides an explicit destination when the traveler has set one.
- Explore can supply its own explicit destination context.
- The current date only affects ordinary travel context such as trip timing and derived local relevance.

## Destination Resolution

Discovery resolves one explicit destination in deterministic order:

1. active trip destination
2. selected upcoming trip destination
3. explicit destination input
4. existing destination context from navigation or Explore
5. manual travel-location destination

Fallback travel-location state is not treated as a resolved destination.

## Canonical Categories

Discovery uses a small stable taxonomy:

- places
- food
- stays
- transport
- events
- travel_tools

Each category has an availability state and a data-quality state so the UI can degrade honestly.

## Data Quality And Availability

Availability states:

- available
- limited
- online_required
- unsupported
- unknown

Quality states:

- curated
- static
- current
- live
- affiliate
- demo
- unknown

The UI may hide these labels, but it must not claim live, nearby, trending, or best content without evidence.

## Offline Behavior

- Static Destination Intelligence remains available offline where bundled.
- Local discovery content remains available if it is already local.
- Live discovery and booking behavior remain online required.
- No geolocation, background GPS, polling, or automatic provider fetch is introduced by discovery derivation.

## Privacy And Boundary Rules

Discovery derives from the minimum safe context only.

- No Journal bodies
- No photo IDs
- No auth tokens
- No exact location history
- No duplicate destination or place store

The layer is a view-model helper, not a persistence engine.

## Relationship To Home And Explore

- Home uses discovery to show a compact contextual section.
- Explore uses discovery to keep destination-scoped categories coherent.
- Destination Hub remains the canonical destination-information surface.
- World Cup functionality is archived legacy code and does not participate in active discovery.

## Step 65 Part 2 contract boundary

The Part 2 place-discovery contract is provider-neutral and remains separate from the existing view-model sections above. `Destination Intelligence` resolves canonical country and city identity; `TravelDiscoveryPlace` carries normalized, source-backed place facts; `TravelPlanningCandidate` remains a traveler-owned planning intent. Discovery results are ephemeral until the traveler explicitly converts one with `travelDiscoveryPlaceToPlanningCandidate` and supplies a planning duration.

The normalized place contract includes a stable logical ID, canonical destination identity, FanAtlas category, safe location and coordinates, source/provider metadata, field classes supplied by the source, freshness (`live`, `recent_cache`, `stale_cache`, `curated`, or `unknown`), and optional source-backed rating, hours, price, accessibility, website, description, and image metadata. Raw provider payloads never leave the adapter. Unknown values remain absent. Ratings retain their original scale and count; opening hours retain explicit known/closed/unknown state; accessibility is never inferred.

Provider adapters implement a replaceable `TravelDiscoveryProvider` contract with capabilities for text/nearby search, categories, ratings, hours, photos, price, accessibility, and details. The orchestration layer validates the canonical destination, enforces bounded limits/radii, requires explicit coordinates for nearby mode, normalizes and deduplicates results, applies the result limit, and converts provider failures into structured errors. Current-information requests fail closed on stale cache data. No provider key, network call, route, geocode, or persistence is introduced by Checkpoint A; the deterministic synthetic fixture provider is test-only.

Discovery requests contain destination and bounded search preferences only. They do not include account identity, email, journal content, reservation data, private notes, auth/session tokens, or precise location unless the traveler explicitly selects nearby mode and supplies coordinates. Restaurant discovery is not a reservation. Coordinates may later support map display or proximity grouping, but are never converted into travel duration.

### Freshness and cache seam

The contract carries `retrievedAt` and optional `expiresAt` with every result. A future cache may key by provider, canonical destination, category/query, and schema version, with data-class TTLs selected by the adapter. Cached results must retain `recent_cache` or `stale_cache`; they must never be presented as live. Cache retention, image use, attribution, and derived storage remain provider-policy decisions.

### Provider evaluation matrix

No provider is selected in Checkpoint A. Future evaluation should compare:

| Criterion | Questions |
| --- | --- |
| Coverage | Does the source cover the canonical destinations FanAtlas supports? |
| Data quality | Are names, categories, coordinates, and destination identity reliable? |
| Ratings | Is the scale/count explicit and stable? |
| Hours | Are structured intervals and closure states supplied with freshness? |
| Photos | Are image rights, attribution, and caching terms clear? |
| Accessibility | Is accessibility source-backed and field-specific? |
| Pricing | Are price classifications supplied without invented values? |
| API cost | What are request, quota, and overage constraints? |
| Cache restrictions | May results, IDs, ratings, hours, and images be retained? |
| Attribution | What must the UI display and where? |
| Global coverage | Are smaller destinations and non-English names supported? |
| Rate limits | Are bounded limits, retries, timeouts, and cancellation practical? |

The provider decision must be evidence-based and must preserve the normalized FanAtlas contract if the provider changes.
