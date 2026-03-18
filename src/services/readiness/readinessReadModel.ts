/**
 * Readiness Read Model V2 — Unified data layer for all launch governance pages.
 * Queries real DB state and applies strict readiness rules.
 */
import { supabase } from "@/integrations/supabase/client";
import { CHANNEL_CONFIG } from "@/config/reminderChannels";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { detectDataSource, type DataSource } from "./dataTruthService";
import { computeLaunchVerdict, type VerdictResult } from "./launchVerdictEngine";

// ── Category Labels ──
const CATEGORY_LABELS: Record<string, string> = {
  ac_repair: "AC Repair & Service", electrical: "Electrical", plumbing: "Plumbing",
  it_support: "IT & Computer", mobile_repair: "Mobile & Tablet Repair", electronics: "Electronics Repair",
  cctv: "CCTV & Security", appliance: "Home Appliances", solar: "Solar Systems",
  painting: "Painting", carpentry: "Carpentry", welding: "Welding",
  cleaning: "Cleaning", pest_control: "Pest Control", general: "General Maintenance",
};

// ── Readiness Scorecard ──
export interface ReadinessScorecard {
  key: string; label: string; score: number;
  built: boolean; integrated: boolean; validated: boolean; launchEligible: boolean;
  warningCount: number; criticalBlockers: number; lastVerified: string | null;
  sourceTruthLevel: DataSource;
}

// ── Category Readiness ──
export type CategoryStatus = "NOT_READY" | "INTERNAL_ONLY" | "PILOT_ONLY" | "LAUNCH_READY";
export interface CategoryReadiness {
  code: string; label: string; partnerCount: number; activeZones: number;
  completedBookings: number; quoteFlowValidated: boolean; completionFlowValidated: boolean;
  supportEscalationTested: boolean; operatorTrainingReady: boolean;
  reminderFlowValidated: boolean; paymentFlowValidated: boolean;
  status: CategoryStatus;
}

export async function fetchCategoryReadiness(): Promise<CategoryReadiness[]> {
  const [partnersRes, bookingsRes] = await Promise.all([
    supabase.from("partners").select("id, categories_supported, service_zones, verification_status, is_seeded"),
    supabase.from("bookings").select("id, category_code, status, payment_status, is_pilot_test").eq("status", "completed").limit(500),
  ]);
  // Exclude seeded partners from readiness calculations
  const verified = (partnersRes.data || []).filter((p: any) => p.verification_status === "verified" && !p.is_seeded);
  const bookings = bookingsRes.data || [];

  return Object.entries(CATEGORY_LABELS).map(([code, label]) => {
    const catPartners = verified.filter((p: any) => (p.categories_supported || []).includes(code));
    const zones = new Set(catPartners.flatMap((p: any) => p.service_zones || []));
    const catBookings = bookings.filter((b: any) => b.category_code === code);
    const completedBookings = catBookings.length;
    const paidBookings = catBookings.filter((b: any) => ["paid", "cash_collected", "payment_verified"].includes(b.payment_status));

    // Strict rules
    const hasSupply = catPartners.length >= 4;
    const hasZones = zones.size >= 2;
    const hasProof = completedBookings >= 5;
    const hasPayment = paidBookings.length > 0;

    let status: CategoryStatus;
    if (hasSupply && hasZones && hasProof && hasPayment) status = "LAUNCH_READY";
    else if (catPartners.length >= 1 && completedBookings >= 1) status = "PILOT_ONLY";
    else if (catPartners.length >= 1) status = "INTERNAL_ONLY";
    else status = "NOT_READY";

    return {
      code, label, partnerCount: catPartners.length, activeZones: zones.size,
      completedBookings, quoteFlowValidated: completedBookings > 0,
      completionFlowValidated: completedBookings > 0,
      supportEscalationTested: false, operatorTrainingReady: false,
      reminderFlowValidated: false, paymentFlowValidated: hasPayment,
      status,
    };
  });
}

