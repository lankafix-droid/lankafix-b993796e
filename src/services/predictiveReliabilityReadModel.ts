/**
 * Predictive Reliability Read Model — V1
 * Composes existing services + predictive intelligence engine.
 * Read-only. Advisory-only. No marketplace mutations.
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchLiveEnterpriseSummary, fetchPerZoneReliabilitySummary } from "@/services/reliabilityReadModel";
import { fetchGovernanceAutomationSummary } from "@/services/reliabilityGovernanceReadModel";
import {
  predictZoneCategoryReliability,
  detectPartnerReliabilityDecay,
  detectDemandPressureRisk,
  computeGovernanceRiskScore,
  type ZoneCategoryReliabilityPrediction,
  type PartnerDecaySignal,
  type DemandPressureSignal,
  type GovernanceRiskScore,
  type ReliabilitySnapshot,
  type PartnerReliabilityRecord,
  type DemandPressureInput,
} from "@/engines/predictiveReliabilityIntelligenceEngine";

const PILOT_CATEGORIES = ["AC", "plumbing", "electrical", "appliance", "painting", "cleaning"];
const PILOT_ZONES = [
  "col_01","col_02","col_03","col_04","col_05","col_06","col_07",
  "col_08","col_09","col_10","col_11","col_12","col_13","col_14","col_15",
  "rajagiriya","battaramulla","nawala","nugegoda","dehiwala","mt_lavinia",
  "thalawathugoda","negombo","wattala","moratuwa",
];

export interface PredictiveReliabilitySummary {
  predictions: ZoneCategoryReliabilityPrediction[];
  partnerDecay: PartnerDecaySignal[];
  demandPressure: DemandPressureSignal[];
  governanceRisk: GovernanceRiskScore[];
  zonesAtRisk: number;
  categoriesDeclining: number;
  partnersAtRisk: number;
  demandAlerts: number;
}

export async function fetchPredictiveReliabilitySummary(): Promise<PredictiveReliabilitySummary> {
  const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel data fetching
  const [zoneSummaries, govSummary, bookings14d, bookings7d, partners] = await Promise.all([
    fetchPerZoneReliabilitySummary().catch(() => []),
    fetchGovernanceAutomationSummary().catch(() => null),
    supabase.from("bookings").select("id, zone_code, category_code, status, partner_id, created_at")
      .gte("created_at", cutoff14d).limit(1000).then(r => r.data || []),
    supabase.from("bookings").select("id, zone_code, category_code, status, partner_id, created_at")
      .gte("created_at", cutoff7d).limit(1000).then(r => r.data || []),
    supabase.from("partners").select("id, full_name, categories_supported, service_zones, performance_score, availability_status, completed_jobs_count")
      .eq("availability_status", "available").limit(200).then(r => r.data || []),
  ]);

  // Build reliability snapshots from zone summaries (synthetic daily points)
  const snapshots: ReliabilitySnapshot[] = [];
  for (const z of zoneSummaries) {
    for (const cat of PILOT_CATEGORIES) {
      const zoneBookings = bookings14d.filter((b: any) => b.zone_code === z.zoneId && b.category_code === cat);
      const total = zoneBookings.length;
      const completed = zoneBookings.filter((b: any) => b.status === "completed").length;
      const score = total > 0 ? Math.round((completed / total) * 100) : z.reliabilityScore;
      snapshots.push({
        date: new Date().toISOString(),
        zoneId: z.zoneId,
        categoryCode: cat,
        reliabilityScore: score,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
        escalationRate: 0,
      });
    }
  }

  // Predictions
  const predictions: ZoneCategoryReliabilityPrediction[] = [];
  for (const z of PILOT_ZONES) {
    for (const c of PILOT_CATEGORIES) {
      predictions.push(predictZoneCategoryReliability(snapshots, z, c));
    }
  }

  // Partner decay detection
  const partnerRecords: PartnerReliabilityRecord[] = partners.map((p: any) => {
    const partnerBookings = bookings14d.filter((b: any) => b.partner_id === p.id);
    const escalated = partnerBookings.filter((b: any) => b.status === "cancelled").length;
    const cats = p.categories_supported || [];
    return {
      partnerId: p.id,
      partnerName: p.full_name,
      categoryCode: cats[0] || "general",
      zoneId: (p.service_zones || [])[0] || "col_01",
      reliabilityScores: [
        { date: cutoff14d, score: Math.min(100, (p.performance_score || 80) + 5) },
        { date: new Date().toISOString(), score: p.performance_score || 80 },
      ],
      completedJobs14d: partnerBookings.filter((b: any) => b.status === "completed").length,
      escalationCount14d: escalated,
    };
  });
  const partnerDecay = detectPartnerReliabilityDecay(partnerRecords);

  // Demand pressure
  const demandInputs: DemandPressureInput[] = [];
  for (const z of PILOT_ZONES) {
    for (const c of PILOT_CATEGORIES) {
      const vol7 = bookings7d.filter((b: any) => b.zone_code === z && b.category_code === c).length;
      const vol14 = bookings14d.filter((b: any) => b.zone_code === z && b.category_code === c).length;
      const available = partners.filter((p: any) =>
        (p.service_zones || []).includes(z) && (p.categories_supported || []).includes(c)
      ).length;
      if (vol7 > 0 || available > 0) {
        demandInputs.push({
          zoneId: z,
          categoryCode: c,
          bookingVolume7d: vol7,
          bookingVolume14d: vol14,
          availablePartners: available,
          avgCompletionMinutes: 90,
        });
      }
    }
  }
  const demandPressure = detectDemandPressureRisk(demandInputs);

  // Governance risk
  const operatorLoads = govSummary?.operatorLoads || [];
  const avgWorkload = operatorLoads.length > 0
    ? operatorLoads.reduce((s, l) => s + l.workloadScore, 0) / operatorLoads.length
    : 0;
  const overdueCount = govSummary?.digest.overdueCount || 0;

  const governanceRisk: GovernanceRiskScore[] = [];
  for (const pred of predictions.filter(p => p.riskLevel !== "low")) {
    const dp = demandPressure.find(d => d.zoneId === pred.zoneId && d.categoryCode === pred.categoryCode);
    governanceRisk.push(computeGovernanceRiskScore({
      zoneId: pred.zoneId,
      categoryCode: pred.categoryCode,
      reliabilityTrendSlope: pred.shortTermSlope,
      overdueGovernanceActions: overdueCount,
      partnerChurnRisk: partnerDecay.filter(d => d.zoneId === pred.zoneId).length * 20,
      demandPressure: dp?.demandPressure || 0,
      operatorWorkloadScore: avgWorkload,
    }));
  }
  governanceRisk.sort((a, b) => b.governanceRiskScore - a.governanceRiskScore);

  const zonesAtRisk = new Set(predictions.filter(p => p.riskLevel === "high" || p.riskLevel === "critical").map(p => p.zoneId)).size;
  const categoriesDeclining = predictions.filter(p => p.trend === "declining").length;

  return {
    predictions: predictions.filter(p => p.riskLevel !== "low" || p.trend !== "stable"),
    partnerDecay,
    demandPressure: demandPressure.filter(d => d.demandPressure > 20),
    governanceRisk,
    zonesAtRisk,
    categoriesDeclining,
    partnersAtRisk: partnerDecay.length,
    demandAlerts: demandPressure.filter(d => d.riskLevel !== "low").length,
  };
}
