# Marketing Asset Agent

Internal, human-gated AI workflow for creating traceable marketing concepts, image briefs, generated assets, and export packs.

## Current State

This repository contains a working local MVP scaffold:

- Next.js app UI with a product workspace, workflow timeline, approval gates, generated asset previews, and trace inspector.
- Typed domain schemas with Zod.
- Deterministic demo provider for local development and regression tests.
- OpenAI provider adapter for production integration.
- Supabase schema and Drizzle schema sketch for production persistence.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Validate

```bash
npm run typecheck
npm test
npm run build
```

## Production Setup

Copy `.env.example` to `.env.local` and configure OpenAI/Supabase values. Production provider mode must fail loudly if required credentials are missing.

