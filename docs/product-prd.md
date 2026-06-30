# Marketing Asset Agent PRD

## Objective

Marketing Asset Agent is an internal, human-gated workflow for producing campaign-ready social and ad assets from a reusable product profile. It must make every AI decision inspectable before image generation happens.

## Users

- Founder or marketer defining product positioning and campaign direction.
- Creative operator reviewing concepts, prompts, and generated assets.
- Engineer/debugger inspecting intermediate outputs, provider calls, cost, latency, and failures.

## V1 Scope

- Product profile creation with required product description and optional audience, market, brand voice, constraints, proof points, prohibited claims, and sample references.
- Versioned product context so repeated campaigns can reuse a fixed brief.
- Marketing intelligence brief with audience segments, pain points, use cases, objections, promises, proof inventory, and claim risk notes.
- Campaign concept generation using Ogilvy-style creative discipline from `skills/example_post_concept_skill.md` without hardcoding Singapore unless it is part of the product context.
- Human approval gate before image prompt generation.
- Structured image briefs and prompts.
- Human approval gate before image generation.
- Generated asset gallery and export package metadata.
- Full workflow trace with step inputs, outputs, provider metadata, errors, token/cost/latency estimates, and prompt versions.

## Non-Goals

- No posting or scheduling to social networks.
- No ad account publishing or budget management.
- No autonomous web research unless explicitly added later.
- No multi-tenant SaaS billing or quota management in v1.

## Product Rules

- Required product description must fail validation if missing.
- Required fields must not be replaced with silent defaults.
- Claims must be classified as `provided`, `inferred`, or `needs_proof`.
- Image generation cannot start unless at least one concept and its image brief are approved.
- Provider failures must be visible in the trace and must not create fake successful assets.
- Product context versions are immutable once created.
- Prompt instructions keep stable sections first and run-specific context last for prompt caching.

## Acceptance Criteria

- A user can start from a product profile and inspect the intelligence brief, concepts, image briefs, asset outputs, and trace.
- A missing product description is rejected with a concrete validation error.
- If audience is omitted, the audience brief marks the target audience as inferred.
- If audience is provided, the workflow preserves it and does not replace it silently.
- Concept approval is required before image briefs are generated.
- Image brief approval is required before generated assets are produced.
- Export includes captions, image prompt metadata, generated asset records, and the trace.
- Re-running a campaign against the same product context version produces equivalent concept and brief content, ignoring run IDs and timestamps.

