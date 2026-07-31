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
- Profile opens and shows Passport, Journal, and Insights entries.
- Direct `/passport`, `/journal`, and `/insights` routes resolve through the current private-route behavior.
- Browser Back and Forward work after visiting Passport, Journal, and Insights.
- Refresh preserves local Trip Draft data.
- Cross-tab Trip Draft updates appear without manual refresh.

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

## Accessibility

- Keyboard-only navigation reaches all visible controls.
- Focus indicators remain visible.
- Dialogs have accessible names and usable close/cancel actions.
- Headings are in a logical order.
- Screen reader smoke check covers Passport, Journal, and Insights.
- Screen reader smoke check covers Explorer heading, toolbar, year strip, replay controls, map description, Destination Browser tabs, selected panels, route disclaimer, and Data Quality disclosure.
- Explorer keyboard path reaches toolbar, year controls, replay controls, destination browser tabs, browser rows, panel actions, route rows, highlights, and Data Quality without unexpected focus jumps.
- Explorer reduced-motion check keeps replay manual and disables pulsing marker animation.

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

## Visual Modes

- Dark mode readability for Profile, Planner, Passport, Journal, and Insights.
- Dark mode readability for Explorer map, markers, route lines, panels, tabs, legends, replay controls, and Data Quality.
- Reduced motion does not remove feature meaning.
- Cards, filters, timelines, and forms remain readable at 200% zoom.
- Explorer at 320px, 375px, tablet, desktop, and 200% zoom has no horizontal body overflow and no fixed-height clipping.

## Release Command Checklist

For a clean release validation run:

```bash
npm ci
npm run validate
npx playwright install chromium
npm run test:e2e
```