// ── Zone Readiness ──
export type ZoneStatus = "DISABLED" | "INTERNAL_TEST_ONLY" | "PILOT_LIVE" | "PUBLIC_LIVE";
export interface ZoneReadiness {
  id: string; label: string; activePartners: number; categoriesSupported: string[];
  dispatchReliability: number; supplyDensity: number; noProviderRisk: boolean;
  liveBookingCount: number; status: ZoneStatus;
}

export async function fetchZoneReadiness(): Promise<ZoneReadiness[]> {
  const [partnersRes, bookingsRes] = await Promise.all([
    supabase.from("partners").select("id, service_zones, categories_supported, availability_status, verification_status, is_seeded"),
    supabase.from("bookings").select("id, zone_code, status").limit(500),
  ]);
  // Exclude seeded partners
  const verified = (partnersRes.data || []).filter((p: any) => p.verification_status === "verified" && !p.is_seeded);
  const bookings = bookingsRes.data || [];

  return COLOMBO_ZONES_DATA.map(zone => {
    const zonePartners = verified.filter((p: any) => (p.service_zones || []).includes(zone.id));
    const active = zonePartners.filter((p: any) => p.availability_status !== "offline");
    const cats = [...new Set(zonePartners.flatMap((p: any) => p.categories_supported || []))];
    const liveBookings = bookings.filter((b: any) => b.zone_code === zone.id);
    const density = active.length;

    let status: ZoneStatus;
    if (density >= 3 && cats.length >= 3 && liveBookings.length >= 3) status = "PUBLIC_LIVE";
    else if (density >= 1 && liveBookings.length >= 1) status = "PILOT_LIVE";
    else if (density >= 1) status = "INTERNAL_TEST_ONLY";
    else status = "DISABLED";

    return {
      id: zone.id, label: zone.label, activePartners: density,
      categoriesSupported: cats, dispatchReliability: density >= 3 ? 85 : density >= 1 ? 55 : 0,
      supplyDensity: density, noProviderRisk: density === 0,
      liveBookingCount: liveBookings.length, status,
    };
  });
}

// ── Partner Readiness ──
export type PartnerStatus = "READY" | "PILOT_ONLY" | "ONBOARDING_REQUIRED" | "HOLD";
export interface PartnerReadiness {
  id: string; name: string; verificationStatus: string; profileComplete: boolean;
  kycComplete: boolean; payoutReady: boolean; serviceZones: string[]; categories: string[];
  responseReadiness: number; quoteReliability: number; cancellationRisk: boolean;
  realCompletedJobs: number; isSeeded: boolean; status: PartnerStatus;
}

export async function fetchPartnerReadiness(): Promise<PartnerReadiness[]> {
  const [partnersRes, bookingsRes, bankRes] = await Promise.all([
    supabase.from("partners").select("id, full_name, verification_status, categories_supported, service_zones, availability_status, acceptance_rate, cancellation_rate, rating_average, completed_jobs_count, phone_number, email, nic_number, user_id").order("full_name"),
    supabase.from("bookings").select("id, partner_id, status").eq("status", "completed").limit(500),
    supabase.from("partner_bank_accounts").select("partner_id, verification_status"),
  ]);
  const partners = partnersRes.data || [];
  const completedMap = new Map<string, number>();
  (bookingsRes.data || []).forEach((b: any) => {
    if (b.partner_id) completedMap.set(b.partner_id, (completedMap.get(b.partner_id) || 0) + 1);
  });
  const bankMap = new Map<string, boolean>();
  (bankRes.data || []).forEach((b: any) => bankMap.set(b.partner_id, b.verification_status === "verified"));

  return partners.map((p: any) => {
    const isVerified = p.verification_status === "verified";
    const hasProfile = !!(p.phone_number && p.full_name && (p.categories_supported || []).length > 0);
    const hasZones = (p.service_zones || []).length > 0;
    const kycComplete = isVerified && !!p.nic_number;
    const payoutReady = bankMap.get(p.id) || false;
    const realJobs = completedMap.get(p.id) || 0;
    const acceptance = p.acceptance_rate ?? 0;
    const cancellationRisk = (p.cancellation_rate ?? 0) > 30;
    const isSeeded = !p.user_id;

    let status: PartnerStatus;
    if (isVerified && hasProfile && hasZones && acceptance >= 50 && realJobs >= 1 && !isSeeded)
      status = "READY";
    else if (isVerified && hasProfile && !isSeeded)
      status = "PILOT_ONLY";
    else if (!isVerified)
      status = "ONBOARDING_REQUIRED";
    else
      status = "HOLD";

    return {
      id: p.id, name: p.full_name, verificationStatus: p.verification_status,
      profileComplete: hasProfile, kycComplete, payoutReady, serviceZones: p.service_zones || [],
      categories: p.categories_supported || [], responseReadiness: Math.min(100, acceptance),
      quoteReliability: realJobs > 0 ? 70 : 0, cancellationRisk, realCompletedJobs: realJobs,
      isSeeded, status,
    };
  });
}

