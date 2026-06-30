import {
  CampaignRunInputSchema,
  ProductProfileInputSchema,
  type Approval,
  type CampaignRun,
  type CampaignRunInput,
  type ProductProfileInput,
  type ProviderCall,
  type WorkflowStep,
  type WorkflowWorkspace
} from "@/lib/domain/schemas";
import { FIXED_DEMO_TIME, nowIso, stableHash, stableId } from "@/lib/domain/ids";
import type { MarketingProvider, ProviderStage } from "@/lib/providers/types";
import { normalizeProviderError } from "@/lib/providers/types";

type WorkflowOptions = {
  now?: string;
};

export function createProductProfile(
  workspace: WorkflowWorkspace,
  input: ProductProfileInput,
  options: WorkflowOptions = {}
): WorkflowWorkspace {
  const parsed = ProductProfileInputSchema.parse(input);
  const timestamp = options.now ?? nowIso();
  const productId = stableId("product", parsed.name, parsed.productDescription, timestamp);
  const product = {
    ...parsed,
    id: productId,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const contextVersion = {
    id: stableId("ctx", productId, "1", stableHash(JSON.stringify(product))),
    productId,
    version: 1,
    profileSnapshot: product,
    sourceHash: stableHash(JSON.stringify(product)),
    createdAt: timestamp
  };

  return {
    ...workspace,
    products: [...workspace.products, product],
    contextVersions: [...workspace.contextVersions, contextVersion]
  };
}

export function createCampaignRun(
  workspace: WorkflowWorkspace,
  input: CampaignRunInput,
  options: WorkflowOptions = {}
): WorkflowWorkspace {
  const parsed = CampaignRunInputSchema.parse(input);
  const timestamp = options.now ?? nowIso();
  const contextVersion = required(
    workspace.contextVersions.find((context) => context.id === parsed.productContextVersionId),
    `Product context version not found: ${parsed.productContextVersionId}`
  );
  const run: CampaignRun = {
    ...parsed,
    id: stableId("run", parsed.productContextVersionId, parsed.objective, timestamp),
    status: "brief_pending",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const step: WorkflowStep = {
    id: stableId("step", run.id, "product-profile-snapshot"),
    runId: run.id,
    stage: "product_profile",
    stepKey: "product-profile-snapshot",
    status: "succeeded",
    input: { productContextVersionId: contextVersion.id },
    output: { productId: contextVersion.productId },
    createdAt: timestamp,
    startedAt: timestamp,
    completedAt: timestamp
  };

  return {
    ...workspace,
    runs: [...workspace.runs, run],
    workflowSteps: [...workspace.workflowSteps, step]
  };
}

export async function generateIntelligenceBrief(
  workspace: WorkflowWorkspace,
  runId: string,
  provider: MarketingProvider
): Promise<WorkflowWorkspace> {
  const run = findRun(workspace, runId);
  const contextVersion = findContext(workspace, run.productContextVersionId);
  const stepInput = { runId, productContextVersionId: contextVersion.id };

  try {
    const result = await provider.generateAudienceBrief({
      workspace,
      run,
      contextVersion
    });
    return appendSuccess(workspace, runId, "intelligence_brief", "generate-intelligence-brief", {
      input: stepInput,
      output: { audienceBriefId: result.output.id },
      providerCall: result.call,
      mutate: (current) => ({
        ...current,
        audienceBriefs: upsertById(current.audienceBriefs, result.output),
        runs: updateRunStatus(current.runs, runId, "concepts_pending")
      })
    });
  } catch (error) {
    return appendProviderFailure(
      workspace,
      runId,
      "intelligence_brief",
      "generate-intelligence-brief",
      provider,
      stepInput,
      error
    );
  }
}

export async function generateConcepts(
  workspace: WorkflowWorkspace,
  runId: string,
  provider: MarketingProvider
): Promise<WorkflowWorkspace> {
  const run = findRun(workspace, runId);
  const contextVersion = findContext(workspace, run.productContextVersionId);
  const brief = required(
    workspace.audienceBriefs.find(
      (candidate) => candidate.productContextVersionId === contextVersion.id
    ),
    "Generate an intelligence brief before generating concepts."
  );
  const stepInput = { runId, briefId: brief.id, assetCount: run.assetCount };

  try {
    const result = await provider.generateConcepts({
      workspace,
      run,
      contextVersion,
      brief
    });
    return appendSuccess(workspace, runId, "concepts", "generate-concepts", {
      input: stepInput,
      output: { conceptIds: result.output.concepts.map((concept) => concept.id) },
      providerCall: result.call,
      mutate: (current) => ({
        ...current,
        concepts: mergeById(current.concepts, result.output.concepts),
        runs: updateRunStatus(current.runs, runId, "concepts_pending_approval")
      })
    });
  } catch (error) {
    return appendProviderFailure(
      workspace,
      runId,
      "concepts",
      "generate-concepts",
      provider,
      stepInput,
      error
    );
  }
}

export function approveConcept(
  workspace: WorkflowWorkspace,
  runId: string,
  conceptId: string,
  status: "approved" | "rejected",
  note?: string
): WorkflowWorkspace {
  const timestamp = nowIso();
  const concept = required(
    workspace.concepts.find((candidate) => candidate.id === conceptId && candidate.runId === runId),
    `Concept not found for run: ${conceptId}`
  );
  const approval: Approval = {
    id: stableId("approval", runId, conceptId, status, timestamp),
    runId,
    entityType: "concept",
    entityId: concept.id,
    status,
    note,
    createdAt: timestamp
  };
  const approvedConcepts = workspace.concepts.filter(
    (candidate) =>
      candidate.runId === runId &&
      (candidate.id === conceptId ? status === "approved" : candidate.approvalStatus === "approved")
  );

  return {
    ...workspace,
    concepts: workspace.concepts.map((candidate) =>
      candidate.id === conceptId
        ? { ...candidate, approvalStatus: status, updatedAt: timestamp }
        : candidate
    ),
    approvals: [...workspace.approvals, approval],
    runs: updateRunStatus(
      workspace.runs,
      runId,
      approvedConcepts.length > 0 ? "image_briefs_ready" : "concepts_pending_approval"
    ),
    workflowSteps: [
      ...workspace.workflowSteps,
      {
        id: stableId("step", runId, "concept-approval", conceptId, status, timestamp),
        runId,
        stage: "concept_approval",
        stepKey: "approve-concept",
        status: "succeeded",
        input: { conceptId, status, note },
        output: { approvedConceptCount: approvedConcepts.length },
        createdAt: timestamp,
        startedAt: timestamp,
        completedAt: timestamp
      }
    ]
  };
}

export async function generateImageBriefs(
  workspace: WorkflowWorkspace,
  runId: string,
  provider: MarketingProvider
): Promise<WorkflowWorkspace> {
  const approvedConcepts = workspace.concepts.filter(
    (concept) => concept.runId === runId && concept.approvalStatus === "approved"
  );
  if (approvedConcepts.length === 0) {
    throw new Error("Approve at least one concept before generating image briefs.");
  }

  const run = findRun(workspace, runId);
  const contextVersion = findContext(workspace, run.productContextVersionId);
  const brief = required(
    workspace.audienceBriefs.find(
      (candidate) => candidate.productContextVersionId === contextVersion.id
    ),
    "Generate an intelligence brief before generating image briefs."
  );
  const stepInput = { runId, approvedConceptIds: approvedConcepts.map((concept) => concept.id) };

  try {
    const result = await provider.generateImageBriefs({
      workspace,
      run,
      contextVersion,
      brief
    });
    return appendSuccess(workspace, runId, "image_briefs", "generate-image-briefs", {
      input: stepInput,
      output: { imageBriefIds: result.output.map((briefOutput) => briefOutput.id) },
      providerCall: result.call,
      mutate: (current) => ({
        ...current,
        imageBriefs: mergeById(current.imageBriefs, result.output),
        runs: updateRunStatus(current.runs, runId, "image_briefs_pending_approval")
      })
    });
  } catch (error) {
    return appendProviderFailure(
      workspace,
      runId,
      "image_briefs",
      "generate-image-briefs",
      provider,
      stepInput,
      error
    );
  }
}

export function approveImageBrief(
  workspace: WorkflowWorkspace,
  runId: string,
  imageBriefId: string,
  status: "approved" | "rejected",
  note?: string
): WorkflowWorkspace {
  const timestamp = nowIso();
  const imageBrief = required(
    workspace.imageBriefs.find(
      (candidate) => candidate.id === imageBriefId && candidate.runId === runId
    ),
    `Image brief not found for run: ${imageBriefId}`
  );
  const approval: Approval = {
    id: stableId("approval", runId, imageBrief.id, status, timestamp),
    runId,
    entityType: "image_brief",
    entityId: imageBrief.id,
    status,
    note,
    createdAt: timestamp
  };
  const approvedBriefs = workspace.imageBriefs.filter(
    (candidate) =>
      candidate.runId === runId &&
      (candidate.id === imageBriefId
        ? status === "approved"
        : candidate.approvalStatus === "approved")
  );

  return {
    ...workspace,
    imageBriefs: workspace.imageBriefs.map((candidate) =>
      candidate.id === imageBriefId
        ? { ...candidate, approvalStatus: status, updatedAt: timestamp }
        : candidate
    ),
    approvals: [...workspace.approvals, approval],
    runs: updateRunStatus(
      workspace.runs,
      runId,
      approvedBriefs.length > 0 ? "assets_ready" : "image_briefs_pending_approval"
    ),
    workflowSteps: [
      ...workspace.workflowSteps,
      {
        id: stableId("step", runId, "image-brief-approval", imageBriefId, status, timestamp),
        runId,
        stage: "image_approval",
        stepKey: "approve-image-brief",
        status: "succeeded",
        input: { imageBriefId, status, note },
        output: { approvedImageBriefCount: approvedBriefs.length },
        createdAt: timestamp,
        startedAt: timestamp,
        completedAt: timestamp
      }
    ]
  };
}

export async function generateAssets(
  workspace: WorkflowWorkspace,
  runId: string,
  provider: MarketingProvider
): Promise<WorkflowWorkspace> {
  const approvedImageBriefs = workspace.imageBriefs.filter(
    (brief) => brief.runId === runId && brief.approvalStatus === "approved"
  );
  if (approvedImageBriefs.length === 0) {
    throw new Error("Approve at least one image brief before generating assets.");
  }

  const run = findRun(workspace, runId);
  const contextVersion = findContext(workspace, run.productContextVersionId);
  const stepInput = { runId, approvedImageBriefIds: approvedImageBriefs.map((brief) => brief.id) };

  try {
    const result = await provider.generateAssets({
      workspace,
      run,
      contextVersion,
      approvedImageBriefs
    });
    return appendSuccess(workspace, runId, "asset_generation", "generate-assets", {
      input: stepInput,
      output: { assetIds: result.output.map((asset) => asset.id) },
      providerCall: result.call,
      mutate: (current) => ({
        ...current,
        generatedAssets: mergeById(current.generatedAssets, result.output),
        runs: updateRunStatus(current.runs, runId, "assets_generated")
      })
    });
  } catch (error) {
    return appendProviderFailure(
      workspace,
      runId,
      "asset_generation",
      "generate-assets",
      provider,
      stepInput,
      error
    );
  }
}

export function currentRun(workspace: WorkflowWorkspace): CampaignRun {
  return required(workspace.runs[0], "No campaign run exists in the workspace.");
}

export function findRun(workspace: WorkflowWorkspace, runId: string): CampaignRun {
  return required(
    workspace.runs.find((run) => run.id === runId),
    `Campaign run not found: ${runId}`
  );
}

export function findContext(workspace: WorkflowWorkspace, contextVersionId: string) {
  return required(
    workspace.contextVersions.find((context) => context.id === contextVersionId),
    `Product context version not found: ${contextVersionId}`
  );
}

function appendSuccess(
  workspace: WorkflowWorkspace,
  runId: string,
  stage: WorkflowStep["stage"],
  stepKey: ProviderStage,
  options: {
    input: unknown;
    output: unknown;
    providerCall: ProviderCall;
    mutate: (workspace: WorkflowWorkspace) => WorkflowWorkspace;
  }
): WorkflowWorkspace {
  const timestamp = nowIso();
  const mutated = options.mutate(workspace);
  const step: WorkflowStep = {
    id: stableId("step", runId, stepKey, mutated.workflowSteps.length, timestamp),
    runId,
    stage,
    stepKey,
    status: "succeeded",
    input: options.input,
    output: options.output,
    providerCallId: options.providerCall.id,
    createdAt: timestamp,
    startedAt: timestamp,
    completedAt: timestamp
  };

  return {
    ...mutated,
    providerCalls: [...mutated.providerCalls, options.providerCall],
    workflowSteps: [...mutated.workflowSteps, step]
  };
}

function appendProviderFailure(
  workspace: WorkflowWorkspace,
  runId: string,
  stage: WorkflowStep["stage"],
  stepKey: ProviderStage,
  provider: MarketingProvider,
  input: unknown,
  error: unknown
): WorkflowWorkspace {
  const timestamp = nowIso();
  const providerError = normalizeProviderError(error);
  const providerCall: ProviderCall = {
    id: stableId("provider", runId, stepKey, "failed", workspace.providerCalls.length, timestamp),
    runId,
    stepKey,
    provider: provider.providerName,
    model: stepKey === "generate-assets" ? provider.imageModel : provider.textModel,
    request: input,
    error: providerError,
    createdAt: timestamp
  };
  const step: WorkflowStep = {
    id: stableId("step", runId, stepKey, "failed", workspace.workflowSteps.length, timestamp),
    runId,
    stage,
    stepKey,
    status: "failed",
    input,
    error: providerError,
    providerCallId: providerCall.id,
    createdAt: timestamp,
    startedAt: timestamp,
    completedAt: timestamp
  };

  return {
    ...workspace,
    runs: updateRunStatus(workspace.runs, runId, `${stage}_failed`),
    providerCalls: [...workspace.providerCalls, providerCall],
    workflowSteps: [...workspace.workflowSteps, step]
  };
}

function updateRunStatus(runs: CampaignRun[], runId: string, status: string): CampaignRun[] {
  const timestamp = nowIso();
  return runs.map((run) => (run.id === runId ? { ...run, status, updatedAt: timestamp } : run));
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const exists = items.some((candidate) => candidate.id === item.id);
  if (!exists) {
    return [...items, item];
  }

  return items.map((candidate) => (candidate.id === item.id ? item : candidate));
}

function mergeById<T extends { id: string }>(items: T[], incoming: T[]): T[] {
  return incoming.reduce((current, item) => upsertById(current, item), items);
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export const workflowTestClock = {
  now: FIXED_DEMO_TIME
};
