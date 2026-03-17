/**
 * Launch Readiness Read Model — Shared data layer for all launch ops pages.
 * Provides typed interfaces and query functions for category gating, zone readiness,
 * partner readiness, communication infrastructure, trust audit, blockers, and test tracking.
 */
import { supabase } from "@/integrations/supabase/client";
import { CHANNEL_CONFIG } from "@/config/reminderChannels";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";

// ── Data Source Labeling ──
export type DataSource = "SEEDED_DATA" | "SIMULATED_DATA" | "LIVE_DATA" | "VERIFIED_LIVE_DATA";

export function detectDataSource(rowCount: number, hasRealUsers: boolean): DataSource {
  if (rowCount === 0) return "SEEDED_DATA";
  if (!hasRealUsers) return "SIMULATED_DATA";
  return "LIVE_DATA";
}

// ── Category Gating ──
export interface CategoryGating {
  code: string;
  label: string;
  partnerCount: number;
  activeZones: number;
  completedBookings: number;
  quoteFlowTested: boolean;
  disputeFlowTested: boolean;
  reminderFlowValidated: boolean;
  operatorTrainingReady: boolean;
  supportReady: boolean;
  status: "LAUNCH_READY" | "PILOT_ONLY" | "NOT_READY";
}

const CATEGORY_LABELS: Record<string, string> = {
  ac_repair: "AC Repair & Service",
  electrical: "Electrical",
  plumbing: "Plumbing",
  it_support: "IT & Computer",
  mobile_repair: "Mobile & Tablet Repair",
  electronics: "Electronics Repair",
  cctv: "CCTV & Security",
  appliance: "Home Appliances",
  solar: "Solar Systems",
  painting: "Painting",
  carpentry: "Carpentry",
  welding: "Welding",
  cleaning: "Cleaning",
  pest_control: "Pest Control",
  general: "General Maintenance",
};

export async function fetchCategoryGating(): Promise<CategoryGating[]> {
  const [partnersRes, bookingsRes] = await Promise.all([
    supabase.from("partners").select("id, categories_supported, service_zones, verification_status"),
    supabase.from("bookings").select("id, category_code, status").eq("status", "completed").limit(500),
  ]);

  const partners = partnersRes.data || [];
  const bookings = bookingsRes.data || [];
  const verified = partners.filter((p: any) => p.verification_status === "verified");

  return Object.entries(CATEGORY_LABELS).map(([code, label]) => {
    const catPartners = verified.filter((p: any) => (p.categories_supported || []).includes(code));
    const zones = new Set(catPartners.flatMap((p: any) => p.service_zones || []));
    const completedBookings = bookings.filter((b: any) => b.category_code === code).length;
    const hasPartners = catPartners.length >= 2;
    const hasZones = zones.size >= 2;
    const hasBookings = completedBookings >= 1;

    const status: CategoryGating["status"] = hasPartners && hasZones && hasBookings
      ? "LAUNCH_READY" : hasPartners ? "PILOT_ONLY" : "NOT_READY";

    return {
      code, label,
      partnerCount: catPartners.length,
      activeZones: zones.size,
      completedBookings,
      quoteFlowTested: completedBookings > 0,
      disputeFlowTested: false,
      reminderFlowValidated: false,
      operatorTrainingReady: false,
      supportReady: hasPartners,
      status,
    };
  });
}

// ── Zone Readiness ──
export interface ZoneReadiness {
  id: string;
  label: string;
  activePartners: number;
  categoriesSupported: string[];
  dispatchReliability: number;
  responseReadiness: number;
  supplyDensity: number;
  noProviderRisk: boolean;
  recommendation: "STRONG_FOR_LAUNCH" | "PILOT_ZONE" | "NEEDS_MORE_SUPPLY" | "HIGH_RISK";
}

