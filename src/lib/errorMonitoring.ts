/**
 * Phase 7 — Lightweight Error Monitoring
 * Captures critical failures, logs to console, and persists to system_incidents table.
 */
import { supabase } from "@/integrations/supabase/client";

export type IncidentType =
  | "booking_creation_failed"
  | "dispatch_trigger_failed"
  | "quote_submission_failed"
  | "settlement_creation_failed"
  | "partner_notification_failed"
  | "cron_health_failure"
  | "general_error";

export type IncidentSeverity = "critical" | "warning" | "info";

interface LogIncidentOpts {
  type: IncidentType;
  severity?: IncidentSeverity;
  source: string;
  bookingId?: string;
  partnerId?: string;
  error: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Log an incident to console and persist to system_incidents.
 * Non-blocking — never throws.
 */
export async function logIncident(opts: LogIncidentOpts): Promise<void> {
  const errorMessage =
    opts.error instanceof Error
      ? opts.error.message
      : typeof opts.error === "string"
      ? opts.error
      : JSON.stringify(opts.error);

  const severity = opts.severity || "warning";

  // Always log to console
  const prefix = `[ErrorMonitor] [${severity.toUpperCase()}] [${opts.type}]`;
  if (severity === "critical") {
    console.error(prefix, errorMessage, opts.metadata || {});
  } else {
    console.warn(prefix, errorMessage, opts.metadata || {});
  }

  // Persist to system_incidents (non-blocking)
  try {
    await supabase.from("system_incidents" as any).insert({
      incident_type: opts.type,
      severity,
      source: opts.source,
      booking_id: opts.bookingId || null,
      partner_id: opts.partnerId || null,
      error_message: errorMessage.slice(0, 1000),
      metadata: {
        ...opts.metadata,
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
      },
    });
  } catch (e) {
    // Silent — monitoring should never break the app
    console.warn("[ErrorMonitor] Failed to persist incident:", e);
  }
}

/**
 * Wrap an async operation with error monitoring.
 * Returns the result or null on failure.
 */
export async function withMonitoring<T>(
  operation: () => Promise<T>,
  context: {
    type: IncidentType;
    source: string;
    bookingId?: string;
    partnerId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    await logIncident({ ...context, error });
    return null;
  }
}
