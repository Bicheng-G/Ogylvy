import { describe, expect, it } from "vitest";
import { createSeedWorkspace, ridePassContextVersion } from "@/lib/domain/fixtures";
import { ProductProfileInputSchema, type WorkflowWorkspace } from "@/lib/domain/schemas";
import { DemoMarketingProvider } from "@/lib/providers/demo-provider";
import {
  approveConcept,
  approveImageBrief,
  createCampaignRun,
  createProductProfile,
  currentRun,
  generateAssets,
  generateConcepts,
  generateImageBriefs,
  generateIntelligenceBrief,
  workflowTestClock
} from "@/lib/workflow/engine";
import { buildExportManifest } from "@/lib/export/export-pack";

describe("marketing workflow", () => {
  it("rejects a missing product description", () => {
    const result = ProductProfileInputSchema.safeParse({
      name: "Broken product",
      productDescription: "",
      market: "Singapore",
      constraints: [],
      proofPoints: [],
      prohibitedClaims: [],
      sampleReferences: []
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("This field is required.");
  });

  it("marks target audience as inferred when the user does not provide it", async () => {
    let workspace = createSeedWorkspace();
    workspace = createProductProfile(
      workspace,
      {
        name: "ClinicFlow",
        productDescription: "A scheduling assistant for clinics with repeated patient follow-ups.",
        targetAudience: "",
        market: "Singapore",
        brandVoice: "Clinical, calm, direct",
        constraints: [],
        proofPoints: ["Designed around recurring appointment follow-ups."],
        prohibitedClaims: ["Guaranteed reduction in waiting time."],
        sampleReferences: []
      },
      workflowTestClock
    );
    const context = workspace.contextVersions.at(-1);
    expect(context).toBeDefined();
    workspace = createCampaignRun(
      workspace,
      {
        productContextVersionId: context!.id,
        objective: "Generate awareness assets",
        channel: "LinkedIn",
        assetCount: 2,
        aspectRatios: ["4:5"],
        maxGenerationSpendCents: 500
      },
      workflowTestClock
    );
    const run = workspace.runs.at(-1);
    expect(run).toBeDefined();

    workspace = await generateIntelligenceBrief(workspace, run!.id, new DemoMarketingProvider());
    const brief = workspace.audienceBriefs.find(
      (candidate) => candidate.productContextVersionId === context!.id
    );

    expect(brief?.targetAudienceSource).toBe("inferred");
    expect(brief?.audienceSegments[0]?.confidence).toBeLessThan(0.8);
  });

  it("preserves a provided target audience", async () => {
    let workspace = createSeedWorkspace();
    workspace = createCampaignRun(
      workspace,
      {
        productContextVersionId: ridePassContextVersion.id,
        objective: "Collect prelaunch route submissions",
        channel: "Instagram",
        assetCount: 2,
        aspectRatios: ["4:5"],
        maxGenerationSpendCents: 500
      },
      workflowTestClock
    );
    const run = workspace.runs.at(-1);
    expect(run).toBeDefined();

    workspace = await generateIntelligenceBrief(workspace, run!.id, new DemoMarketingProvider());
    const brief = workspace.audienceBriefs
      .filter((candidate) => candidate.productContextVersionId === ridePassContextVersion.id)
      .at(-1);

    expect(brief?.targetAudienceSource).toBe("provided");
    expect(brief?.targetAudienceSummary).toContain("Working adults");
  });

  it("blocks image brief generation until at least one concept is approved", async () => {
    const workspace = createSeedWorkspace();
    const run = currentRun(workspace);

    await expect(generateImageBriefs(workspace, run.id, new DemoMarketingProvider())).rejects.toThrow(
      "Approve at least one concept before generating image briefs."
    );
  });

  it("records provider failures without creating fake assets", async () => {
    let workspace = await readyForAssetGeneration(createSeedWorkspace());
    const run = currentRun(workspace);

    workspace = await generateAssets(
      workspace,
      run.id,
      new DemoMarketingProvider({ failStage: "generate-assets" })
    );

    const failedStep = workspace.workflowSteps.find(
      (step) => step.stepKey === "generate-assets" && step.status === "failed"
    );
    const failedCall = workspace.providerCalls.find((call) => call.id === failedStep?.providerCallId);

    expect(failedStep?.error?.type).toBe("DemoProviderFailure");
    expect(failedCall?.error?.statusCode).toBe(503);
    expect(workspace.generatedAssets).toHaveLength(0);
  });

  it("exports captions, prompts, asset records, and trace", async () => {
    const workspace = await completeRun(createSeedWorkspace());
    const run = currentRun(workspace);
    const manifest = buildExportManifest(workspace, run.id);

    expect(manifest.captions.length).toBeGreaterThan(0);
    expect(manifest.imagePrompts.length).toBeGreaterThan(0);
    expect(manifest.assets.length).toBeGreaterThan(0);
    expect(manifest.trace.workflowSteps.length).toBeGreaterThan(0);
    expect(manifest.trace.providerCalls.length).toBeGreaterThan(0);
  });

  it("keeps concept content reproducible for the same context version", async () => {
    const first = await generatedConceptSignature(createSeedWorkspace());
    const second = await generatedConceptSignature(createSeedWorkspace());

    expect(first).toEqual(second);
  });
});

async function readyForAssetGeneration(workspace: WorkflowWorkspace): Promise<WorkflowWorkspace> {
  const run = currentRun(workspace);
  const firstConcept = workspace.concepts.find((concept) => concept.runId === run.id);
  expect(firstConcept).toBeDefined();
  workspace = approveConcept(workspace, run.id, firstConcept!.id, "approved");
  workspace = await generateImageBriefs(workspace, run.id, new DemoMarketingProvider());
  const firstBrief = workspace.imageBriefs.find((brief) => brief.runId === run.id);
  expect(firstBrief).toBeDefined();
  return approveImageBrief(workspace, run.id, firstBrief!.id, "approved");
}

async function completeRun(workspace: WorkflowWorkspace): Promise<WorkflowWorkspace> {
  const ready = await readyForAssetGeneration(workspace);
  return generateAssets(ready, currentRun(ready).id, new DemoMarketingProvider());
}

async function generatedConceptSignature(workspace: WorkflowWorkspace): Promise<string[]> {
  const run = currentRun(workspace);
  const withConcepts = await generateConcepts(workspace, run.id, new DemoMarketingProvider());
  return withConcepts.concepts
    .filter((concept) => concept.runId === run.id)
    .map((concept) =>
      [concept.title, concept.angle, concept.visualIdea, concept.proofElement, concept.cta].join("|")
    )
    .sort();
}