export async function fetchZoneReadiness(): Promise<ZoneReadiness[]> {
  const { data: partners } = await supabase
    .from("partners")
    .select("id, service_zones, categories_supported, availability_status, verification_status");

  const verified = (partners || []).filter((p: any) => p.verification_status === "verified");
  const zoneLabels: Record<string, string> = {};
  COLOMBO_ZONES_DATA.forEach(z => { zoneLabels[z.id] = z.label; });

  return COLOMBO_ZONES_DATA.map(zone => {
    const zonePartners = verified.filter((p: any) => (p.service_zones || []).includes(zone.id));
    const active = zonePartners.filter((p: any) => p.availability_status !== "offline");
    const cats = [...new Set(zonePartners.flatMap((p: any) => p.categories_supported || []))];

    const density = active.length;
    const noProviderRisk = density === 0;
    const recommendation: ZoneReadiness["recommendation"] = density >= 3 && cats.length >= 3
      ? "STRONG_FOR_LAUNCH" : density >= 1 ? "PILOT_ZONE" : noProviderRisk ? "HIGH_RISK" : "NEEDS_MORE_SUPPLY";

    return {
      id: zone.id, label: zone.label,
      activePartners: active.length,
      categoriesSupported: cats,
      dispatchReliability: density >= 3 ? 85 : density >= 1 ? 60 : 0,
      responseReadiness: density >= 2 ? 75 : density >= 1 ? 50 : 0,
      supplyDensity: density,
      noProviderRisk,
      recommendation,
    };
  });
}

// ── Partner Readiness ──
export interface PartnerReadiness {
  id: string;
  name: string;
  verificationStatus: string;
  profileComplete: boolean;
  serviceZones: string[];
  categories: string[];
  responseReadiness: number;
  quoteReliability: number;
  disputeHistory: number;
  status: "READY" | "PILOT_ONLY" | "ONBOARDING_REQUIRED" | "HOLD";
}

export async function fetchPartnerReadiness(): Promise<PartnerReadiness[]> {
  const { data: partners } = await supabase
    .from("partners")
    .select("id, full_name, verification_status, categories_supported, service_zones, availability_status, acceptance_rate, cancellation_rate, rating_average, completed_jobs_count, phone_number, email, nic_number")
    .order("full_name");

  return (partners || []).map((p: any) => {
    const isVerified = p.verification_status === "verified";
    const hasProfile = !!(p.phone_number && p.full_name && (p.categories_supported || []).length > 0);
    const hasZones = (p.service_zones || []).length > 0;
    const acceptance = p.acceptance_rate ?? 0;

    const status: PartnerReadiness["status"] = isVerified && hasProfile && hasZones && acceptance >= 50
      ? "READY" : isVerified && hasProfile ? "PILOT_ONLY" : !isVerified ? "ONBOARDING_REQUIRED" : "HOLD";

    return {
      id: p.id, name: p.full_name,
      verificationStatus: p.verification_status,
      profileComplete: hasProfile,
      serviceZones: p.service_zones || [],
      categories: p.categories_supported || [],
      responseReadiness: Math.min(100, acceptance),
      quoteReliability: (p.completed_jobs_count ?? 0) > 0 ? 70 : 0,
      disputeHistory: 0,
      status,
    };
  });
}

// ── Communication Readiness ──
export interface ChannelReadiness {
  channel: string;
  displayName: string;
  uiReady: boolean;
  backendReady: boolean;
  providerConfigured: boolean;
  sandboxTested: boolean;
  productionTested: boolean;
  currentlyActive: boolean;
  fallbackConfigured: boolean;
  status: "PRODUCTION_READY" | "TEST_MODE" | "STUB_ONLY";
}

export function fetchCommunicationReadiness(): ChannelReadiness[] {
  return Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
    const isStub = cfg.stubMode;
    const isEnabled = cfg.enabled;
    const isReal = !isStub && isEnabled;

    return {
      channel: key,
      displayName: cfg.displayName,
      uiReady: true,
      backendReady: !isStub,
      providerConfigured: !isStub,
      sandboxTested: isReal,
      productionTested: false,
      currentlyActive: isEnabled,
      fallbackConfigured: true,
      status: isReal ? "TEST_MODE" as const : isStub ? "STUB_ONLY" as const : "PRODUCTION_READY" as const,
    };
  });
}

// ── Trust Audit ──
export interface TrustAuditItem {
  screen: string;
  signals: string[];
  status: "STRONG" | "ACCEPTABLE" | "NEEDS_IMPROVEMENT";
}

export function fetchTrustAudit(): TrustAuditItem[] {
  return [
    { screen: "Booking Confirmation", signals: ["Price estimate shown", "Service scope visible", "Approval checkpoint"], status: "STRONG" },
    { screen: "Tracker Page", signals: ["Real-time status updates", "ETA visible", "Partner details shown"], status: "STRONG" },
    { screen: "Quote Review", signals: ["Itemized breakdown", "Approval required", "No hidden charges badge"], status: "STRONG" },
    { screen: "Service Completion", signals: ["OTP verification", "Rating prompt", "Receipt available"], status: "ACCEPTABLE" },
    { screen: "Issue Reporting", signals: ["Report issue button visible", "Escalation path clear"], status: "ACCEPTABLE" },
    { screen: "Dispute Escalation", signals: ["Human review promised", "No auto-resolution", "Status updates"], status: "NEEDS_IMPROVEMENT" },
  ];
}

