import type {
  AudienceBrief,
  CampaignRun,
  Concept,
  ProductContextVersion,
  ProductProfile,
  PromptVersion,
  WorkflowWorkspace
} from "@/lib/domain/schemas";
import { FIXED_DEMO_TIME, stableHash, stableId } from "@/lib/domain/ids";

export const ridePassProduct: ProductProfile = {
  id: "product_ridepass",
  name: "RidePass Commuter Plan",
  productDescription:
    "RidePass is a prelaunch Singapore commute service for people with regular fixed routes and timings. It turns repeated weekday, school, or medical appointment trips into a planned monthly commute arrangement.",
  targetAudience:
    "Working adults, students, parents, and outpatient patients in Singapore with fixed recurring commute needs.",
  market: "Singapore",
  brandVoice: "Direct, calm, practical, Ogilvy-style promise-first advertising.",
  constraints: [
    "Do not position RidePass as ride-hailing.",
    "Do not promise live route coverage until launch areas are confirmed.",
    "Avoid contract or stamp-card creative metaphors."
  ],
  proofPoints: [
    "Designed for repeated routes and fixed timings.",
    "Prelaunch users submit route and timing for rollout prioritisation.",
    "Monthly commute planning is the core offer."
  ],
  prohibitedClaims: [
    "Guaranteed cheaper than all alternatives.",
    "Instant availability everywhere in Singapore.",
    "Confirmed driver assignment before operations are live."
  ],
  sampleReferences: [
    "skills/example_post_concept_skill.md",
    "docs/example/manual_process_example.md"
  ],
  createdAt: FIXED_DEMO_TIME,
  updatedAt: FIXED_DEMO_TIME
};

export const ridePassContextVersion: ProductContextVersion = {
  id: "ctx_ridepass_v1",
  productId: ridePassProduct.id,
  version: 1,
  profileSnapshot: ridePassProduct,
  sourceHash: stableHash(JSON.stringify(ridePassProduct)),
  createdAt: FIXED_DEMO_TIME
};

export const seedPromptVersions: PromptVersion[] = [
  {
    id: "prompt_intelligence_v1",
    promptKey: "marketing-intelligence-brief",
    version: "1.0.0",
    model: "gpt-5.5",
    hash: stableHash("marketing-intelligence-brief:1.0.0:gpt-5.5"),
    body: "Generate a typed marketing intelligence brief. Preserve provided audience details and classify all claims by source.",
    createdAt: FIXED_DEMO_TIME
  },
  {
    id: "prompt_concepts_v1",
    promptKey: "post-concepts",
    version: "1.0.0",
    model: "gpt-5.5",
    hash: stableHash("post-concepts:1.0.0:gpt-5.5"),
    body: "Generate Ogilvy-style post concepts with one promise, one visual idea, one proof element, and one CTA.",
    createdAt: FIXED_DEMO_TIME
  },
  {
    id: "prompt_image_briefs_v1",
    promptKey: "image-briefs",
    version: "1.0.0",
    model: "gpt-5.5",
    hash: stableHash("image-briefs:1.0.0:gpt-5.5"),
    body: "Convert approved concepts into structured image generation prompts with overlay text and negative instructions.",
    createdAt: FIXED_DEMO_TIME
  }
];

export const seedAudienceBrief: AudienceBrief = {
  id: "brief_ridepass_v1",
  productContextVersionId: ridePassContextVersion.id,
  targetAudienceSummary:
    "Singapore commuters with recurring fixed route and timing needs, including office workers, students, parents, and outpatient appointment travellers.",
  targetAudienceSource: "provided",
  audienceSegments: [
    {
      name: "Weekday office commuters",
      description: "People repeating the same home-to-work route during weekday peak windows.",
      source: "provided",
      confidence: 0.92
    },
    {
      name: "Fixed appointment travellers",
      description: "People with recurring weekly medical or therapy appointments at fixed times.",
      source: "provided",
      confidence: 0.84
    }
  ],
  painPoints: [
    {
      text: "Repeated trips still require daily booking decisions.",
      source: "inferred",
      evidence: "Inferred from fixed-route commute positioning."
    },
    {
      text: "Prelaunch availability must be communicated carefully.",
      source: "needs_proof",
      evidence: "Launch areas are not confirmed in the product profile."
    }
  ],
  useCases: [
    {
      text: "Recurring weekday home-to-office commute planning.",
      source: "provided",
      evidence: "Product profile explicitly mentions repeated weekday routes."
    },
    {
      text: "Recurring outpatient appointments with fixed schedule.",
      source: "provided",
      evidence: "User supplied outpatient appointment scenario."
    }
  ],
  scenarios: [
    {
      text: "A commuter wakes up knowing the route and pickup timing are already planned.",
      source: "inferred",
      evidence: "Derived from monthly planned commute promise."
    }
  ],
  objections: [
    {
      text: "Users may wonder whether RidePass is available in their exact area.",
      source: "needs_proof",
      evidence: "Prelaunch status means availability is not guaranteed."
    }
  ],
  corePromises: [
    {
      text: "Turn repeated routes into a planned monthly commute.",
      source: "provided",
      evidence: "Core product description."
    }
  ],
  proofInventory: [
    {
      text: "Route and timing submission for rollout prioritisation.",
      source: "provided",
      evidence: "Product proof point."
    }
  ],
  claimRisks: [
    {
      text: "Do not claim confirmed islandwide service.",
      source: "provided",
      evidence: "Product prohibited claims."
    }
  ],
  createdAt: FIXED_DEMO_TIME
};

