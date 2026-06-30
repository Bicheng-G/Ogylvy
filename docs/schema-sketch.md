# Schema Sketch

This is the durable product-data contract. The executable SQL lives in `supabase/schema.sql`; the TypeScript schema lives in `src/lib/domain/schemas.ts` and `src/lib/db/schema.ts`.

## Core Tables

- `product_profiles`: editable product input and brand constraints.
- `product_context_versions`: immutable snapshots of a profile plus generated intelligence brief reference.
- `campaign_runs`: a single campaign workflow against one context version.
- `workflow_steps`: traceable stage records with inputs, outputs, errors, and timing/cost metadata.
- `audience_briefs`: generated marketing intelligence.
- `concepts`: generated post/ad ideas and approval status.
- `image_briefs`: structured image-generation prompts and approval status.
- `generated_assets`: generated images and export metadata.
- `approvals`: human approval events with actor and note.
- `provider_calls`: raw provider-call metadata and errors.
- `prompt_versions`: stable prompt names and version hashes.

## Required Status Enums

- Workflow step: `pending`, `running`, `blocked`, `succeeded`, `failed`
- Approval: `pending`, `approved`, `rejected`
- Claim source: `provided`, `inferred`, `needs_proof`
- Asset format: `single_image`, `carousel`

## Data Integrity Rules

- Product description is required.
- Context versions are append-only.
- Concepts and image briefs must reference a campaign run.
- Generated assets must reference an approved image brief.
- Provider call errors must preserve status/body/error type when available.

