/**
 * AI Booking Assistant Service
 * 
 * Wraps the existing ai-search-query edge function to provide
 * structured NLP → category/service/urgency detection.
 * 
 * Used by AISmartSearch component and any future booking entry points
 * that accept natural-language problem descriptions.
 */

const AI_SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-search-query`;

export interface ParsedIssue {
  category_code: string;
  category_name: string;
  service_type: string;
  service_name: string;
  urgency: "high" | "medium" | "low";
  confidence: number;
  booking_path: "direct" | "inspection" | "quote_required";
  estimated_price_range: string;
  problem_summary: string;
  alternative_services?: { category_code: string; service_type: string; reason: string }[];
  follow_up_questions?: string[];
}

const FALLBACK_RESULT: ParsedIssue = {
  category_code: "INSPECTION_REQUIRED",
  category_name: "General Inspection",
  service_type: "GENERAL_INSPECTION",
  service_name: "General Inspection",
  urgency: "medium",
  confidence: 0,
  booking_path: "inspection",
  estimated_price_range: "Contact for quote",
  problem_summary: "Unable to determine issue. Please select a category manually or book a general inspection.",
};

/**
 * Parse a customer's natural-language problem description into a structured service intent.
 * Falls back to INSPECTION_REQUIRED if AI fails or confidence is too low.
 */
export async function parseCustomerIssue(text: string): Promise<ParsedIssue> {
  if (!text || text.trim().length < 3) return { ...FALLBACK_RESULT };

  try {
    const resp = await fetch(AI_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ query: text.trim() }),
    });

    if (!resp.ok) {
      console.error("AI booking assistant error:", resp.status);
      return { ...FALLBACK_RESULT };
    }

    const data: ParsedIssue = await resp.json();
    return data;
  } catch (e) {
    console.error("AI booking assistant failed:", e);
    return { ...FALLBACK_RESULT };
  }
}

/**
 * Extract detected category from a parsed result.
 */
export function detectCategory(result: ParsedIssue): string {
  return result.category_code;
}

/**
 * Extract detected service type from a parsed result.
 */
export function detectService(result: ParsedIssue): string {
  return result.service_type;
}

/**
 * Extract detected urgency from a parsed result.
 */
export function detectUrgency(result: ParsedIssue): "high" | "medium" | "low" {
  return result.urgency;
}

/**
 * Check if AI confidence is sufficient for auto-routing (≥70%).
 * Below 70%, the UI should ask the customer to confirm the category.
 */
export function isConfidenceSufficient(result: ParsedIssue, threshold = 70): boolean {
  return result.confidence >= threshold;
}

/**
 * Category code → booking route mapping (mirrors AISmartSearch).
 */
const CATEGORY_ROUTE_MAP: Record<string, string> = {
  MOBILE: "/book/mobile-phone-repairs",
  IT: "/book/it-repairs-support",
  AC: "/book/ac-solutions",
  CCTV: "/book/cctv-solutions",
  SOLAR: "/book/solar-solutions",
  ELECTRICAL: "/book/electrical-services",
  PLUMBING: "/book/plumbing-services",
  ELECTRONICS: "/book/consumer-electronics",
  NETWORK: "/book/network-support",
  SMARTHOME: "/book/smart-home-office",
  SECURITY: "/book/security-solutions",
  POWER_BACKUP: "/book/power-backup",
  COPIER: "/book/copier-printer-repair",
  SUPPLIES: "/book/print-supplies",
  APPLIANCE_INSTALL: "/book/appliance-installation",
  INSPECTION_REQUIRED: "/book/inspection",
};

export function getBookingRouteForCategory(categoryCode: string): string {
  return CATEGORY_ROUTE_MAP[categoryCode] || "/book/inspection";
}
