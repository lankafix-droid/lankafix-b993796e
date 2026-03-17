/**
 * Reminder Batch Evaluator — Evaluates bookings for reminder eligibility.
 * Foundation for scheduled processing. Does not auto-send.
 */

import { computeReminderStates, type ReminderContext } from "@/lib/bookingReminderState";
import { createReminderJob, createSuppressedJob } from "@/lib/reminderJobFactory";
import { orchestrate, type OrchestrationContext } from "@/lib/notificationOrchestrator";
import type { ReminderJob, ReminderChannel } from "@/types/reminderJobs";

export interface BookingSnapshot {
  id: string;
  stage: string;
  stageEnteredAt: string;
  status: string;
  dispatchStatus?: string;
  hasActiveDispute: boolean;
  hasActiveSupportCase: boolean;
  isEscalated: boolean;
  operatorContactedRecently: boolean;
  lastCustomerActivityAt?: string | null;
  sendCounts?: Record<string, number>;
  lastSentTimes?: Record<string, string>;
  activeConditions?: string[];
}

export interface EvaluationResult {
  bookingId: string;
  jobs: Omit<ReminderJob, "id" | "created_at" | "updated_at">[];
  escalationsRecommended: number;
  skipped: boolean;
  skipReason?: string;
}

/** Evaluate a single booking for reminder candidates */
export function evaluateBooking(snapshot: BookingSnapshot): EvaluationResult {
  // Skip resolved bookings
  if (["completed", "cancelled"].includes(snapshot.status) && snapshot.stage !== "completed") {
    return { bookingId: snapshot.id, jobs: [], escalationsRecommended: 0, skipped: true, skipReason: "Booking resolved" };
  }

  const ctx: ReminderContext = {
    stage: snapshot.stage,
    stageEnteredAt: snapshot.stageEnteredAt,
    sendCounts: snapshot.sendCounts,
    lastSentTimes: snapshot.lastSentTimes,
    activeConditions: snapshot.activeConditions,
  };

  const states = computeReminderStates(ctx);
  const jobs: Omit<ReminderJob, "id" | "created_at" | "updated_at">[] = [];
  let escalationsRecommended = 0;

  for (const state of states) {
    if (!state.eligible && !state.suppressed) continue;

    const orchCtx: OrchestrationContext = {
      reminderKey: state.ruleKey,
      audience: state.audience,
      sendCount: state.sendCount,
      lastActivityAt: snapshot.lastCustomerActivityAt,
      hasActiveDispute: snapshot.hasActiveDispute,
      hasActiveSupportCase: snapshot.hasActiveSupportCase,
      isEscalated: snapshot.isEscalated,
      operatorContactedRecently: snapshot.operatorContactedRecently,
      bookingStage: snapshot.stage,
    };

    const decision = orchestrate(orchCtx);

    if (state.suppressed) {
      jobs.push(createSuppressedJob(
        { bookingId: snapshot.id, reminderKey: state.ruleKey, audience: state.audience, channel: decision.channel as ReminderChannel },
        state.suppressReason || "suppressed"
      ));
      continue;
    }

    if (!decision.shouldSend) {
      jobs.push(createSuppressedJob(
        { bookingId: snapshot.id, reminderKey: state.ruleKey, audience: state.audience, channel: decision.channel as ReminderChannel },
        decision.suppressedBy || decision.reason
      ));
      continue;
    }

    if (state.escalationRecommended) {
      escalationsRecommended++;
    }

    jobs.push(createReminderJob({
      bookingId: snapshot.id,
      reminderKey: state.ruleKey,
      audience: state.audience,
      channel: decision.channel as ReminderChannel,
      scheduledFor: state.recommendedSendTime || undefined,
    }));
  }

  return { bookingId: snapshot.id, jobs, escalationsRecommended, skipped: false };
}

/** Evaluate a batch of bookings */
export function evaluateBatch(snapshots: BookingSnapshot[]): EvaluationResult[] {
  return snapshots.map(evaluateBooking);
}
