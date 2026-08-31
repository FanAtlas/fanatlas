# Global Destination Intelligence Architecture

Step 57 Part 1 adds a provider-neutral, structured destination layer for FanAtlas. It is a domain/data-policy foundation: no dynamic geocoding, no AI calls, no live provider calls, and no personalized travel recommendations.

Step 57 Part 2 adds the first read-only Destination Hub UI on top of that model. The Hub renders local/derived destination facts and a separate private personal-summary projection, but it does not own destination data or user travel data.

Step 57 Part 3 adds the first curated static/slow-changing local dataset and hardens legacy integrations. It improves coverage for a small country/city cohort without creating a travel encyclopedia, a visa engine, a live advisory engine, or an AI dependency.

## Source Of Truth

The canonical static/slow-changing source is `src/data/destinationIntelligence/curatedData.ts`. It contains:

- a source registry with stable IDs, authority class, URL/reference where appropriate, reviewed date, and supported categories
- curated country records for United States, Canada, Mexico, Morocco, France, Spain, Portugal, United Kingdom, Italy, Germany, Japan, and Brazil
- curated city records for New York, Los Angeles, Miami, Toronto, Mexico City, Marrakech, Casablanca, Paris, Madrid, Barcelona, Lisbon, London, Rome, Berlin, Tokyo, Rio de Janeiro, and São Paulo

The derivation may still use existing local FanAtlas metadata as compatibility input:

- `src/data/countries.ts` for ISO 3166-1 alpha-2 country identity, display names, flags, and country-scoped city names.
- `src/data/destinations.ts` for older city coordinate rows where a curated city record references the existing local coordinate seed.
- `src/data/emergencyNumbers.ts` as a compatibility adapter over curated emergency records, not as an independent source of truth.
- Trip Draft destination fields only as references to resolve identity. Trip Drafts remain the product source of truth for user trip data.

Unknown fields stay unknown. The curated layer only contains records that have an attached source ID and review date. It does not invent visa, advisory, safety, customs, weather, exchange-rate, transport-disruption, airport-closure, or health-alert claims.

The Destination Hub consumes this same model through `useDestinationIntelligence()` and a pure `deriveDestinationHubView()` helper. Page components must not duplicate destination facts.

## Destination Identity

Countries use ISO 3166-1 alpha-2 as the canonical identity:

```text
country:MA
```

Cities are country-scoped:

```text
city:MA:marrakech
```

Normalization trims whitespace, removes accents, lowercases, collapses punctuation, and applies a small alias map for existing destination names such as `Marrakesh -> Marrakech` and `Lisboa -> Lisbon`. City names are never treated as globally unique; the country context is part of the key.

Unresolved destinations are represented explicitly as unresolved identities and counted in quality metrics. They do not fall back to a nearby or default country.

## Destination Hub Route

The Hub is a private, lazy-loaded route:

```text
/destination/:destinationId
```

Canonical IDs are URL-encoded when placed in the path:

```text
/destination/country%3APT
/destination/city%3APT%3Alisbon
```

Raw canonical IDs are routing/state identifiers and are not displayed as traveler-facing labels. Unknown or unresolved IDs render a safe unavailable state rather than force matching free text.

## Static And Current Classification

Every structured field carries an information class:

- `STATIC`: country code, identity, city key.
- `SLOW_CHANGING`: currency code, language metadata, timezone identifiers, plug/electrical metadata, local customs architecture.
- `CURRENT_INFORMATION`: weather and exchange rates, which remain in existing current-information tools.
- `HIGH_STAKES_CURRENT_INFORMATION`: emergency numbers, visa/entry requirements, official advisories, and safety resources.

Visa and nationality-specific entry advice are not modeled as static facts. They require future official current-information integrations.

## Provenance

Every externally sourced field can carry:

- source ID
- source type
- authority
- retrieved or reviewed date
- freshness class
- optional URL/reference
- verification state

Emergency records are high-stakes and include reviewed metadata where the local dataset has it. Unknown emergency information is represented as unknown; FanAtlas does not silently fall back to US `911`.

Source authority classes supported by the curated registry are:

- `official_government`
- `international_standard`
- `official_emergency`
- `recognized_reference`
- `maintained_internal`
- `unknown`

Do not label a source official unless the source is actually an official authority. The current emergency cohort is marked as locally reviewed internal data rather than broad official-government coverage.

## Provenance UI

