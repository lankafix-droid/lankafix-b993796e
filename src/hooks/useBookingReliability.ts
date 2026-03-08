/**
 * useBookingReliability — Monitors booking lifecycle health
 * and provides real-time status for the customer UI.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReliabilityPhase =
  | "awaiting_payment"
  | "payment_confirmed"
  | "dispatching"
  | "pending_acceptance"
  | "accepted"
  | "retrying"
  | "escalated"
  | "abandoned"
  | "assigned";

export interface ReliabilityState {
  phase: ReliabilityPhase;
  dispatchRound: number;
  maxRounds: number;
  elapsedSec: number;
  isEmergency: boolean;
  acceptanceWindowSec: number;
  message: string;
  isRetrying: boolean;
}

export function useBookingReliability(bookingId: string | null) {
  const [state, setState] = useState<ReliabilityState>({
    phase: "awaiting_payment",
    dispatchRound: 0,
    maxRounds: 5,
    elapsedSec: 0,
    isEmergency: false,
    acceptanceWindowSec: 60,
    message: "Waiting for booking confirmation...",
    isRetrying: false,
  });

  // Poll booking state
  const fetchState = useCallback(async () => {
    if (!bookingId) return;

    const { data: booking } = await supabase
      .from("bookings")
      .select("protection_status, dispatch_status, dispatch_round, is_emergency, status, partner_id, assigned_at, created_at")
      .eq("id", bookingId)
      .single();

    if (!booking) return;

    const isEmergency = booking.is_emergency || false;
    const windowSec = isEmergency ? 30 : 60;
    const round = booking.dispatch_round || 0;

    let phase: ReliabilityPhase = "awaiting_payment";
    let message = "Complete payment to confirm your booking.";
    let isRetrying = false;

    if (booking.status === "cancelled") {
      phase = "abandoned";
      message = "Booking was not completed.";
    } else if (booking.dispatch_status === "accepted" || booking.dispatch_status === "ops_confirmed") {
      phase = "assigned";
      message = "Technician assigned and confirmed!";
    } else if (booking.dispatch_status === "escalated") {
      phase = "escalated";
      message = "Our team is manually assigning the best technician for you.";
    } else if (booking.dispatch_status === "pending_acceptance") {
      phase = "pending_acceptance";
      message = `Waiting for technician to accept (attempt ${round} of 5)...`;
    } else if (booking.dispatch_status === "dispatching") {
      phase = round > 1 ? "retrying" : "dispatching";
      isRetrying = round > 1;
      message = isRetrying
        ? `Finding next available technician (attempt ${round})...`
        : "Finding the best verified technician near you...";
    } else if (booking.protection_status === "paid") {
      phase = "payment_confirmed";
      message = "Payment confirmed — starting technician search...";
    }

    // Calculate elapsed since dispatch started
    const elapsedSec = booking.assigned_at
      ? 0
      : Math.floor((Date.now() - new Date(booking.created_at).getTime()) / 1000);

    setState({
      phase,
      dispatchRound: round,
      maxRounds: 5,
      elapsedSec,
      isEmergency,
      acceptanceWindowSec: windowSec,
      message,
      isRetrying,
    });
  }, [bookingId]);

  // Initial fetch + polling
  useEffect(() => {
    if (!bookingId) return;
    fetchState();
    const interval = setInterval(fetchState, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [bookingId, fetchState]);

  // Realtime updates
  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`reliability-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        () => fetchState()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId, fetchState]);

  return state;
}
