import { z } from "zod";

export const ClaimSourceSchema = z.enum(["provided", "inferred", "needs_proof"]);
export const ApprovalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const WorkflowStepStatusSchema = z.enum([
  "pending",
  "running",
  "blocked",
  "succeeded",
  "failed"
]);
export const AssetFormatSchema = z.enum(["single_image", "carousel"]);
export const WorkflowStageSchema = z.enum([
  "product_profile",
  "intelligence_brief",
  "concepts",
  "concept_approval",
  "image_briefs",
  "image_approval",
  "asset_generation",
  "export"
]);

export const NonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, "This field is required.");

export const StringListSchema = z.array(NonEmptyStringSchema);

export const ProductProfileInputSchema = z.object({
  name: NonEmptyStringSchema,
  productDescription: NonEmptyStringSchema,
  targetAudience: z.string().trim().optional(),
  market: NonEmptyStringSchema,
  brandVoice: z.string().trim().optional(),
  constraints: StringListSchema,
  proofPoints: StringListSchema,
  prohibitedClaims: StringListSchema,
  sampleReferences: StringListSchema
});

export const ProductProfileSchema = ProductProfileInputSchema.extend({
  id: NonEmptyStringSchema,
  createdAt: NonEmptyStringSchema,
  updatedAt: NonEmptyStringSchema
});

export const ProductContextVersionSchema = z.object({
  id: NonEmptyStringSchema,
  productId: NonEmptyStringSchema,
  version: z.number().int().positive(),
  profileSnapshot: ProductProfileSchema,
  sourceHash: NonEmptyStringSchema,
  createdAt: NonEmptyStringSchema
});

export const AudienceSegmentSchema = z.object({
  name: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  source: ClaimSourceSchema,
  confidence: z.number().min(0).max(1)
});

export const ClaimWithSourceSchema = z.object({
  text: NonEmptyStringSchema,
  source: ClaimSourceSchema,
  evidence: NonEmptyStringSchema
});

export const AudienceBriefSchema = z.object({
  id: NonEmptyStringSchema,
  productContextVersionId: NonEmptyStringSchema,
  targetAudienceSummary: NonEmptyStringSchema,
  targetAudienceSource: ClaimSourceSchema,
  audienceSegments: z.array(AudienceSegmentSchema).min(1),
  painPoints: z.array(ClaimWithSourceSchema).min(1),
  useCases: z.array(ClaimWithSourceSchema).min(1),
  scenarios: z.array(ClaimWithSourceSchema).min(1),
  objections: z.array(ClaimWithSourceSchema).min(1),
  corePromises: z.array(ClaimWithSourceSchema).min(1),
  proofInventory: z.array(ClaimWithSourceSchema),
  claimRisks: z.array(ClaimWithSourceSchema),
  createdAt: NonEmptyStringSchema
});

export const CampaignRunInputSchema = z.object({
  productContextVersionId: NonEmptyStringSchema,
  objective: NonEmptyStringSchema,
  channel: NonEmptyStringSchema,
  assetCount: z.number().int().positive(),
  audienceOverride: z.string().trim().optional(),
  tone: z.string().trim().optional(),
  aspectRatios: StringListSchema.min(1),
  maxGenerationSpendCents: z.number().int().nonnegative()
});

export const CampaignRunSchema = CampaignRunInputSchema.extend({
  id: NonEmptyStringSchema,
  status: NonEmptyStringSchema,
  createdAt: NonEmptyStringSchema,
  updatedAt: NonEmptyStringSchema
});

export const PromptVersionSchema = z.object({
  id: NonEmptyStringSchema,
  promptKey: NonEmptyStringSchema,
  version: NonEmptyStringSchema,
  model: NonEmptyStringSchema,
  hash: NonEmptyStringSchema,
  body: NonEmptyStringSchema,
  createdAt: NonEmptyStringSchema
});

export const ProviderErrorSchema = z.object({
  type: NonEmptyStringSchema,
  message: NonEmptyStringSchema,
  statusCode: z.number().int().optional(),
  responseBody: z.unknown().optional()
});

export const ProviderCallSchema = z.object({
  id: NonEmptyStringSchema,
  runId: NonEmptyStringSchema.optional(),
  stepKey: NonEmptyStringSchema,
  provider: NonEmptyStringSchema,
  model: NonEmptyStringSchema,
  promptVersionId: NonEmptyStringSchema.optional(),
  request: z.unknown(),
  response: z.unknown().optional(),
  error: ProviderErrorSchema.optional(),
  tokenInput: z.number().int().nonnegative().optional(),
  tokenOutput: z.number().int().nonnegative().optional(),
  estimatedCostCents: z.number().int().nonnegative().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  createdAt: NonEmptyStringSchema
});

