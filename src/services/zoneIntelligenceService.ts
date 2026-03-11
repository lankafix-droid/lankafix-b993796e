/**
 * Zone Intelligence Service — Phase 5D
 * 
 * Per-zone operational health metrics from real DB aggregates.
 * Internal-only: ops dashboards only.
 * 
 * Health labels: healthy | watch | risk
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ZoneHealthStatus = "healthy" | "watch" | "risk";

export interface ZoneIntelligence {
  zone_code: string;
  zone_label: string;
  bookings_count: number;
  completed_jobs_count: number;
  failed_dispatch_count: number;
  escalations_count: number;
  cancellation_count: number;
  avg_dispatch_time_min: number | null;
  verified_partner_count: number;
  health: ZoneHealthStatus;
  flags: string[];
}

export interface ZoneIntelligenceFilters {
  /** Days lookback for booking/dispatch metrics. Default 30 */
  days?: number;
  category?: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function computeHealth(z: {
  verified_partner_count: number;
  failed_dispatch_count: number;
  escalations_count: number;
  cancellation_count: number;
  bookings_count: number;
  avg_dispatch_time_min: number | null;
}): { health: ZoneHealthStatus; flags: string[] } {
  const flags: string[] = [];

  if (z.verified_partner_count < 2) flags.push("Low partner coverage");
  if (z.bookings_count > 0 && z.failed_dispatch_count / z.bookings_count > 0.3) flags.push("High dispatch failure rate");
  if (z.bookings_count > 0 && z.escalations_count / z.bookings_count > 0.2) flags.push("High escalation rate");
  if (z.bookings_count > 0 && z.cancellation_count / z.bookings_count > 0.25) flags.push("High cancellation rate");
  if (z.avg_dispatch_time_min != null && z.avg_dispatch_time_min > 10) flags.push("Slow assignment");

  const health: ZoneHealthStatus =
    flags.length >= 2 ? "risk" : flags.length === 1 ? "watch" : "healthy";

  return { health, flags };
}

