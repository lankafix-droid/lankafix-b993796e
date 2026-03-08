/**
 * LankaFix Live Dispatch Hook (Database-backed)
 * Matches partners from Lovable Cloud with real Haversine distance + traffic ETA.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import type { CategoryCode } from "@/types/booking";
import { useOnlinePartners, type PartnerRow } from "./usePartners";
import { calculateDistance } from "@/lib/locationUtils";
import { calculateETA, detectTrafficLevel, getETARange, getTrafficLabel, type TrafficLevel } from "@/lib/etaEngine";
import { useLocationStore } from "@/store/locationStore";
import { track } from "@/lib/analytics";

export interface LivePartnerCandidate {
  partner: PartnerRow;
  distanceKm: number;
  etaMinutes: number;
  etaRange: string;
  trafficLevel: TrafficLevel;
  trafficLabel: string;
  matchScore: number;
  currentZoneName: string;
  isOnline: boolean;
}

export interface LiveDispatchDBState {
  phase: "searching" | "matched" | "accepting" | "confirmed" | "timeout" | "no_match";
  candidates: LivePartnerCandidate[];
  bestMatch: LivePartnerCandidate | null;
  searchingPartnerCount: number;
  refreshCount: number;
  acceptCountdown: number;
  lastRefreshedAt: string;
  isRefreshing: boolean;
}

const ACCEPT_TIMEOUT = 60;
const SEARCH_DURATION = 2500;

function scorePartner(
  partner: PartnerRow,
  customerLat: number,
  customerLng: number,
  category: CategoryCode,
  isEmergency: boolean
): LivePartnerCandidate | null {
  if (!partner.categories_supported.includes(category)) return null;
  // Partners already filtered to online/busy by query, but guard anyway
  if ((partner.availability_status as string) === "offline") return null;
  if (isEmergency && !partner.emergency_available) return null;

  const pLat = partner.current_latitude ?? partner.base_latitude;
  const pLng = partner.current_longitude ?? partner.base_longitude;
  if (!pLat || !pLng) return null;

  const distanceKm = calculateDistance(customerLat, customerLng, pLat, pLng);
  if (distanceKm > 25) return null;

  const traffic = detectTrafficLevel();
  const etaMinutes = calculateETA(distanceKm, traffic);

  // Scoring: 35% proximity + 30% rating + 20% experience + 15% availability
  const proximityScore = distanceKm < 2 ? 35 : distanceKm < 5 ? 30 : distanceKm < 8 ? 22 : distanceKm < 12 ? 15 : distanceKm < 15 ? 8 : 4;
  const ratingScore = Math.round((partner.rating_average / 5) * 30);
  const expScore = Math.min(Math.round((partner.experience_years / 10) * 20), 20);
  let availScore = partner.availability_status === "online" ? 15 : 6;
  if (isEmergency && partner.emergency_available && distanceKm < 5) availScore += 10;

  const matchScore = Math.min(proximityScore + ratingScore + expScore + availScore, 100);

  // Derive zone name from service_zones
  const currentZoneName = partner.service_zones?.[0]?.replace(/_/g, " ") || "Colombo";

  return {
    partner,
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMinutes,
    etaRange: getETARange(etaMinutes),
    trafficLevel: traffic,
    trafficLabel: getTrafficLabel(traffic),
    matchScore,
    currentZoneName,
    isOnline: partner.availability_status !== "offline",
  };
}

export function useLiveDispatchDB(
  category: CategoryCode,
  isEmergency: boolean = false,
  enabled: boolean = true
) {
  const { data: partners, isLoading } = useOnlinePartners(category);
  const { getActiveAddress } = useLocationStore();
  const activeAddress = getActiveAddress();

  const custLat = activeAddress?.lat || 6.9090;
  const custLng = activeAddress?.lng || 79.8620;

  const [state, setState] = useState<LiveDispatchDBState>({
    phase: "searching",
    candidates: [],
    bestMatch: null,
    searchingPartnerCount: 0,
    refreshCount: 0,
    acceptCountdown: ACCEPT_TIMEOUT,
    lastRefreshedAt: new Date().toISOString(),
    isRefreshing: false,
  });

  const acceptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runMatch = useCallback(() => {
    if (!partners || partners.length === 0) {
      setState(prev => ({ ...prev, phase: isLoading ? "searching" : "no_match", isRefreshing: false }));
      return;
    }

    setState(prev => ({ ...prev, isRefreshing: true }));

    const candidates = partners
      .map(p => scorePartner(p, custLat, custLng, category, isEmergency))
      .filter((c): c is LivePartnerCandidate => c !== null)
      .sort((a, b) => b.matchScore - a.matchScore);

    const bestMatch = candidates[0] || null;

    setState(prev => ({
      ...prev,
      candidates,
      bestMatch,
      searchingPartnerCount: partners.length,
      refreshCount: prev.refreshCount + 1,
      lastRefreshedAt: new Date().toISOString(),
      isRefreshing: false,
      phase: bestMatch ? (prev.phase === "confirmed" ? "confirmed" : "matched") : "no_match",
    }));

    track("live_dispatch_db_refresh", {
      category,
      candidateCount: candidates.length,
      bestScore: bestMatch?.matchScore,
      bestDistance: bestMatch?.distanceKm,
    });
  }, [partners, isLoading, custLat, custLng, category, isEmergency]);

  // Run match when partners data changes
  useEffect(() => {
    if (!enabled) return;
    if (isLoading) return;
    
    const timer = setTimeout(() => runMatch(), state.refreshCount === 0 ? SEARCH_DURATION : 0);
    return () => clearTimeout(timer);
  }, [enabled, partners, isLoading, runMatch]);

  const startAcceptance = useCallback(() => {
    setState(prev => ({ ...prev, phase: "accepting", acceptCountdown: ACCEPT_TIMEOUT }));
    acceptTimerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.acceptCountdown <= 1) {
          if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
          const nextCandidates = prev.candidates.slice(1);
          const nextBest = nextCandidates[0] || null;
          return { ...prev, acceptCountdown: 0, phase: nextBest ? "matched" : "timeout", candidates: nextCandidates, bestMatch: nextBest };
        }
        return { ...prev, acceptCountdown: prev.acceptCountdown - 1 };
      });
    }, 1000);
  }, []);

  const confirmAcceptance = useCallback(() => {
    if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
    setState(prev => ({ ...prev, phase: "confirmed" }));
    track("dispatch_db_accepted", { category });
  }, [category]);

  useEffect(() => {
    return () => {
      if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
    };
  }, []);

  return { ...state, startAcceptance, confirmAcceptance, refresh: runMatch };
}
