import type { WorkflowWorkspace } from "@/lib/domain/schemas";
import { DemoMarketingProvider } from "@/lib/providers/demo-provider";
import type { MarketingProvider } from "@/lib/providers/types";
import {
  generateAssets,
  generateConcepts,
  generateImageBriefs,
  generateIntelligenceBrief
} from "@/lib/workflow/engine";

export type MarketingWorkflowTask =
  | "generate-intelligence-brief"
  | "generate-concepts"
  | "generate-image-briefs"
  | "generate-assets";

export type MarketingWorkflowTaskInput = {
  task: MarketingWorkflowTask;
  runId: string;
  workspace: WorkflowWorkspace;
};

export async function runMarketingWorkflowTask(
  input: MarketingWorkflowTaskInput,
  provider: MarketingProvider = new DemoMarketingProvider()
): Promise<WorkflowWorkspace> {
  if (input.task === "generate-intelligence-brief") {
    return generateIntelligenceBrief(input.workspace, input.runId, provider);
  }

  if (input.task === "generate-concepts") {
    return generateConcepts(input.workspace, input.runId, provider);
  }

  if (input.task === "generate-image-briefs") {
    return generateImageBriefs(input.workspace, input.runId, provider);
  }

  if (input.task === "generate-assets") {
    return generateAssets(input.workspace, input.runId, provider);
  }

  const exhaustive: never = input.task;
  throw new Error(`Unsupported marketing workflow task: ${exhaustive}`);
}

