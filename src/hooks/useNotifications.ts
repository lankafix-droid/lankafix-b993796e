/**
 * Push notification event types and hook structure for LankaFix.
 * Ready for integration with Capacitor PushNotifications or Firebase.
 */

export type NotificationChannel =
  | "booking_confirmed"
  | "technician_assigned"
  | "technician_arriving"
  | "job_completed"
  | "payment_receipt"
  | "maintenance_reminder";

export interface PushNotificationPayload {
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** Notification templates for each channel */
export const notificationTemplates: Record<NotificationChannel, { title: string; bodyTemplate: string; icon: string }> = {
  booking_confirmed: {
    title: "Booking Confirmed ✅",
    bodyTemplate: "Your {{category}} booking #{{bookingId}} is confirmed. We're finding the best technician for you.",
    icon: "clipboard-check",
  },
  technician_assigned: {
    title: "Technician Assigned 🔧",
    bodyTemplate: "{{technicianName}} has been assigned to your job. They'll arrive within {{eta}} minutes.",
    icon: "user-check",
  },
  technician_arriving: {
    title: "Technician En Route 🚗",
    bodyTemplate: "{{technicianName}} is on the way! ETA: {{eta}} minutes.",
    icon: "map-pin",
  },
  job_completed: {
    title: "Job Completed 🎉",
    bodyTemplate: "Your {{category}} service is complete. Please rate your experience.",
    icon: "check-circle",
  },
  payment_receipt: {
    title: "Payment Received 💰",
    bodyTemplate: "Payment of LKR {{amount}} received for booking #{{bookingId}}. Thank you!",
    icon: "receipt",
  },
  maintenance_reminder: {
    title: "Maintenance Reminder 🔔",
    bodyTemplate: "Your {{deviceName}} is due for {{serviceType}}. Book now for best performance.",
    icon: "bell",
  },
};

/** Check if notifications permission is available */
export function canRequestNotifications(): boolean {
  return "Notification" in window;
}

/** Request notification permission with contextual explanation */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canRequestNotifications()) return "denied";
  return Notification.requestPermission();
}

/** Send a local notification (for testing / fallback) */
export function sendLocalNotification(payload: PushNotificationPayload): void {
  if (!canRequestNotifications() || Notification.permission !== "granted") return;
  new Notification(payload.title, {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag: payload.channel,
  });
}