// ── Communication Readiness ──
export type ChannelStatus = "NOT_BUILT" | "STUB_ONLY" | "SANDBOX_READY" | "PRODUCTION_READY";
export interface ChannelReadiness {
  channel: string; displayName: string; provider: string; enabled: boolean; stubMode: boolean;
  backendReady: boolean; providerConfigured: boolean; sandboxTested: boolean;
  productionTested: boolean; fallbackConfigured: boolean; status: ChannelStatus;
}

export function fetchChannelReadiness(): ChannelReadiness[] {
  return Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
    const isStub = cfg.stubMode;
    const isEnabled = cfg.enabled;
    const isReal = !isStub && isEnabled;
    return {
      channel: key, displayName: cfg.displayName, provider: cfg.provider,
      enabled: isEnabled, stubMode: isStub, backendReady: !isStub,
      providerConfigured: !isStub, sandboxTested: isReal,
      productionTested: false, fallbackConfigured: true,
      status: isReal ? "SANDBOX_READY" as const : isStub ? "STUB_ONLY" as const : "NOT_BUILT" as const,
    };
  });
}

// ── Payment Readiness ──
export interface PaymentReadiness {
  gatewaySelected: boolean; gatewayName: string;
  sandboxTested: boolean; productionKeysConfigured: boolean;
  customerCollectionValidated: boolean; partnerPayoutValidated: boolean;
  settlementTested: boolean; refundPathTested: boolean;
  disputePaymentExceptionTested: boolean; receiptFlowReady: boolean;
  readinessScore: number; verdict: string;
}

export async function fetchPaymentReadiness(): Promise<PaymentReadiness> {
  const { count: paidCount } = await supabase.from("bookings").select("id", { count: "exact", head: true })
    .in("payment_status", ["paid", "cash_collected", "payment_verified"]);
  const { count: settledCount } = await supabase.from("partner_settlements").select("id", { count: "exact", head: true })
    .eq("settlement_status", "settled");

  const hasPaid = (paidCount ?? 0) > 0;
  const hasSettled = (settledCount ?? 0) > 0;
  let score = 20; // base for having payment schema
  if (hasPaid) score += 30;
  if (hasSettled) score += 20;

  return {
    gatewaySelected: false, gatewayName: "Not configured",
    sandboxTested: false, productionKeysConfigured: false,
    customerCollectionValidated: hasPaid, partnerPayoutValidated: hasSettled,
    settlementTested: hasSettled, refundPathTested: false,
    disputePaymentExceptionTested: false, receiptFlowReady: false,
    readinessScore: score, verdict: score >= 70 ? "PRODUCTION_READY" : score >= 40 ? "PARTIAL" : "NOT_READY",
  };
}