export const seedRun: CampaignRun = {
  id: "run_ridepass_demo",
  productContextVersionId: ridePassContextVersion.id,
  objective: "Collect prelaunch route submissions",
  channel: "Instagram/Facebook feed",
  assetCount: 3,
  audienceOverride: "",
  tone: "Direct, calm, emotionally concrete",
  aspectRatios: ["4:5", "1:1"],
  maxGenerationSpendCents: 1200,
  status: "concepts_pending_approval",
  createdAt: FIXED_DEMO_TIME,
  updatedAt: FIXED_DEMO_TIME
};

export const seedConcepts: Concept[] = [
  {
    id: stableId("concept", seedRun.id, "same-route"),
    runId: seedRun.id,
    title: "Same route. Same time. Same peace.",
    angle: "Predictability as the emotional benefit of a commute plan.",
    caption:
      "If your route and timing are fixed, your ride should feel fixed too.\n\nRidePass is building planned weekday commutes for Singapore routines. Share your route and timing for prelaunch access.",
    assetFormat: "single_image",
    visualIdea:
      "A clean morning scene with a calm commuter beside a simple weekly plan card showing weekday chips and a fixed pickup window.",
    proofElement: "Weekly plan card with Mon-Fri chips, fixed pickup window, and monthly plan label.",
    cta: "Share your route to get early access.",
    rationale:
      "Uses one concrete promise and a visible proof card to avoid vague mobility language.",
    claimSources: [
      {
        text: "Fixed recurring routes and timings",
        source: "provided",
        evidence: "Product description"
      },
      {
        text: "Emotional calm from predictability",
        source: "inferred",
        evidence: "Strategic interpretation of planned commute benefit"
      }
    ],
    approvalStatus: "pending",
    createdAt: FIXED_DEMO_TIME,
    updatedAt: FIXED_DEMO_TIME
  }
];

export function createSeedWorkspace(): WorkflowWorkspace {
  return {
    products: [ridePassProduct],
    contextVersions: [ridePassContextVersion],
    audienceBriefs: [seedAudienceBrief],
    runs: [seedRun],
    concepts: seedConcepts,
    imageBriefs: [],
    generatedAssets: [],
    approvals: [],
    workflowSteps: [
      {
        id: "step_seed_profile",
        runId: seedRun.id,
        stage: "product_profile",
        stepKey: "product-profile-snapshot",
        status: "succeeded",
        input: { productId: ridePassProduct.id },
        output: { contextVersionId: ridePassContextVersion.id },
        createdAt: FIXED_DEMO_TIME,
        startedAt: FIXED_DEMO_TIME,
        completedAt: FIXED_DEMO_TIME
      },
      {
        id: "step_seed_brief",
        runId: seedRun.id,
        stage: "intelligence_brief",
        stepKey: "generate-intelligence-brief",
        status: "succeeded",
        input: { contextVersionId: ridePassContextVersion.id },
        output: { audienceBriefId: seedAudienceBrief.id },
        providerCallId: "provider_seed_brief",
        createdAt: FIXED_DEMO_TIME,
        startedAt: FIXED_DEMO_TIME,
        completedAt: FIXED_DEMO_TIME
      },
      {
        id: "step_seed_concepts",
        runId: seedRun.id,
        stage: "concepts",
        stepKey: "generate-concepts",
        status: "succeeded",
        input: { briefId: seedAudienceBrief.id },
        output: { conceptIds: seedConcepts.map((concept) => concept.id) },
        providerCallId: "provider_seed_concepts",
        createdAt: FIXED_DEMO_TIME,
        startedAt: FIXED_DEMO_TIME,
        completedAt: FIXED_DEMO_TIME
      }
    ],
    providerCalls: [
      {
        id: "provider_seed_brief",
        runId: seedRun.id,
        stepKey: "generate-intelligence-brief",
        provider: "demo",
        model: "deterministic-marketing-provider",
        promptVersionId: "prompt_intelligence_v1",
        request: { productContextVersionId: ridePassContextVersion.id },
        response: { audienceBriefId: seedAudienceBrief.id },
        tokenInput: 1180,
        tokenOutput: 940,
        estimatedCostCents: 0,
        latencyMs: 42,
        createdAt: FIXED_DEMO_TIME
      },
      {
        id: "provider_seed_concepts",
        runId: seedRun.id,
        stepKey: "generate-concepts",
        provider: "demo",
        model: "deterministic-marketing-provider",
        promptVersionId: "prompt_concepts_v1",
        request: { runId: seedRun.id, assetCount: seedRun.assetCount },
        response: { conceptIds: seedConcepts.map((concept) => concept.id) },
        tokenInput: 1640,
        tokenOutput: 1120,
        estimatedCostCents: 0,
        latencyMs: 51,
        createdAt: FIXED_DEMO_TIME
      }
    ],
    promptVersions: seedPromptVersions
  };
}
