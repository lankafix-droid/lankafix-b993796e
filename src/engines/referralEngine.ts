/**
 * LankaFix Referral Growth Engine
 * Handles referral codes, credit tracking, and viral growth loops.
 */

export interface ReferralCode {
  code: string;
  ownerId: string;
  ownerName: string;
  ownerType: "customer" | "technician";
  createdAt: string;
  totalReferrals: number;
  totalCreditsEarned: number;
}

export interface ReferralReward {
  referrerCreditsLKR: number;
  refereeCreditsLKR: number;
  minBookingValueLKR: number;
  expiryDays: number;
}

export const REFERRAL_REWARDS: Record<string, ReferralReward> = {
  customer_to_customer: {
    referrerCreditsLKR: 500,
    refereeCreditsLKR: 300,
    minBookingValueLKR: 2000,
    expiryDays: 90,
  },
  technician_to_technician: {
    referrerCreditsLKR: 1000,
    refereeCreditsLKR: 0,
    minBookingValueLKR: 0,
    expiryDays: 180,
  },
  customer_to_technician: {
    referrerCreditsLKR: 750,
    refereeCreditsLKR: 0,
    minBookingValueLKR: 0,
    expiryDays: 180,
  },
};

export interface ReferralActivity {
  id: string;
  referrerName: string;
  refereeName: string;
  type: "customer_to_customer" | "technician_to_technician" | "customer_to_technician";
  status: "pending" | "completed" | "expired";
  creditsAwarded: number;
  createdAt: string;
  completedAt?: string;
}

export interface ReferralMetrics {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalCreditsIssued: number;
  conversionRate: number;
  topReferrers: { name: string; referrals: number; credits: number }[];
  monthlyGrowth: { month: string; referrals: number }[];
}

export function generateReferralCode(name: string): string {
  const prefix = name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LF-${prefix}-${suffix}`;
}

export function generateMockReferralMetrics(): ReferralMetrics {
  return {
    totalReferrals: 284,
    completedReferrals: 198,
    pendingReferrals: 86,
    totalCreditsIssued: 142000,
    conversionRate: 70,
    topReferrers: [
      { name: "Kasun P.", referrals: 14, credits: 7000 },
      { name: "Nimal S.", referrals: 11, credits: 5500 },
      { name: "Amaya R.", referrals: 9, credits: 4500 },
      { name: "Dinesh K.", referrals: 8, credits: 4000 },
      { name: "Sachini W.", referrals: 7, credits: 3500 },
    ],
    monthlyGrowth: [
      { month: "Oct", referrals: 22 },
      { month: "Nov", referrals: 31 },
      { month: "Dec", referrals: 45 },
      { month: "Jan", referrals: 52 },
      { month: "Feb", referrals: 68 },
      { month: "Mar", referrals: 66 },
    ],
  };
}

export function generateMockReferralActivity(): ReferralActivity[] {
  return [
    { id: "R001", referrerName: "Kasun P.", refereeName: "Tharindu M.", type: "customer_to_customer", status: "completed", creditsAwarded: 500, createdAt: "2026-03-01", completedAt: "2026-03-05" },
    { id: "R002", referrerName: "Nimal S.", refereeName: "Ruwan K.", type: "technician_to_technician", status: "completed", creditsAwarded: 1000, createdAt: "2026-03-02", completedAt: "2026-03-08" },
    { id: "R003", referrerName: "Amaya R.", refereeName: "Lakshan D.", type: "customer_to_customer", status: "pending", creditsAwarded: 0, createdAt: "2026-03-07" },
    { id: "R004", referrerName: "Dinesh K.", refereeName: "Pradeep W.", type: "customer_to_technician", status: "completed", creditsAwarded: 750, createdAt: "2026-02-28", completedAt: "2026-03-04" },
    { id: "R005", referrerName: "Sachini W.", refereeName: "Hiruni F.", type: "customer_to_customer", status: "pending", creditsAwarded: 0, createdAt: "2026-03-08" },
  ];
}
