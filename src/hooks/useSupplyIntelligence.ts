/**
 * useSupplyIntelligence — Real-time supply aggregation from partners table.
 * Returns available/busy/offline counts per category and zone,
 * plus reliability-weighted availability levels.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupplyContext } from '@/types/campaign';

export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none';

export interface CategorySupplyDetail {
  available: number;
  busy: number;
  offline: number;
  avgRating: number;
  avgReliability: number;
  confidence: 'high' | 'medium' | 'low';
  availabilityLevel: AvailabilityLevel;
}

export interface SupplyIntelligence {
  /** Per-category supply breakdown */
  categorySupply: Record<string, CategorySupplyDetail>;
  /** Per-zone available counts by category */
  zoneSupply: Record<string, Record<string, number>>;
  /** Overall platform availability */
  overallLevel: AvailabilityLevel;
  /** For campaign engine consumption */
  campaignSupplyContext: SupplyContext;
  /** Loading state */
  loading: boolean;
  /** Last refresh timestamp */
  refreshedAt: number;
}

interface PartnerRow {
  availability_status: string | null;
  categories_supported: string[] | null;
  service_zones: string[] | null;
  rating_average: number | null;
  performance_score: number | null;
  is_seeded: boolean | null;
  verification_status: string | null;
}

function computeAvailability(available: number, busy: number): AvailabilityLevel {
  const total = available + busy;
  if (available >= 3) return 'high';
  if (available >= 1) return 'medium';
  if (total >= 1) return 'low'; // all busy but exist
  return 'none';
}

function computeConfidence(total: number, avgRating: number): 'high' | 'medium' | 'low' {
  if (total >= 3 && avgRating >= 3.5) return 'high';
  if (total >= 1) return 'medium';
  return 'low';
}

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useSupplyIntelligence(): SupplyIntelligence {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;

    const fetchPartners = async () => {
      const { data } = await supabase
        .from('partners')
        .select('availability_status, categories_supported, service_zones, rating_average, performance_score, is_seeded, verification_status')
        .eq('is_seeded', false)
        .eq('verification_status', 'verified');

      if (!cancelled) {
        setPartners(data ?? []);
        setLoading(false);
        setRefreshedAt(Date.now());
      }
    };

    fetchPartners();
    const interval = setInterval(fetchPartners, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return useMemo(() => {
    if (loading) {
      return {
        categorySupply: {},
        zoneSupply: {},
        overallLevel: 'none' as const,
        campaignSupplyContext: { categorySupply: {}, zoneSupply: {} },
        loading: true,
        refreshedAt,
      };
    }

    // Aggregate by category
    const catMap: Record<string, { available: number; busy: number; offline: number; ratings: number[]; scores: number[] }> = {};
    // Aggregate by zone+category
    const zoneMap: Record<string, Record<string, number>> = {};

    for (const p of partners) {
      const cats = p.categories_supported ?? [];
      const zones = p.service_zones ?? [];
      const status = p.availability_status ?? 'offline';

      for (const cat of cats) {
        if (!catMap[cat]) {
          catMap[cat] = { available: 0, busy: 0, offline: 0, ratings: [], scores: [] };
        }
        const bucket = catMap[cat];

        if (status === 'available') bucket.available++;
        else if (status === 'busy' || status === 'on_job') bucket.busy++;
        else bucket.offline++;

        if (p.rating_average != null) bucket.ratings.push(p.rating_average);
        if (p.performance_score != null) bucket.scores.push(p.performance_score);

        // Zone supply — only count available partners
        if (status === 'available') {
          for (const zone of zones) {
            if (!zoneMap[zone]) zoneMap[zone] = {};
            zoneMap[zone][cat] = (zoneMap[zone][cat] ?? 0) + 1;
          }
        }
      }
    }

    // Build detailed category supply
    const categorySupply: Record<string, CategorySupplyDetail> = {};
    const campaignCategorySupply: Record<string, number> = {};

    for (const [cat, data] of Object.entries(catMap)) {
      const avgRating = data.ratings.length > 0
        ? data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length
        : 0;
      const avgReliability = data.scores.length > 0
        ? data.scores.reduce((s, r) => s + r, 0) / data.scores.length
        : 0;
      const total = data.available + data.busy + data.offline;

      categorySupply[cat] = {
        available: data.available,
        busy: data.busy,
        offline: data.offline,
        avgRating: Math.round(avgRating * 10) / 10,
        avgReliability: Math.round(avgReliability),
        confidence: computeConfidence(total, avgRating),
        availabilityLevel: computeAvailability(data.available, data.busy),
      };

      // Campaign engine expects simple count
      campaignCategorySupply[cat] = data.available;
    }

    // Flatten zone supply for campaign context
    const campaignZoneSupply: Record<string, number> = {};
    for (const [zone, cats] of Object.entries(zoneMap)) {
      campaignZoneSupply[zone] = Object.values(cats).reduce((s, n) => s + n, 0);
    }

    // Overall level
    const totalAvailable = Object.values(categorySupply).reduce((s, c) => s + c.available, 0);
    const totalBusy = Object.values(categorySupply).reduce((s, c) => s + c.busy, 0);
    const overallLevel = computeAvailability(totalAvailable, totalBusy);

    return {
      categorySupply,
      zoneSupply: zoneMap,
      overallLevel,
      campaignSupplyContext: {
        categorySupply: campaignCategorySupply,
        zoneSupply: campaignZoneSupply,
      },
      loading,
      refreshedAt,
    };
  }, [partners, loading, refreshedAt]);
}
