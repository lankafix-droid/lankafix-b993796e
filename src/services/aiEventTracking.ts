/**
 * AI Event Tracking Service
 * Logs all AI module interactions for explainability, training, and auditing.
 */
import { supabase } from "@/integrations/supabase/client";

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
    await supabase.from("ai_events" as any).insert(payload);
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
