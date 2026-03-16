/**
 * AI Partner Reliability Scoring
 * Generates advisory reliability insights for partners.
 *
 * HARDENED: feature flags, schema validation, metering, caching, advisory_only.
 */
import { createConfidenceEnvelope } from "@/lib/aiConfidence";
import { isAIEnabled } from "@/config/aiFlags";
import { isValidPartnerReliability } from "@/ai/schemas";
import { recordAIUsage } from "@/services/aiUsageMeter";
import { withCache } from "@/services/aiCacheService";
import { logAIEvent } from "@/services/aiEventTracking";
import type { AIAdvisoryMeta } from "@/ai/types";

export interface PartnerReliabilityScore extends AIAdvisoryMeta {
  partnerId: string;
  partnerName: string;
  overallScore: number;
  metrics: ReliabilityMetric[];
  trend: "improving" | "stable" | "declining";
  riskSignals: string[];
}

export interface ReliabilityMetric {
  name: string;
  value: number;
  benchmark: number;
  status: "excellent" | "good" | "fair" | "poor";
  label: string;
}

interface PartnerPerformanceData {
  id: string;
  name: string;
  on_time_rate?: number | null;
  completion_rate?: number;
  rating_average?: number | null;
  dispute_rate?: number;
  response_time_minutes?: number;
  cancellation_rate?: number | null;
}

/** Generate a reliability scorecard for a partner */
export function computePartnerReliability(
  data: PartnerPerformanceData
): PartnerReliabilityScore {
  const start = performance.now();

  // Feature flag check
  if (!isAIEnabled("ai_quality_monitor")) {
    recordAIUsage("ai_quality_monitor", 0, true);
    return {
      partnerId: data.id,
      partnerName: data.name,
      overallScore: 50,
      metrics: [],
      trend: "stable",
      riskSignals: [],
      confidence: createConfidenceEnvelope(10, ["feature_disabled"]),
      fallback_used: true,
      advisory_only: true,
    };
  }

  try {
    const result = computeScore(data);

    // Schema validation on key outputs
    const schemaValid = isValidPartnerReliability({
      reliability_score: result.overallScore,
      response_reliability: result.metrics.find(m => m.name === "response_reliability")?.value ?? 0,
      completion_consistency: result.metrics.find(m => m.name === "completion_consistency")?.value ?? 0,
      satisfaction_trend: result.trend,
      dispute_frequency: result.riskSignals.includes("elevated_disputes") ? "high" : "low",
    });

    if (!schemaValid) {
      const latency = Math.round(performance.now() - start);
      recordAIUsage("ai_quality_monitor", latency, true);
      return {
        ...result,
        confidence: createConfidenceEnvelope(15, ["schema_validation_failed"]),
        fallback_used: true,
      };
    }

    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_quality_monitor", latency, false);

    logAIEvent({
      ai_module: "ai_quality_monitor",
      partner_id: data.id,
      output_summary: `score=${result.overallScore}, trend=${result.trend}`,
      confidence_score: result.confidence.confidence_score,
    });

    return result;
  } catch {
    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_quality_monitor", latency, true);
    return {
      partnerId: data.id,
      partnerName: data.name,
      overallScore: 50,
      metrics: [],
      trend: "stable",
      riskSignals: [],
      confidence: createConfidenceEnvelope(10, ["computation_error", "fallback_used"]),
      fallback_used: true,
      advisory_only: true,
    };
  }
}

/** Cached reliability score */
export async function computePartnerReliabilityCached(
  data: PartnerPerformanceData
): Promise<PartnerReliabilityScore> {
  const { data: result, cached } = await withCache(
    "ai_quality_monitor",
    { id: data.id },
    async () => computePartnerReliability(data),
    5 * 60 * 1000 // 5 min TTL
  );
  return { ...result, cached };
}

function computeScore(data: PartnerPerformanceData): PartnerReliabilityScore {
  const metrics: ReliabilityMetric[] = [];
  const riskSignals: string[] = [];

  const onTimeRate = (data.on_time_rate ?? 80) * 100;
  metrics.push({
    name: "response_reliability",
    value: onTimeRate,
    benchmark: 85,
    status: onTimeRate >= 90 ? "excellent" : onTimeRate >= 80 ? "good" : onTimeRate >= 65 ? "fair" : "poor",
    label: "On-Time Reliability",
  });
  if (onTimeRate < 70) riskSignals.push("frequent_late_arrivals");

  const completionRate = (data.completion_rate ?? 0.9) * 100;
  metrics.push({
    name: "completion_consistency",
    value: completionRate,
    benchmark: 90,
    status: completionRate >= 95 ? "excellent" : completionRate >= 85 ? "good" : completionRate >= 70 ? "fair" : "poor",
    label: "Completion Consistency",
  });
  if (completionRate < 75) riskSignals.push("high_incompletion_rate");

  const rating = (data.rating_average ?? 3.5) * 20;
  metrics.push({
    name: "customer_satisfaction",
    value: rating,
    benchmark: 80,
    status: rating >= 90 ? "excellent" : rating >= 80 ? "good" : rating >= 60 ? "fair" : "poor",
    label: "Customer Satisfaction",
  });
  if (rating < 60) riskSignals.push("low_customer_satisfaction");

  const disputeScore = Math.max(0, 100 - (data.dispute_rate ?? 0) * 500);
  metrics.push({
    name: "dispute_frequency",
    value: disputeScore,
    benchmark: 90,
    status: disputeScore >= 95 ? "excellent" : disputeScore >= 85 ? "good" : disputeScore >= 70 ? "fair" : "poor",
    label: "Dispute Record",
  });
  if (disputeScore < 70) riskSignals.push("elevated_disputes");

  const overallScore = Math.round(
    metrics.reduce((s, m) => s + m.value, 0) / metrics.length
  );

  const trend = overallScore >= 85 ? "improving" : overallScore >= 65 ? "stable" : "declining";

  return {
    partnerId: data.id,
    partnerName: data.name,
    overallScore,
    metrics,
    trend,
    riskSignals,
    confidence: createConfidenceEnvelope(
      Math.min(85, 50 + metrics.filter((m) => m.status !== "poor").length * 10),
      riskSignals.length > 0 ? riskSignals : ["standard_assessment"]
    ),
    fallback_used: false,
    advisory_only: true,
  };
}
