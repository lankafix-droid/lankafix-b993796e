/**
 * Notification Service for LankaFix
 * Handles creating, reading, and marking notifications for customers and partners.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  booking_id: string | null;
  read_status: boolean;
  created_at: string;
}

export type NotificationType =
  | "booking_created"
  | "technician_assigned"
  | "technician_en_route"
  | "quote_submitted"
  | "quote_approved"
  | "job_completed"
  | "new_job_offer"
  | "booking_assignment";

/**
 * Create a notification record for a user.
 */
export async function createNotificationRecord(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("notifications" as any).insert({
    user_id: opts.userId,
    type: opts.type,
    title: opts.title,
    message: opts.message,
    booking_id: opts.bookingId || null,
    read_status: false,
  });

  if (error) {
    console.warn("[NotificationService] Insert failed:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Send a notification (creates record + optional local push).
 */
export async function sendNotification(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string;
}): Promise<void> {
  await createNotificationRecord(opts);

  // Fire local browser notification if permission granted
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(opts.title, {
        body: opts.message,
        icon: "/icons/icon-192.png",
        tag: opts.type,
      });
    } catch {
      // Silently fail — not critical
    }
  }
}

/**
 * Get all notifications for the current user, ordered by most recent.
 */
export async function getUserNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[NotificationService] Fetch failed:", error.message);
    return [];
  }
  return (data as unknown as AppNotification[]) || [];
}

/**
 * Get unread notification count for the current user.
 */
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications" as any)
    .select("id", { count: "exact", head: true })
    .eq("read_status", false);

  if (error) {
    console.warn("[NotificationService] Count failed:", error.message);
    return 0;
  }
  return count || 0;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from("notifications" as any)
    .update({ read_status: true })
    .eq("id", notificationId);
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications" as any)
    .update({ read_status: true })
    .eq("user_id", user.id)
    .eq("read_status", false);
}

// ─── Convenience helpers for booking lifecycle events ───

export async function notifyBookingCreated(userId: string, bookingId: string, categoryName: string) {
  return sendNotification({
    userId,
    type: "booking_created",
    title: "Booking Confirmed ✅",
    message: `Your ${categoryName} booking is confirmed. We're finding the best technician for you.`,
    bookingId,
  });
}

export async function notifyTechnicianAssigned(userId: string, bookingId: string, techName: string) {
  return sendNotification({
    userId,
    type: "technician_assigned",
    title: "Technician Assigned 🔧",
    message: `${techName} has been assigned to your job.`,
    bookingId,
  });
}

export async function notifyTechnicianEnRoute(userId: string, bookingId: string, techName: string, etaMinutes: number) {
  return sendNotification({
    userId,
    type: "technician_en_route",
    title: "Technician En Route 🚗",
    message: `${techName} is on the way! ETA: ${etaMinutes} minutes.`,
    bookingId,
  });
}

export async function notifyQuoteSubmitted(userId: string, bookingId: string) {
  return sendNotification({
    userId,
    type: "quote_submitted",
    title: "Quote Ready for Review 📋",
    message: "Your technician has submitted a quote. Please review and approve to proceed.",
    bookingId,
  });
}

export async function notifyQuoteApproved(partnerUserId: string, bookingId: string) {
  return sendNotification({
    userId: partnerUserId,
    type: "quote_approved",
    title: "Quote Approved ✅",
    message: "The customer has approved your quote. You may proceed with the repair.",
    bookingId,
  });
}

export async function notifyJobCompleted(userId: string, bookingId: string) {
  return sendNotification({
    userId,
    type: "job_completed",
    title: "Job Completed 🎉",
    message: "Your service is complete. Please rate your experience.",
    bookingId,
  });
}

export async function notifyNewJobOffer(partnerUserId: string, bookingId: string, categoryName: string) {
  return sendNotification({
    userId: partnerUserId,
    type: "new_job_offer",
    title: "New Job Offer ⚡",
    message: `New ${categoryName} job available. Respond within 5 minutes.`,
    bookingId,
  });
}
