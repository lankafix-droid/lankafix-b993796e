/**
 * LankaFix Technician Offer Queue
 * Manages job offer → accept/reject → timeout → next technician cycle.
 */
import { track } from "@/lib/analytics";
import { DISPATCH_DEFAULTS } from "@/lib/locationUtils";

export type OfferStatus = "pending" | "accepted" | "rejected" | "timeout";

export interface TechnicianOffer {
  technicianId: string;
  technicianName: string;
  offeredAt: string;
  status: OfferStatus;
  rejectReason?: string;
  respondedAt?: string;
}

export interface DispatchQueue {
  bookingId: string;
  offers: TechnicianOffer[];
  currentOfferIndex: number;
  status: "dispatching" | "assigned" | "failed" | "manual_queue";
  startedAt: string;
  completedAt?: string;
}

export type DispatchEvent =
  | "TECHNICIAN_OFFER_SENT"
  | "TECHNICIAN_ACCEPTED"
  | "TECHNICIAN_REJECTED"
  | "TECHNICIAN_TIMEOUT"
  | "DISPATCH_SUCCESS"
  | "DISPATCH_FAILED";

/** Create a new dispatch queue for a booking */
export function createDispatchQueue(bookingId: string): DispatchQueue {
  track("dispatch_started", { bookingId });
  return {
    bookingId,
    offers: [],
    currentOfferIndex: -1,
    status: "dispatching",
    startedAt: new Date().toISOString(),
  };
}

/** Add offer to queue */
export function sendOffer(queue: DispatchQueue, techId: string, techName: string): DispatchQueue {
  const offer: TechnicianOffer = {
    technicianId: techId,
    technicianName: techName,
    offeredAt: new Date().toISOString(),
    status: "pending",
  };
  track("technician_offer_sent", { bookingId: queue.bookingId, technicianId: techId });
  return {
    ...queue,
    offers: [...queue.offers, offer],
    currentOfferIndex: queue.offers.length,
  };
}

/** Accept current offer */
export function acceptOffer(queue: DispatchQueue): DispatchQueue {
  const idx = queue.currentOfferIndex;
  if (idx < 0 || idx >= queue.offers.length) return queue;
  const offers = [...queue.offers];
  offers[idx] = { ...offers[idx], status: "accepted", respondedAt: new Date().toISOString() };
  track("technician_offer_accepted", { bookingId: queue.bookingId, technicianId: offers[idx].technicianId });
  return { ...queue, offers, status: "assigned", completedAt: new Date().toISOString() };
}

/** Reject current offer */
export function rejectOffer(queue: DispatchQueue, reason?: string): DispatchQueue {
  const idx = queue.currentOfferIndex;
  if (idx < 0 || idx >= queue.offers.length) return queue;
  const offers = [...queue.offers];
  offers[idx] = { ...offers[idx], status: "rejected", rejectReason: reason, respondedAt: new Date().toISOString() };
  track("technician_offer_rejected", { bookingId: queue.bookingId, technicianId: offers[idx].technicianId, reason });
  const exhausted = offers.length >= DISPATCH_DEFAULTS.maxDispatchAttempts;
  return {
    ...queue,
    offers,
    status: exhausted ? "failed" : "dispatching",
    ...(exhausted ? { completedAt: new Date().toISOString() } : {}),
  };
}

/** Timeout current offer */
export function timeoutOffer(queue: DispatchQueue): DispatchQueue {
  const idx = queue.currentOfferIndex;
  if (idx < 0 || idx >= queue.offers.length) return queue;
  const offers = [...queue.offers];
  offers[idx] = { ...offers[idx], status: "timeout", respondedAt: new Date().toISOString() };
  track("dispatch_timeout", { bookingId: queue.bookingId, technicianId: offers[idx].technicianId });
  return { ...queue, offers };
}

/** Check if queue can dispatch more */
export function canDispatchMore(queue: DispatchQueue): boolean {
  return queue.status === "dispatching" && queue.offers.length < DISPATCH_DEFAULTS.maxDispatchAttempts;
}

/** Get queue summary stats */
export function getQueueStats(queue: DispatchQueue) {
  return {
    totalOffers: queue.offers.length,
    accepted: queue.offers.filter((o) => o.status === "accepted").length,
    rejected: queue.offers.filter((o) => o.status === "rejected").length,
    timedOut: queue.offers.filter((o) => o.status === "timeout").length,
    pending: queue.offers.filter((o) => o.status === "pending").length,
  };
}
