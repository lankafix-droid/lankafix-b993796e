/**
 * LankaFix Provider ERP Store — Stage 12
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ProviderProfile, TechnicianProfile, FleetSummary,
  ProviderPerformanceMetrics, ServiceChecklistItem, JobDispute,
  TechnicianShift,
} from "@/types/provider";
import { SERVICE_CHECKLISTS } from "@/types/provider";
import type { CategoryCode } from "@/types/booking";
import { MOCK_PARTNERS, MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import { TECHNICIAN_CAPABILITIES } from "@/lib/dispatchEngine";
import { track } from "@/lib/analytics";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

const DEFAULT_SHIFT: TechnicianShift = {
  startTime: "09:00", endTime: "18:00",
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
};

// Build initial technician profiles from mock data
function buildTechProfiles(): TechnicianProfile[] {
  return MOCK_TECHNICIANS.map((t) => {
    const caps = TECHNICIAN_CAPABILITIES[t.technicianId || ""];
    return {
      technicianId: t.technicianId || "",
      technicianName: t.name,
      providerId: t.partnerId || "",
      phoneNumber: `+94 7${Math.floor(10000000 + Math.random() * 90000000)}`,
      skillsCategories: t.specializations as CategoryCode[],
      yearsOfExperience: caps?.experienceYears || 3,
      certifications: caps?.certifications || [],
      currentZone: t.currentZoneId || "",
      ratingScore: t.rating,
      totalCompletedJobs: t.jobsCompleted,
      performanceScore: Math.round((t.rating / 5) * 40 + ((caps?.completionRate || 90) / 100) * 30 + ((caps?.acceptanceRate || 80) / 100) * 30),
      dailyJobCapacity: 4,
      maxConcurrentJobs: 1,
      averageJobDurationMinutes: caps?.avgResponseMinutes ? caps.avgResponseMinutes + 60 : 90,
      todayJobCount: t.activeJobsCount || 0,
      shift: { ...DEFAULT_SHIFT },
      trainingStatus: t.specializations.reduce((acc, cat) => ({ ...acc, [`${cat}_certified`]: true }), {} as Record<string, boolean>),
    };
  });
}

function buildProviderProfiles(): ProviderProfile[] {
  return MOCK_PARTNERS.map((p) => ({
    providerId: p.id,
    companyName: p.companyName,
    businessRegistrationNumber: p.licenseNumber || `BR-${p.id}`,
    serviceCategories: p.categories,
    operatingZones: p.coverageZones,
    contactPhone: `+94 11 ${Math.floor(1000000 + Math.random() * 9000000)}`,
    contactEmail: `${p.id.toLowerCase()}@lankafix.lk`,
    businessAddress: `No. ${Math.floor(1 + Math.random() * 200)}, Colombo`,
    verificationStatus: p.verified ? "verified" as const : "pending" as const,
    ratingScore: p.rating,
    totalCompletedJobs: p.jobsCompleted,
    businessHours: { start: "08:00", end: "20:00" },
    emergencyEnabled: true,
    createdAt: p.verifiedSince,
  }));
}

interface ProviderERPStore {
  providers: ProviderProfile[];
  technicians: TechnicianProfile[];
  disputes: JobDispute[];
  jobChecklists: Record<string, ServiceChecklistItem[]>; // jobId -> checklist

  // Provider management
  getProvider: (id: string) => ProviderProfile | undefined;
  updateProviderVerification: (id: string, status: "pending" | "verified" | "suspended") => void;

  // Technician management
  getTechnician: (id: string) => TechnicianProfile | undefined;
  getTechniciansByProvider: (providerId: string) => TechnicianProfile[];
  updateTechnicianShift: (techId: string, shift: TechnicianShift) => void;
  updateTechnicianCapacity: (techId: string, daily: number, concurrent: number) => void;
  incrementTodayJobCount: (techId: string) => void;

  // Fleet
  getFleetSummary: (providerId: string) => FleetSummary;

  // Performance
  getProviderPerformance: (providerId: string) => ProviderPerformanceMetrics;
  getTechnicianPerformanceScore: (techId: string) => number;

  // Checklists
  initJobChecklist: (jobId: string, categoryCode: CategoryCode) => void;
  toggleChecklistItem: (jobId: string, itemId: string) => void;
  getJobChecklist: (jobId: string) => ServiceChecklistItem[];
  isChecklistComplete: (jobId: string) => boolean;

  // Disputes
  raiseDispute: (jobId: string, raisedBy: "provider" | "technician", reason: string, description: string) => void;
  resolveDispute: (disputeId: string, resolution: string) => void;
  getDisputesForJob: (jobId: string) => JobDispute[];

  // Capacity check
  hasTechnicianCapacity: (techId: string) => boolean;
  isWithinShiftHours: (techId: string) => boolean;
}

export const useProviderERPStore = create<ProviderERPStore>()(
  persist(
    (set, get) => ({
      providers: buildProviderProfiles(),
      technicians: buildTechProfiles(),
      disputes: [],
      jobChecklists: {},

      getProvider: (id) => get().providers.find((p) => p.providerId === id),
      
      updateProviderVerification: (id, status) => {
        track("provider_verification_updated", { providerId: id, status });
        set((s) => ({
          providers: s.providers.map((p) =>
            p.providerId === id ? { ...p, verificationStatus: status } : p
          ),
        }));
      },

      getTechnician: (id) => get().technicians.find((t) => t.technicianId === id),

      getTechniciansByProvider: (providerId) =>
        get().technicians.filter((t) => t.providerId === providerId),

      updateTechnicianShift: (techId, shift) => {
        track("technician_shift_updated", { techId });
        set((s) => ({
          technicians: s.technicians.map((t) =>
            t.technicianId === techId ? { ...t, shift } : t
          ),
        }));
      },

      updateTechnicianCapacity: (techId, daily, concurrent) => {
        track("technician_capacity_updated", { techId, daily, concurrent });
        set((s) => ({
          technicians: s.technicians.map((t) =>
            t.technicianId === techId ? { ...t, dailyJobCapacity: daily, maxConcurrentJobs: concurrent } : t
          ),
        }));
      },

      incrementTodayJobCount: (techId) =>
        set((s) => ({
          technicians: s.technicians.map((t) =>
            t.technicianId === techId ? { ...t, todayJobCount: t.todayJobCount + 1 } : t
          ),
        })),

      getFleetSummary: (providerId) => {
        const techs = get().technicians.filter((t) => t.providerId === providerId);
        const storedAvail = require("@/store/bookingStore").useBookingStore.getState().techAvailability;
        const online = techs.filter((t) => (storedAvail[t.technicianId] || "available") === "available").length;
        const busy = techs.filter((t) => (storedAvail[t.technicianId] || "available") === "busy").length;
        const offline = techs.filter((t) => (storedAvail[t.technicianId]) === "offline").length;
        return {
          totalTechnicians: techs.length,
          online,
          busy,
          offline: techs.length - online - busy,
          totalCapacityToday: techs.reduce((s, t) => s + t.dailyJobCapacity, 0),
          usedCapacityToday: techs.reduce((s, t) => s + t.todayJobCount, 0),
        };
      },

      getProviderPerformance: (providerId) => {
        const techs = get().technicians.filter((t) => t.providerId === providerId);
        const avgResponse = techs.length > 0 ? Math.round(techs.reduce((s, t) => s + t.averageJobDurationMinutes, 0) / techs.length) : 0;
        const avgRating = techs.length > 0 ? Math.round(techs.reduce((s, t) => s + t.ratingScore, 0) / techs.length * 10) / 10 : 0;
        const totalJobs = techs.reduce((s, t) => s + t.totalCompletedJobs, 0);
        
        const jobsByCategory: Record<string, number> = {};
        const revenueByCategory: Record<string, number> = {};
        techs.forEach((t) => {
          t.skillsCategories.forEach((cat) => {
            jobsByCategory[cat] = (jobsByCategory[cat] || 0) + Math.round(t.totalCompletedJobs / t.skillsCategories.length);
            revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Math.round((t.totalCompletedJobs / t.skillsCategories.length) * 3500);
          });
        });

        return {
          averageResponseMinutes: avgResponse,
          jobAcceptanceRate: techs.length > 0 ? Math.round(techs.reduce((s, t) => s + t.performanceScore, 0) / techs.length) : 0,
          customerRating: avgRating,
          completionRate: 95,
          dailyJobCount: techs.reduce((s, t) => s + t.todayJobCount, 0),
          weeklyRevenue: totalJobs * 500,
          monthlyRevenue: totalJobs * 2000,
          jobsByCategory,
          revenueByCategory,
        };
      },

      getTechnicianPerformanceScore: (techId) => {
        const tech = get().technicians.find((t) => t.technicianId === techId);
        return tech?.performanceScore || 0;
      },

      initJobChecklist: (jobId, categoryCode) => {
        const items = SERVICE_CHECKLISTS[categoryCode] || [];
        const checklist: ServiceChecklistItem[] = items.map((label, i) => ({
          id: `CL-${jobId}-${i}`,
          label,
          completed: false,
        }));
        track("checklist_initialized", { jobId, categoryCode, itemCount: checklist.length });
        set((s) => ({
          jobChecklists: { ...s.jobChecklists, [jobId]: checklist },
        }));
      },

      toggleChecklistItem: (jobId, itemId) =>
        set((s) => ({
          jobChecklists: {
            ...s.jobChecklists,
            [jobId]: (s.jobChecklists[jobId] || []).map((item) =>
              item.id === itemId
                ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : undefined }
                : item
            ),
          },
        })),

      getJobChecklist: (jobId) => get().jobChecklists[jobId] || [],

      isChecklistComplete: (jobId) => {
        const cl = get().jobChecklists[jobId];
        return cl ? cl.length > 0 && cl.every((i) => i.completed) : true;
      },

      hasTechnicianCapacity: (techId) => {
        const tech = get().technicians.find((t) => t.technicianId === techId);
        if (!tech) return false;
        return tech.todayJobCount < tech.dailyJobCapacity;
      },

      isWithinShiftHours: (techId) => {
        const tech = get().technicians.find((t) => t.technicianId === techId);
        if (!tech) return false;
        const now = new Date();
        const dayMap: Record<number, string> = { 0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday" };
        const today = dayMap[now.getDay()];
        if (!tech.shift.workingDays.includes(today as any)) return false;
        const [sh, sm] = tech.shift.startTime.split(":").map(Number);
        const [eh, em] = tech.shift.endTime.split(":").map(Number);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        return nowMinutes >= sh * 60 + sm && nowMinutes <= eh * 60 + em;
      },

      raiseDispute: (jobId, raisedBy, reason, description) => {
        const dispute: JobDispute = {
          id: generateId("DSP"),
          jobId, raisedBy, reason, description,
          status: "open",
          createdAt: new Date().toISOString(),
        };
        track("dispute_raised", { jobId, raisedBy, reason });
        set((s) => ({ disputes: [...s.disputes, dispute] }));
      },

      resolveDispute: (disputeId, resolution) => {
        track("dispute_resolved", { disputeId });
        set((s) => ({
          disputes: s.disputes.map((d) =>
            d.id === disputeId ? { ...d, status: "resolved" as const, resolvedAt: new Date().toISOString(), resolution } : d
          ),
        }));
      },

      getDisputesForJob: (jobId) => get().disputes.filter((d) => d.jobId === jobId),
    }),
    { name: "lankafix-provider-erp" },
  ),
);
