import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────

export type ExpansionReadiness = "ready" | "promising" | "early_signal" | "insufficient_data";

export interface ExpansionCandidate {
  zoneCode: string;
  zoneLabel: string;
  readiness: ExpansionReadiness;
  score: number; // 0-100

  // Evidence
  searchesFromZone: number;
  failedBookingAttempts: number;
  waitlistSignups: number;
  nearbyPartnerCount: number;

  // Derived
  estimatedDailyDemand: number;
  partnersNeeded: number;
  recommendation: string;
  triggerReasons: string[];
}

export interface ExpansionReport {
  generatedAt: string;
  currentZoneCount: number;
  candidates: ExpansionCandidate[];
  topPriority: ExpansionCandidate | null;
}

// ─── Approved Zones (current coverage) ──────────────────────────

const CURRENT_ZONES = new Set([
  "col_01", "col_02", "col_03", "col_04", "col_05", "col_06", "col_07",
  "col_08", "col_09", "col_10", "col_11", "col_12", "col_13", "col_14", "col_15",
  "dehiwala", "mount_lavinia", "nugegoda", "maharagama", "kottawa", "piliyandala",
  "moratuwa", "ratmalana", "battaramulla", "rajagiriya", "kotte", "malabe",
  "kaduwela", "athurugiriya", "thalawathugoda", "nawala", "wattala", "ja_ela",
  "kadawatha", "kelaniya", "pelawatte",
]);

// ─── Potential Expansion Zones ──────────────────────────────────

const EXPANSION_TARGETS: Record<string, string> = {
  negombo: "Negombo",
  gampaha: "Gampaha",
  kandy: "Kandy",
  galle: "Galle",
  matara: "Matara",
  kurunegala: "Kurunegala",
  anuradhapura: "Anuradhapura",
  jaffna: "Jaffna",
  trincomalee: "Trincomalee",
  badulla: "Badulla",
  horana: "Horana",
  panadura: "Panadura",
  kalutara: "Kalutara",
  minuwangoda: "Minuwangoda",
  nittambuwa: "Nittambuwa",
};

// ─── Scoring Thresholds ─────────────────────────────────────────

const READINESS_THRESHOLDS = {
  ready: 70,        // strong demand + nearby supply
  promising: 45,    // moderate signals
  earlySignal: 20,  // weak but present
};

// ─── Core Analysis ──────────────────────────────────────────────

/**
 * Analyze demand signals outside current service zones to identify expansion opportunities.
 * Uses notification_events (zone_not_supported, category_interest) and AI interaction logs.
 */
