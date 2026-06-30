create extension if not exists "pgcrypto";

create type workflow_step_status as enum ('pending', 'running', 'blocked', 'succeeded', 'failed');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type claim_source as enum ('provided', 'inferred', 'needs_proof');
create type asset_format as enum ('single_image', 'carousel');

create table product_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  product_description text not null check (char_length(trim(product_description)) > 0),
  target_audience text,
  market text not null,
  brand_voice text,
  constraints jsonb not null default '[]'::jsonb,
  proof_points jsonb not null default '[]'::jsonb,
  prohibited_claims jsonb not null default '[]'::jsonb,
  sample_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_context_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references product_profiles(id),
  version integer not null,
  profile_snapshot jsonb not null,
  source_hash text not null,
  created_at timestamptz not null default now(),
  unique (product_id, version)
);

create table audience_briefs (
  id uuid primary key default gen_random_uuid(),
  product_context_version_id uuid not null references product_context_versions(id),
  brief jsonb not null,
  created_at timestamptz not null default now()
);

create table campaign_runs (
  id uuid primary key default gen_random_uuid(),
  product_context_version_id uuid not null references product_context_versions(id),
  objective text not null,
  channel text not null,
  asset_count integer not null check (asset_count > 0),
  audience_override text,
  tone text,
  aspect_ratios jsonb not null default '[]'::jsonb,
  max_generation_spend_cents integer not null check (max_generation_spend_cents >= 0),
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  version text not null,
  model text not null,
  hash text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (prompt_key, version, model)
);

create table provider_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references campaign_runs(id),
  step_key text not null,
  provider text not null,
  model text not null,
  prompt_version_id uuid references prompt_versions(id),
  request jsonb not null,
  response jsonb,
  error jsonb,
  token_input integer,
  token_output integer,
  estimated_cost_cents integer,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create table workflow_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references campaign_runs(id),
  parent_step_id uuid references workflow_steps(id),
  step_key text not null,
  status workflow_step_status not null,
  input jsonb not null,
  output jsonb,
  error jsonb,
  provider_call_id uuid references provider_calls(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table concepts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references campaign_runs(id),
  title text not null,
  angle text not null,
  caption text not null,
  asset_format asset_format not null,
  visual_idea text not null,
  proof_element text not null,
  cta text not null,
  rationale text not null,
  claim_sources jsonb not null,
  approval_status approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table image_briefs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references campaign_runs(id),
  concept_id uuid not null references concepts(id),
  card_index integer not null,
  aspect_ratio text not null,
  prompt text not null,
  negative_prompt text not null,
  overlay_text jsonb not null,
  approval_status approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table generated_assets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references campaign_runs(id),
  image_brief_id uuid not null references image_briefs(id),
  provider text not null,
  model text not null,
  storage_path text not null,
  image_url text not null,
  metadata jsonb not null,
  approval_status approval_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references campaign_runs(id),
  entity_type text not null,
  entity_id uuid not null,
  status approval_status not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index workflow_steps_run_id_idx on workflow_steps(run_id);
create index provider_calls_run_id_idx on provider_calls(run_id);
create index concepts_run_id_idx on concepts(run_id);
create index image_briefs_run_id_idx on image_briefs(run_id);
create index generated_assets_run_id_idx on generated_assets(run_id);

