/**
 * LankaFix Milestone Payment Engine
 * Multi-stage payment milestones for project installations (CCTV, Solar, Smart Home/Office).
 */
import type { CategoryCode } from "@/types/booking";
import { CATEGORY_TIER_MAP, calculateCommission } from "./commissionEngine";

// ─── Milestone Definitions ──────────────────────────────────────

export interface MilestoneDefinition {
  id: string;
  label: string;
  description: string;
  percentOfTotal: number;
  requiresApproval: boolean;
  /** Which booking statuses trigger this milestone */
  triggerStatuses: string[];
}

export interface MilestonePayment {
  milestoneId: string;
  label: string;
  amount: number;
  percentOfTotal: number;
  status: "pending" | "due" | "paid" | "overdue";
  paidAt?: string;
  paidMethod?: string;
  reference?: string;
}

export interface MilestoneSchedule {
  projectValue: number;
  categoryCode: CategoryCode;
  milestones: MilestonePayment[];
  totalPaid: number;
  totalRemaining: number;
  commissionOnFullValue: number;
}

// ─── Default Milestone Templates ────────────────────────────────

const PROJECT_MILESTONES: MilestoneDefinition[] = [
  {
    id: "ms_inspection",
    label: "Inspection & Design Approval",
    description: "Site inspection, system design, and customer approval",
    percentOfTotal: 10,
    requiresApproval: true,
    triggerStatuses: ["quote_approved"],
  },
  {
    id: "ms_equipment",
    label: "Equipment & Material Delivery",
    description: "Procurement and delivery of all required equipment",
    percentOfTotal: 40,
    requiresApproval: true,
    triggerStatuses: ["repair_started"],
  },
  {
    id: "ms_installation",
    label: "Installation Completion",
    description: "Full installation and system setup",
    percentOfTotal: 40,
    requiresApproval: true,
    triggerStatuses: ["completed"],
  },
  {
    id: "ms_handover",
    label: "Testing & Handover",
    description: "System testing, demonstration, and customer handover",
    percentOfTotal: 10,
    requiresApproval: true,
    triggerStatuses: ["rated"],
  },
];

const MEDIUM_MILESTONES: MilestoneDefinition[] = [
  {
    id: "ms_deposit",
    label: "Booking Confirmation",
    description: "Deposit to confirm booking and parts procurement",
    percentOfTotal: 30,
    requiresApproval: false,
    triggerStatuses: ["assigned"],
  },
  {
    id: "ms_completion",
    label: "Service Completion",
    description: "Balance payment on successful completion",
    percentOfTotal: 70,
    requiresApproval: true,
    triggerStatuses: ["completed"],
  },
];

// ─── Milestone Schedule Generator ───────────────────────────────

export function isProjectCategory(categoryCode: CategoryCode): boolean {
  return CATEGORY_TIER_MAP[categoryCode] === "project_install";
}

export function isMilestoneEligible(categoryCode: CategoryCode): boolean {
  const tier = CATEGORY_TIER_MAP[categoryCode];
  return tier === "project_install" || tier === "medium_repair";
}

export function generateMilestoneSchedule(
  categoryCode: CategoryCode,
  projectValue: number
): MilestoneSchedule {
  const tier = CATEGORY_TIER_MAP[categoryCode];
  const templates = tier === "project_install" ? PROJECT_MILESTONES : MEDIUM_MILESTONES;
  const commission = calculateCommission(categoryCode, projectValue);

  const milestones: MilestonePayment[] = templates.map((t) => ({
    milestoneId: t.id,
    label: t.label,
    amount: Math.round(projectValue * (t.percentOfTotal / 100)),
    percentOfTotal: t.percentOfTotal,
    status: "pending",
  }));

  return {
    projectValue,
    categoryCode,
    milestones,
    totalPaid: 0,
    totalRemaining: projectValue,
    commissionOnFullValue: commission.commissionAmount,
  };
}

export function payMilestone(
  schedule: MilestoneSchedule,
  milestoneId: string,
  method: string,
  reference?: string
): MilestoneSchedule {
  const updatedMilestones = schedule.milestones.map((m) => {
    if (m.milestoneId === milestoneId && m.status !== "paid") {
      return {
        ...m,
        status: "paid" as const,
        paidAt: new Date().toISOString(),
        paidMethod: method,
        reference,
      };
    }
    return m;
  });

  const totalPaid = updatedMilestones
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + m.amount, 0);

  return {
    ...schedule,
    milestones: updatedMilestones,
    totalPaid,
    totalRemaining: schedule.projectValue - totalPaid,
  };
}

export function getNextDueMilestone(schedule: MilestoneSchedule): MilestonePayment | null {
  return schedule.milestones.find((m) => m.status === "pending" || m.status === "due") ?? null;
}

export function getMilestoneProgress(schedule: MilestoneSchedule): number {
  const paidCount = schedule.milestones.filter((m) => m.status === "paid").length;
  return Math.round((paidCount / schedule.milestones.length) * 100);
}
