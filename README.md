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
VITE_OPENAI_API_KEY=
VITE_API_FOOTBALL_KEY=
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
4. Add safer OpenAI backend proxy instead of exposing key in frontend
5. Connect Mapbox or Google Maps for in-app directions
