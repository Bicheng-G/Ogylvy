import OpenAI from "openai";
import type {
  AudienceBrief,
  Concept,
  GeneratedAsset,
  ImageBrief,
  ProviderCall
} from "@/lib/domain/schemas";
import {
  AudienceBriefSchema,
  ConceptSchema,
  GeneratedAssetSchema,
  ImageBriefSchema
} from "@/lib/domain/schemas";
import { nowIso, stableHash, stableId } from "@/lib/domain/ids";
import type {
  GenerateAssetsInput,
  GenerateBriefInput,
  GenerateConceptsInput,
  GenerateImageBriefsInput,
  MarketingProvider,
  ProviderResult
} from "@/lib/providers/types";
import { ProviderExecutionError } from "@/lib/providers/types";

type OpenAIProviderOptions = {
  apiKey: string;
  textModel?: string;
  imageModel?: string;
};

export class OpenAIMarketingProvider implements MarketingProvider {
  readonly providerName = "openai";
  readonly textModel: string;
  readonly imageModel: string;
  private readonly client: OpenAI;

  constructor(options: OpenAIProviderOptions) {
    if (!options.apiKey.trim()) {
      throw new Error("OPENAI_API_KEY is required when MARKETING_AGENT_AI_PROVIDER=openai.");
    }

    this.textModel = options.textModel?.trim() || "gpt-5.5";
    this.imageModel = options.imageModel?.trim() || "gpt-image-2";
    this.client = new OpenAI({ apiKey: options.apiKey });
  }

  async generateAudienceBrief(
    input: GenerateBriefInput
  ): Promise<ProviderResult<AudienceBrief>> {
    const prompt = [
      stableSystemInstructions(),
      "Task: Generate a marketing intelligence brief as strict JSON.",
      "Rules: preserve a provided target audience if present; classify every claim as provided, inferred, or needs_proof; do not invent proof.",
      `Run context: ${JSON.stringify({
        run: input.run,
        productContextVersion: input.contextVersion
      })}`
    ].join("\n\n");

    const started = performance.now();
    const response = await this.responsesJson(prompt, audienceBriefJsonSchema());
    const responseRecord = objectRecord(response, "Audience brief output must be a JSON object.");
    const output = AudienceBriefSchema.parse({
      ...responseRecord,
      id: stableId("brief", input.contextVersion.id, input.run.id),
      productContextVersionId: input.contextVersion.id,
      createdAt: nowIso()
    });

    return {
      output,
      call: this.providerCall(input.run.id, "generate-intelligence-brief", prompt, response, started)
    };
  }

  async generateConcepts(
    input: GenerateConceptsInput
  ): Promise<ProviderResult<{ concepts: Concept[] }>> {
    const prompt = [
      stableSystemInstructions(),
      "Task: Generate campaign concepts as strict JSON.",
      "Rules: each concept needs one promise, one visual idea, one proof element, one CTA, source-labeled claims, and approval_status pending.",
      `Run context: ${JSON.stringify({
        run: input.run,
        productContextVersion: input.contextVersion,
        brief: input.brief
      })}`
    ].join("\n\n");

    const started = performance.now();
    const response = await this.responsesJson(prompt, conceptListJsonSchema());
    const concepts = conceptArrayFrom(response).map((concept, index) =>
      ConceptSchema.parse({
        ...concept,
        id: stableId("concept", input.run.id, index, stringField(concept, "title")),
        runId: input.run.id,
        approvalStatus: "pending",
        createdAt: nowIso(),
        updatedAt: nowIso()
      })
    );

    return {
      output: { concepts },
      call: this.providerCall(input.run.id, "generate-concepts", prompt, response, started)
    };
  }

  async generateImageBriefs(
    input: GenerateImageBriefsInput
  ): Promise<ProviderResult<ImageBrief[]>> {
    const approvedConcepts = input.workspace.concepts.filter(
      (concept) => concept.runId === input.run.id && concept.approvalStatus === "approved"
    );
    const prompt = [
      stableSystemInstructions(),
      "Task: Convert approved marketing concepts into image generation briefs as strict JSON.",
      "Rules: produce one image brief per approved single-image concept, and one brief per carousel card if a carousel is required. Include negative prompts.",
      `Run context: ${JSON.stringify({
        run: input.run,
        productContextVersion: input.contextVersion,
        brief: input.brief,
        approvedConcepts
      })}`
    ].join("\n\n");

    const started = performance.now();
    const response = await this.responsesJson(prompt, imageBriefListJsonSchema());
    const briefs = imageBriefArrayFrom(response).map((brief, index) =>
      ImageBriefSchema.parse({
        ...brief,
        id: stableId("imgbrief", input.run.id, stringField(brief, "conceptId"), index),
        runId: input.run.id,
        cardIndex: numberField(brief, "cardIndex"),
        approvalStatus: "pending",
        createdAt: nowIso(),
        updatedAt: nowIso()
      })
    );

    return {
      output: briefs,
      call: this.providerCall(input.run.id, "generate-image-briefs", prompt, response, started)
    };
  }

