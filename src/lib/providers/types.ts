import type {
  AudienceBrief,
  CampaignRun,
  GeneratedAsset,
  ImageBrief,
  ProductContextVersion,
  ProviderCall,
  ProviderError,
  WorkflowWorkspace
} from "@/lib/domain/schemas";

export type ProviderStage =
  | "generate-intelligence-brief"
  | "generate-concepts"
  | "generate-image-briefs"
  | "generate-assets";

export type ProviderResult<T> = {
  output: T;
  call: ProviderCall;
};

export type GenerateBriefInput = {
  workspace: WorkflowWorkspace;
  contextVersion: ProductContextVersion;
  run: CampaignRun;
};

export type GenerateConceptsInput = GenerateBriefInput & {
  brief: AudienceBrief;
};

export type GenerateImageBriefsInput = GenerateConceptsInput;

export type GenerateAssetsInput = GenerateBriefInput & {
  approvedImageBriefs: ImageBrief[];
};

export interface MarketingProvider {
  readonly providerName: string;
  readonly textModel: string;
  readonly imageModel: string;
  generateAudienceBrief(input: GenerateBriefInput): Promise<ProviderResult<AudienceBrief>>;
  generateConcepts(
    input: GenerateConceptsInput
  ): Promise<ProviderResult<GenerateConceptsResult>>;
  generateImageBriefs(
    input: GenerateImageBriefsInput
  ): Promise<ProviderResult<ImageBrief[]>>;
  generateAssets(input: GenerateAssetsInput): Promise<ProviderResult<GeneratedAsset[]>>;
}

export type GenerateConceptsResult = {
  concepts: Array<import("@/lib/domain/schemas").Concept>;
};

export class ProviderExecutionError extends Error {
  readonly providerError: ProviderError;

  constructor(providerError: ProviderError) {
    super(providerError.message);
    this.name = "ProviderExecutionError";
    this.providerError = providerError;
  }
}

export function normalizeProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderExecutionError) {
    return error.providerError;
  }

  if (error instanceof Error) {
    return {
      type: error.name || "ProviderError",
      message: error.message
    };
  }

  return {
    type: "UnknownProviderError",
    message: "Provider failed with a non-Error value.",
    responseBody: error
  };
}

