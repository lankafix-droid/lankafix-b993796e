/**
 * AI Confidence System
 * Every AI module returns a standardized confidence envelope.
 */

export type ConfidenceBand = "high" | "medium" | "low";

export interface AIConfidenceEnvelope {
  confidence_score: number;
  confidence_band: ConfidenceBand;
  reason_codes: string[];
}

/** Compute confidence band from a 0-100 score */
export function getConfidenceBand(score: number): ConfidenceBand {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/** Create a standardized confidence envelope */
export function createConfidenceEnvelope(
  score: number,
  reasons: string[] = []
): AIConfidenceEnvelope {
  const clamped = Math.max(0, Math.min(100, score));
  return {
    confidence_score: clamped,
    confidence_band: getConfidenceBand(clamped),
    reason_codes: reasons,
  };
}

/** Check if confidence is sufficient for automated action (default threshold: 70) */
export function isConfidenceSufficient(
  envelope: AIConfidenceEnvelope,
  threshold = 70
): boolean {
  return envelope.confidence_score >= threshold;
}

/** Should this result fall back to human review? */
export function requiresHumanReview(envelope: AIConfidenceEnvelope): boolean {
  return envelope.confidence_band === "low";
}

/** Merge multiple confidence envelopes (weighted average) */
export function mergeConfidence(
  envelopes: { envelope: AIConfidenceEnvelope; weight: number }[]
): AIConfidenceEnvelope {
  if (envelopes.length === 0) {
    return createConfidenceEnvelope(0, ["no_input"]);
  }
  const totalWeight = envelopes.reduce((s, e) => s + e.weight, 0);
  if (totalWeight === 0) return createConfidenceEnvelope(0, ["zero_weight"]);

  const weightedScore = envelopes.reduce(
    (s, e) => s + e.envelope.confidence_score * e.weight,
    0
  ) / totalWeight;

  const allReasons = envelopes.flatMap((e) => e.envelope.reason_codes);
  return createConfidenceEnvelope(weightedScore, [...new Set(allReasons)]);
}