export async function analyzeExpansionOpportunities(): Promise<ExpansionReport> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

  // Fetch zone-not-supported events (logged when bookings are blocked)
  const { data: zoneEvents } = await supabase
    .from("notification_events")
    .select("event_type, metadata, created_at")
    .in("event_type", ["zone_not_supported", "category_interest"])
    .gte("created_at", ninetyDaysAgo);

  // Fetch AI search interactions that didn't convert
  const { data: aiLogs } = await supabase
    .from("ai_interaction_logs")
    .select("input_query, matched_category, converted_to_booking, metadata, created_at")
    .eq("converted_to_booking", false)
    .gte("created_at", ninetyDaysAgo);

  // Fetch partners near expansion zones
  const { data: partners } = await supabase
    .from("partners")
    .select("id, service_zones, base_latitude, base_longitude, verification_status")
    .eq("verification_status", "verified");

  const candidates: ExpansionCandidate[] = [];

  for (const [zoneCode, zoneLabel] of Object.entries(EXPANSION_TARGETS)) {
    // Count zone-specific demand signals
    const zoneSignals = (zoneEvents || []).filter(e => {
      const meta = e.metadata as Record<string, unknown> | null;
      const metaZone = meta?.zone_code || meta?.city || "";
      return String(metaZone).toLowerCase().includes(zoneCode);
    });

    const searchSignals = (aiLogs || []).filter(l => {
      const query = (l.input_query || "").toLowerCase();
      return query.includes(zoneCode) || query.includes(zoneLabel.toLowerCase());
    });

    const totalSearches = searchSignals.length;
    const failedAttempts = zoneSignals.filter(e => e.event_type === "zone_not_supported").length;
    const waitlistSignups = zoneSignals.filter(e => e.event_type === "category_interest").length;

    // Count nearby partners (within potential reach)
    const nearbyPartners = (partners || []).filter(p =>
      p.service_zones?.some((z: string) => {
        // Check if any partner serves adjacent zones
        const adjacentMap: Record<string, string[]> = {
          negombo: ["ja_ela", "wattala", "kadawatha"],
          gampaha: ["kadawatha", "kelaniya", "ja_ela"],
          panadura: ["moratuwa", "piliyandala"],
          kalutara: ["moratuwa", "piliyandala"],
          horana: ["piliyandala", "kottawa"],
        };
        return adjacentMap[zoneCode]?.includes(z);
      })
    );

    // Calculate expansion score (0-100)
    let score = 0;
    const triggerReasons: string[] = [];

    if (failedAttempts >= 10) {
      score += 30;
      triggerReasons.push(`${failedAttempts} blocked booking attempts`);
    } else if (failedAttempts >= 3) {
      score += 15;
      triggerReasons.push(`${failedAttempts} blocked booking attempts`);
    }

    if (totalSearches >= 20) {
      score += 25;
      triggerReasons.push(`${totalSearches} service searches from area`);
    } else if (totalSearches >= 5) {
      score += 10;
      triggerReasons.push(`${totalSearches} service searches from area`);
    }

    if (waitlistSignups >= 5) {
      score += 20;
      triggerReasons.push(`${waitlistSignups} waitlist signups`);
    } else if (waitlistSignups >= 2) {
      score += 8;
      triggerReasons.push(`${waitlistSignups} waitlist signups`);
    }

    if (nearbyPartners.length >= 3) {
      score += 15;
      triggerReasons.push(`${nearbyPartners.length} partners in adjacent zones`);
    } else if (nearbyPartners.length >= 1) {
      score += 5;
      triggerReasons.push(`${nearbyPartners.length} partner(s) in adjacent zones`);
    }

    // Population/market size bonus for major cities
    const majorCities = ["negombo", "kandy", "galle", "gampaha", "kurunegala", "jaffna"];
    if (majorCities.includes(zoneCode)) {
      score += 10;
      triggerReasons.push("Major population center");
    }

    if (score === 0 && triggerReasons.length === 0) continue;

    const readiness: ExpansionReadiness =
      score >= READINESS_THRESHOLDS.ready ? "ready" :
      score >= READINESS_THRESHOLDS.promising ? "promising" :
      score >= READINESS_THRESHOLDS.earlySignal ? "early_signal" :
      "insufficient_data";

    const estimatedDailyDemand = Math.max(1, Math.round((failedAttempts + totalSearches * 0.3) / 90));
    const partnersNeeded = Math.max(2, Math.ceil(estimatedDailyDemand * 3));

    candidates.push({
      zoneCode,
      zoneLabel,
      readiness,
      score: Math.min(score, 100),
      searchesFromZone: totalSearches,
      failedBookingAttempts: failedAttempts,
      waitlistSignups,
      nearbyPartnerCount: nearbyPartners.length,
      estimatedDailyDemand,
      partnersNeeded,
      recommendation: generateExpansionRecommendation(readiness, zoneLabel, partnersNeeded),
      triggerReasons,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    generatedAt: new Date().toISOString(),
    currentZoneCount: CURRENT_ZONES.size,
    candidates,
    topPriority: candidates.length > 0 ? candidates[0] : null,
  };
}

function generateExpansionRecommendation(
  readiness: ExpansionReadiness,
  zoneLabel: string,
  partnersNeeded: number
): string {
  switch (readiness) {
    case "ready":
      return `${zoneLabel} is ready for expansion. Begin recruiting ${partnersNeeded} partners and enable zone.`;
    case "promising":
      return `${zoneLabel} shows promising demand. Start soft recruitment and monitor for 30 days.`;
    case "early_signal":
      return `${zoneLabel} has early demand signals. Continue monitoring; no action needed yet.`;
    case "insufficient_data":
      return `${zoneLabel} lacks sufficient data. No expansion warranted.`;
  }
}

/**
 * Quick check: is any expansion zone ready for launch?
 */
export async function getReadyForLaunchZones(): Promise<ExpansionCandidate[]> {
  const report = await analyzeExpansionOpportunities();
  return report.candidates.filter(c => c.readiness === "ready");
}

/**
 * Get a summary dashboard view of expansion intelligence.
 */
export async function getExpansionDashboardSummary() {
  const report = await analyzeExpansionOpportunities();
  return {
    totalCandidates: report.candidates.length,
    readyZones: report.candidates.filter(c => c.readiness === "ready").length,
    promisingZones: report.candidates.filter(c => c.readiness === "promising").length,
    earlySignals: report.candidates.filter(c => c.readiness === "early_signal").length,
    topPriority: report.topPriority,
    currentCoverage: report.currentZoneCount,
  };
}
