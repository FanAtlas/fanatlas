# FanAtlas Deployment

## Local development

```bash
npm run dev
```

## Production deployment

Vercel is expected to deploy from the GitHub `main` branch.

Run:

```bash
./scripts/deploy.sh
```

The script runs `npm run build` first. If the build fails, deployment is cancelled before any commit or push.

## Deployment checklist

- Run `npm run build`
- Confirm no TypeScript errors
- Confirm no broken imports
- Confirm app routes still render
- Commit and push to `origin main`

When Vercel is connected to the GitHub repository, pushing to `main` triggers a production deployment automatically.
