/**
 * AI Event Tracking Service
 * Logs all AI module interactions for explainability, training, and auditing.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AIEventPayload {
  user_id?: string;
  partner_id?: string;
  booking_id?: string;
  zone_id?: string;
  category?: string;
  ai_module: string;
  input_summary?: string;
  output_summary?: string;
  confidence_score?: number;
  accepted_by_user?: boolean;
  accepted_by_operator?: boolean;
  metadata?: Record<string, unknown>;
}

/** Log an AI event (fire-and-forget) */
export async function logAIEvent(payload: AIEventPayload): Promise<void> {
  try {
    await supabase.from("ai_events").insert({
      ai_module: payload.ai_module,
      user_id: payload.user_id ?? null,
      partner_id: payload.partner_id ?? null,
      booking_id: payload.booking_id ?? null,
      zone_id: payload.zone_id ?? null,
      category: payload.category ?? null,
      input_summary: payload.input_summary ?? null,
      output_summary: payload.output_summary ?? null,
      confidence_score: payload.confidence_score ?? null,
      accepted_by_user: payload.accepted_by_user ?? null,
      accepted_by_operator: payload.accepted_by_operator ?? null,
      metadata: (payload.metadata as Json) ?? null,
    });
  } catch {
    // Silent fail — analytics should never block UX
  }
}

/** Track AI analytics events through the lightweight analytics system */
export function trackAIAnalytics(
  event:
    | "ai_recommendation_shown"
    | "ai_estimate_viewed"
    | "ai_partner_rank_viewed"
    | "ai_nudge_clicked"
    | "ai_dropoff_recovered"
    | "ai_photo_triage_used"
    | "ai_search_assist_used",
  payload?: Record<string, unknown>
) {
  if (import.meta.env.DEV) {
    console.log(`[ai-analytics] ${event}`, payload ?? {});
  }
  // Future: gtag / PostHog / Meta Pixel
}