  async generateAssets(input: GenerateAssetsInput): Promise<ProviderResult<GeneratedAsset[]>> {
    const started = performance.now();
    const assets: GeneratedAsset[] = [];

    for (const brief of input.approvedImageBriefs) {
      const imageResponse = await this.client.images.generate({
        model: this.imageModel,
        prompt: brief.prompt,
        size: imageSizeForRatio(brief.aspectRatio)
      } as Parameters<typeof this.client.images.generate>[0]);
      const imageUrl = extractImageDataUrl(imageResponse);
      assets.push(
        GeneratedAssetSchema.parse({
          id: stableId("asset", input.run.id, brief.id, stableHash(brief.prompt)),
          runId: input.run.id,
          imageBriefId: brief.id,
          provider: this.providerName,
          model: this.imageModel,
          storagePath: `openai/${input.run.id}/${brief.id}.png`,
          imageUrl,
          metadata: {
            width: 1080,
            height: brief.aspectRatio === "1:1" ? 1080 : 1350,
            promptHash: stableHash(brief.prompt),
            demoAsset: false
          },
          approvalStatus: "pending",
          createdAt: nowIso()
        })
      );
    }

    return {
      output: assets,
      call: this.providerCall(
        input.run.id,
        "generate-assets",
        JSON.stringify({ imageBriefIds: input.approvedImageBriefs.map((brief) => brief.id) }),
        { assetIds: assets.map((asset) => asset.id) },
        started
      )
    };
  }

  private async responsesJson(prompt: string, schema: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.responses.create({
        model: this.textModel,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "marketing_asset_agent_output",
            strict: true,
            schema
          }
        }
      } as Parameters<typeof this.client.responses.create>[0]);

      return JSON.parse(extractResponseText(response));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ProviderExecutionError({
          type: "OpenAIInvalidJson",
          message: error.message
        });
      }

      throw error;
    }
  }

  private providerCall(
    runId: string,
    stepKey: string,
    request: unknown,
    response: unknown,
    started: number
  ): ProviderCall {
    return {
      id: stableId("provider", runId, stepKey, stableHash(JSON.stringify(response))),
      runId,
      stepKey,
      provider: this.providerName,
      model: stepKey === "generate-assets" ? this.imageModel : this.textModel,
      request,
      response,
      latencyMs: Math.max(0, Math.round(performance.now() - started)),
      createdAt: nowIso()
    };
  }
}

function stableSystemInstructions(): string {
  return [
    "You are a senior marketing strategist and creative director.",
    "Produce inspectable intermediate artifacts for a human-gated marketing asset workflow.",
    "Fail by omission rather than inventing claims. Use explicit claim source labels.",
    "Do not include posting, scheduling, ad account, or social network publishing actions."
  ].join("\n");
}

function extractResponseText(response: unknown): string {
  const direct = response as { output_text?: unknown };
  if (typeof direct.output_text === "string" && direct.output_text.trim()) {
    return direct.output_text;
  }

  const nested = response as {
    output?: Array<{ content?: Array<{ text?: unknown; type?: unknown }> }>;
  };
  const text = nested.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => (typeof content.text === "string" ? content.text : ""))
    .join("")
    .trim();

  if (text) {
    return text;
  }

  throw new ProviderExecutionError({
    type: "OpenAIEmptyResponse",
    message: "OpenAI response did not include JSON output text.",
    responseBody: response
  });
}

function extractImageDataUrl(response: unknown): string {
  const data = response as { data?: Array<{ b64_json?: unknown; url?: unknown }> };
  const first = data.data?.[0];

  if (typeof first?.b64_json === "string" && first.b64_json.trim()) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  if (typeof first?.url === "string" && first.url.trim()) {
    return first.url;
  }

  throw new ProviderExecutionError({
    type: "OpenAIImageMissing",
    message: "OpenAI image response did not include b64_json or url.",
    responseBody: response
  });
}

