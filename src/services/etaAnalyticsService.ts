/**
 * ETA Analytics Service — Phase 3
 * 
 * Queries eta_predictions table for accuracy metrics, partner reliability scores,
 * and zone/category breakdowns. Used by ops dashboards.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────

export interface ETAAccuracyMetrics {
  totalPredictions: number;
  completedPredictions: number;
  withinRangeCount: number;
  withinRangePercent: number;
  avgErrorMinutes: number;
  earlyCount: number;
  onTimeCount: number;
  lateCount: number;
  earlyPercent: number;
  onTimePercent: number;
  latePercent: number;
}

export interface PartnerETAReliability {
  partnerId: string;
  totalPredictions: number;
  withinRangePercent: number;
  avgLatenessMinutes: number;
  lateCount: number;
  reliabilityScore: number;
  reliabilityBand: "excellent" | "good" | "unstable" | "poor";
}

export interface ZoneETAAccuracy {
  zone: string;
  count: number;
  withinRangePercent: number;
  avgErrorMinutes: number;
}

export interface CategoryETAAccuracy {
  category: string;
  count: number;
  withinRangePercent: number;
  avgErrorMinutes: number;
}

// ── Core fetch functions ─────────────────────────────────────

async function fetchETAAccuracyMetrics(): Promise<ETAAccuracyMetrics> {
  const { data: all } = await supabase
    .from("eta_predictions")
    .select("accuracy_class, prediction_error_minutes, within_range, actual_travel_minutes")
    .not("accuracy_class", "is", null)
    .limit(1000);

  const completed = all || [];
  const total = completed.length;

  if (total === 0) {
    return {
      totalPredictions: 0, completedPredictions: 0,
      withinRangeCount: 0, withinRangePercent: 0,
      avgErrorMinutes: 0,
      earlyCount: 0, onTimeCount: 0, lateCount: 0,
      earlyPercent: 0, onTimePercent: 0, latePercent: 0,
    };
  }

  const withinRange = completed.filter((r: any) => r.within_range === true);
  const early = completed.filter((r: any) => r.accuracy_class === "early");
  const onTime = completed.filter((r: any) => r.accuracy_class === "on_time");
  const late = completed.filter((r: any) => r.accuracy_class === "late");

  const errors = completed
    .map((r: any) => Math.abs(r.prediction_error_minutes || 0));
  const avgError = errors.reduce((s: number, e: number) => s + e, 0) / total;

  // Also get total predictions count (including those without accuracy)
  const { count: totalCount } = await supabase
    .from("eta_predictions")
    .select("id", { count: "exact", head: true });

  return {
    totalPredictions: totalCount ?? 0,
    completedPredictions: total,
    withinRangeCount: withinRange.length,
    withinRangePercent: Math.round((withinRange.length / total) * 100),
    avgErrorMinutes: Math.round(avgError * 10) / 10,
    earlyCount: early.length,
    onTimeCount: onTime.length,
    lateCount: late.length,
    earlyPercent: Math.round((early.length / total) * 100),
    onTimePercent: Math.round((onTime.length / total) * 100),
    latePercent: Math.round((late.length / total) * 100),
  };
}

async function fetchPartnerETAReliability(): Promise<PartnerETAReliability[]> {
  const { data } = await supabase
    .from("eta_predictions")
    .select("partner_id, accuracy_class, prediction_error_minutes, within_range")
    .not("accuracy_class", "is", null)
    .not("partner_id", "is", null)
    .limit(1000);

  if (!data || data.length === 0) return [];

  // Group by partner
  const grouped: Record<string, any[]> = {};
  data.forEach((r: any) => {
    if (!r.partner_id) return;
    if (!grouped[r.partner_id]) grouped[r.partner_id] = [];
    grouped[r.partner_id].push(r);
  });

  return Object.entries(grouped)
    .filter(([_, rows]) => rows.length >= 3) // minimum sample threshold
    .map(([partnerId, rows]) => {
      const total = rows.length;
      const withinRange = rows.filter((r: any) => r.within_range === true).length;
      const withinRangePercent = Math.round((withinRange / total) * 100);
      const lateRows = rows.filter((r: any) => r.accuracy_class === "late");
      const lateCount = lateRows.length;
      const avgLateness = lateRows.length > 0
        ? lateRows.reduce((s: number, r: any) => s + Math.max(0, r.prediction_error_minutes || 0), 0) / lateRows.length
        : 0;

      // Reliability score: 0-100
      // Factors: within-range% (60%), avg lateness penalty (25%), repeated late penalty (15%)
      const rangeFactor = withinRangePercent * 0.6;
      const latenessPenalty = Math.min(25, avgLateness * 2.5) * 0.25;
      const repeatLatePenalty = Math.min(15, (lateCount / total) * 30) * 0.15;
      const reliabilityScore = Math.max(0, Math.min(100, Math.round(
        rangeFactor + (25 - latenessPenalty * 100) + (15 - repeatLatePenalty * 100)
      )));

      // Simplified scoring
      const score = Math.max(0, Math.min(100, Math.round(
        withinRangePercent * 0.6 +
        Math.max(0, 25 - avgLateness * 2.5) +
        Math.max(0, 15 - (lateCount / total) * 30)
      )));

      let band: PartnerETAReliability["reliabilityBand"];
      if (score >= 80) band = "excellent";
      else if (score >= 60) band = "good";
      else if (score >= 40) band = "unstable";
      else band = "poor";

      return {
        partnerId,
        totalPredictions: total,
        withinRangePercent,
        avgLatenessMinutes: Math.round(avgLateness * 10) / 10,
        lateCount,
        reliabilityScore: score,
        reliabilityBand: band,
      };
    })
    .sort((a, b) => a.reliabilityScore - b.reliabilityScore); // worst first for ops
}

async function fetchZoneETAAccuracy(): Promise<ZoneETAAccuracy[]> {
  const { data } = await supabase
    .from("eta_predictions")
    .select("customer_zone, accuracy_class, prediction_error_minutes, within_range")
    .not("accuracy_class", "is", null)
    .not("customer_zone", "is", null)
    .limit(1000);

  if (!data || data.length === 0) return [];

  const grouped: Record<string, any[]> = {};
  data.forEach((r: any) => {
    if (!r.customer_zone) return;
    if (!grouped[r.customer_zone]) grouped[r.customer_zone] = [];
    grouped[r.customer_zone].push(r);
  });

  return Object.entries(grouped).map(([zone, rows]) => {
    const total = rows.length;
    const withinRange = rows.filter((r: any) => r.within_range === true).length;
    const avgError = rows.reduce((s: number, r: any) => s + Math.abs(r.prediction_error_minutes || 0), 0) / total;
    return {
      zone,
      count: total,
      withinRangePercent: Math.round((withinRange / total) * 100),
      avgErrorMinutes: Math.round(avgError * 10) / 10,
    };
  }).sort((a, b) => a.withinRangePercent - b.withinRangePercent);
}

// ── React Query Hooks ────────────────────────────────────────

export function useETAAccuracyMetrics() {
  return useQuery({
    queryKey: ["eta-accuracy-metrics"],
    queryFn: fetchETAAccuracyMetrics,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function usePartnerETAReliability() {
  return useQuery({
    queryKey: ["partner-eta-reliability"],
    queryFn: fetchPartnerETAReliability,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useZoneETAAccuracy() {
  return useQuery({
    queryKey: ["zone-eta-accuracy"],
    queryFn: fetchZoneETAAccuracy,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