// ── Launch Blockers ──
export interface LaunchBlocker {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  owner: string;
  module: string;
  dueDate: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  notes: string;
}

export async function fetchLaunchBlockers(): Promise<LaunchBlocker[]> {
  const [catData, channelData] = await Promise.all([
    fetchCategoryGating(),
    Promise.resolve(fetchCommunicationReadiness()),
  ]);

  const blockers: LaunchBlocker[] = [];

  // Categories with zero partners
  catData.filter(c => c.partnerCount === 0).forEach(c => {
    blockers.push({
      id: `cat-${c.code}`, title: `${c.label}: No partners onboarded`,
      severity: "CRITICAL", owner: "Operations", module: "Supply",
      dueDate: "Before Launch", status: "OPEN", notes: "Category cannot accept bookings without partners",
    });
  });

  // Stub channels
  channelData.filter(c => c.status === "STUB_ONLY" && c.currentlyActive).forEach(c => {
    blockers.push({
      id: `channel-${c.channel}`, title: `${c.displayName}: Provider not integrated`,
      severity: c.channel === "whatsapp" ? "HIGH" : "MEDIUM", owner: "Engineering", module: "Communication",
      dueDate: "Before Launch", status: "OPEN", notes: `${c.displayName} adapter is in stub mode`,
    });
  });

  // No real bookings
  const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed");
  if ((count ?? 0) === 0) {
    blockers.push({
      id: "no-completed-bookings", title: "No completed real bookings",
      severity: "CRITICAL", owner: "Operations", module: "Core Flow",
      dueDate: "Before Launch", status: "OPEN", notes: "End-to-end booking lifecycle has not been validated with real data",
    });
  }

  // Payment flow
  blockers.push({
    id: "payment-validation", title: "Payment flow not validated end-to-end",
    severity: "HIGH", owner: "Engineering", module: "Payments",
    dueDate: "Before Launch", status: "OPEN", notes: "No payment gateway integration confirmed for production",
  });

  return blockers.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ── Pilot Test Tracker ──
export interface PilotTest {
  id: string;
  name: string;
  category: string;
  status: "PASS" | "FAIL" | "PENDING";
  owner: string;
  lastTestDate: string | null;
  notes: string;
  isBlocker: boolean;
}

export function fetchPilotTests(): PilotTest[] {
  return [
    { id: "t1", name: "Booking Creation Flow", category: "Core", status: "PENDING", owner: "QA", lastTestDate: null, notes: "Create booking for each category", isBlocker: true },
    { id: "t2", name: "Dispatch & Partner Matching", category: "Dispatch", status: "PENDING", owner: "QA", lastTestDate: null, notes: "Verify partner gets offer, accepts", isBlocker: true },
    { id: "t3", name: "Quote Submission & Approval", category: "Quote", status: "PENDING", owner: "QA", lastTestDate: null, notes: "Partner submits quote, customer approves", isBlocker: true },
    { id: "t4", name: "Revised Quote Approval", category: "Quote", status: "PENDING", owner: "QA", lastTestDate: null, notes: "Extra work scenario", isBlocker: false },
    { id: "t5", name: "Service Completion + OTP", category: "Core", status: "PENDING", owner: "QA", lastTestDate: null, notes: "End-to-end completion with OTP", isBlocker: true },
    { id: "t6", name: "Issue Reporting", category: "Support", status: "PENDING", owner: "Support", lastTestDate: null, notes: "Customer reports issue mid-job", isBlocker: true },
    { id: "t7", name: "Reminder Generation", category: "Automation", status: "PENDING", owner: "Engineering", lastTestDate: null, notes: "Verify reminder jobs created", isBlocker: false },
    { id: "t8", name: "Callback Task Creation", category: "Automation", status: "PENDING", owner: "Operations", lastTestDate: null, notes: "Escalation creates operator task", isBlocker: false },
    { id: "t9", name: "Dispute Escalation Flow", category: "Support", status: "PENDING", owner: "Support", lastTestDate: null, notes: "Full dispute lifecycle", isBlocker: true },
    { id: "t10", name: "Payment Collection", category: "Payments", status: "PENDING", owner: "Engineering", lastTestDate: null, notes: "Cash / digital payment capture", isBlocker: true },
    { id: "t11", name: "Partner Onboarding Flow", category: "Partner", status: "PENDING", owner: "Operations", lastTestDate: null, notes: "New partner signup to first job", isBlocker: true },
    { id: "t12", name: "WhatsApp Notification Delivery", category: "Communication", status: "PENDING", owner: "Engineering", lastTestDate: null, notes: "Live provider test", isBlocker: false },
  ];
}

// ── Enhanced Command Center Scorecards ──
export interface ReadinessScorecard {
  key: string;
  label: string;
  score: number;
  built: boolean;
  integrated: boolean;
  validated: boolean;
  warningCount: number;
  criticalBlockers: number;
  lastVerified: string | null;
}

export async function fetchReadinessScorecards(): Promise<ReadinessScorecard[]> {
  const [catData, zoneData, partnerData, channelData, trustData] = await Promise.all([
    fetchCategoryGating(),
    fetchZoneReadiness(),
    fetchPartnerReadiness(),
    Promise.resolve(fetchCommunicationReadiness()),
    Promise.resolve(fetchTrustAudit()),
  ]);

  const readyCats = catData.filter(c => c.status !== "NOT_READY").length;
  const readyZones = zoneData.filter(z => z.recommendation !== "HIGH_RISK").length;
  const readyPartners = partnerData.filter(p => p.status === "READY").length;
  const liveChannels = channelData.filter(c => c.status !== "STUB_ONLY").length;
  const strongTrust = trustData.filter(t => t.status !== "NEEDS_IMPROVEMENT").length;

  return [
    { key: "supply", label: "Supply Readiness", score: Math.round((readyPartners / Math.max(1, partnerData.length)) * 100), built: true, integrated: true, validated: readyPartners > 0, warningCount: partnerData.filter(p => p.status === "HOLD").length, criticalBlockers: partnerData.filter(p => p.status === "ONBOARDING_REQUIRED").length, lastVerified: null },
    { key: "zones", label: "Zone Coverage", score: Math.round((readyZones / Math.max(1, zoneData.length)) * 100), built: true, integrated: true, validated: readyZones >= 5, warningCount: zoneData.filter(z => z.recommendation === "NEEDS_MORE_SUPPLY").length, criticalBlockers: zoneData.filter(z => z.recommendation === "HIGH_RISK").length, lastVerified: null },
    { key: "categories", label: "Category Readiness", score: Math.round((readyCats / Math.max(1, catData.length)) * 100), built: true, integrated: true, validated: readyCats >= 4, warningCount: catData.filter(c => c.status === "PILOT_ONLY").length, criticalBlockers: catData.filter(c => c.status === "NOT_READY").length, lastVerified: null },
    { key: "partners", label: "Partner Readiness", score: readyPartners > 0 ? Math.min(100, readyPartners * 15) : 0, built: true, integrated: true, validated: readyPartners >= 5, warningCount: 0, criticalBlockers: readyPartners === 0 ? 1 : 0, lastVerified: null },
    { key: "comms", label: "Communication Systems", score: Math.round((liveChannels / Math.max(1, channelData.length)) * 100), built: true, integrated: liveChannels >= 2, validated: false, warningCount: channelData.filter(c => c.status === "STUB_ONLY").length, criticalBlockers: 0, lastVerified: null },
    { key: "payment", label: "Payment Systems", score: 30, built: true, integrated: false, validated: false, warningCount: 1, criticalBlockers: 1, lastVerified: null },
    { key: "operators", label: "Operator Readiness", score: 40, built: true, integrated: true, validated: false, warningCount: 1, criticalBlockers: 0, lastVerified: null },
    { key: "trust", label: "Trust & Support Systems", score: Math.round((strongTrust / Math.max(1, trustData.length)) * 100), built: true, integrated: true, validated: strongTrust >= 4, warningCount: trustData.filter(t => t.status === "NEEDS_IMPROVEMENT").length, criticalBlockers: 0, lastVerified: null },
    { key: "reminders", label: "Reminder Engine", score: 75, built: true, integrated: true, validated: false, warningCount: 1, criticalBlockers: 0, lastVerified: null },
    { key: "ai", label: "AI Advisory Systems", score: 70, built: true, integrated: true, validated: false, warningCount: 0, criticalBlockers: 0, lastVerified: null },
  ];
}