function imageSizeForRatio(aspectRatio: string): "1024x1024" | "1024x1536" | "1536x1024" {
  if (aspectRatio === "1:1") {
    return "1024x1024";
  }

  if (aspectRatio === "16:9") {
    return "1536x1024";
  }

  return "1024x1536";
}

function conceptArrayFrom(response: unknown): Array<Record<string, unknown>> {
  const parsed = response as { concepts?: unknown };
  if (!Array.isArray(parsed.concepts)) {
    throw new ProviderExecutionError({
      type: "OpenAIShapeError",
      message: "Concept output did not include a concepts array.",
      responseBody: response
    });
  }

  return parsed.concepts as Array<Record<string, unknown>>;
}

function imageBriefArrayFrom(response: unknown): Array<Record<string, unknown>> {
  const parsed = response as { imageBriefs?: unknown };
  if (!Array.isArray(parsed.imageBriefs)) {
    throw new ProviderExecutionError({
      type: "OpenAIShapeError",
      message: "Image brief output did not include an imageBriefs array.",
      responseBody: response
    });
  }

  return parsed.imageBriefs as Array<Record<string, unknown>>;
}

function objectRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new ProviderExecutionError({
    type: "OpenAIShapeError",
    message,
    responseBody: value
  });
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  throw new ProviderExecutionError({
    type: "OpenAIShapeError",
    message: `OpenAI output field ${field} must be a non-empty string.`,
    responseBody: record
  });
}

function numberField(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new ProviderExecutionError({
    type: "OpenAIShapeError",
    message: `OpenAI output field ${field} must be a finite number.`,
    responseBody: record
  });
}

function sourceClaimSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["text", "source", "evidence"],
    properties: {
      text: { type: "string" },
      source: { type: "string", enum: ["provided", "inferred", "needs_proof"] },
      evidence: { type: "string" }
    }
  };
}

function audienceBriefJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "targetAudienceSummary",
      "targetAudienceSource",
      "audienceSegments",
      "painPoints",
      "useCases",
      "scenarios",
      "objections",
      "corePromises",
      "proofInventory",
      "claimRisks"
    ],
    properties: {
      targetAudienceSummary: { type: "string" },
      targetAudienceSource: { type: "string", enum: ["provided", "inferred", "needs_proof"] },
      audienceSegments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "description", "source", "confidence"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            source: { type: "string", enum: ["provided", "inferred", "needs_proof"] },
            confidence: { type: "number" }
          }
        }
      },
      painPoints: { type: "array", items: sourceClaimSchema() },
      useCases: { type: "array", items: sourceClaimSchema() },
      scenarios: { type: "array", items: sourceClaimSchema() },
      objections: { type: "array", items: sourceClaimSchema() },
      corePromises: { type: "array", items: sourceClaimSchema() },
      proofInventory: { type: "array", items: sourceClaimSchema() },
      claimRisks: { type: "array", items: sourceClaimSchema() }
    }
  };
}

function conceptListJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["concepts"],
    properties: {
      concepts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "angle",
            "caption",
            "assetFormat",
            "visualIdea",
            "proofElement",
            "cta",
            "rationale",
            "claimSources"
          ],
          properties: {
            title: { type: "string" },
            angle: { type: "string" },
            caption: { type: "string" },
            assetFormat: { type: "string", enum: ["single_image", "carousel"] },
            visualIdea: { type: "string" },
            proofElement: { type: "string" },
            cta: { type: "string" },
            rationale: { type: "string" },
            claimSources: { type: "array", items: sourceClaimSchema() }
          }
        }
      }
    }
  };
}

function imageBriefListJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["imageBriefs"],
    properties: {
      imageBriefs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "conceptId",
            "cardIndex",
            "aspectRatio",
            "prompt",
            "negativePrompt",
            "overlayText"
          ],
          properties: {
            conceptId: { type: "string" },
            cardIndex: { type: "number" },
            aspectRatio: { type: "string" },
            prompt: { type: "string" },
            negativePrompt: { type: "string" },
            overlayText: {
              type: "object",
              additionalProperties: false,
              required: ["headline", "subtext", "cta"],
              properties: {
                headline: { type: "string" },
                subtext: { type: "string" },
                cta: { type: "string" }
              }
            }
          }
        }
      }
    }
  };
}