async function fetchZoneIntelligence(filters: ZoneIntelligenceFilters = {}): Promise<ZoneIntelligence[]> {
  const since = daysAgo(filters.days || 30);

  // Parallel: bookings by zone, partners by zone, escalations by zone, dispatch_log times
  const [bookingsRes, partnersRes, escalationsRes, dispatchRes] = await Promise.all([
    // Bookings grouped by zone_code (fetch minimal rows)
    (() => {
      let q = supabase
        .from("bookings")
        .select("zone_code, status, dispatch_status")
        .gte("created_at", since)
        .not("zone_code", "is", null);
      if (filters.category) q = q.eq("category_code", filters.category);
      return q.limit(1000);
    })(),

    // Partners with their service_zones
    supabase
      .from("partners")
      .select("service_zones")
      .eq("verification_status", "verified"),

    // Escalations by booking zone (join via booking_id → bookings.zone_code)
    supabase
      .from("dispatch_escalations")
      .select("booking_id")
      .gte("created_at", since)
      .limit(500),

    // Dispatch log response times with booking zone
    supabase
      .from("dispatch_log")
      .select("booking_id, response_time_seconds")
      .gte("created_at", since)
      .not("response_time_seconds", "is", null)
      .limit(500),
  ]);

  const bookingRows = bookingsRes.data || [];
  const partnerRows = partnersRes.data || [];

  // Build zone aggregates from booking rows
  const zoneMap = new Map<string, {
    bookings: number; completed: number; failed: number; cancelled: number;
    partners: number; escalations: number; dispatchTimes: number[];
  }>();

  const ensureZone = (zc: string) => {
    if (!zoneMap.has(zc)) {
      zoneMap.set(zc, { bookings: 0, completed: 0, failed: 0, cancelled: 0, partners: 0, escalations: 0, dispatchTimes: [] });
    }
    return zoneMap.get(zc)!;
  };

  // Booking-level zone mapping (for escalations/dispatch lookups)
  const bookingZoneMap = new Map<string, string>();

  for (const b of bookingRows) {
    if (!b.zone_code) continue;
    const z = ensureZone(b.zone_code);
    z.bookings++;
    if (b.status === "completed") z.completed++;
    if (b.status === "cancelled") z.cancelled++;
    if (b.dispatch_status === "escalated" || b.dispatch_status === "no_provider_found") z.failed++;
    bookingZoneMap.set(b.id, b.zone_code);
  }

  // Map escalations to zones via booking_id
  for (const e of (escalationsRes.data || [])) {
    const zc = bookingZoneMap.get(e.booking_id);
    if (zc) ensureZone(zc).escalations++;
  }

  // Map dispatch response times to zones via booking_id
  for (const d of (dispatchRes.data || [])) {
    const zc = bookingZoneMap.get(d.booking_id);
    if (zc && d.response_time_seconds != null) {
      ensureZone(zc).dispatchTimes.push(d.response_time_seconds);
    }
  }

  // Partners: count per zone from service_zones array
  for (const p of partnerRows) {
    const zones = (p.service_zones || []) as string[];
    for (const zc of zones) {
      ensureZone(zc).partners++;
    }
  }

  // Build zone labels from known zones
  const { COLOMBO_ZONES_DATA } = await import("@/data/colomboZones");
  const labelMap = new Map(COLOMBO_ZONES_DATA.map(z => [z.id, z.label]));

  // Build results
  const results: ZoneIntelligence[] = [];
  for (const [zoneCode, data] of zoneMap) {
    const avgTime = data.dispatchTimes.length > 0
      ? Math.round(data.dispatchTimes.reduce((a, b) => a + b, 0) / data.dispatchTimes.length / 60 * 10) / 10
      : null;

    const { health, flags } = computeHealth({
      verified_partner_count: data.partners,
      failed_dispatch_count: data.failed,
      escalations_count: data.escalations,
      cancellation_count: data.cancelled,
      bookings_count: data.bookings,
      avg_dispatch_time_min: avgTime,
    });

    results.push({
      zone_code: zoneCode,
      zone_label: labelMap.get(zoneCode) || zoneCode,
      bookings_count: data.bookings,
      completed_jobs_count: data.completed,
      failed_dispatch_count: data.failed,
      escalations_count: data.escalations,
      cancellation_count: data.cancelled,
      avg_dispatch_time_min: avgTime,
      verified_partner_count: data.partners,
      health,
      flags,
    });
  }

  // Also add zones with partners but no bookings
  for (const p of partnerRows) {
    for (const zc of (p.service_zones || []) as string[]) {
      if (!zoneMap.has(zc)) {
        const { health, flags } = computeHealth({
          verified_partner_count: 1, failed_dispatch_count: 0,
          escalations_count: 0, cancellation_count: 0, bookings_count: 0,
          avg_dispatch_time_min: null,
        });
        results.push({
          zone_code: zc, zone_label: labelMap.get(zc) || zc,
          bookings_count: 0, completed_jobs_count: 0, failed_dispatch_count: 0,
          escalations_count: 0, cancellation_count: 0, avg_dispatch_time_min: null,
          verified_partner_count: 1, health, flags,
        });
        zoneMap.set(zc, { bookings: 0, completed: 0, failed: 0, cancelled: 0, partners: 1, escalations: 0, dispatchTimes: [] });
      }
    }
  }

  // Sort: risk first, then by bookings descending
  results.sort((a, b) => {
    const healthOrder = { risk: 0, watch: 1, healthy: 2 };
    const diff = healthOrder[a.health] - healthOrder[b.health];
    return diff !== 0 ? diff : b.bookings_count - a.bookings_count;
  });

  return results;
}

export function useZoneIntelligence(filters: ZoneIntelligenceFilters = {}) {
  return useQuery({
    queryKey: ["zone-intelligence", filters],
    queryFn: () => fetchZoneIntelligence(filters),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
