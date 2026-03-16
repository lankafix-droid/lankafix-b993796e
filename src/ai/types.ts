/**
 * Shared AI Advisory Types
 * Standardized meta fields that every AI advisory service response MUST include.
 */
import type { AIConfidenceEnvelope } from "@/lib/aiConfidence";

/** Standard meta envelope for all AI advisory outputs */
export interface AIAdvisoryMeta {
  /** Confidence envelope with score, band, and reason codes */
  confidence: AIConfidenceEnvelope;
  /** True when the AI module could not produce a real result */
  fallback_used: boolean;
  /** Always true — AI outputs are advisory only, never auto-execute */
  advisory_only: true;
  /** True when this result was served from cache */
  cached?: boolean;
}
