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
