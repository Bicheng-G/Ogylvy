import type {
  AudienceBrief,
  CampaignRun,
  ClaimWithSource,
  Concept,
  GeneratedAsset,
  ImageBrief,
  ProductContextVersion,
  ProviderCall,
  WorkflowWorkspace
} from "@/lib/domain/schemas";
import { FIXED_DEMO_TIME, stableHash, stableId } from "@/lib/domain/ids";
import type {
  GenerateAssetsInput,
  GenerateBriefInput,
  GenerateConceptsInput,
  GenerateImageBriefsInput,
  MarketingProvider,
  ProviderResult
} from "@/lib/providers/types";
import { ProviderExecutionError } from "@/lib/providers/types";

type DemoProviderOptions = {
  failStage?: string;
};

export class DemoMarketingProvider implements MarketingProvider {
  readonly providerName = "demo";
  readonly textModel = "deterministic-marketing-provider";
  readonly imageModel = "deterministic-svg-image-generator";
  private readonly failStage?: string;

  constructor(options: DemoProviderOptions = {}) {
    this.failStage = options.failStage;
  }

  async generateAudienceBrief(
    input: GenerateBriefInput
  ): Promise<ProviderResult<AudienceBrief>> {
    this.assertStageAvailable("generate-intelligence-brief");
    const profile = input.contextVersion.profileSnapshot;
    const providedAudience = profile.targetAudience?.trim();
    const audienceSource = providedAudience ? "provided" : "inferred";
    const audienceSummary =
      providedAudience ||
      `Likely buyers for ${profile.name}: people in ${profile.market} who feel the product problem frequently enough to respond to practical proof-led marketing.`;

    const proofInventory = profile.proofPoints.map<ClaimWithSource>((proof) => ({
      text: proof,
      source: "provided",
      evidence: "Product profile proof point"
    }));

    const brief: AudienceBrief = {
      id: stableId("brief", input.contextVersion.id, input.run.id),
      productContextVersionId: input.contextVersion.id,
      targetAudienceSummary: audienceSummary,
      targetAudienceSource: audienceSource,
      audienceSegments: [
        {
          name: audienceSource === "provided" ? "Provided target audience" : "Inferred primary audience",
          description: audienceSummary,
          source: audienceSource,
          confidence: audienceSource === "provided" ? 0.95 : 0.68
        }
      ],
      painPoints: [
        {
          text: `The audience needs ${profile.name} to solve a repeated, costly, or frustrating workflow rather than a one-off curiosity.`,
          source: "inferred",
          evidence: "Inferred from the product description and campaign objective"
        },
        {
          text: "Any unsupported performance, availability, pricing, or superiority claim requires proof before use.",
          source: "needs_proof",
          evidence: "Conservative marketing-claims policy"
        }
      ],
      useCases: [
        {
          text: `Use ${profile.name} when the buyer needs the outcome described in the product profile: ${profile.productDescription}`,
          source: "provided",
          evidence: "Product description"
        }
      ],
      scenarios: [
        {
          text: `A realistic ${profile.market} buyer compares the current way of solving the problem with a simpler planned approach from ${profile.name}.`,
          source: "inferred",
          evidence: "Scenario inferred from market and positioning"
        }
      ],
      objections: [
        {
          text: "The audience may question whether the product is available, trustworthy, or proven enough for their situation.",
          source: "inferred",
          evidence: "Common objection for pre-purchase marketing"
        }
      ],
      corePromises: [
        {
          text: this.firstProofOrPromise(profile),
          source: profile.proofPoints.length > 0 ? "provided" : "inferred",
          evidence:
            profile.proofPoints.length > 0
              ? "First proof point in product profile"
              : "Promise inferred from product description"
        }
      ],
      proofInventory,
      claimRisks: profile.prohibitedClaims.map<ClaimWithSource>((claim) => ({
        text: claim,
        source: "provided",
        evidence: "Product profile prohibited claim"
      })),
      createdAt: FIXED_DEMO_TIME
    };

    return {
      output: brief,
      call: this.providerCall(input.workspace, input.run, "generate-intelligence-brief", {
        request: { productContextVersionId: input.contextVersion.id },
        response: { audienceBriefId: brief.id },
        tokenInput: 980,
        tokenOutput: 860,
        latencyMs: 38
      })
    };
  }