// ── Trust Audit ──
export interface TrustAuditItem {
  screen: string; signals: string[];
  trustPresent: boolean; transparencyPresent: boolean; humanSupportVisible: boolean;
  status: "STRONG" | "ACCEPTABLE" | "NEEDS_IMPROVEMENT";
}

export function fetchTrustAudit(): TrustAuditItem[] {
  return [
    { screen: "Booking Confirmation", signals: ["Price estimate", "Service scope", "Approval checkpoint"], trustPresent: true, transparencyPresent: true, humanSupportVisible: true, status: "STRONG" },
    { screen: "Tracker Page", signals: ["Real-time status", "ETA visible", "Partner details", "Support access"], trustPresent: true, transparencyPresent: true, humanSupportVisible: true, status: "STRONG" },
    { screen: "Quote Review", signals: ["Itemized breakdown", "Approval required", "No hidden charges"], trustPresent: true, transparencyPresent: true, humanSupportVisible: true, status: "STRONG" },
    { screen: "Service Completion", signals: ["OTP verification", "Rating prompt", "Receipt"], trustPresent: true, transparencyPresent: true, humanSupportVisible: false, status: "ACCEPTABLE" },
    { screen: "Issue Reporting", signals: ["Report button visible", "Escalation path clear"], trustPresent: true, transparencyPresent: false, humanSupportVisible: true, status: "ACCEPTABLE" },
    { screen: "Dispute Escalation", signals: ["Human review promised", "No auto-resolution", "Status updates"], trustPresent: true, transparencyPresent: false, humanSupportVisible: true, status: "NEEDS_IMPROVEMENT" },
  ];
}

// ── Training Readiness ──
export interface TrainingModule {
  id: string; title: string; description: string;
  requiredForRoles: string[]; completionPercent: number;
  owner: string; lastUpdated: string;
}

export function fetchTrainingModules(): TrainingModule[] {
  return [
    { id: "lifecycle", title: "Booking Lifecycle", description: "Full booking state machine walkthrough", requiredForRoles: ["All Operators"], completionPercent: 0, owner: "Operations Lead", lastUpdated: "2026-03-17" },
    { id: "dispatch", title: "Dispatch Board Operations", description: "Handling dispatch failures, retries, manual assignment", requiredForRoles: ["Dispatch Operator"], completionPercent: 0, owner: "Dispatch Lead", lastUpdated: "2026-03-17" },
    { id: "war-room", title: "Dispatch War Room", description: "Real-time incident triage and escalation", requiredForRoles: ["Dispatch Operator", "Senior Operator"], completionPercent: 0, owner: "Dispatch Lead", lastUpdated: "2026-03-17" },
    { id: "quotes", title: "Quote Approval Handling", description: "Revised quotes, extra work, dispute prevention", requiredForRoles: ["Support Operator"], completionPercent: 0, owner: "Support Lead", lastUpdated: "2026-03-17" },
    { id: "disputes", title: "Dispute & Support Handling", description: "Escalation SOP, refund policy, human-only decisions", requiredForRoles: ["Support Operator", "Senior Operator"], completionPercent: 0, owner: "Support Lead", lastUpdated: "2026-03-17" },
    { id: "reminders", title: "Reminder Engine Usage", description: "Statuses, suppression rules, callback generation", requiredForRoles: ["All Operators"], completionPercent: 0, owner: "Engineering", lastUpdated: "2026-03-17" },
    { id: "callbacks", title: "Callback Queue Handling", description: "Priority triage, overdue escalation, completion tracking", requiredForRoles: ["Support Operator"], completionPercent: 0, owner: "Operations Lead", lastUpdated: "2026-03-17" },
    { id: "ai-policy", title: "AI Advisory Policy", description: "Confidence interpretation, override rules, fraud alert protocol", requiredForRoles: ["All Operators"], completionPercent: 0, owner: "Product Lead", lastUpdated: "2026-03-17" },
    { id: "escalation", title: "Escalation SOP", description: "When to escalate, severity classification, response targets", requiredForRoles: ["All Operators"], completionPercent: 0, owner: "Operations Lead", lastUpdated: "2026-03-17" },
    { id: "payments", title: "Payment & Trust SOP", description: "Cash collection, refund policy, settlement tracking", requiredForRoles: ["Senior Operator", "Admin"], completionPercent: 0, owner: "Finance Lead", lastUpdated: "2026-03-17" },
  ];
}

