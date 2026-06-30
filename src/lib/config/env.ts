import { DemoMarketingProvider } from "@/lib/providers/demo-provider";
import { OpenAIMarketingProvider } from "@/lib/providers/openai-provider";
import type { MarketingProvider } from "@/lib/providers/types";

export type RuntimeConfig = {
  aiProvider: "demo" | "openai";
  storage: "demo" | "supabase";
  openaiApiKey?: string;
  openaiTextModel: string;
  openaiImageModel: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
};

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const aiProvider = parseProvider(env.MARKETING_AGENT_AI_PROVIDER);
  const storage = parseStorage(env.MARKETING_AGENT_STORAGE);

  return {
    aiProvider,
    storage,
    openaiApiKey: env.OPENAI_API_KEY,
    openaiTextModel: env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.5",
    openaiImageModel: env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2",
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function createMarketingProvider(config = readRuntimeConfig()): MarketingProvider {
  if (config.aiProvider === "demo") {
    return new DemoMarketingProvider();
  }

  if (!config.openaiApiKey?.trim()) {
    throw new Error("OPENAI_API_KEY is required when MARKETING_AGENT_AI_PROVIDER=openai.");
  }

  return new OpenAIMarketingProvider({
    apiKey: config.openaiApiKey,
    textModel: config.openaiTextModel,
    imageModel: config.openaiImageModel
  });
}

export function assertSupabaseConfigured(config = readRuntimeConfig()): void {
  if (config.storage !== "supabase") {
    return;
  }

  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", config.supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", config.supabaseAnonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabaseServiceRoleKey]
  ]
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Supabase storage mode is missing required env vars: ${missing.join(", ")}`);
  }
}

function parseProvider(value: string | undefined): RuntimeConfig["aiProvider"] {
  if (!value || value === "demo") {
    return "demo";
  }

  if (value === "openai") {
    return "openai";
  }

  throw new Error(`Unsupported MARKETING_AGENT_AI_PROVIDER: ${value}`);
}

function parseStorage(value: string | undefined): RuntimeConfig["storage"] {
  if (!value || value === "demo") {
    return "demo";
  }

  if (value === "supabase") {
    return "supabase";
  }

  throw new Error(`Unsupported MARKETING_AGENT_STORAGE: ${value}`);
}

