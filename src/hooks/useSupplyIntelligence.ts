/**
 * useSupplyIntelligence — Real-time supply aggregation from partners table.
 * Returns available/busy/offline counts per category and zone,
 * plus reliability-weighted availability levels and archetype-aware messaging.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupplyContext } from '@/types/campaign';

export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none';
export type ReliabilityLevel = 'high' | 'medium' | 'low' | 'unknown';

/** Service archetype determines UX behavior, messaging, and fallback logic */
export type ServiceArchetype =
  | 'instant'           // mobile, IT urgent fixes
  | 'inspection_first'  // AC, consumer electronics
  | 'consultation'      // solar, CCTV, smart home
  | 'project_based'     // office setups, large installs
  | 'delivery'          // supplies, accessories
  | 'waitlist';         // coming soon

/** Map category codes to service archetypes */
export const CATEGORY_ARCHETYPES: Record<string, ServiceArchetype> = {
  MOBILE: 'instant',
  IT: 'instant',
  ELECTRICAL: 'instant',
  PLUMBING: 'instant',
  NETWORK: 'instant',
  AC: 'inspection_first',
  CONSUMER_ELEC: 'inspection_first',
  COPIER: 'inspection_first',
  CCTV: 'consultation',
  SOLAR: 'consultation',
  SMART_HOME_OFFICE: 'consultation',
  HOME_SECURITY: 'consultation',
  POWER_BACKUP: 'consultation',
  APPLIANCE_INSTALL: 'project_based',
  PRINT_SUPPLIES: 'delivery',
};

/** Archetype-specific availability labels */
const ARCHETYPE_LABELS: Record<ServiceArchetype, Record<AvailabilityLevel, string>> = {
  instant: {
    high: 'Available Now',
    medium: 'Technician Nearby',
    low: 'Next Available Slot',
    none: "We'll Arrange Help",
  },
  inspection_first: {
    high: 'Inspection Today',
    medium: 'Inspection Available',
    low: 'Next Day Inspection',
    none: "We'll Arrange Inspection",
  },
  consultation: {
    high: 'Site Visit Available',
    medium: 'Book Assessment',
    low: 'Schedule Consultation',
    none: 'Request Consultation',
  },
  project_based: {
    high: 'Consultation Available',
    medium: 'Schedule Consultation',
    low: 'Request Quote',
    none: 'Submit Requirement',
  },
  delivery: {
    high: 'Delivery Available',
    medium: 'Order Now',
    low: 'Pre-Order',
    none: 'Notify When Available',
  },
  waitlist: {
    high: 'Launching Soon',
    medium: 'Launching Soon',
    low: 'Launching Soon',
    none: 'Launching Soon',
  },
};

/** Archetype-specific badge styles */
const ARCHETYPE_BADGE_STYLES: Record<AvailabilityLevel, string> = {
  high: 'bg-success/90 text-success-foreground',
  medium: 'bg-warning/90 text-warning-foreground',
  low: 'bg-muted text-muted-foreground',
  none: 'bg-accent text-accent-foreground',
};

export interface CategorySupplyDetail {
  available: number;
  busy: number;
  offline: number;
  avgRating: number;
  avgReliability: number;
  confidence: 'high' | 'medium' | 'low';
  availabilityLevel: AvailabilityLevel;
  /** Reliability-adjusted effective availability */
  effectiveLevel: AvailabilityLevel;
  reliabilityLevel: ReliabilityLevel;
  /** Archetype for this category */
  archetype: ServiceArchetype;
  /** Archetype-aware label for the badge */
  availabilityLabel: string;
  /** Badge CSS class */
  badgeClass: string;
}

export interface SupplyIntelligence {
  categorySupply: Record<string, CategorySupplyDetail>;
  zoneSupply: Record<string, Record<string, number>>;
  overallLevel: AvailabilityLevel;
  campaignSupplyContext: SupplyContext;
  loading: boolean;
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
  if (available >= 3) return 'high';
  if (available >= 1) return 'medium';
  if (available + busy >= 1) return 'low';
  return 'none';
}

function computeReliability(avgScore: number, sampleSize: number): ReliabilityLevel {
  if (sampleSize === 0) return 'unknown';
  if (avgScore >= 70) return 'high';
  if (avgScore >= 40) return 'medium';
  return 'low';
}

/** Reliability downgrades effective availability */
function computeEffectiveLevel(
  availability: AvailabilityLevel,
  reliability: ReliabilityLevel,
): AvailabilityLevel {
  if (reliability === 'low') {
    // High availability + low reliability → limited
    if (availability === 'high') return 'medium';
    if (availability === 'medium') return 'low';
  }
  if (reliability === 'unknown' && availability === 'high') {
    return 'medium'; // unproven partners → conservative
  }
  return availability;
}

function computeConfidence(total: number, avgRating: number): 'high' | 'medium' | 'low' {
  if (total >= 3 && avgRating >= 3.5) return 'high';
  if (total >= 1) return 'medium';
  return 'low';
}

const REFRESH_INTERVAL = 2 * 60 * 1000;

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

    const catMap: Record<string, { available: number; busy: number; offline: number; ratings: number[]; scores: number[] }> = {};
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

        if (status === 'available') {
          for (const zone of zones) {
            if (!zoneMap[zone]) zoneMap[zone] = {};
            zoneMap[zone][cat] = (zoneMap[zone][cat] ?? 0) + 1;
          }
        }
      }
    }

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

      const availabilityLevel = computeAvailability(data.available, data.busy);
      const reliabilityLevel = computeReliability(avgReliability, data.scores.length);
      const effectiveLevel = computeEffectiveLevel(availabilityLevel, reliabilityLevel);
      const archetype = CATEGORY_ARCHETYPES[cat] ?? 'inspection_first';

      categorySupply[cat] = {
        available: data.available,
        busy: data.busy,
        offline: data.offline,
        avgRating: Math.round(avgRating * 10) / 10,
        avgReliability: Math.round(avgReliability),
        confidence: computeConfidence(total, avgRating),
        availabilityLevel,
        effectiveLevel,
        reliabilityLevel,
        archetype,
        availabilityLabel: ARCHETYPE_LABELS[archetype][effectiveLevel],
        badgeClass: ARCHETYPE_BADGE_STYLES[effectiveLevel],
      };

      // Campaign engine: use effective (reliability-weighted) supply count
      // If reliability is low, discount available count
      const reliabilityDiscount = reliabilityLevel === 'low' ? 0.5 : reliabilityLevel === 'unknown' ? 0.7 : 1;
      campaignCategorySupply[cat] = Math.round(data.available * reliabilityDiscount);
    }

    const campaignZoneSupply: Record<string, number> = {};
    for (const [zone, cats] of Object.entries(zoneMap)) {
      campaignZoneSupply[zone] = Object.values(cats).reduce((s, n) => s + n, 0);
    }

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

/** Get archetype for a category code */
export function getCategoryArchetype(code: string): ServiceArchetype {
  return CATEGORY_ARCHETYPES[code] ?? 'inspection_first';
}
