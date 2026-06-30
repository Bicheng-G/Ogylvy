import JSZip from "jszip";
import type { WorkflowWorkspace } from "@/lib/domain/schemas";
import { findRun, findContext } from "@/lib/workflow/engine";

export type ExportManifest = {
  runId: string;
  productName: string;
  contextVersionId: string;
  captions: Array<{ conceptId: string; title: string; caption: string }>;
  imagePrompts: Array<{
    imageBriefId: string;
    conceptId: string;
    prompt: string;
    negativePrompt: string;
    overlayText: unknown;
  }>;
  assets: Array<{
    assetId: string;
    imageBriefId: string;
    storagePath: string;
    imageUrl: string;
    metadata: unknown;
  }>;
  trace: {
    workflowSteps: WorkflowWorkspace["workflowSteps"];
    providerCalls: WorkflowWorkspace["providerCalls"];
    approvals: WorkflowWorkspace["approvals"];
  };
};

export function buildExportManifest(workspace: WorkflowWorkspace, runId: string): ExportManifest {
  const run = findRun(workspace, runId);
  const context = findContext(workspace, run.productContextVersionId);
  const concepts = workspace.concepts.filter((concept) => concept.runId === runId);
  const imageBriefs = workspace.imageBriefs.filter((brief) => brief.runId === runId);
  const assets = workspace.generatedAssets.filter((asset) => asset.runId === runId);

  return {
    runId,
    productName: context.profileSnapshot.name,
    contextVersionId: context.id,
    captions: concepts.map((concept) => ({
      conceptId: concept.id,
      title: concept.title,
      caption: concept.caption
    })),
    imagePrompts: imageBriefs.map((brief) => ({
      imageBriefId: brief.id,
      conceptId: brief.conceptId,
      prompt: brief.prompt,
      negativePrompt: brief.negativePrompt,
      overlayText: brief.overlayText
    })),
    assets: assets.map((asset) => ({
      assetId: asset.id,
      imageBriefId: asset.imageBriefId,
      storagePath: asset.storagePath,
      imageUrl: asset.imageUrl,
      metadata: asset.metadata
    })),
    trace: {
      workflowSteps: workspace.workflowSteps.filter((step) => step.runId === runId),
      providerCalls: workspace.providerCalls.filter((call) => call.runId === runId),
      approvals: workspace.approvals.filter((approval) => approval.runId === runId)
    }
  };
}

export function buildExportMarkdown(manifest: ExportManifest): string {
  const captions = manifest.captions
    .map((caption) => `## ${caption.title}\n\n${caption.caption}`)
    .join("\n\n");
  const prompts = manifest.imagePrompts
    .map(
      (brief) =>
        `## Image Brief ${brief.imageBriefId}\n\nPrompt:\n${brief.prompt}\n\nNegative prompt:\n${brief.negativePrompt}`
    )
    .join("\n\n");

  return [
    `# ${manifest.productName} Export Pack`,
    `Run: ${manifest.runId}`,
    `Context version: ${manifest.contextVersionId}`,
    "# Captions",
    captions,
    "# Image Prompts",
    prompts,
    "# Trace Summary",
    `Workflow steps: ${manifest.trace.workflowSteps.length}`,
    `Provider calls: ${manifest.trace.providerCalls.length}`,
    `Approvals: ${manifest.trace.approvals.length}`
  ].join("\n\n");
}

export async function buildExportZip(workspace: WorkflowWorkspace, runId: string): Promise<Blob> {
  const manifest = buildExportManifest(workspace, runId);
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("creative-brief.md", buildExportMarkdown(manifest));

  for (const asset of manifest.assets) {
    zip.file(`assets/${asset.assetId}.txt`, asset.imageUrl);
  }

  return zip.generateAsync({ type: "blob" });
}

