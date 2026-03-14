/**
 * useDispatchTracker — Real-time customer-facing dispatch status tracker.
 * 
 * Subscribes to:
 * - bookings table (dispatch_status changes)
 * - dispatch_offers table (offer status changes)
 * 
 * Provides live dispatch phases:
 * searching → offered → accepted → en_route → arriving → failed
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DispatchPhase =
  | "idle"
  | "searching"
  | "offered"
  | "accepted"
  | "team_assembling"
  | "team_assigned"
  | "en_route"
  | "arriving"
  | "failed"
  | "escalated";

export interface DispatchOffer {
  id: string;
  partner_id: string;
  status: string;
  offer_mode: string;
  is_lead_technician: boolean;
  eta_min_minutes: number;
  eta_max_minutes: number;
  dispatch_score: number;
  accept_window_seconds: number;
  created_at: string;
  expires_at: string;
}

export interface AssignedTechnician {
  partner_id: string;
  full_name: string;
  rating_average: number;
  vehicle_type: string;
  profile_photo_url: string | null;
  eta_minutes: number;
  is_lead: boolean;
}

export interface DispatchTrackerState {
  phase: DispatchPhase;
  offers: DispatchOffer[];
  assignedTechnicians: AssignedTechnician[];
  dispatchRound: number;
  multiTechCount: number;
  acceptedCount: number;
  estimatedEta: { min: number; max: number } | null;
  error: string | null;
}

export function useDispatchTracker(bookingId: string | undefined) {
  const [state, setState] = useState<DispatchTrackerState>({
    phase: "idle",
    offers: [],
    assignedTechnicians: [],
    dispatchRound: 0,
    multiTechCount: 1,
    acceptedCount: 0,
    estimatedEta: null,
    error: null,
  });

  // Fetch initial state
  const fetchState = useCallback(async () => {
    if (!bookingId) return;

    const [bookingRes, offersRes] = await Promise.all([
      supabase.from("bookings")
        .select("dispatch_status, dispatch_round, dispatch_mode, promised_eta_minutes, partner_id")
        .eq("id", bookingId)
        .single(),
      supabase.from("dispatch_offers")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false }),
    ]);

    const booking = bookingRes.data;
    const offers = (offersRes.data || []) as DispatchOffer[];

    if (!booking) return;

    const acceptedOffers = offers.filter(o => o.status === "accepted");
    const pendingOffers = offers.filter(o => o.status === "pending");
    const isMultiTech = offers.some(o => o.offer_mode === "multi_tech");

    // Determine phase from dispatch_status
    let phase: DispatchPhase = "idle";
    switch (booking.dispatch_status) {
      case "dispatching": phase = "searching"; break;
      case "pending_acceptance": phase = pendingOffers.length > 0 ? "offered" : "searching"; break;
      case "accepted":
      case "ops_confirmed":
        phase = "accepted"; break;
      case "team_assigned": phase = "team_assigned"; break;
      case "escalated":
      case "no_provider_found": phase = "escalated"; break;
      default:
        if (booking.partner_id) phase = "accepted";
        break;
    }

    // If multi-tech and some accepted but not all, show assembling
    if (isMultiTech && acceptedOffers.length > 0 && acceptedOffers.length < offers.filter(o => o.offer_mode === "multi_tech").length) {
      phase = "team_assembling";
    }

    // Fetch assigned technician details
    let assignedTechnicians: AssignedTechnician[] = [];
    if (acceptedOffers.length > 0) {
      const partnerIds = acceptedOffers.map(o => o.partner_id);
      const { data: partners } = await supabase
        .from("partners")
        .select("id, full_name, rating_average, vehicle_type, profile_photo_url")
        .in("id", partnerIds);

      assignedTechnicians = (partners || []).map((p: any) => {
        const offer = acceptedOffers.find(o => o.partner_id === p.id);
        return {
          partner_id: p.id,
          full_name: p.full_name,
          rating_average: p.rating_average,
          vehicle_type: p.vehicle_type,
          profile_photo_url: p.profile_photo_url,
          eta_minutes: offer?.eta_min_minutes || booking.promised_eta_minutes || 30,
          is_lead: offer?.is_lead_technician || false,
        };
      });
    }

    // ETA from best accepted offer or booking
    const bestOffer = acceptedOffers[0] || pendingOffers[0];
    const estimatedEta = bestOffer
      ? { min: bestOffer.eta_min_minutes, max: bestOffer.eta_max_minutes }
      : booking.promised_eta_minutes
        ? { min: Math.round(booking.promised_eta_minutes * 0.7), max: Math.round(booking.promised_eta_minutes * 1.3) }
        : null;

    setState({
      phase,
      offers,
      assignedTechnicians,
      dispatchRound: booking.dispatch_round || 0,
      multiTechCount: isMultiTech ? offers.filter(o => o.offer_mode === "multi_tech").length : 1,
      acceptedCount: acceptedOffers.length,
      estimatedEta,
      error: null,
    });
  }, [bookingId]);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Real-time subscriptions
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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId, fetchState]);

  return state;
}