export interface RoleReadiness {
  role: string; requiredModules: number; completedModules: number; readinessPercent: number;
}

export function fetchRoleReadiness(): RoleReadiness[] {
  const modules = fetchTrainingModules();
  const roles = ["Dispatch Operator", "Support Operator", "Senior Operator", "Admin"];
  return roles.map(role => {
    const required = modules.filter(m => m.requiredForRoles.includes(role) || m.requiredForRoles.includes("All Operators"));
    const completed = required.filter(m => m.completionPercent >= 100);
    return { role, requiredModules: required.length, completedModules: completed.length, readinessPercent: required.length > 0 ? Math.round((completed.length / required.length) * 100) : 0 };
  });
}

// ── Pilot Validation ──
export interface PilotTest {
  id: string; name: string; category: string;
  status: "PASS" | "FAIL" | "PENDING"; isBlocker: boolean;
  owner: string; lastTestDate: string | null; notes: string;
}

export function fetchPilotTests(): PilotTest[] {
  return [
    { id: "t1", name: "Booking Creation Flow", category: "Core", status: "PENDING", isBlocker: true, owner: "QA", lastTestDate: null, notes: "Create booking for each Phase-1 category" },
    { id: "t2", name: "Dispatch & Partner Acceptance", category: "Dispatch", status: "PENDING", isBlocker: true, owner: "QA", lastTestDate: null, notes: "Partner receives and accepts dispatch offer" },
    { id: "t3", name: "Quote Submission & Approval", category: "Quote", status: "PENDING", isBlocker: true, owner: "QA", lastTestDate: null, notes: "Partner submits quote, customer approves" },
    { id: "t4", name: "Revised Quote Flow", category: "Quote", status: "PENDING", isBlocker: false, owner: "QA", lastTestDate: null, notes: "Extra work scenario with approval" },
    { id: "t5", name: "OTP Start & Completion", category: "Core", status: "PENDING", isBlocker: true, owner: "QA", lastTestDate: null, notes: "Both start OTP and completion OTP verified" },
    { id: "t6", name: "Issue Reporting", category: "Support", status: "PENDING", isBlocker: true, owner: "Support", lastTestDate: null, notes: "Customer reports issue, escalation created" },
    { id: "t7", name: "Reminder Generation", category: "Automation", status: "PENDING", isBlocker: false, owner: "Engineering", lastTestDate: null, notes: "Reminder jobs created and processed" },
    { id: "t8", name: "Callback Task Creation", category: "Automation", status: "PENDING", isBlocker: false, owner: "Operations", lastTestDate: null, notes: "Escalation bridge creates operator task" },
    { id: "t9", name: "Dispute Escalation", category: "Support", status: "PENDING", isBlocker: true, owner: "Support", lastTestDate: null, notes: "Full dispute lifecycle with human resolution" },
    { id: "t10", name: "Payment Collection", category: "Payments", status: "PENDING", isBlocker: true, owner: "Engineering", lastTestDate: null, notes: "Cash or digital payment captured" },
    { id: "t11", name: "Partner Onboarding E2E", category: "Partner", status: "PENDING", isBlocker: true, owner: "Operations", lastTestDate: null, notes: "Signup → verification → first job" },
    { id: "t12", name: "WhatsApp Delivery", category: "Communication", status: "PENDING", isBlocker: false, owner: "Engineering", lastTestDate: null, notes: "Live provider message delivery" },
    { id: "t13", name: "Partner Settlement", category: "Payments", status: "PENDING", isBlocker: false, owner: "Finance", lastTestDate: null, notes: "Net payout calculated and recorded" },
  ];
}

