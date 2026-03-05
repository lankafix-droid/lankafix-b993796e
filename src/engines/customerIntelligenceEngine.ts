import { track } from "@/lib/analytics";
import type { CategoryCode } from "@/types/booking";

/** Customer intent scoring */
export interface CustomerIntent {
  customerId: string;
  sessionId: string;
  phoneNumber?: string;
  customerName?: string;
  gpsLocation?: { lat: number; lng: number };
  city?: string;
  intentScore: number;
  actions: IntentAction[];
  createdAt: string;
  lastActivityAt: string;
  diagnosisCompleted: boolean;
  bookingInitiated: boolean;
  abandoned: boolean;
  followUpSent: boolean;
  categoryViewed?: CategoryCode;
  diagnoseProblem?: string;
  diagnoseResult?: string;
}

export interface IntentAction {
  action: string;
  points: number;
  timestamp: string;
  meta?: Record<string, unknown>;
}

/** Intent scoring weights */
const INTENT_SCORES: Record<string, number> = {
  category_viewed: 10,
  diagnosis_started: 20,
  diagnosis_completed: 30,
  booking_initiated: 40,
  photo_uploaded: 15,
  voice_input_used: 15,
  self_fix_viewed: 5,
  device_registered: 25,
};

/** Session tracking for anonymous users */
export interface AnonymousSession {
  sessionId: string;
  deviceType: string;
  categoryViewed?: CategoryCode;
  diagnosisStarted: boolean;
  diagnosisCompleted: boolean;
  startedAt: string;
  lastActivityAt: string;
  pageViews: string[];
}

/** AI learning feedback — predicted vs actual */
export interface DiagnosisFeedback {
  jobId: string;
  categoryCode: CategoryCode;
  predictedIssue: string;
  predictedProbability: number;
  actualIssue: string;
  matchedPrediction: boolean;
  technicianId: string;
  feedbackAt: string;
}

/** Cancellation intelligence */
export interface CancellationRecord {
  jobId: string;
  categoryCode: CategoryCode;
  reason: string;
  timestamp: string;
  intentScore: number;
}

// ─── Intent Score Calculator ──────────────────────────────────────

export function calculateIntentScore(actions: IntentAction[]): number {
  return actions.reduce((sum, a) => sum + a.points, 0);
}

export function recordIntentAction(
  intent: CustomerIntent,
  action: string,
  meta?: Record<string, unknown>
): CustomerIntent {
  const points = INTENT_SCORES[action] ?? 0;
  const now = new Date().toISOString();
  const newAction: IntentAction = { action, points, timestamp: now, meta };

  track("customer_intent_action", { action, points, sessionId: intent.sessionId });

  return {
    ...intent,
    intentScore: intent.intentScore + points,
    actions: [...intent.actions, newAction],
    lastActivityAt: now,
    diagnosisCompleted: action === "diagnosis_completed" ? true : intent.diagnosisCompleted,
    bookingInitiated: action === "booking_initiated" ? true : intent.bookingInitiated,
  };
}

export function createCustomerIntent(sessionId: string, phoneNumber?: string, name?: string): CustomerIntent {
  return {
    customerId: `CUST-${Date.now().toString(36).toUpperCase()}`,
    sessionId,
    phoneNumber,
    customerName: name,
    intentScore: 0,
    actions: [],
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    diagnosisCompleted: false,
    bookingInitiated: false,
    abandoned: false,
    followUpSent: false,
  };
}

// ─── Abandoned Booking Recovery ──────────────────────────────────

export interface AbandonedRecovery {
  sessionId: string;
  customerId: string;
  phoneNumber?: string;
  category?: CategoryCode;
  problem?: string;
  abandonedAt: string;
  followUpSchedule: { minutesAfter: number; sent: boolean; sentAt?: string }[];
  recovered: boolean;
}

export function createAbandonedRecovery(intent: CustomerIntent): AbandonedRecovery {
  return {
    sessionId: intent.sessionId,
    customerId: intent.customerId,
    phoneNumber: intent.phoneNumber,
    category: intent.categoryViewed,
    problem: intent.diagnoseProblem,
    abandonedAt: new Date().toISOString(),
    followUpSchedule: [
      { minutesAfter: 5, sent: false },
      { minutesAfter: 1440, sent: false },   // 24 hours
      { minutesAfter: 4320, sent: false },   // 72 hours
    ],
    recovered: false,
  };
}

export function getFollowUpMessage(recovery: AbandonedRecovery, step: number): string {
  const categoryLabel = recovery.category ?? "device";
  const messages = [
    `Hi, we noticed your ${categoryLabel} may need servicing. Book a LankaFix technician now and get priority dispatch.`,
    `Still having issues with your ${categoryLabel}? Our verified technicians are ready to help — book in 60 seconds.`,
    `Last reminder: Protect your ${categoryLabel} with LankaFix Care. Book a service or subscribe to a care plan today.`,
  ];
  return messages[step] ?? messages[0];
}

// ─── Analytics Helpers ──────────────────────────────────────────

export interface DiagnoseAnalytics {
  totalDiagnoses: number;
  completedDiagnoses: number;
  conversionToBooking: number;
  conversionRate: number;
  accuracyRate: number;
  topProblems: { problem: string; category: CategoryCode; count: number }[];
  abandonment: { total: number; recovered: number; recoveryRate: number };
}

export function computeDiagnoseAnalytics(
  feedbacks: DiagnosisFeedback[],
  intents: CustomerIntent[],
  recoveries: AbandonedRecovery[]
): DiagnoseAnalytics {
  const totalDiagnoses = intents.length;
  const completedDiagnoses = intents.filter(i => i.diagnosisCompleted).length;
  const conversionToBooking = intents.filter(i => i.bookingInitiated).length;
  const conversionRate = totalDiagnoses > 0 ? Math.round((conversionToBooking / totalDiagnoses) * 100) : 0;
  const matchedFeedbacks = feedbacks.filter(f => f.matchedPrediction);
  const accuracyRate = feedbacks.length > 0 ? Math.round((matchedFeedbacks.length / feedbacks.length) * 100) : 0;

  // Count top problems
  const problemMap = new Map<string, { problem: string; category: CategoryCode; count: number }>();
  intents.forEach(i => {
    if (i.diagnoseProblem && i.categoryViewed) {
      const key = `${i.categoryViewed}_${i.diagnoseProblem}`;
      const existing = problemMap.get(key);
      if (existing) existing.count++;
      else problemMap.set(key, { problem: i.diagnoseProblem, category: i.categoryViewed, count: 1 });
    }
  });
  const topProblems = Array.from(problemMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  const totalAbandoned = recoveries.length;
  const recovered = recoveries.filter(r => r.recovered).length;

  return {
    totalDiagnoses,
    completedDiagnoses,
    conversionToBooking,
    conversionRate,
    accuracyRate,
    topProblems,
    abandonment: {
      total: totalAbandoned,
      recovered,
      recoveryRate: totalAbandoned > 0 ? Math.round((recovered / totalAbandoned) * 100) : 0,
    },
  };
}