export const WorkflowStepSchema = z.object({
  id: NonEmptyStringSchema,
  runId: NonEmptyStringSchema,
  parentStepId: NonEmptyStringSchema.optional(),
  stage: WorkflowStageSchema,
  stepKey: NonEmptyStringSchema,
  status: WorkflowStepStatusSchema,
  input: z.unknown(),
  output: z.unknown().optional(),
  error: ProviderErrorSchema.optional(),
  providerCallId: NonEmptyStringSchema.optional(),
  startedAt: NonEmptyStringSchema.optional(),
  completedAt: NonEmptyStringSchema.optional(),
  createdAt: NonEmptyStringSchema
});

export const ConceptSchema = z.object({
  id: NonEmptyStringSchema,
  runId: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  angle: NonEmptyStringSchema,
  caption: NonEmptyStringSchema,
  assetFormat: AssetFormatSchema,
  visualIdea: NonEmptyStringSchema,
  proofElement: NonEmptyStringSchema,
  cta: NonEmptyStringSchema,
  rationale: NonEmptyStringSchema,
  claimSources: z.array(ClaimWithSourceSchema).min(1),
  approvalStatus: ApprovalStatusSchema,
  createdAt: NonEmptyStringSchema,
  updatedAt: NonEmptyStringSchema
});

export const ImageBriefSchema = z.object({
  id: NonEmptyStringSchema,
  runId: NonEmptyStringSchema,
  conceptId: NonEmptyStringSchema,
  cardIndex: z.number().int().nonnegative(),
  aspectRatio: NonEmptyStringSchema,
  prompt: NonEmptyStringSchema,
  negativePrompt: NonEmptyStringSchema,
  overlayText: z.object({
    headline: NonEmptyStringSchema,
    subtext: NonEmptyStringSchema,
    cta: NonEmptyStringSchema
  }),
  approvalStatus: ApprovalStatusSchema,
  createdAt: NonEmptyStringSchema,
  updatedAt: NonEmptyStringSchema
});

export const GeneratedAssetSchema = z.object({
  id: NonEmptyStringSchema,
  runId: NonEmptyStringSchema,
  imageBriefId: NonEmptyStringSchema,
  provider: NonEmptyStringSchema,
  model: NonEmptyStringSchema,
  storagePath: NonEmptyStringSchema,
  imageUrl: NonEmptyStringSchema,
  metadata: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    promptHash: NonEmptyStringSchema,
    demoAsset: z.boolean()
  }),
  approvalStatus: ApprovalStatusSchema,
  createdAt: NonEmptyStringSchema
});

export const ApprovalSchema = z.object({
  id: NonEmptyStringSchema,
  runId: NonEmptyStringSchema,
  entityType: NonEmptyStringSchema,
  entityId: NonEmptyStringSchema,
  status: ApprovalStatusSchema,
  actorId: z.string().trim().optional(),
  note: z.string().trim().optional(),
  createdAt: NonEmptyStringSchema
});

export const WorkflowWorkspaceSchema = z.object({
  products: z.array(ProductProfileSchema),
  contextVersions: z.array(ProductContextVersionSchema),
  audienceBriefs: z.array(AudienceBriefSchema),
  runs: z.array(CampaignRunSchema),
  concepts: z.array(ConceptSchema),
  imageBriefs: z.array(ImageBriefSchema),
  generatedAssets: z.array(GeneratedAssetSchema),
  approvals: z.array(ApprovalSchema),
  providerCalls: z.array(ProviderCallSchema),
  workflowSteps: z.array(WorkflowStepSchema),
  promptVersions: z.array(PromptVersionSchema)
});

export type ClaimSource = z.infer<typeof ClaimSourceSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;
export type ProductProfileInput = z.infer<typeof ProductProfileInputSchema>;
export type ProductProfile = z.infer<typeof ProductProfileSchema>;
export type ProductContextVersion = z.infer<typeof ProductContextVersionSchema>;
export type ClaimWithSource = z.infer<typeof ClaimWithSourceSchema>;
export type AudienceBrief = z.infer<typeof AudienceBriefSchema>;
export type CampaignRunInput = z.infer<typeof CampaignRunInputSchema>;
export type CampaignRun = z.infer<typeof CampaignRunSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type ImageBrief = z.infer<typeof ImageBriefSchema>;
export type GeneratedAsset = z.infer<typeof GeneratedAssetSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
export type ProviderCall = z.infer<typeof ProviderCallSchema>;
export type ProviderError = z.infer<typeof ProviderErrorSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowWorkspace = z.infer<typeof WorkflowWorkspaceSchema>;
export type PromptVersion = z.infer<typeof PromptVersionSchema>;

