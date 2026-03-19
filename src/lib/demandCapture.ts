/**
 * Demand Capture — logs structured interest and fallback requests.
 * Persists to notification_events table for ops visibility + demand intelligence.
 */
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

export type DemandCaptureSource =
  | "category_grid"
  | "direct_route"
  | "waitlist_submit"
  | "fallback_callback"
  | "fallback_chat"
  | "fallback_request"
  | "no_supply_cta";

/**
 * Log interest in a coming_soon category.
 * Non-blocking — never throws.
 */
export async function logCategoryInterest(
  categoryCode: string,
  source: DemandCaptureSource
): Promise<void> {
  track("category_interest", { category: categoryCode, source });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from("notification_events").insert({
      event_type: "category_interest",
      customer_id: user?.id || null,
      metadata: {
        category_code: categoryCode,
        source,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("[DemandCapture] Failed to log interest:", e);
  }
}

/**
 * Log a fallback demand capture event (callback request, no-supply action).
 * Used when user clicks a CTA for a category with no supply.
 */
export async function logFallbackDemand(
  categoryCode: string,
  actionType: "callback" | "chat" | "request" | "notify",
  source: string = "category_card",
): Promise<void> {
  track("fallback_demand_capture", { category: categoryCode, action: actionType, source });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("notification_events").insert({
      event_type: "fallback_demand",
      customer_id: user?.id || null,
      metadata: {
        category_code: categoryCode,
        action_type: actionType,
        source,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("[DemandCapture] Failed to log fallback demand:", e);
  }
}
