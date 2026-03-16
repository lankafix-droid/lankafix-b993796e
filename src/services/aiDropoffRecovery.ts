/**
 * AI Booking Drop-Off Recovery
 * Detects abandoned bookings and generates recovery nudges.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DropOffEvent {
  userId: string;
  stepAbandoned: string;
  categoryCode?: string;
  sessionDuration?: number;
  timestamp: string;
}

export interface RecoveryAction {
  type: "in_app_reminder" | "notification" | "whatsapp";
  message: string;
  ctaLabel: string;
  ctaRoute: string;
  delay: string;
}

/** Generate recovery actions for an abandoned booking */
export function generateRecoveryActions(event: DropOffEvent): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  // Immediate in-app reminder
  actions.push({
    type: "in_app_reminder",
    message: "You were booking a service — ready to continue?",
    ctaLabel: "Continue Booking",
    ctaRoute: "/services",
    delay: "immediate",
  });

  // Delayed notification (1 hour)
  actions.push({
    type: "notification",
    message: event.categoryCode
      ? `Complete your ${event.categoryCode} service booking`
      : "Complete your service booking",
    ctaLabel: "Book Now",
    ctaRoute: "/services",
    delay: "1h",
  });

  return actions;
}

/** Track a booking drop-off event */
export async function trackDropOff(event: DropOffEvent): Promise<void> {
  try {
    await supabase.from("ai_retention_events" as any).insert({
      customer_id: event.userId,
      event_type: "booking_dropoff",
      trigger_reason: `abandoned_at_${event.stepAbandoned}`,
      nudge_content: `Category: ${event.categoryCode || "unknown"}`,
      metadata: {
        step: event.stepAbandoned,
        category: event.categoryCode,
        session_duration: event.sessionDuration,
      },
    });
  } catch {
    // Silent
  }
}
