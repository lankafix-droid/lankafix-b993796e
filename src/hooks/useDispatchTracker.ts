/**
 * useDispatchTracker — Real-time customer-facing dispatch status tracker.
 *
 * Subscribes to:
 * - bookings (dispatch_status, status changes)
 * - dispatch_offers (offer lifecycle)
 * - job_timeline (event log for secondary signals)
 *
 * Normalizes into clear customer-facing phases:
 * SEARCHING_TECHNICIAN → OFFER_SENT → AWAITING_ACCEPTANCE →
 * TECHNICIAN_ACCEPTED → TEAM_FORMING → TECHNICIAN_EN_ROUTE →
 * TECHNICIAN_ARRIVING → DISPATCH_ESCALATED → DISPATCH_FAILED
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DispatchPhase =
  | "IDLE"
  | "SEARCHING_TECHNICIAN"
  | "OFFER_SENT"
  | "AWAITING_ACCEPTANCE"
  | "TECHNICIAN_ACCEPTED"
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
  // Extended data
  offers_pending: number;
  offers_total: number;
  accepted_count: number;
  multi_tech_required: number;
  is_multi_tech: boolean;
  last_event: string | null;
  error: string | null;
}

const INITIAL_STATE: DispatchTrackerState = {
  phase: "IDLE",
  technician: null,
  eta: null,
  team_members: [],
  dispatch_round: 0,
  escalation_flag: false,
  offers_pending: 0,
  offers_total: 0,
  accepted_count: 0,
  multi_tech_required: 1,
  is_multi_tech: false,
  last_event: null,
  error: null,
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
      const [bookingRes, offersRes, timelineRes] = await Promise.all([
        supabase.from("bookings")
          .select("dispatch_status, dispatch_round, dispatch_mode, promised_eta_minutes, partner_id, status, category_code, is_emergency")
          .eq("id", bookingId)
          .single(),
        supabase.from("dispatch_offers")
          .select("id, partner_id, status, offer_mode, is_lead_technician, eta_min_minutes, eta_max_minutes, dispatch_score, accept_window_seconds, created_at, expires_at, multi_tech_group_id, category_code")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false }),
        supabase.from("job_timeline")
          .select("status, note, created_at")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (!mountedRef.current) return;

      const booking = bookingRes.data;
      if (!booking) return;

      const offers = offersRes.data || [];
      const timeline = timelineRes.data || [];

      const pendingOffers = offers.filter((o: any) => o.status === "pending");
      const acceptedOffers = offers.filter((o: any) => o.status === "accepted");
      const isMultiTech = offers.some((o: any) => o.offer_mode === "multi_tech");
      const multiTechRequired = isMultiTech
        ? MULTI_TECH_DEFAULTS[booking.category_code] || 2
        : 1;

      // ═══ PHASE RESOLUTION ═══
      let phase: DispatchPhase = "IDLE";

      // Check booking-level status first
      if (booking.status === "cancelled") {
        phase = "DISPATCH_FAILED";
      } else if (["tech_en_route"].includes(booking.status)) {
        phase = "TECHNICIAN_EN_ROUTE";
      } else if (["tech_arrived", "inspecting"].includes(booking.status)) {
        phase = "TECHNICIAN_ARRIVING";
      } else {
        // Dispatch-status based
        switch (booking.dispatch_status) {
          case "dispatching":
            phase = "SEARCHING_TECHNICIAN";
            break;

          case "pending_acceptance":
            if (pendingOffers.length > 0) {
              phase = "AWAITING_ACCEPTANCE";
            } else {
              phase = "OFFER_SENT";
            }
            break;

          case "accepted":
          case "ops_confirmed":
            phase = "TECHNICIAN_ACCEPTED";
            break;

          case "team_assigned":
            phase = "TEAM_ASSIGNED";
            break;

          case "escalated":
          case "no_provider_found":
            phase = "DISPATCH_ESCALATED";
            break;

          default:
            if (booking.partner_id && ["assigned", "tech_en_route"].includes(booking.status)) {
              phase = "TECHNICIAN_ACCEPTED";
            } else if (booking.dispatch_status) {
              phase = "SEARCHING_TECHNICIAN";
            }
            break;
        }
      }

      // Multi-tech team forming detection
      if (isMultiTech && acceptedOffers.length > 0 && acceptedOffers.length < multiTechRequired && pendingOffers.length > 0) {
        phase = "TEAM_FORMING";
      }

      // ═══ TECHNICIAN DETAILS ═══
      let technician: TechnicianInfo | null = null;
      let teamMembers: TechnicianInfo[] = [];

      if (acceptedOffers.length > 0) {
        const partnerIds = [...new Set(acceptedOffers.map((o: any) => o.partner_id))];
        const { data: partners } = await supabase
          .from("partners")
          .select("id, full_name, rating_average, vehicle_type, profile_photo_url")
          .in("id", partnerIds);

        if (mountedRef.current && partners) {
          teamMembers = partners.map((p: any) => {
            const offer = acceptedOffers.find((o: any) => o.partner_id === p.id);
            return {
              partner_id: p.id,
              full_name: p.full_name,
              rating_average: p.rating_average || 0,
              vehicle_type: p.vehicle_type || "motorcycle",
              profile_photo_url: p.profile_photo_url,
              is_lead: offer?.is_lead_technician || false,
            };
          });

          // Primary technician = lead or first accepted
          const lead = teamMembers.find(t => t.is_lead);
          technician = lead || teamMembers[0] || null;
        }
      } else if (booking.partner_id) {
        // Fallback: fetch from booking.partner_id
        const { data: assignedPartner } = await supabase
          .from("partners")
          .select("id, full_name, rating_average, vehicle_type, profile_photo_url")
          .eq("id", booking.partner_id)
          .single();

        if (mountedRef.current && assignedPartner) {
          technician = {
            partner_id: assignedPartner.id,
            full_name: assignedPartner.full_name,
            rating_average: assignedPartner.rating_average || 0,
            vehicle_type: assignedPartner.vehicle_type || "motorcycle",
            profile_photo_url: assignedPartner.profile_photo_url,
            is_lead: true,
          };
          teamMembers = [technician];
        }
      }

      // ═══ ETA ═══
      const bestOffer = acceptedOffers[0] || pendingOffers[0];
      const eta = bestOffer
        ? { min: bestOffer.eta_min_minutes, max: bestOffer.eta_max_minutes }
        : booking.promised_eta_minutes
          ? { min: Math.round(booking.promised_eta_minutes * 0.7), max: Math.round(booking.promised_eta_minutes * 1.3) }
          : null;

      // Last meaningful event
      const lastEvent = timeline[0]?.status || null;

      if (mountedRef.current) {
        setState({
          phase,
          technician,
          eta,
          team_members: teamMembers,
          dispatch_round: booking.dispatch_round || 0,
          escalation_flag: booking.dispatch_status === "escalated",
          offers_pending: pendingOffers.length,
          offers_total: offers.length,
          accepted_count: acceptedOffers.length,
          multi_tech_required: multiTechRequired,
          is_multi_tech: isMultiTech,
          last_event: lastEvent,
          error: null,
        });
      }
    } catch (e) {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, error: e instanceof Error ? e.message : "Unknown error" }));
      }
    }
  }, [bookingId]);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Real-time subscriptions: bookings + dispatch_offers + job_timeline
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`dispatch-tracker-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        () => { fetchState(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dispatch_offers", filter: `booking_id=eq.${bookingId}` },
        () => { fetchState(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "job_timeline", filter: `booking_id=eq.${bookingId}` },
        () => { fetchState(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId, fetchState]);

  return state;
}