  async generateConcepts(
    input: GenerateConceptsInput
  ): Promise<ProviderResult<{ concepts: Concept[] }>> {
    this.assertStageAvailable("generate-concepts");
    const profile = input.contextVersion.profileSnapshot;
    const concepts = [
      this.concept(input.run, profile.name, 0, {
        title: "Make the repeated problem feel solved before the day starts.",
        angle: "Turn routine anxiety into a clear promise of preparation.",
        visualIdea:
          "A composed morning scene with one proof card showing the recurring plan and the product name clearly.",
        proofElement: "A visible plan card built from provided product proof points.",
        cta: "Start your first campaign run.",
        rationale:
          "Lead with a specific outcome and proof element before visual style."
      }),
      this.concept(input.run, profile.name, 1, {
        title: "Show the old way beside the planned way.",
        angle: "Contrast makes the value proposition concrete without unsupported claims.",
        visualIdea:
          "A split composition: left side shows scattered decisions, right side shows a clean plan summary.",
        proofElement: "Before/after list using only provided or inferred claims with source labels.",
        cta: "Review the plan and approve the prompt.",
        rationale:
          "Useful for ads because the buyer can understand the promise in one glance."
      }),
      this.concept(input.run, profile.name, 2, {
        title: "The proof card is the hero.",
        angle: "Use one visual proof element instead of a vague aspirational scene.",
        visualIdea:
          "A premium poster centered on a product-specific proof card, supported by a calm human context.",
        proofElement: this.firstProofOrPromise(profile),
        cta: "Generate the asset pack.",
        rationale:
          "Keeps the creative grounded in inspectable product evidence."
      })
    ].slice(0, input.run.assetCount);

    return {
      output: { concepts },
      call: this.providerCall(input.workspace, input.run, "generate-concepts", {
        request: {
          runId: input.run.id,
          briefId: input.brief.id,
          requestedConcepts: input.run.assetCount
        },
        response: { conceptIds: concepts.map((concept) => concept.id) },
        tokenInput: 1480,
        tokenOutput: 1250,
        latencyMs: 44
      })
    };
  }

  async generateImageBriefs(
    input: GenerateImageBriefsInput
  ): Promise<ProviderResult<ImageBrief[]>> {
    this.assertStageAvailable("generate-image-briefs");
    const approvedConcepts = input.workspace.concepts.filter(
      (concept) => concept.runId === input.run.id && concept.approvalStatus === "approved"
    );
    const aspectRatio = input.run.aspectRatios[0];
    if (!aspectRatio) {
      throw new Error("Campaign run must include at least one aspect ratio before image briefs.");
    }

    const imageBriefs = approvedConcepts.map<ImageBrief>((concept, index) => ({
      id: stableId("imgbrief", input.run.id, concept.id, index),
      runId: input.run.id,
      conceptId: concept.id,
      cardIndex: 0,
      aspectRatio,
      prompt: [
        `Create a marketing poster for ${input.contextVersion.profileSnapshot.name}.`,
        `Concept: ${concept.title}.`,
        `Visual idea: ${concept.visualIdea}.`,
        `Proof element: ${concept.proofElement}.`,
        `Market context: ${input.contextVersion.profileSnapshot.market}.`,
        "Use code-native export metadata for captions; in-image text should be limited to the approved overlay text."
      ].join(" "),
      negativePrompt:
        "Do not include social network logos, fake pricing, unsupported performance claims, watermarks, cluttered UI, or publishing/scheduling controls.",
      overlayText: {
        headline: concept.title,
        subtext: concept.angle,
        cta: concept.cta
      },
      approvalStatus: "pending",
      createdAt: FIXED_DEMO_TIME,
      updatedAt: FIXED_DEMO_TIME
    }));

    return {
      output: imageBriefs,
      call: this.providerCall(input.workspace, input.run, "generate-image-briefs", {
        request: { approvedConceptIds: approvedConcepts.map((concept) => concept.id) },
        response: { imageBriefIds: imageBriefs.map((brief) => brief.id) },
        tokenInput: 920,
        tokenOutput: 760,
        latencyMs: 33
      })
    };
  }

  async generateAssets(
    input: GenerateAssetsInput
  ): Promise<ProviderResult<GeneratedAsset[]>> {
    this.assertStageAvailable("generate-assets");
    const assets = input.approvedImageBriefs.map<GeneratedAsset>((brief) => {
      const promptHash = stableHash(brief.prompt);
      return {
        id: stableId("asset", input.run.id, brief.id, promptHash),
        runId: input.run.id,
        imageBriefId: brief.id,
        provider: this.providerName,
        model: this.imageModel,
        storagePath: `demo/${input.run.id}/${brief.id}.svg`,
        imageUrl: svgDataUri(brief.overlayText.headline, brief.overlayText.subtext, brief.overlayText.cta),
        metadata: {
          width: 1080,
          height: 1350,
          promptHash,
          demoAsset: true
        },
        approvalStatus: "pending",
        createdAt: FIXED_DEMO_TIME
      };
    });

    return {
      output: assets,
      call: this.providerCall(input.workspace, input.run, "generate-assets", {
        request: { imageBriefIds: input.approvedImageBriefs.map((brief) => brief.id) },
        response: { assetIds: assets.map((asset) => asset.id) },
        tokenInput: 0,
        tokenOutput: 0,
        latencyMs: 58
      })
    };
  }

  private assertStageAvailable(stage: string): void {
    if (this.failStage === stage) {
      throw new ProviderExecutionError({
        type: "DemoProviderFailure",
        message: `Configured demo failure for ${stage}.`,
        statusCode: 503,
        responseBody: { stage, provider: this.providerName }
      });
    }
  }

