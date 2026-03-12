/**
 * AI Diagnosis Service
 * 
 * Wraps the existing ai-photo-diagnose edge function to provide
 * photo-based issue detection, confidence scoring, and price estimation.
 * 
 * Supported categories: AC, Consumer Electronics, IT (initial scope).
 * All results are advisory — technician diagnosis always takes precedence.
 */

const AI_PHOTO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-photo-diagnose`;

export interface DetectedIssue {
  issue: string;
  confidence: number;
  severity: "high" | "medium" | "low";
  description: string;
}

export interface PhotoDiagnosisResult {
  detected_issues: DetectedIssue[];
  category_code: string;
  category_name: string;
  recommended_service: string;
  recommended_service_name: string;
  overall_confidence: number;
  urgency: string;
  estimated_price_range: string;
  booking_path: "direct" | "inspection" | "quote_required";
  inspection_recommended: boolean;
  additional_notes: string | null;
  self_fix_possible: boolean;
  self_fix_tip: string | null;
  safety_override_applied?: boolean;
  override_reason?: string;
}

const INSPECTION_FALLBACK: PhotoDiagnosisResult = {
  detected_issues: [{ issue: "Unable to identify", confidence: 30, severity: "medium", description: "On-site inspection recommended" }],
  category_code: "INSPECTION_REQUIRED",
  category_name: "General Inspection",
  recommended_service: "GENERAL_INSPECTION",
  recommended_service_name: "General Inspection",
  overall_confidence: 30,
  urgency: "medium",
  estimated_price_range: "Contact for quote",
  booking_path: "inspection",
  inspection_recommended: true,
  additional_notes: null,
  self_fix_possible: false,
  self_fix_tip: null,
};

/**
 * Analyze a repair photo to predict issues and estimate repair range.
 * Returns structured diagnosis with confidence scoring.
 */
export async function analyzeRepairPhoto(
  imageBase64: string,
  description?: string,
  sessionId?: string,
): Promise<PhotoDiagnosisResult> {
  if (!imageBase64) return { ...INSPECTION_FALLBACK };

  try {
    const resp = await fetch(AI_PHOTO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        description: description?.slice(0, 500) || undefined,
        session_id: sessionId,
      }),
    });

    if (!resp.ok) {
      console.error("AI photo diagnosis error:", resp.status);
      return { ...INSPECTION_FALLBACK };
    }

    return await resp.json();
  } catch (e) {
    console.error("AI photo diagnosis failed:", e);
    return { ...INSPECTION_FALLBACK };
  }
}

/**
 * Extract the primary predicted issue from a diagnosis result.
 */
export function predictRepairIssue(result: PhotoDiagnosisResult): {
  predicted_issue: string;
  confidence: number;
  severity: string;
} {
  const top = result.detected_issues[0];
  return {
    predicted_issue: top?.issue || "Unknown",
    confidence: result.overall_confidence / 100,
    severity: top?.severity || "medium",
  };
}

/**
 * Extract the estimated repair price range from a diagnosis result.
 */
export function estimateRepairRange(result: PhotoDiagnosisResult): {
  estimated_range: string;
  booking_path: string;
  inspection_recommended: boolean;
} {
  return {
    estimated_range: result.estimated_price_range,
    booking_path: result.booking_path,
    inspection_recommended: result.inspection_recommended,
  };
}