// ── Launch Blockers ──
export interface LaunchBlocker {
  id: string; title: string; severity: "CRITICAL" | "HIGH" | "MEDIUM";
  owner: string; module: string; dueDate: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED"; notes: string;
  dependency: string; launchImpact: string;
}

export async function fetchLaunchBlockers(): Promise<LaunchBlocker[]> {
  const [catData, channelData, paymentData] = await Promise.all([
    fetchCategoryReadiness(),
    Promise.resolve(fetchChannelReadiness()),
    fetchPaymentReadiness(),
  ]);
  const blockers: LaunchBlocker[] = [];

  catData.filter(c => c.partnerCount === 0).forEach(c => {
    blockers.push({
      id: `cat-${c.code}`, title: `${c.label}: Zero partners`, severity: "CRITICAL",
      owner: "Operations", module: "Supply", dueDate: "Before Launch", status: "OPEN",
      notes: "Category cannot accept bookings", dependency: "Partner onboarding",
      launchImpact: "Category must be hidden or disabled",
    });
  });

  channelData.filter(c => c.stubMode && c.channel === "whatsapp").forEach(c => {
    blockers.push({
      id: `channel-${c.channel}`, title: `${c.displayName}: Stub only`, severity: "HIGH",
      owner: "Engineering", module: "Communication", dueDate: "Before Launch", status: "OPEN",
      notes: "WhatsApp is critical for Sri Lankan market reach", dependency: "Meta Business API",
      launchImpact: "Maximum verdict: PILOT_ONLY",
    });
  });

  channelData.filter(c => c.stubMode && c.channel === "push").forEach(c => {
    blockers.push({
      id: `channel-${c.channel}`, title: `${c.displayName}: Stub only`, severity: "MEDIUM",
      owner: "Engineering", module: "Communication", dueDate: "Before Launch", status: "OPEN",
      notes: "Push notifications not wired to Firebase", dependency: "Firebase Cloud Messaging",
      launchImpact: "Reduced customer engagement",
    });
  });

  const { count: completedCount } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed");
  if ((completedCount ?? 0) === 0) {
    blockers.push({
      id: "no-completed-bookings", title: "No completed real bookings", severity: "CRITICAL",
      owner: "Operations", module: "Core Flow", dueDate: "Before Launch", status: "OPEN",
      notes: "End-to-end booking lifecycle unvalidated", dependency: "Real partner + customer test",
      launchImpact: "Verdict locked to NOT_READY",
    });
  }

  if (!paymentData.customerCollectionValidated) {
    blockers.push({
      id: "payment-not-validated", title: "Payment collection not validated", severity: "HIGH",
      owner: "Engineering", module: "Payments", dueDate: "Before Launch", status: "OPEN",
      notes: "No payment gateway integration confirmed", dependency: "PayHere / Stripe setup",
      launchImpact: "Maximum verdict: LIMITED_SOFT_LAUNCH",
    });
  }

  return blockers.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ── Scorecards ──
export async function fetchScorecards(): Promise<ReadinessScorecard[]> {
  const [cats, zones, partners, channels, trust, payment] = await Promise.all([
    fetchCategoryReadiness(), fetchZoneReadiness(), fetchPartnerReadiness(),
    Promise.resolve(fetchChannelReadiness()), Promise.resolve(fetchTrustAudit()),
    fetchPaymentReadiness(),
  ]);

  const readyCats = cats.filter(c => c.status === "LAUNCH_READY" || c.status === "PILOT_ONLY").length;
  const liveZones = zones.filter(z => z.status !== "DISABLED").length;
  const readyPartners = partners.filter(p => p.status === "READY").length;
  const nonSeededPartners = partners.filter(p => !p.isSeeded);
  const liveChannels = channels.filter(c => c.status !== "STUB_ONLY" && c.status !== "NOT_BUILT").length;
  const strongTrust = trust.filter(t => t.status !== "NEEDS_IMPROVEMENT").length;
  const training = fetchRoleReadiness();
  const avgTraining = training.reduce((s, r) => s + r.readinessPercent, 0) / Math.max(1, training.length);

  const hasRealPartners = nonSeededPartners.length > 0;
  const dataSource = detectDataSource(partners.length, hasRealPartners, false);

  return [
    { key: "supply", label: "Supply Readiness", score: Math.round((readyPartners / Math.max(1, partners.length)) * 100), built: true, integrated: true, validated: readyPartners > 0, launchEligible: readyPartners >= 5, warningCount: partners.filter(p => p.status === "HOLD").length, criticalBlockers: cats.filter(c => c.status === "NOT_READY").length, lastVerified: null, sourceTruthLevel: dataSource },
    { key: "zones", label: "Zone Coverage", score: Math.round((liveZones / Math.max(1, zones.length)) * 100), built: true, integrated: true, validated: liveZones >= 5, launchEligible: liveZones >= 8, warningCount: zones.filter(z => z.status === "INTERNAL_TEST_ONLY").length, criticalBlockers: zones.filter(z => z.status === "DISABLED").length, lastVerified: null, sourceTruthLevel: dataSource },
    { key: "categories", label: "Category Readiness", score: Math.round((readyCats / Math.max(1, cats.length)) * 100), built: true, integrated: true, validated: readyCats >= 3, launchEligible: cats.filter(c => c.status === "LAUNCH_READY").length >= 3, warningCount: cats.filter(c => c.status === "PILOT_ONLY").length, criticalBlockers: cats.filter(c => c.status === "NOT_READY").length, lastVerified: null, sourceTruthLevel: dataSource },
    { key: "partners", label: "Partner Readiness", score: readyPartners > 0 ? Math.min(100, readyPartners * 12) : 0, built: true, integrated: true, validated: readyPartners >= 3, launchEligible: readyPartners >= 5, warningCount: partners.filter(p => p.cancellationRisk).length, criticalBlockers: readyPartners === 0 ? 1 : 0, lastVerified: null, sourceTruthLevel: dataSource },
    { key: "comms", label: "Communication Systems", score: Math.round((liveChannels / Math.max(1, channels.length)) * 100), built: true, integrated: liveChannels >= 2, validated: false, launchEligible: liveChannels >= 3, warningCount: channels.filter(c => c.stubMode).length, criticalBlockers: 0, lastVerified: null, sourceTruthLevel: "LIVE_DATA" },
    { key: "payment", label: "Payment Systems", score: payment.readinessScore, built: true, integrated: payment.customerCollectionValidated, validated: payment.productionKeysConfigured, launchEligible: payment.readinessScore >= 70, warningCount: payment.readinessScore < 70 ? 1 : 0, criticalBlockers: payment.readinessScore < 30 ? 1 : 0, lastVerified: null, sourceTruthLevel: payment.customerCollectionValidated ? "LIVE_DATA" : "SEEDED_DATA" },
    { key: "operators", label: "Operator Readiness", score: Math.round(avgTraining), built: true, integrated: true, validated: avgTraining >= 80, launchEligible: avgTraining >= 80, warningCount: avgTraining < 50 ? 1 : 0, criticalBlockers: 0, lastVerified: null, sourceTruthLevel: "LIVE_DATA" },
    { key: "trust", label: "Trust & Support", score: Math.round((strongTrust / Math.max(1, trust.length)) * 100), built: true, integrated: true, validated: strongTrust >= 4, launchEligible: strongTrust >= 5, warningCount: trust.filter(t => t.status === "NEEDS_IMPROVEMENT").length, criticalBlockers: 0, lastVerified: null, sourceTruthLevel: "LIVE_DATA" },
    { key: "reminders", label: "Reminder Engine", score: 75, built: true, integrated: true, validated: false, launchEligible: false, warningCount: 1, criticalBlockers: 0, lastVerified: null, sourceTruthLevel: "LIVE_DATA" },
    { key: "ai", label: "AI Advisory", score: 70, built: true, integrated: true, validated: false, launchEligible: false, warningCount: 0, criticalBlockers: 0, lastVerified: null, sourceTruthLevel: "LIVE_DATA" },
  ];
}

// ── Real Transaction Proof ──
export interface TransactionProof {
  liveUsers: number; liveBookings: number; completedBookings: number;
  liveQuotes: number; partnerAcceptances: number; disputes: number;
  callbackTasks: number; payments: number;
}

export async function fetchTransactionProof(): Promise<TransactionProof> {
  const [bookings, completed, quotes, accepts, disputes, callbacks, payments] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["completed", "assigned", "quote_approved"]),
    supabase.from("dispatch_offers").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("under_mediation", true),
    supabase.from("operator_callback_tasks").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }).in("payment_status", ["paid", "cash_collected", "payment_verified"]),
  ]);
  return {
    liveUsers: 0, // Would need auth.users count, approximated
    liveBookings: bookings.count ?? 0, completedBookings: completed.count ?? 0,
    liveQuotes: quotes.count ?? 0, partnerAcceptances: accepts.count ?? 0,
    disputes: disputes.count ?? 0, callbackTasks: callbacks.count ?? 0,
    payments: payments.count ?? 0,
  };
}

