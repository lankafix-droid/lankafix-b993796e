import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BookingState, BookingStatus, CategoryCode, PricingBreakdown,
  QuoteData, ServiceMode, TechnicianInfo, PaymentIntent,
  TimelineEvent, TimelineActor, BookingPhoto, TimelineEventMeta,
} from "@/types/booking";
import { BOOKING_STATUS_LABELS } from "@/types/booking";
import { canTransition } from "@/brand/trustSystem";
import { matchTechnician } from "@/engines/matchingEngine";
import { getZoneByLabel } from "@/data/colomboZones";

interface BookingDraft {
  categoryCode: CategoryCode | null;
  categoryName: string;
  serviceCode: string | null;
  serviceName: string;
  serviceMode: ServiceMode;
  isEmergency: boolean;
  precheckAnswers: Record<string, string | boolean>;
  photos: BookingPhoto[];
  zone: string;
  address: string;
  scheduledDate: string;
  scheduledTime: string;
  preferredWindow: string;
}

interface BookingStore {
  draft: BookingDraft;
  bookings: BookingState[];

  setDraftCategory: (code: CategoryCode, name: string) => void;
  setDraftService: (code: string, name: string) => void;
  setDraftMode: (mode: ServiceMode) => void;
  setDraftEmergency: (isEmergency: boolean) => void;
  setDraftPrecheckAnswer: (key: string, value: string | boolean) => void;
  setDraftSchedule: (date: string, time: string, window?: string) => void;
  setDraftLocation: (zone: string, address: string) => void;
  resetDraft: () => void;

  confirmBooking: (pricing: PricingBreakdown, quoteRequired: boolean) => string;
  updateBookingStatus: (jobId: string, status: BookingStatus) => void;
  setBookingQuote: (jobId: string, quote: QuoteData) => void;
  approveQuote: (jobId: string, optionId: string) => void;
  setBookingTechnician: (jobId: string, tech: TechnicianInfo) => void;
  setBookingRating: (jobId: string, rating: number) => void;
  cancelBooking: (jobId: string, reason: string) => void;
  verifyOtp: (jobId: string, type: "start" | "completion") => void;
  setPayment: (jobId: string, key: "deposit" | "completion", payment: PaymentIntent) => void;
  markArrived: (jobId: string) => void;
  markDispatched: (jobId: string) => void;
  addTimelineEvent: (jobId: string, event: TimelineEvent) => void;
  addBookingPhoto: (jobId: string, photo: BookingPhoto) => void;
  getBooking: (jobId: string) => BookingState | undefined;
  getRecentBookings: () => BookingState[];
}

const initialDraft: BookingDraft = {
  categoryCode: null,
  categoryName: "",
  serviceCode: null,
  serviceName: "",
  serviceMode: "on_site",
  isEmergency: false,
  precheckAnswers: {},
  photos: [],
  zone: "",
  address: "",
  scheduledDate: "",
  scheduledTime: "",
  preferredWindow: "",
};

function generateJobId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "LF-";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ============================================================
// Centralized timeline logger
// ============================================================
function appendTimeline(
  bookings: BookingState[],
  jobId: string,
  event: TimelineEvent
): BookingState[] {
  return bookings.map((b) =>
    b.jobId === jobId
      ? { ...b, timelineEvents: [...b.timelineEvents, event] }
      : b
  );
}

function logEvent(
  bookings: BookingState[],
  jobId: string,
  title: string,
  description: string | undefined,
  actor: TimelineActor,
  meta?: TimelineEventMeta
): BookingState[] {
  return appendTimeline(bookings, jobId, {
    timestamp: new Date().toISOString(),
    title,
    description,
    actor,
    meta,
  });
}

function createInitialTimeline(quoteRequired: boolean, matchMsg: string): TimelineEvent[] {
  const now = new Date().toISOString();
  return [
    { timestamp: now, title: "Booking Created", description: "Service request submitted by customer", actor: "system" },
    { timestamp: now, title: "Matching Started", description: "Looking for the best technician in your area", actor: "system" },
    { timestamp: now, title: "Technician Matched", description: matchMsg, actor: "system" },
    ...(quoteRequired
      ? [{ timestamp: now, title: "Inspection Scheduled", description: "Technician will inspect and provide a detailed quote", actor: "system" as const }]
      : []),
  ];
}

