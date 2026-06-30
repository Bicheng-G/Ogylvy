import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const workflowStepStatus = pgEnum("workflow_step_status", [
  "pending",
  "running",
  "blocked",
  "succeeded",
  "failed"
]);

export const approvalStatus = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const assetFormat = pgEnum("asset_format", ["single_image", "carousel"]);

export const productProfiles = pgTable("product_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id"),
  name: text("name").notNull(),
  productDescription: text("product_description").notNull(),
  targetAudience: text("target_audience"),
  market: text("market").notNull(),
  brandVoice: text("brand_voice"),
  constraints: jsonb("constraints").notNull().default([]),
  proofPoints: jsonb("proof_points").notNull().default([]),
  prohibitedClaims: jsonb("prohibited_claims").notNull().default([]),
  sampleReferences: jsonb("sample_references").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const productContextVersions = pgTable("product_context_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productProfiles.id),
  version: integer("version").notNull(),
  profileSnapshot: jsonb("profile_snapshot").notNull(),
  sourceHash: text("source_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const campaignRuns = pgTable("campaign_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productContextVersionId: uuid("product_context_version_id")
    .notNull()
    .references(() => productContextVersions.id),
  objective: text("objective").notNull(),
  channel: text("channel").notNull(),
  assetCount: integer("asset_count").notNull(),
  audienceOverride: text("audience_override"),
  tone: text("tone"),
  aspectRatios: jsonb("aspect_ratios").notNull().default([]),
  maxGenerationSpendCents: integer("max_generation_spend_cents").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const workflowSteps = pgTable("workflow_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => campaignRuns.id),
  parentStepId: uuid("parent_step_id"),
  stepKey: text("step_key").notNull(),
  status: workflowStepStatus("status").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  error: jsonb("error"),
  providerCallId: uuid("provider_call_id"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const providerCalls = pgTable("provider_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => campaignRuns.id),
  stepKey: text("step_key").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersionId: uuid("prompt_version_id"),
  request: jsonb("request").notNull(),
  response: jsonb("response"),
  error: jsonb("error"),
  tokenInput: integer("token_input"),
  tokenOutput: integer("token_output"),
  estimatedCostCents: integer("estimated_cost_cents"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

