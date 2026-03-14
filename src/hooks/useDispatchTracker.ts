/**
 * useDispatchTracker — Real-time customer-facing dispatch status tracker.
 *
 * Subscribes to bookings, dispatch_offers, job_timeline via Supabase Realtime.
 *
 * Customer-facing phases:
 * SEARCHING_TECHNICIAN → AWAITING_ACCEPTANCE → TECHNICIAN_ACCEPTED →
 * SEARCHING_TEAM → LEAD_ASSIGNED → TEAM_FORMING → TEAM_ASSIGNED →
 * TECHNICIAN_EN_ROUTE → TECHNICIAN_ARRIVING →
 * DISPATCH_ESCALATED → DISPATCH_FAILED
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DispatchPhase =
  | "IDLE"
  | "SEARCHING_TECHNICIAN"
  | "AWAITING_ACCEPTANCE"
  | "TECHNICIAN_ACCEPTED"
  | "SEARCHING_TEAM"
  | "LEAD_ASSIGNED"
  | "TEAM_FORMING"
  | "TEAM_ASSIGNED"
  | "TECHNICIAN_EN_ROUTE"
  | "TECHNICIAN_ARRIVING"
  | "DISPATCH_ESCALATED"
  | "DISPATCH_FAILED";

export interface TechnicianInfo {
  partner_id: string;
  full_name: string;
  rating_average: number;
  vehicle_type: string;
  profile_photo_url: string | null;
  is_lead: boolean;
}

export interface DispatchTrackerState {
  phase: DispatchPhase;
  technician: TechnicianInfo | null;
  eta: { min: number; max: number } | null;
  team_members: TechnicianInfo[];
  dispatch_round: number;
  escalation_flag: boolean;
}

const INITIAL_STATE: DispatchTrackerState = {
  phase: "IDLE",
  technician: null,
  eta: null,
  team_members: [],
  dispatch_round: 0,
  escalation_flag: false,
};

const MULTI_TECH_DEFAULTS: Record<string, number> = { AC: 2, SOLAR: 3, CCTV: 2, SMART_HOME_OFFICE: 2 };

export function useDispatchTracker(bookingId: string | undefined) {
  const [state, setState] = useState<DispatchTrackerState>(INITIAL_STATE);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchState = useCallback(async () => {
    if (!bookingId || !mountedRef.current) return;

    try {
      const [bookingRes, offersRes] = await Promise.all([
        supabase.from("bookings")
          .select("dispatch_status, dispatch_round, dispatch_mode, promised_eta_minutes, partner_id, status, category_code, is_emergency")
          .eq("id", bookingId)
          .single(),
        supabase.from("dispatch_offers")
          .select("id, partner_id, status, offer_mode, is_lead_technician, eta_min_minutes, eta_max_minutes, multi_tech_group_id")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false }),
      ]);

      if (!mountedRef.current) return;

      const booking = bookingRes.data;
      if (!booking) return;

      const offers = offersRes.data || [];
      const pendingOffers = offers.filter((o: any) => o.status === "pending");
      const acceptedOffers = offers.filter((o: any) => o.status === "accepted");
      const isMultiTech = offers.some((o: any) => o.offer_mode === "multi_tech");
      const multiTechRequired = isMultiTech ? MULTI_TECH_DEFAULTS[booking.category_code] || 2 : 1;
      const hasAcceptedLead = acceptedOffers.some((o: any) => o.is_lead_technician);

      // ═══ PHASE RESOLUTION ═══
      let phase: DispatchPhase = "IDLE";

      if (booking.status === "cancelled") {
        phase = "DISPATCH_FAILED";
      } else if (["tech_en_route"].includes(booking.status)) {
        phase = "TECHNICIAN_EN_ROUTE";
      } else if (["tech_arrived", "inspecting"].includes(booking.status)) {
        phase = "TECHNICIAN_ARRIVING";
      } else if (booking.dispatch_status === "escalated" || booking.dispatch_status === "no_provider_found") {
        phase = "DISPATCH_ESCALATED";
      } else if (booking.dispatch_status === "team_assigned") {
        phase = "TEAM_ASSIGNED";
      } else if (booking.dispatch_status === "accepted" || booking.dispatch_status === "ops_confirmed") {
        phase = isMultiTech ? "TEAM_ASSIGNED" : "TECHNICIAN_ACCEPTED";
      } else if (isMultiTech) {
        // Multi-tech specific sub-phases
        if (hasAcceptedLead && acceptedOffers.length < multiTechRequired && pendingOffers.length > 0) {
          phase = "TEAM_FORMING";
        } else if (hasAcceptedLead && acceptedOffers.length < multiTechRequired) {
          phase = "SEARCHING_TEAM";
        } else if (hasAcceptedLead) {
          phase = "LEAD_ASSIGNED";
        } else if (pendingOffers.length > 0) {
          phase = "AWAITING_ACCEPTANCE";
        } else if (booking.dispatch_status === "dispatching") {
          phase = "SEARCHING_TECHNICIAN";
        } else if (booking.dispatch_status) {
          phase = "SEARCHING_TECHNICIAN";
        }
      } else {
        // Single-tech phases
        if (booking.dispatch_status === "pending_acceptance") {
          phase = pendingOffers.length > 0 ? "AWAITING_ACCEPTANCE" : "SEARCHING_TECHNICIAN";
        } else if (booking.dispatch_status === "dispatching") {
          phase = "SEARCHING_TECHNICIAN";
        } else if (booking.partner_id && ["assigned", "tech_en_route"].includes(booking.status)) {
          phase = "TECHNICIAN_ACCEPTED";
        } else if (booking.dispatch_status) {
          phase = "SEARCHING_TECHNICIAN";
        }
      }

      // ═══ TECHNICIAN DETAILS ═══
      let technician: TechnicianInfo | null = null;
      let teamMembers: TechnicianInfo[] = [];

      const partnerIdsToFetch = acceptedOffers.length > 0
        ? [...new Set(acceptedOffers.map((o: any) => o.partner_id))]
        : booking.partner_id ? [booking.partner_id] : [];

      if (partnerIdsToFetch.length > 0 && mountedRef.current) {
        const { data: partners } = await supabase
          .from("partners")
          .select("id, full_name, rating_average, vehicle_type, profile_photo_url")
          .in("id", partnerIdsToFetch);

        if (mountedRef.current && partners) {
          teamMembers = partners.map((p: any) => {
            const offer = acceptedOffers.find((o: any) => o.partner_id === p.id);
            return {
              partner_id: p.id,
              full_name: p.full_name,
              rating_average: p.rating_average || 0,
              vehicle_type: p.vehicle_type || "motorcycle",
              profile_photo_url: p.profile_photo_url,
              is_lead: offer?.is_lead_technician || (partnerIdsToFetch.length === 1),
            };
          });

          const lead = teamMembers.find(t => t.is_lead);
          technician = lead || teamMembers[0] || null;
        }
      }

      // ═══ ETA ═══
      const bestOffer = acceptedOffers[0] || pendingOffers[0];
      const eta = bestOffer?.eta_min_minutes != null
        ? { min: bestOffer.eta_min_minutes, max: bestOffer.eta_max_minutes }
        : booking.promised_eta_minutes
          ? { min: Math.round(booking.promised_eta_minutes * 0.7), max: Math.round(booking.promised_eta_minutes * 1.3) }
          : null;

      if (mountedRef.current) {
        setState({
          phase,
          technician,
          eta,
          team_members: teamMembers,
          dispatch_round: booking.dispatch_round || 0,
          escalation_flag: booking.dispatch_status === "escalated",
        });
      }
    } catch (e) {
      console.error("[DispatchTracker] Error:", e);
    }
  }, [bookingId]);

  // Initial fetch
  useEffect(() => { fetchState(); }, [fetchState]);

  // Real-time subscriptions
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`dispatch-tracker-${bookingId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` }, () => fetchState())
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_offers", filter: `booking_id=eq.${bookingId}` }, () => fetchState())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "job_timeline", filter: `booking_id=eq.${bookingId}` }, () => fetchState())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId, fetchState]);

  return state;
}