const DEFAULT_CANCEL_POLICY = {
  freeCancelMinutes: 5,
  refundBeforeDispatchPercent: 100,
  refundAfterDispatchPercent: 0,
};

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      draft: { ...initialDraft },
      bookings: [],

      setDraftCategory: (code, name) =>
        set((s) => ({ draft: { ...s.draft, categoryCode: code, categoryName: name, serviceCode: null, serviceName: "", precheckAnswers: {} } })),

      setDraftService: (code, name) =>
        set((s) => ({ draft: { ...s.draft, serviceCode: code, serviceName: name, precheckAnswers: {} } })),

      setDraftMode: (mode) =>
        set((s) => ({ draft: { ...s.draft, serviceMode: mode } })),

      setDraftEmergency: (isEmergency) =>
        set((s) => ({ draft: { ...s.draft, isEmergency } })),

      setDraftPrecheckAnswer: (key, value) =>
        set((s) => ({ draft: { ...s.draft, precheckAnswers: { ...s.draft.precheckAnswers, [key]: value } } })),

      setDraftSchedule: (date, time, window) =>
        set((s) => ({ draft: { ...s.draft, scheduledDate: date, scheduledTime: time, preferredWindow: window || "" } })),

      setDraftLocation: (zone, address) =>
        set((s) => ({ draft: { ...s.draft, zone, address } })),

      resetDraft: () => set({ draft: { ...initialDraft } }),

      // Confirm booking with matching engine
      confirmBooking: (pricing, quoteRequired) => {
        const { draft } = get();

        if (!draft.categoryCode || !draft.serviceCode) {
          console.warn("[LankaFix] Cannot confirm booking: missing category or service code.");
          return "";
        }

        const jobId = generateJobId();
        const pricingWithPolicy: PricingBreakdown = {
          ...pricing,
          cancelPolicy: pricing.cancelPolicy || DEFAULT_CANCEL_POLICY,
        };

        // Use matching engine
        const zoneData = getZoneByLabel(draft.zone);
        const matchResult = matchTechnician(draft.categoryCode, zoneData?.id || "", draft.isEmergency);

        const depositPayment: PaymentIntent | undefined = pricingWithPolicy.depositRequired
          ? { type: "deposit", amount: pricingWithPolicy.depositAmount, method: null, status: "pending", refundableAmount: pricingWithPolicy.depositAmount, refundStatus: "none", provider: "manual" }
          : undefined;

        const booking: BookingState = {
          jobId,
          categoryCode: draft.categoryCode,
          serviceCode: draft.serviceCode,
          serviceName: draft.serviceName,
          categoryName: draft.categoryName,
          serviceMode: draft.serviceMode,
          isEmergency: draft.isEmergency,
          precheckAnswers: { ...draft.precheckAnswers },
          photos: [],
          zone: draft.zone,
          address: draft.address,
          scheduledDate: draft.scheduledDate,
          scheduledTime: draft.scheduledTime,
          preferredWindow: draft.preferredWindow,
          pricing: pricingWithPolicy,
          technician: matchResult.technician,
          status: quoteRequired ? "scheduled" : "requested",
          createdAt: new Date().toISOString(),
          quote: null,
          rating: null,
          cancelReason: null,
          startOtpRequired: true,
          completionOtpRequired: true,
          startOtpVerifiedAt: null,
          completionOtpVerifiedAt: null,
          payments: { deposit: depositPayment },
          timelineEvents: createInitialTimeline(quoteRequired, matchResult.message),
          dispatchStatus: "pending",
          etaMinutes: matchResult.technician ? parseInt(matchResult.technician.eta) || undefined : undefined,
        };
        set((s) => ({
          bookings: [booking, ...s.bookings],
          draft: { ...initialDraft },
        }));
        return jobId;
      },

      // Guarded status transition
      updateBookingStatus: (jobId, toStatus) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          if (!canTransition(booking.status, toStatus)) {
            console.warn(`[LankaFix] Invalid transition: ${booking.status} → ${toStatus}`);
            return s;
          }

          // Quote-required completion guard
          if (toStatus === "completed" && booking.pricing.quoteRequired) {
            if (!booking.quote?.selectedOptionId && booking.status !== "quote_approved") {
              console.warn("[LankaFix] Cannot complete: quote-required booking must have approved quote.");
              return s;
            }
          }

          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: toStatus } : b
          );

          // Dispatch auto updates
          if (toStatus === "tech_en_route") {
            const now = new Date().toISOString();
            updated = updated.map((b) =>
              b.jobId === jobId ? { ...b, dispatchStatus: "dispatched" as const, dispatchedAt: now } : b
            );
            updated = logEvent(updated, jobId, "Technician Dispatched", "Technician is on the way to your location", "system");
          }

          updated = logEvent(
            updated, jobId,
            `Status Updated — ${BOOKING_STATUS_LABELS[toStatus]}`,
            `From ${BOOKING_STATUS_LABELS[booking.status]} → ${BOOKING_STATUS_LABELS[toStatus]}`,
            "system"
          );
          return { bookings: updated };
        }),

      // Set quote with transition guard
      setBookingQuote: (jobId, quote) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;

          const canMove = canTransition(booking.status, "quote_submitted");
          const newStatus = canMove ? "quote_submitted" as BookingStatus : booking.status;

          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, quote, status: newStatus } : b
          );
          updated = logEvent(updated, jobId, "Quote Submitted", "Detailed quote ready for your review", "technician");
          return { bookings: updated };
        }),

      // Quote approval
      approveQuote: (jobId, optionId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking || !booking.quote) return s;

          const now = new Date().toISOString();
          const updatedQuote: QuoteData = {
            ...booking.quote,
            selectedOptionId: optionId,
            approvedAt: now,
            approvedBy: "customer",
          };

          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, quote: updatedQuote } : b
          );

          if (canTransition(booking.status, "quote_approved")) {
            updated = updated.map((b) =>
              b.jobId === jobId ? { ...b, status: "quote_approved" as BookingStatus } : b
            );
            updated = logEvent(updated, jobId, `Status Updated — ${BOOKING_STATUS_LABELS["quote_approved"]}`,
              `From ${BOOKING_STATUS_LABELS[booking.status]} → ${BOOKING_STATUS_LABELS["quote_approved"]}`, "system");
          }

          updated = logEvent(updated, jobId, "Quote Approved", `Customer approved Option ${optionId}`, "customer", { optionId });
          return { bookings: updated };
        }),

      setBookingTechnician: (jobId, tech) =>
        set((s) => ({
          bookings: s.bookings.map((b) => (b.jobId === jobId ? { ...b, technician: tech } : b)),
        })),

      setBookingRating: (jobId, rating) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          if (!canTransition(booking.status, "rated")) {
            console.warn(`[LankaFix] Cannot rate from status: ${booking.status}`);
            return s;
          }
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, rating, status: "rated" as BookingStatus } : b
          );
          updated = logEvent(updated, jobId, "Rating Submitted", `Customer rated ${rating}/5 stars`, "customer");
          return { bookings: updated };
        }),

      cancelBooking: (jobId, reason) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking || !canTransition(booking.status, "cancelled")) {
            console.warn(`[LankaFix] Cannot cancel from status: ${booking?.status}`);
            return s;
          }
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: "cancelled" as BookingStatus, cancelReason: reason } : b
          );
          updated = logEvent(updated, jobId, "Booking Cancelled", `Reason: ${reason}`, "customer");
          return { bookings: updated };
        }),

      // OTP verification with guard + auto transitions
      verifyOtp: (jobId, type) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;

          const now = new Date().toISOString();
          let newStatus = booking.status;

          if (type === "start" && canTransition(booking.status, "in_progress")) {
            newStatus = "in_progress";
          }
          if (type === "completion" && canTransition(booking.status, "completed")) {
            if (booking.pricing.quoteRequired && !booking.quote?.selectedOptionId && booking.status !== "quote_approved") {
              console.warn("[LankaFix] Cannot complete via OTP: quote not approved.");
              newStatus = booking.status;
            } else {
              newStatus = "completed";
            }
          }

          let updated = s.bookings.map((b) =>
            b.jobId === jobId
              ? {
                  ...b,
                  ...(type === "start" ? { startOtpVerifiedAt: now } : { completionOtpVerifiedAt: now }),
                  status: newStatus,
                }
              : b
          );
          updated = logEvent(updated, jobId, type === "start" ? "Job Start Verified (OTP)" : "Completion Verified (OTP)", "OTP verified by customer", "customer");
          if (newStatus !== booking.status) {
            updated = logEvent(updated, jobId, `Status Updated — ${BOOKING_STATUS_LABELS[newStatus]}`,
              `Auto-transition after OTP ${type} verification`, "system");
          }
          // If completed, log warranty activation
          if (newStatus === "completed") {
            updated = logEvent(updated, jobId, "Warranty Activated", "Labor warranty now active from this date", "system");
          }
          return { bookings: updated };
        }),

      // Payment with timeline + optional auto status
      setPayment: (jobId, key, payment) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;

          const paymentWithProvider: PaymentIntent = {
            ...payment,
            provider: payment.provider || "manual",
          };

          let newStatus = booking.status;
          if (key === "deposit" && paymentWithProvider.status === "paid" && canTransition(booking.status, "scheduled")) {
            newStatus = "scheduled";
          }

          let updated = s.bookings.map((b) =>
            b.jobId === jobId
              ? { ...b, payments: { ...b.payments, [key]: paymentWithProvider }, status: newStatus }
              : b
          );
          updated = logEvent(
            updated, jobId,
            paymentWithProvider.status === "paid" ? "Payment Received" : "Payment Updated",
            `${key} — LKR ${paymentWithProvider.amount.toLocaleString("en-LK")}`,
            "system",
            { amount: paymentWithProvider.amount, paymentKey: key }
          );
          if (newStatus !== booking.status) {
            updated = logEvent(updated, jobId, `Status Updated — ${BOOKING_STATUS_LABELS[newStatus]}`,
              `Auto-transition after ${key} payment`, "system");
          }
          return { bookings: updated };
        }),

      // Mark arrived
      markArrived: (jobId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          const now = new Date().toISOString();
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, dispatchStatus: "arrived" as const, arrivedAt: now } : b
          );
          updated = logEvent(updated, jobId, "Technician Arrived", "Technician has arrived at your location", "system");
          return { bookings: updated };
        }),

      addTimelineEvent: (jobId, event) =>
        set((s) => ({
          bookings: appendTimeline(s.bookings, jobId, event),
        })),

      getBooking: (jobId) => get().bookings.find((b) => b.jobId === jobId),

      getRecentBookings: () => get().bookings.slice(0, 10),
    }),
    {
      name: "lankafix-bookings",
    }
  )
);
