/**
 * AI Provider Adapter
 * Abstracts LLM provider calls behind a single interface.
 * Currently backed by Lovable AI Gateway via Supabase Edge Functions.
 * Provider-agnostic: swap implementation without changing consumers.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AICompletionRequest {
  /** Edge function name to invoke */
  functionName: string;
  /** Payload forwarded to the edge function */
  payload: Record<string, unknown>;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface AICompletionResponse<T = unknown> {
  data: T | null;
  error: string | null;
  latencyMs: number;
  model?: string;
}

/**
 * Invoke an AI edge function and return a typed response.
 * All AI calls MUST go through this adapter for consistency,
 * metering, and future provider swaps.
 */
export async function invokeAI<T = unknown>(
  req: AICompletionRequest
): Promise<AICompletionResponse<T>> {
  const start = performance.now();
  try {
    const { data, error } = await supabase.functions.invoke(req.functionName, {
      body: req.payload,
    });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return { data: null, error: error.message ?? "AI invocation failed", latencyMs };
    }

    return { data: data as T, error: null, latencyMs, model: data?.model };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown AI error",
      latencyMs,
    };
  }
}

/**
 * Check if the AI gateway is reachable (lightweight health ping).
 */
export async function checkAIHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke("ai-health", {
      body: { ping: true },
    });
    return !error;
  } catch {
    return false;
  }
}
