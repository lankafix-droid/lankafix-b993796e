/**
 * Customer Notification Templates — Structured message templates for future
 * push/WhatsApp/SMS/email notifications.
 * Does NOT send notifications. Advisory templates only.
 */

export interface NotificationTemplate {
  key: string;
  title: string;
  shortMessage: string;
  detailedMessage: string;
  tone: "informational" | "action_required" | "reassurance" | "celebration";
}

export const CUSTOMER_NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  booking_received: {
    key: "booking_received",
    title: "Booking Received",
    shortMessage: "Your booking has been received. We'll review it shortly.",
    detailedMessage: "Your service request has been received successfully. A LankaFix operator will review your booking and find the right technician for you. You'll be updated at each step.",
    tone: "informational",
  },
  booking_under_review: {
    key: "booking_under_review",
    title: "Under Review",
    shortMessage: "A LankaFix operator is reviewing your request.",
    detailedMessage: "Our team personally checks every booking for quality and safety before proceeding. You'll hear from us shortly.",
    tone: "informational",
  },
  technician_search_started: {
    key: "technician_search_started",
    title: "Finding Technician",
    shortMessage: "We're matching you with verified technicians nearby.",
    detailedMessage: "Only verified, rated, and background-checked professionals are considered. Our team selects the best match for your job. Expected match within 10–45 minutes.",
    tone: "informational",
  },
  technician_assigned: {
    key: "technician_assigned",
    title: "Technician Assigned",
    shortMessage: "A verified technician has been assigned to your job.",
    detailedMessage: "Your technician's identity is verified by LankaFix. You'll be notified when they're on the way. You can track their live location once they depart.",
    tone: "celebration",
  },
  technician_delayed: {
    key: "technician_delayed",
    title: "Technician Delayed",
    shortMessage: "Your technician is delayed. Updated timing will be shared.",
    detailedMessage: "Your technician is running behind schedule. Our team is coordinating an updated arrival time. We're here to help if you need anything.",
    tone: "reassurance",
  },
  quote_ready: {
    key: "quote_ready",
    title: "Quote Ready",
    shortMessage: "Your repair quote is ready for review.",
    detailedMessage: "The technician has submitted a detailed quote with all costs itemized. Review it carefully — no work begins until you approve. All charges are transparent.",
    tone: "action_required",
  },
  quote_approval_reminder: {
    key: "quote_approval_reminder",
    title: "Quote Awaiting Approval",
    shortMessage: "Your quote is waiting for your approval.",
    detailedMessage: "The technician is ready to proceed once you approve the quote. Take your time reviewing — nothing proceeds without your approval. Need help deciding? Contact our team.",
    tone: "action_required",
  },
  completion_confirmation_reminder: {
    key: "completion_confirmation_reminder",
    title: "Confirm Completion",
    shortMessage: "Please confirm your service was completed.",
    detailedMessage: "Your technician has finished the work. Please confirm the service was completed satisfactorily. If something is wrong, report it before confirming to protect your warranty rights.",
    tone: "action_required",
  },
  support_review_started: {
    key: "support_review_started",
    title: "Support Review Started",
    shortMessage: "Our team is reviewing your concern.",
    detailedMessage: "A LankaFix operator is now reviewing your reported issue. We'll handle this fairly and contact you with a resolution. No automatic actions are taken.",
    tone: "reassurance",
  },
  escalation_started: {
    key: "escalation_started",
    title: "Escalated for Priority Review",
    shortMessage: "A senior operator is now handling your case.",
    detailedMessage: "Your case has been escalated for priority attention. A senior LankaFix team member is reviewing this to ensure the best outcome for you.",
    tone: "reassurance",
  },
  dispute_under_review: {
    key: "dispute_under_review",
    title: "Under Review",
    shortMessage: "Our mediation team is reviewing your concern.",
    detailedMessage: "Our team will review this fairly before any final action. A human operator handles every case personally. You'll hear from us within 2–4 hours.",
    tone: "reassurance",
  },

  // ── Reminder-specific variants ──

  quote_reminder_1: {
    key: "quote_reminder_1",
    title: "Quote Ready for Review",
    shortMessage: "Your quote is ready. Take your time reviewing it.",
    detailedMessage: "A detailed quote has been submitted for your review. All charges are transparent — nothing proceeds without your approval. Review when you're ready.",
    tone: "informational",
  },
  quote_reminder_2: {
    key: "quote_reminder_2",
    title: "Reminder: Quote Awaiting Approval",
    shortMessage: "Your technician is ready once you approve the quote.",
    detailedMessage: "Your quote is still awaiting your approval. The technician is standing by. If you have questions, our team is happy to help you decide.",
    tone: "action_required",
  },
  completion_reminder: {
    key: "completion_reminder",
    title: "Please Confirm Completion",
    shortMessage: "Please confirm your service was completed satisfactorily.",
    detailedMessage: "Your technician has finished the work. Confirming helps protect your warranty. If something isn't right, report it before confirming.",
    tone: "action_required",
  },
  rating_reminder: {
    key: "rating_reminder",
    title: "Rate Your Experience",
    shortMessage: "How was your service? Your rating helps others.",
    detailedMessage: "Your feedback helps us improve and helps other customers choose the right technician. It only takes a moment.",
    tone: "informational",
  },
  technician_delayed_update: {
    key: "technician_delayed_update",
    title: "Delay Update",
    shortMessage: "Your technician is running late. We're coordinating an update.",
    detailedMessage: "Your technician is delayed. Our team is actively coordinating an updated arrival time. We're here if you need anything in the meantime.",
    tone: "reassurance",
  },
  escalation_followup_update: {
    key: "escalation_followup_update",
    title: "Escalation Update",
    shortMessage: "A senior operator is still working on your case.",
    detailedMessage: "Your escalated case is being handled by a senior LankaFix team member. We'll share an update as soon as we have one.",
    tone: "reassurance",
  },
  dispute_status_followup: {
    key: "dispute_status_followup",
    title: "Dispute Update",
    shortMessage: "We're still reviewing your concern carefully.",
    detailedMessage: "Our mediation team is thoroughly reviewing your case. Every dispute is handled personally by a human operator. You'll hear from us soon.",
    tone: "reassurance",
  },
  no_provider_reassurance: {
    key: "no_provider_reassurance",
    title: "Still Searching",
    shortMessage: "We're expanding technician search in your area.",
    detailedMessage: "All nearby technicians are currently busy. Our team is personally coordinating to find the right professional for your job. You'll be notified as soon as we have a match.",
    tone: "reassurance",
  },
};

/** Get a notification template by key */
export function getNotificationTemplate(key: string): NotificationTemplate | null {
  return CUSTOMER_NOTIFICATION_TEMPLATES[key] || null;
}
