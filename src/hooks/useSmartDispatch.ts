/**
 * useSmartDispatch — Calls the smart-dispatch edge function
 * and manages acceptance timer, fallback rounds, and dispatch mode.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryCode } from "@/types/booking";
import { useLocationStore } from "@/store/locationStore";
import { track } from "@/lib/analytics";
import { getETARange, detectTrafficLevel, getTrafficLabel, type TrafficLevel } from "@/lib/etaEngine";

export interface DispatchScoreBreakdown {
  proximity: number;
  specialization: number;
  rating: number;
  response_speed: number;
  workload: number;
  completion_rate: number;
  emergency_priority: number;
  total: number;
}

export interface SmartDispatchCandidate {
  partner_id: string;
  partner: {
    id: string;
    full_name: string;
    business_name: string | null;
    rating_average: number;
    completed_jobs_count: number;
    experience_years: number;
    vehicle_type: string;
    brand_specializations: string[];
    specializations: string[];
    availability_status: string;
    emergency_available: boolean;
    current_job_count: number;
    service_zones: string[];
    profile_photo_url: string | null;
    acceptance_rate: number;
    cancellation_rate: number;
  };
  distance_km: number;
  eta_minutes: number;
  traffic: string;
  score: DispatchScoreBreakdown;
  // Enriched client-side
  etaRange: string;
  trafficLabel: string;
  currentZoneName: string;
}

export type DispatchMode = "auto" | "top_3" | "manual";

export interface SmartDispatchState {
  phase: "loading" | "searching" | "matched" | "accepting" | "confirmed" | "no_match" | "timeout" | "error";
  candidates: SmartDispatchCandidate[];
  bestMatch: SmartDispatchCandidate | null;
  dispatchMode: DispatchMode;
  totalEligible: number;
  dispatchRound: number;
  acceptCountdown: number;
  escalateToOps: boolean;
  error: string | null;
}

const ACCEPT_TIMEOUT = 60;
const EMERGENCY_ACCEPT_TIMEOUT = 45;

export function useSmartDispatch(
  category: CategoryCode,
  isEmergency: boolean = false,
  serviceType?: string,
  brand?: string,
  enabled: boolean = true,
) {
  const { getActiveAddress } = useLocationStore();
  const activeAddress = getActiveAddress();
  const custLat = activeAddress?.lat || 6.9090;
  const custLng = activeAddress?.lng || 79.8620;
  const custZone = activeAddress?.zoneId;

  const [state, setState] = useState<SmartDispatchState>({
    phase: "loading",
    candidates: [],
    bestMatch: null,
    dispatchMode: "auto",
    totalEligible: 0,
    dispatchRound: 1,
    acceptCountdown: isEmergency ? EMERGENCY_ACCEPT_TIMEOUT : ACCEPT_TIMEOUT,
    escalateToOps: false,
    error: null,
  });

  const acceptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const enrichCandidate = useCallback((raw: any): SmartDispatchCandidate => {
    const traffic = raw.traffic as TrafficLevel || detectTrafficLevel();
    return {
      ...raw,
      etaRange: getETARange(raw.eta_minutes),
      trafficLabel: getTrafficLabel(traffic),
      currentZoneName: raw.partner?.service_zones?.[0]?.replace(/_/g, " ") || "Colombo",
    };
  }, []);

  const runDispatch = useCallback(async () => {
    if (!enabled) return;
    setState(prev => ({ ...prev, phase: "searching", error: null }));

    try {
      const { data, error } = await supabase.functions.invoke("smart-dispatch", {
        body: {
          category_code: category,
          service_type: serviceType,
          brand,
          customer_lat: custLat,
          customer_lng: custLng,
          customer_zone: custZone,
          is_emergency: isEmergency,
        },
      });

      if (error) throw error;
      if (!mountedRef.current) return;

      const candidates = (data.candidates || []).map(enrichCandidate);
      const bestMatch = candidates[0] || null;

      track("smart_dispatch_result", {
        category,
        mode: data.dispatch_mode,
        candidateCount: candidates.length,
        totalEligible: data.total_eligible,
        bestScore: bestMatch?.score?.total,
        bestDistance: bestMatch?.distance_km,
      });

      setState(prev => ({
        ...prev,
        candidates,
        bestMatch,
        dispatchMode: data.dispatch_mode || "auto",
        totalEligible: data.total_eligible || 0,
        escalateToOps: data.escalate_to_ops || false,
        phase: bestMatch ? "matched" : "no_match",
      }));
    } catch (e) {
      console.error("[SmartDispatch] Error:", e);
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        phase: "error",
        error: e instanceof Error ? e.message : "Dispatch failed",
      }));
    }
  }, [enabled, category, serviceType, brand, custLat, custLng, custZone, isEmergency, enrichCandidate]);

  // Initial dispatch
  useEffect(() => {
    if (!enabled) return;
    // Small delay for UX searching animation
    const timer = setTimeout(runDispatch, 2000);
    return () => clearTimeout(timer);
  }, [enabled, runDispatch]);

  const startAcceptance = useCallback(() => {
    const timeout = isEmergency ? EMERGENCY_ACCEPT_TIMEOUT : ACCEPT_TIMEOUT;
    setState(prev => ({ ...prev, phase: "accepting", acceptCountdown: timeout }));
    acceptTimerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.acceptCountdown <= 1) {
          if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
          // Fallback to next candidate
          const nextCandidates = prev.candidates.slice(1);
          const nextBest = nextCandidates[0] || null;
          return {
            ...prev,
            acceptCountdown: 0,
            phase: nextBest ? "matched" : "timeout",
            candidates: nextCandidates,
            bestMatch: nextBest,
            dispatchRound: prev.dispatchRound + 1,
          };
        }
        return { ...prev, acceptCountdown: prev.acceptCountdown - 1 };
      });
    }, 1000);
  }, [isEmergency]);

  const confirmAcceptance = useCallback(() => {
    if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
    setState(prev => ({ ...prev, phase: "confirmed" }));
    track("smart_dispatch_accepted", { category });
  }, [category]);

  const selectCandidate = useCallback((candidateId: string) => {
    setState(prev => {
      const selected = prev.candidates.find(c => c.partner_id === candidateId);
      if (!selected) return prev;
      return { ...prev, bestMatch: selected };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
    };
  }, []);

  return {
    ...state,
    startAcceptance,
    confirmAcceptance,
    selectCandidate,
    refresh: runDispatch,
  };
}
