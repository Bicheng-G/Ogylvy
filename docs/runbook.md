# Runbook

## Local Development

1. Install dependencies with `npm install`.
2. Start the app with `npm run dev`.
3. Open `http://127.0.0.1:3000`.
4. Use the built-in RidePass seed product to exercise the workflow.

The local app uses the deterministic demo provider. It produces structured concepts, image briefs, SVG preview assets, trace records, and export metadata without external credentials.

## Production Configuration

Set these environment variables before switching to production providers:

```bash
MARKETING_AGENT_AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-2
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MARKETING_AGENT_STORAGE=supabase
```

Production mode must fail loudly when required provider or storage credentials are absent.

## Verification

Run:

```bash
npm run typecheck
npm test
npm run build
```

Provider-backed smoke tests should remain behind explicit environment flags so CI does not accidentally spend image-generation budget.

## Recovery

- If a provider call fails, inspect `provider_calls` and `workflow_steps.error`.
- If image generation fails, retry only the failed image brief after confirming approval state remains valid.
- If a product description or proof point was wrong, create a new product context version instead of mutating old campaign history.

