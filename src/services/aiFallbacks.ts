/**
 * AI Fallback Service
 * Provides deterministic fallback responses when AI modules fail,
 * time out, or return low-confidence results.
 * Ensures UX never breaks due to AI unavailability.
 */
import { createConfidenceEnvelope, type AIConfidenceEnvelope } from "@/lib/aiConfidence";

export interface FallbackResult<T> {
  data: T;
  fallback_used: true;
  fallback_reason: string;
  confidence: AIConfidenceEnvelope;
}

/** Generic fallback wrapper — tries the AI call, falls back on error */
export async function withFallback<T>(
  aiCall: () => Promise<T>,
  fallbackData: T,
  fallbackReason: string,
  timeoutMs = 8000
): Promise<{ data: T; fallback_used: boolean; confidence: AIConfidenceEnvelope }> {
  try {
    const result = await Promise.race([
      aiCall(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ai_timeout")), timeoutMs)
      ),
    ]);
    return {
      data: result,
      fallback_used: false,
      confidence: createConfidenceEnvelope(75, ["ai_response_received"]),
    };
  } catch (err) {
    const reason =
      err instanceof Error && err.message === "ai_timeout"
        ? "ai_timeout"
        : fallbackReason;

    if (import.meta.env.DEV) {
      console.warn(`[ai-fallback] Using fallback: ${reason}`, err);
    }

    return {
      data: fallbackData,
      fallback_used: true,
      confidence: createConfidenceEnvelope(15, ["fallback_used", reason]),
    };
  }
}

/** Price estimate fallback values by category */
export function getFallbackPriceRange(categoryCode: string) {
  const ranges: Record<string, { min: number; max: number }> = {
    MOBILE: { min: 1500, max: 8000 },
    LAPTOP: { min: 2500, max: 15000 },
    PRINTER: { min: 2000, max: 10000 },
    CCTV: { min: 3000, max: 25000 },
    AC: { min: 2500, max: 12000 },
    SOLAR: { min: 5000, max: 50000 },
    SMART_HOME_OFFICE: { min: 3000, max: 20000 },
    CONSUMER_ELEC: { min: 1500, max: 8000 },
    IT: { min: 2000, max: 12000 },
  };
  return ranges[categoryCode] ?? { min: 2000, max: 10000 };
}
