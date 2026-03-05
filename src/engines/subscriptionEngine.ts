/**
 * LankaFix Subscription Engine — Stage 11
 * Handles AMC scheduling, credit management, seasonal logic, and dispatch priority.
 */
import type {
  Subscription, AmcVisit, ServiceCredit, RegisteredDevice,
  DeviceServiceRecord, SubscriptionAnalytics, CarePlanDefinition,
} from "@/types/subscription";
import { SEASONAL_RECOMMENDATIONS } from "@/types/subscription";
import { getPlanById } from "@/data/carePlans";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/** Create a new subscription */
export function createSubscription(
  userId: string,
  planId: string,
  deviceId: string,
): Subscription {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const now = new Date();
  const expiry = new Date(now);
  expiry.setFullYear(expiry.getFullYear() + 1);

  const renewalDate = new Date(expiry);
  renewalDate.setDate(renewalDate.getDate() - 30);

  const credits: ServiceCredit[] = Array.from({ length: plan.serviceCredits }, (_, i) => ({
    id: generateId("CR"),
    subscriptionId: "",
    status: "available" as const,
    expiresAt: expiry.toISOString(),
  }));

  const visits = scheduleAmcVisits(plan, now);

  const sub: Subscription = {
    id: generateId("SUB"),
    userId,
    planId,
    deviceId,
    status: "active",
    startDate: now.toISOString(),
    expiryDate: expiry.toISOString(),
    renewalDate: renewalDate.toISOString(),
    credits: credits.map((c) => ({ ...c, subscriptionId: "" })),
    amcVisits: visits,
    createdAt: now.toISOString(),
  };

  // Backfill subscription IDs
  sub.credits = sub.credits.map((c) => ({ ...c, subscriptionId: sub.id }));
  sub.amcVisits = sub.amcVisits.map((v) => ({ ...v, subscriptionId: sub.id }));

  return sub;
}

/** Schedule AMC visits based on plan and seasonal recommendations */
export function scheduleAmcVisits(plan: CarePlanDefinition, startDate: Date): AmcVisit[] {
  const visits: AmcVisit[] = [];
  const seasonal = SEASONAL_RECOMMENDATIONS[plan.category];
  const interval = Math.floor(12 / plan.visitsPerYear);

  for (let i = 0; i < plan.visitsPerYear; i++) {
    const visitDate = new Date(startDate);
    if (seasonal && seasonal.months.length >= plan.visitsPerYear) {
      // Use seasonal months
      const targetMonth = seasonal.months[i % seasonal.months.length] - 1;
      visitDate.setMonth(targetMonth);
      if (visitDate <= startDate) visitDate.setFullYear(visitDate.getFullYear() + 1);
    } else {
      visitDate.setMonth(startDate.getMonth() + interval * (i + 1));
    }

    visits.push({
      id: generateId("AMC"),
      subscriptionId: "",
      scheduledDate: visitDate.toISOString(),
      status: "scheduled",
      checklist: plan.serviceChecklist.map((item) => ({ item, completed: false })),
    });
  }

  return visits;
}

/** Get available credits for a subscription */
export function getAvailableCredits(sub: Subscription): ServiceCredit[] {
  return sub.credits.filter((c) => c.status === "available" && new Date(c.expiresAt) > new Date());
}

/** Use a service credit */
export function useCredit(sub: Subscription, creditId: string, jobId: string): Subscription {
  return {
    ...sub,
    credits: sub.credits.map((c) =>
      c.id === creditId ? { ...c, status: "used" as const, usedForJobId: jobId, usedAt: new Date().toISOString() } : c
    ),
  };
}

/** Check if subscription is near renewal (within 30 days) */
export function isNearRenewal(sub: Subscription): boolean {
  return new Date(sub.renewalDate) <= new Date();
}

/** Check if subscription is expired */
export function isExpired(sub: Subscription): boolean {
  return new Date(sub.expiryDate) < new Date();
}

/** Get dispatch priority bonus for subscriber */
export function getSubscriberDispatchBonus(sub: Subscription | undefined): number {
  if (!sub || sub.status !== "active") return 0;
  const plan = getPlanById(sub.planId);
  return plan?.priorityDispatch ? 20 : 0;
}

/** Get labor discount for subscriber */
export function getSubscriberLaborDiscount(sub: Subscription | undefined): number {
  if (!sub || sub.status !== "active") return 0;
  const plan = getPlanById(sub.planId);
  return plan?.laborDiscount || 0;
}

/** Calculate subscription analytics from a list of subscriptions */
export function computeSubscriptionAnalytics(subs: Subscription[]): SubscriptionAnalytics {
  const active = subs.filter((s) => s.status === "active");
  const expired = subs.filter((s) => s.status === "expired");
  const renewed = expired.filter((s) => subs.some((a) => a.status === "active" && a.deviceId === s.deviceId));

  const categoryDemand: Record<string, number> = {};
  for (const sub of active) {
    const plan = getPlanById(sub.planId);
    if (plan) {
      categoryDemand[plan.category] = (categoryDemand[plan.category] || 0) + 1;
    }
  }

  const totalRevenue = active.reduce((sum, s) => {
    const plan = getPlanById(s.planId);
    return sum + (plan?.annualPrice || 0);
  }, 0);

  return {
    activeSubscriptions: active.length,
    monthlyRecurringRevenue: Math.round(totalRevenue / 12),
    renewalRate: expired.length > 0 ? Math.round((renewed.length / expired.length) * 100) : 100,
    churnRate: expired.length > 0 ? Math.round(((expired.length - renewed.length) / expired.length) * 100) : 0,
    categoryDemand,
  };
}

/** Get upcoming AMC visits across all subscriptions */
export function getUpcomingVisits(subs: Subscription[]): (AmcVisit & { deviceId: string; planId: string })[] {
  const now = new Date();
  const results: (AmcVisit & { deviceId: string; planId: string })[] = [];

  for (const sub of subs) {
    if (sub.status !== "active") continue;
    for (const visit of sub.amcVisits) {
      if (visit.status === "scheduled" && new Date(visit.scheduledDate) > now) {
        results.push({ ...visit, deviceId: sub.deviceId, planId: sub.planId });
      }
    }
  }

  return results.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
}

/** AMC technician payout based on category */
export function getAmcVisitPayout(category: string): number {
  const payouts: Record<string, number> = {
    AC: 2000, CCTV: 2500, SOLAR: 3000, COPIER: 2000,
    IT: 1500, MOBILE: 1500, ROUTER: 1500,
    SMART_HOME_OFFICE: 2000, CONSUMER_ELEC: 1500,
  };
  return payouts[category] || 1500;
}
