/**
 * LankaFix Live Dispatch Hook
 * Provides real-time technician matching with auto-refresh, GPS drift simulation,
 * acceptance countdown, and dynamic ETA recalculation.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import type { CategoryCode } from "@/types/booking";
import { MOCK_TECHNICIANS, simulateGpsDrift, type TechnicianProfile } from "@/data/mockPartnerData";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { calculateDistance } from "@/lib/locationUtils";
import { calculateETA, detectTrafficLevel, getETARange, getTrafficLabel, type TrafficLevel } from "@/lib/etaEngine";
import { track } from "@/lib/analytics";

export interface LiveTechCandidate {
  tech: TechnicianProfile;
  distanceKm: number;
  etaMinutes: number;
  etaRange: string;
  trafficLevel: TrafficLevel;
  trafficLabel: string;
  matchScore: number;
  currentZoneName: string;
  isOnline: boolean;
}

export interface LiveDispatchState {
  phase: "searching" | "matched" | "accepting" | "confirmed" | "timeout" | "no_match";
  candidates: LiveTechCandidate[];
  bestMatch: LiveTechCandidate | null;
  searchingTechCount: number;
  refreshCount: number;
  acceptCountdown: number;
  lastRefreshedAt: string;
  isRefreshing: boolean;
}

const REFRESH_INTERVAL = 20_000; // 20s
const ACCEPT_TIMEOUT = 60; // 60s
const SEARCH_DURATION = 2500; // 2.5s initial search animation

function getZoneName(zoneId: string): string {
  const zone = COLOMBO_ZONES_DATA.find(z => z.id === zoneId);
  return zone ? zone.area : zoneId;
}

function getZoneGeo(zoneId: string): { lat: number; lng: number } | null {
  const zone = COLOMBO_ZONES_DATA.find(z => z.id === zoneId);
  return zone?.geo || null;
}

/** Score a technician for live dispatch */
function scoreTech(
  tech: TechnicianProfile,
  customerLat: number,
  customerLng: number,
  category: CategoryCode,
  isEmergency: boolean
): LiveTechCandidate | null {
  // Must match category
  if (!tech.specializations.includes(category)) return null;
  if (tech.availabilityStatus === "offline") return null;
  if (isEmergency && !tech.emergencyAvailable) return null;

  // Simulate current position with drift
  const drifted = simulateGpsDrift(tech.currentLat, tech.currentLng);
  const distanceKm = calculateDistance(customerLat, customerLng, drifted.lat, drifted.lng);
  
  // Skip if > 25km
  if (distanceKm > 25) return null;

  const traffic = detectTrafficLevel();
  const etaMinutes = calculateETA(distanceKm, traffic);

  // Scoring: 35% proximity + 30% rating + 20% experience + 15% availability
  const proximityScore = distanceKm < 2 ? 35 : distanceKm < 5 ? 30 : distanceKm < 8 ? 22 : distanceKm < 12 ? 15 : distanceKm < 15 ? 8 : 4;
  const ratingScore = Math.round((tech.rating / 5) * 30);
  const expScore = Math.min(Math.round((tech.experienceYears / 10) * 20), 20);
  let availScore = tech.availabilityStatus === "available" ? 15 : tech.availabilityStatus === "busy" ? 6 : 0;
  
  // Emergency boost
  if (isEmergency && tech.emergencyAvailable && distanceKm < 5) {
    availScore += 10;
  }

  const matchScore = Math.min(proximityScore + ratingScore + expScore + availScore, 100);

  return {
    tech: { ...tech, currentLat: drifted.lat, currentLng: drifted.lng },
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMinutes,
    etaRange: getETARange(etaMinutes),
    trafficLevel: traffic,
    trafficLabel: getTrafficLabel(traffic),
    matchScore,
    currentZoneName: getZoneName(tech.currentZoneId || ""),
    isOnline: tech.availabilityStatus !== "offline",
  };
}

export function useLiveDispatch(
  category: CategoryCode,
  customerZoneId: string,
  isEmergency: boolean = false,
  enabled: boolean = true
) {
  const [state, setState] = useState<LiveDispatchState>({
    phase: "searching",
    candidates: [],
    bestMatch: null,
    searchingTechCount: 0,
    refreshCount: 0,
    acceptCountdown: ACCEPT_TIMEOUT,
    lastRefreshedAt: new Date().toISOString(),
    isRefreshing: false,
  });

  const acceptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get customer geo
  const customerGeo = getZoneGeo(customerZoneId);
  const custLat = customerGeo?.lat || 6.9090;
  const custLng = customerGeo?.lng || 79.8620;

  const runMatch = useCallback(() => {
    setState(prev => ({ ...prev, isRefreshing: true }));

    const candidates = MOCK_TECHNICIANS
      .map(t => scoreTech(t, custLat, custLng, category, isEmergency))
      .filter((c): c is LiveTechCandidate => c !== null)
      .sort((a, b) => b.matchScore - a.matchScore);

    const bestMatch = candidates[0] || null;
    const onlineTechs = MOCK_TECHNICIANS.filter(t => t.availabilityStatus === "available" || t.availabilityStatus === "busy").length;

    setState(prev => ({
      ...prev,
      candidates,
      bestMatch,
      searchingTechCount: onlineTechs,
      refreshCount: prev.refreshCount + 1,
      lastRefreshedAt: new Date().toISOString(),
      isRefreshing: false,
      phase: bestMatch ? (prev.phase === "confirmed" ? "confirmed" : "matched") : "no_match",
    }));

    track("live_dispatch_refresh", {
      category,
      zone: customerZoneId,
      candidateCount: candidates.length,
      bestScore: bestMatch?.matchScore,
      bestDistance: bestMatch?.distanceKm,
    });
  }, [category, customerZoneId, isEmergency, custLat, custLng]);

  // Initial search phase
  useEffect(() => {
    if (!enabled) return;
    
    const searchTimer = setTimeout(() => {
      runMatch();
    }, SEARCH_DURATION);

    return () => clearTimeout(searchTimer);
  }, [enabled, runMatch]);

  // Auto-refresh every 20s
  useEffect(() => {
    if (!enabled || state.phase === "confirmed") return;

    refreshTimerRef.current = setInterval(() => {
      runMatch();
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [enabled, state.phase, runMatch]);

  // Start acceptance countdown
  const startAcceptance = useCallback(() => {
    setState(prev => ({ ...prev, phase: "accepting", acceptCountdown: ACCEPT_TIMEOUT }));

    acceptTimerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.acceptCountdown <= 1) {
          // Timeout — try next candidate
          if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
          const nextCandidates = prev.candidates.slice(1);
          const nextBest = nextCandidates[0] || null;
          return {
            ...prev,
            acceptCountdown: 0,
            phase: nextBest ? "matched" : "timeout",
            candidates: nextCandidates,
            bestMatch: nextBest,
          };
        }
        return { ...prev, acceptCountdown: prev.acceptCountdown - 1 };
      });
    }, 1000);
  }, []);

  // Simulate acceptance (partner accepts)
  const confirmAcceptance = useCallback(() => {
    if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    setState(prev => ({ ...prev, phase: "confirmed" }));
    track("dispatch_accepted", { category, zone: customerZoneId });
  }, [category, customerZoneId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  return {
    ...state,
    startAcceptance,
    confirmAcceptance,
    refresh: runMatch,
  };
}
