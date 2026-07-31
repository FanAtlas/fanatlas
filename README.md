# FanAtlas — Option 3 Starter

Mobile-first React app for World Cup tourists.

## Includes
- Home dashboard
- Match Center
- AI Chat
- SOS
- Map placeholder
- Explore
- Travel Guides
- Profile / Premium placeholder
- Supabase schema
- API-Football service file
- OpenAI service file

## Run locally

```bash
npm install
npm run dev
```

## Developer quality commands

FanAtlas uses npm, TypeScript, ESLint, Vitest, and Playwright for local and CI validation.

```bash
npm run typecheck      # TypeScript only, no build output
npm run lint           # ESLint quality checks
npm run lint:fix       # ESLint auto-fix, review the diff afterwards
npm run test           # Vitest unit tests
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest with V8 coverage
npm run build          # TypeScript plus production Vite build
npm run test:e2e       # Playwright browser smoke tests
npm run validate       # typecheck, lint, unit tests, build
npm run validate:full  # validate plus Playwright
```

Install Chromium for local browser tests when needed:

```bash
npx playwright install chromium
```

Before release, run the clean validation sequence:

```bash
npm ci
npm run validate
npx playwright install chromium
npm run test:e2e
```

Manual checks that are not fully automated live in [docs/qa-checklist.md](docs/qa-checklist.md).

### Testing guidance

- Add unit tests for new pure domain helpers and derivation rules.
- Use deterministic fixtures with fixed IDs, timestamps, and `YYYY-MM-DD` dates.
- Do not use real credentials, real journal content, uploaded user photos, or private coordinates in tests.
- Unit and integration tests should not depend on network services or Supabase.
- Browser tests should use synthetic storage state or current route behavior, never production accounts.
- Keep assertions behavior-focused; avoid full-page snapshots.

## Environment variables

Copy `.env.example` to `.env` and fill:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_EXCHANGE_RATES_URL=

# Backend/serverless only. Never expose this with a VITE_ prefix.
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_API_FOOTBALL_KEY=
```

### Currency integration

`VITE_EXCHANGE_RATES_URL` is optional. If omitted, FanAtlas uses the live free endpoint:

```text
https://open.er-api.com/v6/latest/USD
```

If that request fails, FanAtlas tries:

```text
https://api.exchangerate.host/latest
```

The endpoint should be browser-accessible and return JSON in either shape:

```json
{ "rates": { "USD": 1, "CAD": 1.37, "MXN": 18.2 } }
```

or:

```json
{ "conversion_rates": { "USD": 1, "CAD": 1.37, "MXN": 18.2 } }
```

If both endpoints fail or return invalid data, the app shows: "Unable to load exchange rates. Please try again."

### AI Chat integration

`OPENAI_API_KEY` is read only by `api/ai.ts`, intended for a backend/serverless runtime such as Vercel. It is never read by frontend code.

The AI route also reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the server to verify the user's Supabase auth token and check monthly usage in `user_ai_usage`.

`SUPABASE_SERVICE_ROLE_KEY` is optional. Add it only as a server/backend environment variable when RLS policies prevent the API route from reading or updating `user_ai_usage`. Never expose it with a `VITE_` prefix.

The AI model is fixed in the backend to `gpt-4o-mini` to control costs.

For local `.env`:

```bash
OPENAI_API_KEY=your_openai_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional server/backend only:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

For Vercel:

```text
Project Settings → Environment Variables:
OPENAI_API_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
Optional: SUPABASE_SERVICE_ROLE_KEY
```

Plain `npm run dev` runs Vite only, so `/api/ai` may be unavailable locally unless a local serverless runtime is also serving the `api/` directory. For live local backend testing, run the app with a platform that serves Vercel functions, such as Vercel CLI. If the server key is missing, the chat shows: "OpenAI key is not configured."

### Favorites table

FanAtlas favorites are stored in Supabase. Create this table before using the Favorites page:

```sql
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('stadium', 'restaurant', 'hotel', 'fan-zone')),
  item_id text not null,
  name text not null,
  city text,
  image text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists favorites_user_id_idx on public.favorites(user_id);

alter table public.favorites enable row level security;

create policy "Users can manage own favorites"
on public.favorites
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## GitHub setup

Create a new GitHub repo named:

```bash
fanatlas
```

Then upload this project.

## Global Travel Explorer

The Global Travel Explorer is a private derived view built from existing FanAtlas data. It does not store Explorer statistics, create a new database, call remote geocoding, load map tiles, or send travel history to a map provider.

Source-of-truth boundaries:

- Trip Drafts own trip metadata, itinerary, visit status, journal entries, and photo references.
- Travel Passport owns completed-trip destination eligibility.
- Travel Insights owns aggregate statistics and rankings.
- Travel Explorer owns only map-ready read models, layers, route projections, coordinate validation, and UI selection state.

Country identity is matched deterministically by ISO alpha-2 code first, then a small explicit alias table for known naming differences. City identity includes country context, using the same Passport city-key rule where possible.

Explorer map behavior uses locally available destination coordinates from the bundled FanAtlas destination table and structured Trip Draft destination fields. There is no bundled world-country geometry dataset yet, so countries without trusted local coordinates remain available in the destination browser and data-quality notice instead of being guessed.

Routes connect known trip destination points in itinerary order. They are not turn-by-turn directions and do not represent exact physical travel paths.

The interactive Explorer experience supports country, city, trip and route selection, local search, status and year filters, status/frequency/travel-day/route modes, a keyboard-accessible destination browser, and manual Travel Replay. Replay never autoplays and respects reduced-motion preferences. Explorer memory integration uses aggregate photo, journal and favorite counts only; it does not load photo Blobs or render journal body text.

Step 52 release notes:

- Source-of-truth chain: Trip Drafts -> Passport -> Insights -> Explorer -> Explorer view helpers -> Explorer UI.
- Year membership currently uses the trip start year. Cross-year trips are not expanded into every intersected year in Step 52.
- Route-point deduplication removes only consecutive identical coordinates. Repeated visits separated by another destination remain visible.
- Antimeridian-aware bounds may use a wrapped box where `east < west`; route lines remain straight SVG segments and are labeled as approximate itinerary connections.
- Frequency mode is based on completed-trip counts. Travel Days mode is based on completed trips with valid inclusive durations.
- Wishlist remains empty unless a future canonical structured wishlist destination source is added. Saved Places are not inferred as wishlist destinations.
- Country polygon geometry is deferred. The current release uses local marker projection, local route lines, and the Destination Browser as the accessible full alternative. This avoids adding a new map dependency, a large geometry bundle, licensing review, and accessibility risk late in Step 52.
- Authenticated Explorer Playwright coverage is deferred until FanAtlas has a safe nonproduction auth strategy. The current E2E suite verifies private route behavior through the existing auth gate, while component and domain tests cover seeded Explorer interactions.
- Explorer must not create remote map, geocoding, routing, analytics, AI, IndexedDB Blob, or photo-CDN requests during initial render.

## Vercel deployment

1. Go to Vercel
2. Import GitHub repo
3. Add the environment variables
4. Deploy

## Next development steps

1. Connect Supabase Auth
2. Replace mock data with Supabase queries
3. Add API-Football fixtures to Match Center
4. Replace mock and demo integrations with production providers
5. Connect Mapbox or Google Maps for in-app directions
