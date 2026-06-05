# FanAtlas WorldCup2026 API Setup

This patch replaces API-Football with the free open-source World Cup 2026 API from:

https://github.com/rezarahiminia/worldcup2026

## What it adds

- Vercel API proxy:
  - `api/worldcup2026.ts`

- Frontend service:
  - `src/services/worldcup2026.ts`

- Updated Match Center:
  - `src/pages/MatchesPage.tsx`

## No API key required

This API does not require an API key for read access.

## Test after deploy

Open:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/worldcup2026?resource=games
```

Also test:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/worldcup2026?resource=stadiums
```

If those URLs return JSON, your Match Center should load live/open-source data.

## Important

This is not the official FIFA API. Show a small disclaimer in the app:

"Data powered by open-source World Cup 2026 API. Verify official information with FIFA and stadium sources."