The Hub avoids cluttering every row with source text. General static/slow-changing sections use compact source disclosures, while emergency, entry, official information, and other current/high-stakes sections show stronger source/freshness context. Future official links may be rendered only after source validation.

## Data Quality

`deriveDestinationIntelligence()` produces non-persisted quality counters:

- resolved destinations
- unresolved destinations
- missing country metadata
- missing coordinates
- missing timezone
- missing currency
- unverified emergency information
- stale records
- conflicting records

These counters are operational/domain diagnostics. They are not stored as product data.

`src/lib/destinationCoverage.ts` also derives a pure coverage report for the curated dataset:

- supported countries and cities
- countries with currency, calling code, timezone, electrical, and reviewed emergency records
- cities with coordinates and city timezones
- records missing provenance
- stale source records
- legacy conflicts

The same module validates ISO codes, duplicate identities, currency codes, language codes, calling codes, IANA timezones, plug types, voltage/frequency values, emergency-number shape, emergency provenance, source registry references, reviewed-date format, and privacy-boundary markers.

## Privacy Boundary

Destination Intelligence describes destinations, not users. The derivation does not include:

- Journal body
- private trip notes
- account email
- auth tokens
- photo IDs
- precise live GPS history
- private location history

Trip Drafts may contribute destination references only: label, city, country, and country code.

## Personal Context Boundary

The Hub may show private derived counts to the authenticated traveler:

- visited/planned/not-yet-visited status
- trip counts
- visited cities and places
- memory/photo counts
- Journal entry counts

These counts are derived from Passport, Explorer, and Trip Draft state. Destination Intelligence itself remains non-personal. The Hub does not display Journal body, planning notes, account email, auth tokens, photo IDs, raw storage IDs, raw canonical IDs, precise location history, or provider payloads.

## AI Boundary

No FanAtlas AI call is made in Step 57 Part 1. The model is shaped so future minimized TravelContext projections can consume selected destination fields safely. High-stakes/current fields retain provenance, freshness, and official-source requirements.

The Step 57 Part 2 Hub also makes no AI calls and does not depend on OpenAI availability. Current-information actions route to existing safe surfaces such as SOS, Currency Converter, Translator, and Travel Tools; they are explicit traveler actions, not automatic page-load fetches.

## Integration Points

- Global Travel Explorer selected country/city panels can open a canonical Hub route.
- Travel Passport country stamps and city rows can open a canonical Hub route.
- Trip Draft detail pages can open a Destination Guide only when the stored destination resolves safely to a canonical country or city identity.
- Local Hub search matches country name, city name, aliases resolved by the domain layer, and ISO code. It is local-only and does not persist search terms.
- SOS and the AI emergency-information tool read emergency numbers through the canonical curated adapter. Unsupported countries render/fail as unavailable instead of receiving a guessed number.
- Static destination currency metadata is validated against the existing currency-converter supported ISO codes. Live exchange rates remain separate current-information data.

## Data Maintenance

To add a destination safely:

1. Add or confirm the canonical country/city identity.
2. Add only trusted static or slow-changing metadata.
3. Attach source IDs from the registry, adding a source only when its authority and categories are clear.
4. Set or update the reviewed date.
5. Run the curated data validation and coverage tests.
6. Check the Destination Hub for sparse and enriched states.
7. Keep current/high-stakes claims out of static records unless they are explicitly reviewed emergency records.

Never add unsupported visa eligibility, entry-rule conclusions, advisories, weather, exchange rates, transport disruptions, airport closures, health alerts, subjective safety scores, or stereotyped cultural claims to this dataset.

## Known Limitations

- The country list has broad identity coverage, but enriched static/slow-changing metadata is intentionally limited to the initial 12-country cohort.
- Coordinates are curated for cities that already had trusted local coordinates; Berlin, Tokyo, Rio de Janeiro, and São Paulo currently have city timezones but no coordinates.
- Transport metadata remains conservative destination capability metadata, not real-time service availability.
- Emergency coverage is locally reviewed for the cohort and remains unknown for unsupported countries.
- No dynamic geocoding, routing, translation, visa engine, advisory engine, weather lookup, or exchange-rate lookup is part of this layer.
- The Hub is an information surface, not a full destination page system. It has no maps, photos, recommendation engine, live weather widget, live exchange-rate widget, visa eligibility engine, official advisory engine, or AI-generated destination copy.
