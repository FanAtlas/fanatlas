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
OPENAI_MODEL=gpt-4.1-mini
VITE_API_FOOTBALL_KEY=
```

### Currency integration

`VITE_EXCHANGE_RATES_URL` is optional. If omitted, FanAtlas shows demo rates.

The endpoint should be browser-accessible and return USD-based JSON in either shape:

```json
{ "rates": { "USD": 1, "CAD": 1.37, "MXN": 18.2 } }
```

or:

```json
{ "conversion_rates": { "USD": 1, "CAD": 1.37, "MXN": 18.2 } }
```

If the endpoint fails or returns invalid data, the app shows a clear error and keeps working with demo rates.

### AI Chat integration

`OPENAI_API_KEY` is read only by `api/ai-chat.ts`, intended for a backend/serverless runtime such as Vercel. It is never read by frontend code.

Plain `npm run dev` runs Vite only, so `/api/ai-chat` may be unavailable locally. In that case the chat intentionally falls back to demo mode. For live local backend testing, run the app with a platform that serves the `api/` directory, such as Vercel dev.

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
