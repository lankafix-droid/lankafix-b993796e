/**
 * useSmartDispatch — Backend-driven dispatch with ETA ranges,
 * dynamic accept windows, and realtime status sync.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryCode } from "@/types/booking";
import { useLocationStore } from "@/store/locationStore";
import { track } from "@/lib/analytics";

export interface DispatchScoreBreakdown {
  proximity: number;
  specialization: number;
  rating: number;
  response_speed: number;
  workload: number;
  completion_rate: number;
  emergency_priority: number;
  new_partner_boost: number;
  vehicle_bonus: number;
  zone_preference: number;
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
  eta_min: number;
  eta_max: number;
  traffic: string;
  traffic_label: string;
  location_source: string;
  score: DispatchScoreBreakdown;
  // Enriched client-side
  etaRangeLabel: string;
  currentZoneName: string;
}

export type DispatchMode = "auto" | "top_3" | "manual";

export interface SmartDispatchState {
  phase: "loading" | "searching" | "matched" | "accepting" | "confirmed" | "no_match" | "timeout" | "escalated" | "error";
  candidates: SmartDispatchCandidate[];
  bestMatch: SmartDispatchCandidate | null;
  dispatchMode: DispatchMode;
  totalEligible: number;
  dispatchRound: number;
  acceptCountdown: number;
  acceptWindowSeconds: number;
  escalateToOps: boolean;
  error: string | null;
}

const DEFAULT_ACCEPT_TIMEOUT = 60;
const EMERGENCY_ACCEPT_TIMEOUT = 30;

export function useSmartDispatch(
  category: CategoryCode,
  isEmergency: boolean = false,
  serviceType?: string,
  brand?: string,
  enabled: boolean = true,
  bookingId?: string,
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
    acceptCountdown: isEmergency ? EMERGENCY_ACCEPT_TIMEOUT : DEFAULT_ACCEPT_TIMEOUT,
    acceptWindowSeconds: isEmergency ? EMERGENCY_ACCEPT_TIMEOUT : DEFAULT_ACCEPT_TIMEOUT,
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
    const etaMin = raw.eta_min || Math.round(raw.eta_minutes * 0.7);
    const etaMax = raw.eta_max || Math.round(raw.eta_minutes * 1.3);
    return {
      ...raw,
      eta_min: etaMin,
      eta_max: etaMax,
      etaRangeLabel: `${etaMin}–${etaMax} min`,
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
          booking_id: bookingId,
        },
      });

      if (error) throw error;
      if (!mountedRef.current) return;

      const candidates = (data.candidates || []).map(enrichCandidate);
      const bestMatch = candidates[0] || null;
      // Use server-provided accept window (§12)
      const serverAcceptWindow = data.accept_window_seconds || (isEmergency ? EMERGENCY_ACCEPT_TIMEOUT : DEFAULT_ACCEPT_TIMEOUT);

      track("smart_dispatch_result", {
        category,
        mode: data.dispatch_mode,
        candidateCount: candidates.length,
        totalEligible: data.total_eligible,
        bestScore: bestMatch?.score?.total,
        bestDistance: bestMatch?.distance_km,
        dispatchRound: data.dispatch_round,
      });

      setState(prev => ({
        ...prev,
        candidates,
        bestMatch,
        dispatchMode: data.dispatch_mode || "auto",
        totalEligible: data.total_eligible || 0,
        dispatchRound: data.dispatch_round || 1,
        acceptWindowSeconds: serverAcceptWindow,
        escalateToOps: data.escalate_to_ops || false,
        phase: bestMatch ? "matched" : data.escalate_to_ops ? "escalated" : "no_match",
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
  }, [enabled, category, serviceType, brand, custLat, custLng, custZone, isEmergency, enrichCandidate, bookingId]);

  // Initial dispatch
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(runDispatch, 2000);
    return () => clearTimeout(timer);
  }, [enabled, runDispatch]);

  const startAcceptance = useCallback(() => {
    const timeout = state.acceptWindowSeconds;
    setState(prev => ({ ...prev, phase: "accepting", acceptCountdown: timeout }));
    acceptTimerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.acceptCountdown <= 1) {
          if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
          // Backend handles timeout
          if (bookingId && prev.bestMatch) {
            supabase.functions.invoke("dispatch-accept", {
              body: {
                booking_id: bookingId,
                partner_id: prev.bestMatch.partner_id,
                action: "timeout",
              },
            }).then(({ data }) => {
              if (!mountedRef.current) return;
              if (data?.status === "escalated") {
                setState(p => ({ ...p, phase: "escalated", acceptCountdown: 0 }));
              } else if (data?.status === "next_round") {
                setState(p => ({
                  ...p, phase: "searching", acceptCountdown: 0,
                  dispatchRound: data.dispatch_round,
                }));
                setTimeout(() => runDispatch(), 3000);
              }
            });
          }
          return { ...prev, acceptCountdown: 0, phase: "searching" };
        }
        return { ...prev, acceptCountdown: prev.acceptCountdown - 1 };
      });
    }, 1000);
  }, [state.acceptWindowSeconds, bookingId, runDispatch]);

  const confirmAcceptance = useCallback(async () => {
    if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);

    if (bookingId && state.bestMatch) {
      try {
        await supabase.functions.invoke("dispatch-accept", {
          body: {
            booking_id: bookingId,
            partner_id: state.bestMatch.partner_id,
            action: "accept",
          },
        });
        setState(prev => ({ ...prev, phase: "confirmed" }));
        track("smart_dispatch_accepted", { category, bookingId });
      } catch (e) {
        console.error("[SmartDispatch] Accept error:", e);
        setState(prev => ({ ...prev, phase: "confirmed" }));
      }
    } else {
      setState(prev => ({ ...prev, phase: "confirmed" }));
      track("smart_dispatch_accepted", { category });
    }
  }, [category, bookingId, state.bestMatch]);

  const selectCandidate = useCallback(async (candidateId: string) => {
    const selected = state.candidates.find(c => c.partner_id === candidateId);
    if (!selected) return;

    setState(prev => ({ ...prev, bestMatch: selected }));

    if (bookingId) {
      try {
        await supabase.functions.invoke("dispatch-select", {
          body: {
            booking_id: bookingId,
            partner_id: candidateId,
            eta_minutes: selected.eta_minutes,
          },
        });
        track("smart_dispatch_customer_selected", { category, partnerId: candidateId, bookingId });
      } catch (e) {
        console.error("[SmartDispatch] Select error:", e);
      }
    }
  }, [state.candidates, bookingId, category]);

  // Subscribe to realtime booking dispatch_status + ops_confirmed
  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`dispatch-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload: any) => {
          const newStatus = payload.new?.dispatch_status;
          if (newStatus === "accepted" || newStatus === "ops_confirmed") {
            if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
            setState(prev => ({ ...prev, phase: "confirmed" }));
          } else if (newStatus === "escalated") {
            if (acceptTimerRef.current) clearInterval(acceptTimerRef.current);
            setState(prev => ({ ...prev, phase: "escalated" }));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

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
