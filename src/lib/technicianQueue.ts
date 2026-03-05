/**
 * LankaFix Technician Offer Queue V2
 * 12-second acceptance window, max 5 attempts, detailed event logging.
 */
import { track } from "@/lib/analytics";
import { DISPATCH_DEFAULTS } from "@/lib/locationUtils";

export type OfferStatus = "pending" | "accepted" | "rejected" | "timeout";

export interface TechnicianOffer {
  technicianId: string;
  technicianName: string;
  dispatchScore: number;
  dispatchRank: number;
  distanceKm: number;
  etaMinutes: number;
  offeredAt: string;
  expiresAt: string;
  status: OfferStatus;
  rejectReason?: string;
  respondedAt?: string;
  responseTimeMs?: number;
}

export interface DispatchQueue {
  bookingId: string;
  offers: TechnicianOffer[];
  currentOfferIndex: number;
  status: "dispatching" | "assigned" | "failed" | "manual_queue";
  startedAt: string;
  completedAt?: string;
  totalDispatchTimeMs?: number;
}

export type DispatchEvent =
  | "TECHNICIAN_OFFER_SENT"
  | "TECHNICIAN_ACCEPTED"
  | "TECHNICIAN_REJECTED"
  | "TECHNICIAN_TIMEOUT"
  | "DISPATCH_SUCCESS"
  | "DISPATCH_FAILED"
  | "MOVED_TO_MANUAL_QUEUE";

/** Create a new dispatch queue */
export function createDispatchQueue(bookingId: string): DispatchQueue {
  track("dispatch_queue_created", { bookingId });
  return {
    bookingId,
    offers: [],
    currentOfferIndex: -1,
    status: "dispatching",
    startedAt: new Date().toISOString(),
  };
}

/** Send offer with 12-second expiry */
export function sendOffer(
  queue: DispatchQueue,
  techId: string,
  techName: string,
  score: number,
  rank: number,
  distanceKm: number,
  etaMinutes: number
): DispatchQueue {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DISPATCH_DEFAULTS.acceptWindow * 1000).toISOString();

  const offer: TechnicianOffer = {
    technicianId: techId,
    technicianName: techName,
    dispatchScore: score,
    dispatchRank: rank,
    distanceKm,
    etaMinutes,
    offeredAt: now.toISOString(),
    expiresAt,
    status: "pending",
  };

  track("technician_offer_sent", {
    bookingId: queue.bookingId,
    technicianId: techId,
    score,
    rank,
    acceptWindowSeconds: DISPATCH_DEFAULTS.acceptWindow,
  });

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

  const now = new Date();
  const offers = [...queue.offers];
  const offeredAt = new Date(offers[idx].offeredAt).getTime();
  const responseTimeMs = now.getTime() - offeredAt;

  offers[idx] = {
    ...offers[idx],
    status: "accepted",
    respondedAt: now.toISOString(),
    responseTimeMs,
  };

  const totalDispatchTimeMs = now.getTime() - new Date(queue.startedAt).getTime();

  track("technician_offer_accepted", {
    bookingId: queue.bookingId,
    technicianId: offers[idx].technicianId,
    responseTimeMs,
    totalDispatchTimeMs,
    attemptNumber: idx + 1,
  });

  return {
    ...queue,
    offers,
    status: "assigned",
    completedAt: now.toISOString(),
    totalDispatchTimeMs,
  };
}

/** Reject current offer */
export function rejectOffer(queue: DispatchQueue, reason?: string): DispatchQueue {
  const idx = queue.currentOfferIndex;
  if (idx < 0 || idx >= queue.offers.length) return queue;

  const now = new Date();
  const offers = [...queue.offers];
  const offeredAt = new Date(offers[idx].offeredAt).getTime();

  offers[idx] = {
    ...offers[idx],
    status: "rejected",
    rejectReason: reason,
    respondedAt: now.toISOString(),
    responseTimeMs: now.getTime() - offeredAt,
  };

  track("technician_offer_rejected", {
    bookingId: queue.bookingId,
    technicianId: offers[idx].technicianId,
    reason,
    attemptNumber: idx + 1,
  });

  const exhausted = offers.length >= DISPATCH_DEFAULTS.maxDispatchAttempts;

  return {
    ...queue,
    offers,
    status: exhausted ? "failed" : "dispatching",
    ...(exhausted ? {
      completedAt: now.toISOString(),
      totalDispatchTimeMs: now.getTime() - new Date(queue.startedAt).getTime(),
    } : {}),
  };
}

/** Timeout current offer (12 seconds elapsed) */
export function timeoutOffer(queue: DispatchQueue): DispatchQueue {
  const idx = queue.currentOfferIndex;
  if (idx < 0 || idx >= queue.offers.length) return queue;

  const now = new Date();
  const offers = [...queue.offers];

  offers[idx] = {
    ...offers[idx],
    status: "timeout",
    respondedAt: now.toISOString(),
    responseTimeMs: DISPATCH_DEFAULTS.acceptWindow * 1000,
  };

  track("dispatch_timeout", {
    bookingId: queue.bookingId,
    technicianId: offers[idx].technicianId,
    attemptNumber: idx + 1,
  });

  return { ...queue, offers };
}

/** Move to manual queue when all attempts exhausted */
export function moveToManualQueue(queue: DispatchQueue): DispatchQueue {
  track("dispatch_manual_queue", { bookingId: queue.bookingId, totalAttempts: queue.offers.length });
  return {
    ...queue,
    status: "manual_queue",
    completedAt: new Date().toISOString(),
    totalDispatchTimeMs: Date.now() - new Date(queue.startedAt).getTime(),
  };
}

/** Check if queue can dispatch more */
export function canDispatchMore(queue: DispatchQueue): boolean {
  return queue.status === "dispatching" && queue.offers.length < DISPATCH_DEFAULTS.maxDispatchAttempts;
}

/** Check if current offer has expired */
export function isCurrentOfferExpired(queue: DispatchQueue): boolean {
  const idx = queue.currentOfferIndex;
  if (idx < 0 || idx >= queue.offers.length) return false;
  const offer = queue.offers[idx];
  if (offer.status !== "pending") return false;
  return new Date() > new Date(offer.expiresAt);
}

/** Get queue summary stats */
export function getQueueStats(queue: DispatchQueue) {
  const avgResponseMs = queue.offers
    .filter(o => o.responseTimeMs)
    .reduce((sum, o) => sum + (o.responseTimeMs ?? 0), 0) / Math.max(queue.offers.filter(o => o.responseTimeMs).length, 1);

  return {
    totalOffers: queue.offers.length,
    accepted: queue.offers.filter((o) => o.status === "accepted").length,
    rejected: queue.offers.filter((o) => o.status === "rejected").length,
    timedOut: queue.offers.filter((o) => o.status === "timeout").length,
    pending: queue.offers.filter((o) => o.status === "pending").length,
    avgResponseMs: Math.round(avgResponseMs),
    totalDispatchTimeMs: queue.totalDispatchTimeMs,
    acceptWindowSeconds: DISPATCH_DEFAULTS.acceptWindow,
  };
}
