/**
 * AI Trust & Fraud Intelligence
 * Advisory-only fraud pattern detection.
 * Flags for operator review — never auto-bans users.
 *
 * HARDENED: feature flags, schema validation, metering, safe degraded state.
 *
 * CRITICAL SAFETY: On error or disabled state, riskLevel MUST be "unknown"
 * (never "safe") to prevent false-negative trust signals.
 */
import { createConfidenceEnvelope, type AIConfidenceEnvelope } from "@/lib/aiConfidence";
import { isAIEnabled } from "@/config/aiFlags";
import { isValidFraudAlert } from "@/ai/schemas";
import { recordAIUsage } from "@/services/aiUsageMeter";
import { logAIEvent } from "@/services/aiEventTracking";

export type FraudAlertSeverity = "info" | "low" | "medium" | "high" | "critical";

/**
 * Risk levels:
 * - "safe"     — scan completed, no signals found
 * - "unknown"  — scan could not complete (error, disabled, degraded)
 * - "low" / "medium" / "high" / "critical" — signals detected
 */
export type FraudRiskLevel = "safe" | "unknown" | "low" | "medium" | "high" | "critical";

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
  riskLevel: FraudRiskLevel;
  scanTimestamp: string;
  fallback_used: boolean;
  advisory_only: true;
}

interface BookingPattern {
  customerId: string;
  bookingsLast30d: number;
  cancellationsLast30d: number;
  disputesLast30d: number;
  avgBookingValue: number;
  sameAddressBookings: number;
}

/** Degraded-state result: returned when scan cannot execute */
function degradedResult(reason: string): FraudScanResult {
  return {
    alerts: [],
    riskScore: 0,
    riskLevel: "unknown",
    scanTimestamp: new Date().toISOString(),
    fallback_used: true,
    advisory_only: true,
  };
}

/** Analyze booking patterns for potential fraud signals */
export function scanBookingPatterns(pattern: BookingPattern): FraudScanResult {
  const start = performance.now();

  // Feature flag check — NEVER return "safe" when disabled
  if (!isAIEnabled("ai_fraud_watch")) {
    recordAIUsage("ai_fraud_watch", 0, true);
    return degradedResult("feature_disabled");
  }

  try {
    const alerts: FraudAlert[] = [];
    let riskScore = 0;

    // High cancellation rate
    if (pattern.bookingsLast30d > 3 && pattern.cancellationsLast30d / pattern.bookingsLast30d > 0.5) {
      const alert: FraudAlert = {
        id: `cancel_pattern_${pattern.customerId}`,
        alertType: "suspicious_cancellation_pattern",
        severity: "medium",
        message: `High cancellation rate: ${pattern.cancellationsLast30d}/${pattern.bookingsLast30d} bookings cancelled`,
        action: "flag_for_review",
        confidence: createConfidenceEnvelope(65, ["cancellation_rate"]),
      };
      if (isValidFraudAlert({
        alert_type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        confidence_score: alert.confidence.confidence_score,
      })) {
        alerts.push(alert);
        riskScore += 25;
      }
    }

    // Frequent disputes
    if (pattern.disputesLast30d >= 3) {
      const alert: FraudAlert = {
        id: `dispute_pattern_${pattern.customerId}`,
        alertType: "repeated_disputes",
        severity: "high",
        message: `${pattern.disputesLast30d} disputes raised in 30 days`,
        action: "escalate_to_ops",
        confidence: createConfidenceEnvelope(80, ["dispute_frequency"]),
      };
      if (isValidFraudAlert({
        alert_type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        confidence_score: alert.confidence.confidence_score,
      })) {
        alerts.push(alert);
        riskScore += 35;
      }
    }

    // Unusually high volume
    if (pattern.bookingsLast30d > 15) {
      const alert: FraudAlert = {
        id: `volume_pattern_${pattern.customerId}`,
        alertType: "unusual_booking_volume",
        severity: "low",
        message: `Unusually high booking volume: ${pattern.bookingsLast30d} in 30 days`,
        action: "review",
        confidence: createConfidenceEnvelope(45, ["volume_anomaly"]),
      };
      if (isValidFraudAlert({
        alert_type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        confidence_score: alert.confidence.confidence_score,
      })) {
        alerts.push(alert);
        riskScore += 15;
      }
    }

    // Determine risk level — "safe" ONLY when scan completed with zero alerts
    const riskLevel: FraudRiskLevel =
      riskScore >= 60 ? "critical" :
      riskScore >= 40 ? "high" :
      riskScore >= 20 ? "medium" :
      riskScore > 0 ? "low" :
      "safe";

    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_fraud_watch", latency, false);

    if (alerts.length > 0) {
      logAIEvent({
        ai_module: "ai_fraud_watch",
        input_summary: `customer=${pattern.customerId}`,
        output_summary: `${alerts.length} alerts, risk=${riskLevel}`,
        confidence_score: alerts[0].confidence.confidence_score,
      });
    }

    return {
      alerts,
      riskScore: Math.min(100, riskScore),
      riskLevel,
      scanTimestamp: new Date().toISOString(),
      fallback_used: false,
      advisory_only: true,
    };
  } catch {
    // CRITICAL: On error, return "unknown" — NEVER "safe"
    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_fraud_watch", latency, true);
    return degradedResult("computation_error");
  }
}

/** Detect potential partner abuse patterns */
export function scanPartnerPatterns(data: {
  partnerId: string;
  lateArrivals30d: number;
  totalJobs30d: number;
  disputesLost30d: number;
  quoteInflationRate: number;
}): FraudAlert[] {
  if (!isAIEnabled("ai_fraud_watch")) return [];

  const start = performance.now();
  const alerts: FraudAlert[] = [];

  try {
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

    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_fraud_watch", latency, false);
  } catch {
    const latency = Math.round(performance.now() - start);
    recordAIUsage("ai_fraud_watch", latency, true);
  }

  return alerts;
}
