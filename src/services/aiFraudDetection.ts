/**
 * AI Trust & Fraud Intelligence
 * Advisory-only fraud pattern detection.
 * Flags for operator review — never auto-bans users.
 */
import { createConfidenceEnvelope, type AIConfidenceEnvelope } from "@/lib/aiConfidence";

export type FraudAlertSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface FraudAlert {
  id: string;
  alertType: string;
  severity: FraudAlertSeverity;
  message: string;
  action: "review" | "flag_for_review" | "escalate_to_ops";
  confidence: AIConfidenceEnvelope;
  metadata?: Record<string, unknown>;
}

export interface FraudScanResult {
  alerts: FraudAlert[];
  riskScore: number;
  riskLevel: "safe" | "low" | "medium" | "high" | "critical";
  scanTimestamp: string;
}

interface BookingPattern {
  customerId: string;
  bookingsLast30d: number;
  cancellationsLast30d: number;
  disputesLast30d: number;
  avgBookingValue: number;
  sameAddressBookings: number;
}

/** Analyze booking patterns for potential fraud signals */
export function scanBookingPatterns(pattern: BookingPattern): FraudScanResult {
  const alerts: FraudAlert[] = [];
  let riskScore = 0;

  // High cancellation rate
  if (pattern.bookingsLast30d > 3 && pattern.cancellationsLast30d / pattern.bookingsLast30d > 0.5) {
    alerts.push({
      id: `cancel_pattern_${pattern.customerId}`,
      alertType: "suspicious_cancellation_pattern",
      severity: "medium",
      message: `High cancellation rate: ${pattern.cancellationsLast30d}/${pattern.bookingsLast30d} bookings cancelled`,
      action: "flag_for_review",
      confidence: createConfidenceEnvelope(65, ["cancellation_rate"]),
    });
    riskScore += 25;
  }

  // Frequent disputes
  if (pattern.disputesLast30d >= 3) {
    alerts.push({
      id: `dispute_pattern_${pattern.customerId}`,
      alertType: "repeated_disputes",
      severity: "high",
      message: `${pattern.disputesLast30d} disputes raised in 30 days`,
      action: "escalate_to_ops",
      confidence: createConfidenceEnvelope(80, ["dispute_frequency"]),
    });
    riskScore += 35;
  }

  // Unusually high volume
  if (pattern.bookingsLast30d > 15) {
    alerts.push({
      id: `volume_pattern_${pattern.customerId}`,
      alertType: "unusual_booking_volume",
      severity: "low",
      message: `Unusually high booking volume: ${pattern.bookingsLast30d} in 30 days`,
      action: "review",
      confidence: createConfidenceEnvelope(45, ["volume_anomaly"]),
    });
    riskScore += 15;
  }

  const riskLevel = riskScore >= 60 ? "critical" : riskScore >= 40 ? "high" : riskScore >= 20 ? "medium" : riskScore > 0 ? "low" : "safe";

  return {
    alerts,
    riskScore: Math.min(100, riskScore),
    riskLevel,
    scanTimestamp: new Date().toISOString(),
  };
}

/** Detect potential partner abuse patterns */
export function scanPartnerPatterns(data: {
  partnerId: string;
  lateArrivals30d: number;
  totalJobs30d: number;
  disputesLost30d: number;
  quoteInflationRate: number;
}): FraudAlert[] {
  const alerts: FraudAlert[] = [];

  if (data.totalJobs30d > 5 && data.lateArrivals30d / data.totalJobs30d > 0.4) {
    alerts.push({
      id: `late_pattern_${data.partnerId}`,
      alertType: "partner_late_pattern",
      severity: "medium",
      message: `Frequent late arrivals: ${data.lateArrivals30d}/${data.totalJobs30d} jobs`,
      action: "flag_for_review",
      confidence: createConfidenceEnvelope(70, ["late_arrival_rate"]),
    });
  }

  if (data.quoteInflationRate > 0.3) {
    alerts.push({
      id: `inflate_pattern_${data.partnerId}`,
      alertType: "quote_inflation",
      severity: "high",
      message: `Quote inflation detected: ${Math.round(data.quoteInflationRate * 100)}% above estimates`,
      action: "escalate_to_ops",
      confidence: createConfidenceEnvelope(60, ["quote_inflation"]),
    });
  }

  return alerts;
}
