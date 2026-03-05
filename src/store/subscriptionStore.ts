/**
 * LankaFix Subscription Store — Stage 11
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RegisteredDevice, Subscription, DeviceServiceRecord,
  DeviceCategoryCode, AmcVisit,
} from "@/types/subscription";
import { createSubscription, useCredit, getAvailableCredits } from "@/engines/subscriptionEngine";
import { track } from "@/lib/analytics";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

interface SubscriptionStore {
  devices: RegisteredDevice[];
  subscriptions: Subscription[];
  serviceHistory: DeviceServiceRecord[];

  // Device management
  registerDevice: (device: Omit<RegisteredDevice, "deviceId" | "createdAt">) => string;
  removeDevice: (deviceId: string) => void;
  getDevice: (deviceId: string) => RegisteredDevice | undefined;
  getDevicesByCategory: (category: DeviceCategoryCode) => RegisteredDevice[];

  // Subscription management
  subscribeToPlan: (planId: string, deviceId: string) => string;
  cancelSubscription: (subId: string) => void;
  renewSubscription: (subId: string) => void;
  getActiveSubscription: (deviceId: string) => Subscription | undefined;
  getAllActiveSubscriptions: () => Subscription[];

  // Service credits
  useServiceCredit: (subId: string, jobId: string) => void;

  // AMC visits
  completeAmcVisit: (subId: string, visitId: string, techName: string, report: string) => void;
  rescheduleAmcVisit: (subId: string, visitId: string, newDate: string) => void;

  // Service history
  addServiceRecord: (record: Omit<DeviceServiceRecord, "id">) => void;
  getDeviceHistory: (deviceId: string) => DeviceServiceRecord[];

  // Upsell helper
  shouldShowUpsell: (categoryCode: string) => boolean;
}

const MOCK_USER_ID = "user-default";

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      devices: [],
      subscriptions: [],
      serviceHistory: [],

      registerDevice: (device) => {
        const deviceId = generateId("DEV");
        const registered: RegisteredDevice = {
          ...device,
          deviceId,
          createdAt: new Date().toISOString(),
        };
        track("device_registered", { deviceId, category: device.category });
        set((s) => ({ devices: [...s.devices, registered] }));
        return deviceId;
      },

      removeDevice: (deviceId) =>
        set((s) => ({ devices: s.devices.filter((d) => d.deviceId !== deviceId) })),

      getDevice: (deviceId) => get().devices.find((d) => d.deviceId === deviceId),

      getDevicesByCategory: (category) => get().devices.filter((d) => d.category === category),

      subscribeToPlan: (planId, deviceId) => {
        const sub = createSubscription(MOCK_USER_ID, planId, deviceId);
        track("subscription_created", { planId, deviceId, subscriptionId: sub.id });
        set((s) => ({ subscriptions: [...s.subscriptions, sub] }));
        return sub.id;
      },

      cancelSubscription: (subId) => {
        track("subscription_cancelled", { subscriptionId: subId });
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) =>
            sub.id === subId ? { ...sub, status: "cancelled" as const } : sub
          ),
        }));
      },

      renewSubscription: (subId) => {
        track("subscription_renewed", { subscriptionId: subId });
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => {
            if (sub.id !== subId) return sub;
            const now = new Date();
            const expiry = new Date(now);
            expiry.setFullYear(expiry.getFullYear() + 1);
            return { ...sub, status: "active" as const, startDate: now.toISOString(), expiryDate: expiry.toISOString() };
          }),
        }));
      },

      getActiveSubscription: (deviceId) =>
        get().subscriptions.find((s) => s.deviceId === deviceId && s.status === "active"),

      getAllActiveSubscriptions: () =>
        get().subscriptions.filter((s) => s.status === "active"),

      useServiceCredit: (subId, jobId) => {
        const sub = get().subscriptions.find((s) => s.id === subId);
        if (!sub) return;
        const available = getAvailableCredits(sub);
        if (available.length === 0) return;
        track("service_credit_used", { subscriptionId: subId, jobId });
        const updated = useCredit(sub, available[0].id, jobId);
        set((s) => ({
          subscriptions: s.subscriptions.map((s2) => s2.id === subId ? updated : s2),
        }));
      },

      completeAmcVisit: (subId, visitId, techName, report) => {
        track("amc_visit_completed", { subscriptionId: subId, visitId });
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => {
            if (sub.id !== subId) return sub;
            return {
              ...sub,
              amcVisits: sub.amcVisits.map((v) =>
                v.id === visitId
                  ? { ...v, status: "completed" as const, completedAt: new Date().toISOString(), technicianName: techName, serviceReport: report, checklist: v.checklist.map((c) => ({ ...c, completed: true })) }
                  : v
              ),
            };
          }),
        }));
      },

      rescheduleAmcVisit: (subId, visitId, newDate) => {
        track("amc_visit_rescheduled", { subscriptionId: subId, visitId });
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => {
            if (sub.id !== subId) return sub;
            return {
              ...sub,
              amcVisits: sub.amcVisits.map((v) =>
                v.id === visitId ? { ...v, scheduledDate: newDate, status: "rescheduled" as const } : v
              ),
            };
          }),
        }));
      },

      addServiceRecord: (record) => {
        const id = generateId("SRV");
        set((s) => ({ serviceHistory: [...s.serviceHistory, { ...record, id }] }));
      },

      getDeviceHistory: (deviceId) => get().serviceHistory.filter((r) => r.deviceId === deviceId),

      shouldShowUpsell: (categoryCode) => {
        const devices = get().devices.filter((d) => d.category === categoryCode);
        if (devices.length === 0) return true; // No device registered yet, show upsell
        return devices.some((d) => !get().subscriptions.find((s) => s.deviceId === d.deviceId && s.status === "active"));
      },
    }),
    { name: "lankafix-subscriptions" },
  ),
);
