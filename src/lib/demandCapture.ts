/**
 * Demand Capture — logs structured interest for coming_soon categories.
 * Persists to notification_events table for ops visibility.
 */
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

/**
 * Log interest in a coming_soon category.
 * Non-blocking — never throws.
 */
export async function logCategoryInterest(
  categoryCode: string,
  source: "category_grid" | "direct_route" | "waitlist_submit"
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