  private concept(
    run: CampaignRun,
    productName: string,
    index: number,
    input: Pick<Concept, "title" | "angle" | "visualIdea" | "proofElement" | "cta" | "rationale">
  ): Concept {
    return {
      id: stableId("concept", run.id, productName, index, input.title),
      runId: run.id,
      title: input.title,
      angle: input.angle,
      caption: `${input.title}\n\n${productName} turns product context into a traceable marketing asset workflow. Review the brief, approve the concept, then generate the asset pack.`,
      assetFormat: index === 2 ? "carousel" : "single_image",
      visualIdea: input.visualIdea,
      proofElement: input.proofElement,
      cta: input.cta,
      rationale: input.rationale,
      claimSources: [
        {
          text: productName,
          source: "provided",
          evidence: "Product profile name"
        },
        {
          text: input.angle,
          source: "inferred",
          evidence: "Creative strategy generated from approved product context"
        }
      ],
      approvalStatus: "pending",
      createdAt: FIXED_DEMO_TIME,
      updatedAt: FIXED_DEMO_TIME
    };
  }

  private firstProofOrPromise(profile: ProductContextVersion["profileSnapshot"]): string {
    const firstProof = profile.proofPoints[0]?.trim();
    if (firstProof) {
      return firstProof;
    }

    return `A clearer way to communicate ${profile.name} from the provided product description.`;
  }

  private providerCall(
    workspace: WorkflowWorkspace,
    run: CampaignRun,
    stepKey: string,
    input: {
      request: unknown;
      response: unknown;
      tokenInput: number;
      tokenOutput: number;
      latencyMs: number;
    }
  ): ProviderCall {
    return {
      id: stableId("provider", run.id, stepKey, workspace.providerCalls.length),
      runId: run.id,
      stepKey,
      provider: this.providerName,
      model: stepKey === "generate-assets" ? this.imageModel : this.textModel,
      promptVersionId: promptVersionIdFor(stepKey),
      request: input.request,
      response: input.response,
      tokenInput: input.tokenInput,
      tokenOutput: input.tokenOutput,
      estimatedCostCents: 0,
      latencyMs: input.latencyMs,
      createdAt: FIXED_DEMO_TIME
    };
  }
}

function promptVersionIdFor(stepKey: string): string {
  if (stepKey === "generate-intelligence-brief") {
    return "prompt_intelligence_v1";
  }

  if (stepKey === "generate-concepts") {
    return "prompt_concepts_v1";
  }

  if (stepKey === "generate-image-briefs") {
    return "prompt_image_briefs_v1";
  }

  return "prompt_image_generation_v1";
}

function svgDataUri(headline: string, subtext: string, cta: string): string {
  const headlineLines = wrapSvgText(headline, 30, 2);
  const subtextLines = wrapSvgText(subtext, 48, 2);
  const bodyLines = wrapSvgText("Traceable creative, approved before generation.", 32, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <rect width="1080" height="1350" fill="#f8faf8"/>
  <rect x="72" y="78" width="936" height="1194" rx="34" fill="#ffffff" stroke="#d7ded5" stroke-width="3"/>
  <rect x="118" y="118" width="844" height="258" rx="28" fill="#114b43"/>
  ${svgTextLines(headlineLines, 162, 200, 48, 56, "#ffffff", "700")}
  ${svgTextLines(subtextLines, 162, 304, 28, 36, "#d6f2df", "500")}
  <rect x="122" y="462" width="836" height="434" rx="28" fill="#f1f6f0"/>
  <circle cx="260" cy="664" r="88" fill="#f06d5e" opacity="0.88"/>
  <rect x="392" y="562" width="402" height="58" rx="16" fill="#ffffff" stroke="#b8c7bb"/>
  <rect x="392" y="648" width="310" height="58" rx="16" fill="#ffffff" stroke="#b8c7bb"/>
  <rect x="392" y="734" width="462" height="58" rx="16" fill="#ffffff" stroke="#b8c7bb"/>
  ${svgTextLines(bodyLines, 146, 994, 44, 54, "#17211d", "700")}
  <text x="146" y="1080" fill="#4d5b53" font-size="34" font-family="Arial, sans-serif">${escapeXml(cta).slice(0, 72)}</text>
  <rect x="146" y="1152" width="250" height="70" rx="18" fill="#f06d5e"/>
  <text x="178" y="1198" fill="#ffffff" font-size="30" font-family="Arial, sans-serif" font-weight="700">Export pack</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapSvgText(input: string, maxChars: number, maxLines: number): string[] {
  const words = input.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;

    if (lines.length === maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  const consumedWordCount = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (consumedWordCount < words.length && lines.length > 0) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex].replace(/[.,;:!?]*$/, "")}...`;
  }

  return lines;
}

function svgTextLines(
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  fill: string,
  weight: string
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="${weight}">${escapeXml(line)}</text>`
    )
    .join("\n  ");
}