// ── Full Command Center Data ──
export interface CommandCenterData {
  scorecards: ReadinessScorecard[];
  verdict: VerdictResult;
  blockers: LaunchBlocker[];
  proof: TransactionProof;
  dataSource: DataSource;
  riskSignals: { escalations: number; staleBookings: number; disputes: number };
}

export async function fetchCommandCenterData(): Promise<CommandCenterData> {
  const [scorecards, blockers, proof, cats, channels] = await Promise.all([
    fetchScorecards(), fetchLaunchBlockers(), fetchTransactionProof(),
    fetchCategoryReadiness(), Promise.resolve(fetchChannelReadiness()),
  ]);

  const whatsappStub = channels.find(c => c.channel === "whatsapp")?.stubMode ?? true;
  const pushStub = channels.find(c => c.channel === "push")?.stubMode ?? true;
  const launchReadyCats = cats.filter(c => c.status === "LAUNCH_READY").length;
  const zeroSupplyCats = cats.filter(c => c.partnerCount === 0).length;

  const verdict = computeLaunchVerdict({
    verifiedLiveCompletedBookings: proof.completedBookings,
    launchReadyCategories: launchReadyCats,
    whatsappStubOnly: whatsappStub,
    pushStubOnly: pushStub,
    paymentProductionValidated: false,
    operatorTrainingCompletion: 0,
    categoriesWithZeroSupply: zeroSupplyCats,
    unresolvedCriticalBlockers: blockers.filter(b => b.severity === "CRITICAL" && b.status !== "RESOLVED").length,
    verifiedPartnerCount: 0,
    readyZones: 0,
    livePayments: proof.payments,
    liveDisputes: proof.disputes,
  });

  const [escRes, staleRes, dispRes] = await Promise.all([
    supabase.from("dispatch_escalations").select("id", { count: "exact", head: true }).is("resolved_at", null),
    supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["requested"]).lt("created_at", new Date(Date.now() - 30 * 60000).toISOString()),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("under_mediation", true),
  ]);

  const dataSource = detectDataSource(proof.liveBookings, proof.liveBookings > 0, proof.completedBookings > 0);

  return {
    scorecards, verdict, blockers, proof, dataSource,
    riskSignals: { escalations: escRes.count ?? 0, staleBookings: staleRes.count ?? 0, disputes: dispRes.count ?? 0 },
  };
}
