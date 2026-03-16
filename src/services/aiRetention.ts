/**
 * AI Retention Intelligence
 * Implements retention nudges based on user behavior.
 * Advisory only — does not auto-send notifications.
 */
import { supabase } from "@/integrations/supabase/client";

export type RetentionTrigger =
  | "abandoned_booking"
  | "repeat_service_due"
  | "maintenance_reminder"
  | "service_followup"
  | "inactive_user"
  | "cross_sell_opportunity";

export interface RetentionNudge {
  id: string;
  trigger: RetentionTrigger;
  title: string;
  message: string;
  ctaLabel: string;
  ctaRoute: string;
  priority: "low" | "normal" | "high";
  categoryCode?: string;
}

/** Generate retention nudges for a customer based on their history */
export function generateRetentionNudges(data: {
  lastBookingDaysAgo?: number;
  lastCategory?: string;
  totalBookings?: number;
  hasAbandonedBooking?: boolean;
  devices?: { category: string; lastServiceMonthsAgo: number }[];
}): RetentionNudge[] {
  const nudges: RetentionNudge[] = [];

  // Abandoned booking recovery
  if (data.hasAbandonedBooking) {
    nudges.push({
      id: "abandoned_recovery",
      trigger: "abandoned_booking",
      title: "Complete your booking",
      message: "You started a booking but didn't finish. Ready to continue?",
      ctaLabel: "Continue Booking",
      ctaRoute: "/services",
      priority: "high",
    });
  }

  // Maintenance reminders for devices
  if (data.devices) {
    for (const device of data.devices) {
      if (device.lastServiceMonthsAgo >= 6) {
        nudges.push({
          id: `maintenance_${device.category}`,
          trigger: "maintenance_reminder",
          title: `${device.category} service due`,
          message: `Your last ${device.category} service was ${device.lastServiceMonthsAgo} months ago.`,
          ctaLabel: "Book Service",
          ctaRoute: "/services",
          priority: device.lastServiceMonthsAgo >= 12 ? "high" : "normal",
          categoryCode: device.category,
        });
      }
    }
  }

  // Re-engagement for inactive users
  if (data.lastBookingDaysAgo && data.lastBookingDaysAgo > 60) {
    nudges.push({
      id: "inactive_reengagement",
      trigger: "inactive_user",
      title: "We miss you!",
      message: "It's been a while. Need any repair or maintenance services?",
      ctaLabel: "Browse Services",
      ctaRoute: "/services",
      priority: "normal",
    });
  }

  // Repeat service suggestion
  if (data.lastCategory && data.lastBookingDaysAgo && data.lastBookingDaysAgo > 30) {
    nudges.push({
      id: `repeat_${data.lastCategory}`,
      trigger: "repeat_service_due",
      title: "Book again?",
      message: `Need another ${data.lastCategory} service? Rebook with one tap.`,
      ctaLabel: "Rebook",
      ctaRoute: "/services",
      priority: "low",
      categoryCode: data.lastCategory,
    });
  }

  return nudges;
}

/** Log a retention event (fire-and-forget) */
export async function logRetentionEvent(
  customerId: string,
  eventType: string,
  nudgeContent: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("ai_retention_events" as any).insert({
      customer_id: customerId,
      event_type: eventType,
      nudge_content: nudgeContent,
      metadata,
    });
  } catch {
    // Silent
  }
}
