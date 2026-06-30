# Marketing Asset Agent Architecture

## Runtime Shape

The app is a Next.js internal tool with a workflow-first UI:

1. Product profile
2. Product context version
3. Intelligence brief
4. Campaign run
5. Concepts
6. Concept approval
7. Image briefs
8. Image brief approval
9. Asset generation
10. Export and trace review

The local MVP runs with a deterministic demo provider so the workflow can be tested without credentials. Production execution switches provider and storage through explicit environment configuration.

## Recommended Production Stack

- Next.js, TypeScript, App Router, Tailwind.
- Supabase Auth, Postgres, Storage, and RLS.
- Drizzle ORM schema for application code.
- Trigger.dev tasks for long-running workflow stages.
- OpenAI Responses API for structured reasoning outputs.
- OpenAI Image API with `gpt-image-2` for final image assets.
- Langfuse or equivalent tracing for prompt, model, cost, and latency observability.

## Provider Strategy

The app uses a provider interface with two implementations:

- `DemoMarketingProvider`: deterministic local workflow outputs for tests and development.
- `OpenAIMarketingProvider`: production adapter using OpenAI structured JSON outputs and image generation.

The demo provider is not a silent fallback. It is the default local development mode and is documented as such. Production mode must configure `MARKETING_AGENT_AI_PROVIDER=openai` and `OPENAI_API_KEY`; missing credentials are treated as configuration errors.

## Persistence Strategy

Production persistence belongs in Supabase:

- Postgres tables hold product profiles, immutable context versions, workflow steps, approvals, provider calls, prompt versions, concepts, image briefs, and generated assets.
- Supabase Storage holds generated image files and export bundles.
- Row-level security should initially restrict all rows to authenticated internal users.

The local MVP keeps a client-side workflow state for fast iteration and pure domain tests. The schema and adapters are included so the state model can be moved to Supabase without changing the workflow concepts.

## Traceability

Every workflow step records:

- Step key and status.
- Input payload.
- Output payload.
- Error type/message/details when failed.
- Provider name/model.
- Token/cost/latency estimates where available.
- Prompt version ID.
- Parent/child step relationship where relevant.

Provider errors are stored as structured records and surfaced in the right-side trace inspector.

## Safety Decisions

- Do not generate images directly from product description.
- Do not hide provider failures behind empty arrays.
- Do not infer proof points as factual claims.
- Do not hardcode localization; market-specific cues come from product profile fields.
- Do not make a social posting integration part of this app in v1.

