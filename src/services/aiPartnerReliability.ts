/**
 * AI Partner Reliability Scoring
 * Generates advisory reliability insights for partners.
 */
import { createConfidenceEnvelope, type AIConfidenceEnvelope } from "@/lib/aiConfidence";

export interface PartnerReliabilityScore {
  partnerId: string;
  partnerName: string;
  overallScore: number;
  metrics: ReliabilityMetric[];
  trend: "improving" | "stable" | "declining";
  riskSignals: string[];
  confidence: AIConfidenceEnvelope;
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
  const metrics: ReliabilityMetric[] = [];
  const riskSignals: string[] = [];

  // Response reliability
  const onTimeRate = (data.on_time_rate ?? 80) * 100;
  metrics.push({
    name: "response_reliability",
    value: onTimeRate,
    benchmark: 85,
    status: onTimeRate >= 90 ? "excellent" : onTimeRate >= 80 ? "good" : onTimeRate >= 65 ? "fair" : "poor",
    label: "On-Time Reliability",
  });
  if (onTimeRate < 70) riskSignals.push("frequent_late_arrivals");

  // Completion consistency
  const completionRate = (data.completion_rate ?? 0.9) * 100;
  metrics.push({
    name: "completion_consistency",
    value: completionRate,
    benchmark: 90,
    status: completionRate >= 95 ? "excellent" : completionRate >= 85 ? "good" : completionRate >= 70 ? "fair" : "poor",
    label: "Completion Consistency",
  });
  if (completionRate < 75) riskSignals.push("high_incompletion_rate");

  // Customer satisfaction
  const rating = (data.rating_average ?? 3.5) * 20;
  metrics.push({
    name: "customer_satisfaction",
    value: rating,
    benchmark: 80,
    status: rating >= 90 ? "excellent" : rating >= 80 ? "good" : rating >= 60 ? "fair" : "poor",
    label: "Customer Satisfaction",
  });
  if (rating < 60) riskSignals.push("low_customer_satisfaction");

  // Dispute frequency
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
  };
}
