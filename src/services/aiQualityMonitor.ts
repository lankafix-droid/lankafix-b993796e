/**
 * AI Service Quality Monitoring
 * Detects quality issues and flags partners for internal review.
 * Advisory only — never auto-penalizes.
 */
import { createConfidenceEnvelope, type AIConfidenceEnvelope } from "@/lib/aiConfidence";

export interface QualityFlag {
  partnerId: string;
  flagType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
  confidence: AIConfidenceEnvelope;
}

interface QualityMetrics {
  partnerId: string;
  repeatComplaintRate: number; // % of jobs with repeat complaints
  callbackRepairRate: number; // % of jobs requiring callback
  installationFailureRate: number; // % of installations with issues
  disputeRate: number; // % of jobs disputed
  totalJobs: number;
}

/** Scan partner metrics for quality issues */
export function detectQualityIssues(metrics: QualityMetrics): QualityFlag[] {
  const flags: QualityFlag[] = [];

  if (metrics.totalJobs < 5) return flags; // Not enough data

  if (metrics.repeatComplaintRate > 0.15) {
    flags.push({
      partnerId: metrics.partnerId,
      flagType: "high_repeat_complaints",
      severity: metrics.repeatComplaintRate > 0.3 ? "high" : "medium",
      description: `${Math.round(metrics.repeatComplaintRate * 100)}% repeat complaint rate`,
      recommendation: "Review complaint patterns and consider coaching",
      confidence: createConfidenceEnvelope(75, ["repeat_complaint_rate"]),
    });
  }

  if (metrics.callbackRepairRate > 0.1) {
    flags.push({
      partnerId: metrics.partnerId,
      flagType: "callback_repairs",
      severity: metrics.callbackRepairRate > 0.2 ? "high" : "medium",
      description: `${Math.round(metrics.callbackRepairRate * 100)}% callback repair rate`,
      recommendation: "Investigate repair quality and completeness",
      confidence: createConfidenceEnvelope(70, ["callback_rate"]),
    });
  }

  if (metrics.installationFailureRate > 0.08) {
    flags.push({
      partnerId: metrics.partnerId,
      flagType: "installation_failures",
      severity: metrics.installationFailureRate > 0.15 ? "critical" : "high",
      description: `${Math.round(metrics.installationFailureRate * 100)}% installation failure rate`,
      recommendation: "Urgent review of installation procedures required",
      confidence: createConfidenceEnvelope(80, ["installation_failure_rate"]),
    });
  }

  if (metrics.disputeRate > 0.12) {
    flags.push({
      partnerId: metrics.partnerId,
      flagType: "frequent_disputes",
      severity: metrics.disputeRate > 0.25 ? "critical" : "high",
      description: `${Math.round(metrics.disputeRate * 100)}% dispute rate`,
      recommendation: "Review dispute cases and partner communication",
      confidence: createConfidenceEnvelope(72, ["dispute_rate"]),
    });
  }

  return flags;
}
