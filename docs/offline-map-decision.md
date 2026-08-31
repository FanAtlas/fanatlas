# Offline Map Decision

FanAtlas needs an offline map path that can grow from the current web app into future mobile apps without binding product behavior to one renderer or one storage format.

## Decision

**Recommended primary architecture:** MapLibre GL JS on the web, MapLibre Native for future Capacitor apps, and PMTiles-backed vector tiles as the portable offline pack format.

**Fallback architecture:** a commercial SDK with offline-region support if FanAtlas later needs a vendor-managed navigation stack and can accept the licensing, cost, and lock-in tradeoffs.

**Scope chosen for Step 60 Part 3:** **Scope A**

This step builds the architecture, domain model, route-hardening, and documentation. It does not ship production offline map downloads yet.

## Comparison Matrix

| Option | Strengths | Weaknesses | PWA fit | Native fit | Storage model | Licensing / cost | FanAtlas fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Leaflet + raster caching/download | Small API surface, already in the app, easy overlays and markers | Depends on raster tiles, bulk caching is constrained by tile terms, offline-region workflows are weak, no vector styling path | Good for the current web shell, weak for real offline regions | Weak without a rewrite | Browser cache or app-managed raster files, but not a good long-term offline-pack model | Low library cost, but tile-provider terms and bandwidth are the hard part | Good interim renderer, not a good end state |
| MapLibre GL JS + vector tiles | WebGL vector rendering, modern styling, PMTiles-compatible, strong marker/overlay support, future WebGL/WebGPU path | Requires a renderer migration and style work | Strong | Strong through MapLibre Native | Vector tiles, style JSON, PMTiles or tile services | Open source library, data/provider costs still depend on tile source | Best long-term open architecture |
| MapLibre + PMTiles | Single-file tile archives, static hosting, portable to web and native, good for offline packs, easy to reason about downloads | Needs tile generation pipeline and careful size control | Strong | Strong | Single-file offline packs with explicit region manifests | Open source format and tooling, but storage and tile production are on FanAtlas | Best fit for trip/city downloads |
| Self-hosted vector tile architecture | Maximum control, can tailor coverage and updates, can power custom POIs and future native routing | Operationally heavier, requires tile pipeline, storage, CDN, and update policy | Strong if built well | Strong if mirrored in native | Custom tile store or PMTiles/MBTiles-compatible backend | Cost shifts to infrastructure and maintenance | Good if FanAtlas becomes a large-scale mapping platform |
| Commercial SDK with offline regions | Fast path to offline regions and sometimes native navigation features | Vendor lock-in, cost, less control over rendering and storage, browser support can be uneven | Mixed | Often strong | SDK-managed offline region store | Usually higher recurring cost and contractual constraints | Good fallback if product requirements outrun open tooling |
| Hybrid web now, native adapter later | Preserves current web product while leaving room for Capacitor | Requires discipline to keep boundaries clean | Strong | Strong if the seam is kept narrow | Web pack store now, native pack store later | Lower near-term cost, avoids premature native investment | Best rollout path for FanAtlas |

## Why This Choice

FanAtlas is a global travel product, not a local demo. The map architecture needs to support:

- offline city and trip downloads
- explicit region size estimates and storage pressure handling
- future custom POIs and itinerary markers
- future Capacitor apps without a second rewrite
- truthful distinction between offline maps and offline routing

Leaflet is still a good interim web renderer, but it is not the best long-term offline-pack architecture. Public raster tile endpoints also create terms and caching constraints that do not scale cleanly into user-selected offline regions.

MapLibre gives FanAtlas a vector rendering path that works on the web and in native apps. PMTiles gives FanAtlas a compact, portable way to package trip or city map regions without building a bespoke download format. That combination is the best fit for a future FanAtlas offline-map product.

## Licensing And Terms Notes

- Leaflet is BSD-2 licensed.
- MapLibre GL JS and MapLibre Native are open source and designed around vector tiles and style specifications.
- PMTiles is an open format; the reference implementation is BSD-3 and the specification is public domain / CC0 where applicable.
- OpenStreetMap tile services have usage policies that must be respected. FanAtlas should not bulk-download public tiles unless the provider explicitly permits it.

Current public tile usage is still an online dependency in FanAtlas. The offline-pack architecture should move FanAtlas away from depending on public raster tile caching as the primary offline strategy.

## Offline Pack Strategy

The offline pack model should be provider-neutral:

- region types: `city`, `trip`, `custom_bounds`
- pack statuses: `not_downloaded`, `estimating`, `ready_to_download`, `downloading`, `paused`, `downloaded`, `update_available`, `failed`, `deleting`, `unsupported`
- explicit consent before download
- size estimate before download
- deletion without touching Trip Draft, Journal, Passport, or Preparation data
- separate offline-map and offline-route capabilities

Trip packs should be derived from itinerary destinations and trusted coordinates, not from precise location history.

## Future Routing

MapLibre + PMTiles does not solve offline routing by itself. FanAtlas should treat routing as a separate future capability. If and when route data becomes offline-capable, it should be introduced through a separate decision about a routing engine or native SDK, not by assuming map packs provide turn-by-turn guidance.

## Selected Scope

Step 60 Part 3 stops at:

- architecture decision
- provider-neutral domain model
- route freshness hardening
- offline/non-offline transition semantics
- docs and tests

It does not ship production offline map downloads yet.

## Source References

- Leaflet API reference: https://leafletjs.com/reference
- Leaflet quick start and tile attribution guidance: https://leafletjs.com/examples/quick-start/
- OpenStreetMap tile usage policy: https://wiki.openstreetmap.org/wiki/Tile_usage_policy
- MapLibre GL JS docs: https://maplibre.org/maplibre-gl-js/docs/
- MapLibre Native docs: https://maplibre.org/maplibre-native/docs/book/
- PMTiles repository and docs: https://github.com/protomaps/PMTiles
