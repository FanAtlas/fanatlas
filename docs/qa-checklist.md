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

## Accessibility

- Keyboard-only navigation reaches all visible controls.
- Focus indicators remain visible.
- Dialogs have accessible names and usable close/cancel actions.
- Headings are in a logical order.
- Screen reader smoke check covers Passport, Journal, and Insights.

## Localization

- English
- Spanish
- French
- Arabic
- Portuguese
- Arabic RTL layout has no horizontal overflow.
- Mixed-direction trip titles and journal text remain readable.

## Visual Modes

- Dark mode readability for Profile, Planner, Passport, Journal, and Insights.
- Reduced motion does not remove feature meaning.
- Cards, filters, timelines, and forms remain readable at 200% zoom.

## Release Command Checklist

For a clean release validation run:

```bash
npm ci
npm run validate
npx playwright install chromium
npm run test:e2e
```
