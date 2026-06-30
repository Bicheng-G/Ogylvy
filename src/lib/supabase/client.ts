import { createClient } from "@supabase/supabase-js";
import { readRuntimeConfig } from "@/lib/config/env";

export function createSupabaseBrowserClient() {
  const config = readRuntimeConfig();
  if (!config.supabaseUrl?.trim() || !config.supabaseAnonKey?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required to create the Supabase browser client."
    );
  }

  return createClient(config.supabaseUrl, config.supabaseAnonKey);
}

export function createSupabaseServiceClient() {
  const config = readRuntimeConfig();
  if (!config.supabaseUrl?.trim() || !config.supabaseServiceRoleKey?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to create the Supabase service client."
    );
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
}

