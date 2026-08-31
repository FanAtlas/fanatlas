# Travel Home Architecture

Step 61 turns FanAtlas Home into a contextual travel command center. It is a pure derivation layer over existing trip, destination, preparation, and connectivity state.

## Source Of Truth

Home does not own persistence or duplicate any trip model.

- Trip Drafts own itinerary days, place order, visit status, planning actions, and trip dates.
- Travel Preparation owns readiness, phase, and attention items.
- Trip Day owns the canonical next-place and progress derivation.
- Destination Intelligence owns static destination context and verified emergency data.
- Connectivity is a UX hint only and does not trigger polling or auto-fetch.

## Pure View Model

`src/lib/travelHome.ts` derives a deterministic `TravelHomeViewModel` from:

- trip drafts
- destination intelligence
- current date
- connectivity

The output is React-free, storage-free, network-free, and immutable.

## State Machine

Home resolves to one of these states:

- `no_trip`
- `planned_trip`
- `approaching_trip`
- `departure_day`
- `active_trip`
- `day_complete`
- `ended_trip`
- `multiple_trips`
- `undated_trip`

Precedence is deterministic:

1. active trips
2. upcoming trips
3. ended trips
4. undated trips
5. no trip

Overlapping active or upcoming trips surface a trip chooser instead of silently selecting a hidden context.

## Context Priority

Home prioritizes:

1. current travel state
2. one primary action
3. today / preparation / destination context
4. safety and utilities
5. secondary shortcuts

It does not render a dashboard of equal-weight cards.

## Primary Actions

Representative actions:

- no trip: plan a trip
- upcoming: open preparation
- departure day: open Today
- active: continue Today
- day complete: open Journal
- ended: review trip
- multiple trips: choose a trip

## Secondary Actions

Secondary actions remain contextual and compact. They can point to:

- Destination Guide
- Map
- Preparation
- Journal
- SOS
- Passport
- Explorer
- Travel tools

## Offline Behavior

Home does not fetch live weather, currency, routes, or official updates on render.

When offline:

- local trip essentials remain visible
- live-context cards degrade independently
- the offline summary is explicit
- the page does not become an error screen

Home does not claim offline map downloads or offline routing.

## Privacy

Home derives from existing data and does not persist:

- selected context
- progress
- next place
- preparation summary
- destination intelligence
- exact location
- auth tokens
- provider payloads
- Journal bodies

## Accessibility And Layout

Home keeps a single top-level hero and a restrained set of sections. The view is designed for mobile first, RTL, keyboard access, and reduced-motion environments.

## Relationship To Other Pages

- Today remains the execution surface.
- Preparation remains the readiness surface.
- Destination Hub remains the destination context surface.
- SOS remains the safety surface.
- Passport, Journal, and Explorer stay available as lower-priority memory and discovery surfaces.

## Limitations

- No automatic live refresh on connectivity return.
- No duplicate trip store.
- No fake offline map download CTA.
- No AI dependency.
