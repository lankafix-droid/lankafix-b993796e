import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BookingState, BookingStatus, CategoryCode, PricingBreakdown,
  QuoteData, ServiceMode, TechnicianInfo, PaymentIntent,
  TimelineEvent, TimelineActor, BookingPhoto, TimelineEventMeta,
  JobOutcome, ChatMessage, WarrantyRecord,
} from "@/types/booking";
import { BOOKING_STATUS_LABELS } from "@/types/booking";
import { canTransition } from "@/brand/trustSystem";
import { runDispatch } from "@/lib/dispatchEngine";
import type { DispatchResult } from "@/lib/dispatchEngine";
import { getZoneByLabel } from "@/data/colomboZones";
import { track } from "@/lib/analytics";
import type { TrackingData } from "@/lib/trackingEngine";

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
  diagnoseSource?: boolean;
  urgency?: string;
}

interface BookingStore {
  draft: BookingDraft;
  bookings: BookingState[];
  lastMatchResult: DispatchResult | null;
  techAvailability: Record<string, import("@/types/booking").TechnicianAvailability>;

  setDraftCategory: (code: CategoryCode, name: string) => void;
  setDraftService: (code: string, name: string) => void;
  setDraftMode: (mode: ServiceMode) => void;
  setDraftEmergency: (isEmergency: boolean) => void;
  setDraftPrecheckAnswer: (key: string, value: string | boolean) => void;
  setDraftSchedule: (date: string, time: string, window?: string) => void;
  setDraftLocation: (zone: string, address: string) => void;
  resetDraft: () => void;
  prefillDraftFromDiagnose: (payload: {
    categoryCode: CategoryCode;
    categoryName: string;
    serviceCode: string;
    serviceName: string;
    urgency: string;
    zone: string;
    recommendedMode: ServiceMode;
  }) => void;

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

  // Supply-side actions
  acceptJob: (jobId: string, technicianId: string) => void;
  rejectJob: (jobId: string, reason: import("@/types/booking").TechRejectionReason) => void;
  confirmPartnerAssignment: (jobId: string) => void;
  reassignTechnician: (jobId: string, tech: TechnicianInfo) => void;
  startInspection: (jobId: string) => void;
  startRepair: (jobId: string) => void;
  markCompleted: (jobId: string) => void;
  updateTechnicianAvailability: (techId: string, status: import("@/types/booking").TechnicianAvailability) => void;
  attachTechnicianPhoto: (jobId: string, type: "before" | "after", url: string) => void;
  setInternalNote: (jobId: string, noteType: "partner" | "technician", note: string) => void;

  // Ops hooks
  opsAssignTechnician: (jobId: string, technicianId: string) => void;
  opsEscalateJob: (jobId: string, reason: string) => void;
  opsMoveToManualQueue: (jobId: string) => void;

  // Chat & outcomes
  addChatMessage: (jobId: string, msg: ChatMessage) => void;
  setJobOutcome: (jobId: string, outcome: JobOutcome) => void;

  // Tracking
  startTravel: (jobId: string, techLat: number, techLng: number, custLat: number, custLng: number) => void;
  updateTracking: (jobId: string, tracking: TrackingData) => void;
  stopJobTracking: (jobId: string) => void;

  // Stage 8: Repeat service detection
  getRepeatBooking: (categoryCode: CategoryCode) => BookingState | undefined;
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

function appendTimeline(bookings: BookingState[], jobId: string, event: TimelineEvent): BookingState[] {
  return bookings.map((b) => b.jobId === jobId ? { ...b, timelineEvents: [...b.timelineEvents, event] } : b);
}

function logEvent(bookings: BookingState[], jobId: string, title: string, description: string | undefined, actor: TimelineActor, meta?: TimelineEventMeta): BookingState[] {
  return appendTimeline(bookings, jobId, { timestamp: new Date().toISOString(), title, description, actor, meta });
}

const DEFAULT_CANCEL_POLICY = {
  freeCancelMinutes: 10,
  refundBeforeDispatchPercent: 100,
  refundAfterDispatchPercent: 0,
};

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      draft: { ...initialDraft },
      bookings: [],
      lastMatchResult: null,
      techAvailability: {},

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

      prefillDraftFromDiagnose: (payload) => {
        track("booking_prefill_from_diagnose", payload);
        set((s) => ({
          draft: {
            ...s.draft,
            categoryCode: payload.categoryCode,
            categoryName: payload.categoryName,
            serviceCode: payload.serviceCode,
            serviceName: payload.serviceName,
            serviceMode: payload.recommendedMode,
            zone: payload.zone,
            isEmergency: payload.urgency === "emergency",
            diagnoseSource: true,
            urgency: payload.urgency,
          },
        }));
      },

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

        // Run dispatch engine
        const dispatchResult = runDispatch({ categoryCode: draft.categoryCode, zone: draft.zone, isEmergency: draft.isEmergency });

        track("matching_started", { category: draft.categoryCode, zone: draft.zone, urgency: draft.urgency });

        const depositPayment: PaymentIntent | undefined = pricingWithPolicy.depositRequired
          ? { type: "deposit", amount: pricingWithPolicy.depositAmount, method: null, status: "pending", refundableAmount: pricingWithPolicy.depositAmount, refundStatus: "none", provider: "manual" }
          : undefined;

        // Determine initial status based on dispatch
        const matchedTech = dispatchResult.bestMatch?.tech || null;
        let initialStatus: BookingStatus = "matching";
        if (matchedTech) {
          if (dispatchResult.requiresPartnerConfirmation) {
            initialStatus = "awaiting_partner_confirmation";
          } else {
            initialStatus = "assigned";
          }
        }

        const now = new Date().toISOString();
        const timelineEvents: TimelineEvent[] = [
          { timestamp: now, title: "Booking Created", description: "Service request submitted by customer", actor: "system" },
          { timestamp: now, title: "Matching Started", description: "Looking for the best technician in your area", actor: "system" },
        ];

        if (matchedTech) {
          track("technician_matched", {
            category: draft.categoryCode,
            zone: draft.zone,
            confidenceScore: dispatchResult.bestMatch?.totalScore,
            distanceKm: dispatchResult.bestMatch?.distanceKm,
            extendedCoverage: dispatchResult.extendedCoverage,
          });

          if (dispatchResult.extendedCoverage) {
            track("extended_coverage_applied", { category: draft.categoryCode, zone: draft.zone });
          }

          timelineEvents.push({
            timestamp: now,
            title: dispatchResult.requiresPartnerConfirmation ? "Awaiting Partner Confirmation" : "Technician Matched",
            description: `${matchedTech.name} (Score: ${dispatchResult.bestMatch?.totalScore}/100)`,
            actor: "system",
          });

          if (quoteRequired) {
            timelineEvents.push({
              timestamp: now,
              title: "Inspection Scheduled",
              description: "Technician will inspect and provide a detailed quote",
              actor: "system",
            });
          }
        } else {
          track("technician_match_failed", { category: draft.categoryCode, zone: draft.zone });
        }

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
          technician: matchedTech,
          status: initialStatus,
          createdAt: now,
          quote: null,
          rating: null,
          cancelReason: null,
          startOtpRequired: true,
          completionOtpRequired: true,
          startOtpVerifiedAt: null,
          completionOtpVerifiedAt: null,
          payments: { deposit: depositPayment },
          timelineEvents,
          dispatchStatus: "pending",
          etaMinutes: matchedTech ? parseInt(matchedTech.eta) || undefined : undefined,
          dispatchScore: dispatchResult.bestMatch?.totalScore,
        };

        set((s) => ({
          bookings: [booking, ...s.bookings],
          draft: { ...initialDraft },
          lastMatchResult: dispatchResult,
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

          if (toStatus === "completed" && booking.pricing.quoteRequired) {
            if (!booking.quote?.selectedOptionId && booking.status !== "quote_approved" && booking.status !== "repair_started") {
              console.warn("[LankaFix] Cannot complete: quote-required booking must have approved quote.");
              return s;
            }
          }

          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: toStatus } : b
          );

          if (toStatus === "tech_en_route") {
            const now = new Date().toISOString();
            updated = updated.map((b) =>
              b.jobId === jobId ? { ...b, dispatchStatus: "dispatched" as const, dispatchedAt: now } : b
            );
            updated = logEvent(updated, jobId, "Technician Dispatched", "Technician is on the way to your location", "system");
          }

          if (toStatus === "arrived") {
            const now = new Date().toISOString();
            updated = updated.map((b) =>
              b.jobId === jobId ? { ...b, dispatchStatus: "arrived" as const, arrivedAt: now } : b
            );
          }

          updated = logEvent(updated, jobId,
            `Status Updated — ${BOOKING_STATUS_LABELS[toStatus]}`,
            `From ${BOOKING_STATUS_LABELS[booking.status]} → ${BOOKING_STATUS_LABELS[toStatus]}`,
            "system"
          );
          return { bookings: updated };
        }),

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
            if (booking.pricing.quoteRequired && !booking.quote?.selectedOptionId && booking.status !== "quote_approved" && booking.status !== "repair_started") {
              console.warn("[LankaFix] Cannot complete via OTP: quote not approved.");
              newStatus = booking.status;
            } else {
              newStatus = "completed";
            }
          }
          let updated = s.bookings.map((b) =>
            b.jobId === jobId
              ? { ...b, ...(type === "start" ? { startOtpVerifiedAt: now } : { completionOtpVerifiedAt: now }), status: newStatus }
              : b
          );
          updated = logEvent(updated, jobId, type === "start" ? "Job Start Verified (OTP)" : "Completion Verified (OTP)", "OTP verified by customer", "customer");
          if (newStatus !== booking.status) {
            updated = logEvent(updated, jobId, `Status Updated — ${BOOKING_STATUS_LABELS[newStatus]}`,
              `Auto-transition after OTP ${type} verification`, "system");
          }
          if (newStatus === "completed") {
            updated = logEvent(updated, jobId, "Warranty Activated", "Labor warranty now active from this date", "system");
          }
          return { bookings: updated };
        }),

      setPayment: (jobId, key, payment) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          const paymentWithProvider: PaymentIntent = { ...payment, provider: payment.provider || "manual" };
          let newStatus = booking.status;
          if (key === "deposit" && paymentWithProvider.status === "paid" && canTransition(booking.status, "scheduled")) {
            newStatus = "scheduled";
          }
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, payments: { ...b.payments, [key]: paymentWithProvider }, status: newStatus } : b
          );
          updated = logEvent(updated, jobId,
            paymentWithProvider.status === "paid" ? "Payment Received" : "Payment Updated",
            `${key} — LKR ${paymentWithProvider.amount.toLocaleString("en-LK")}`,
            "system", { amount: paymentWithProvider.amount, paymentKey: key }
          );
          if (newStatus !== booking.status) {
            updated = logEvent(updated, jobId, `Status Updated — ${BOOKING_STATUS_LABELS[newStatus]}`,
              `Auto-transition after ${key} payment`, "system");
          }
          return { bookings: updated };
        }),

      markArrived: (jobId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          const now = new Date().toISOString();
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, dispatchStatus: "arrived" as const, arrivedAt: now } : b
          );
          if (canTransition(booking.status, "arrived")) {
            updated = updated.map((b) =>
              b.jobId === jobId ? { ...b, status: "arrived" as BookingStatus } : b
            );
          }
          updated = logEvent(updated, jobId, "Technician Arrived", "Technician has arrived at your location", "system");
          return { bookings: updated };
        }),

      markDispatched: (jobId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          const now = new Date().toISOString();
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, dispatchStatus: "dispatched" as const, dispatchedAt: now } : b
          );
          updated = logEvent(updated, jobId, "Technician Dispatched", "Technician is on the way to your location", "system");
          return { bookings: updated };
        }),

      addTimelineEvent: (jobId, event) =>
        set((s) => ({ bookings: appendTimeline(s.bookings, jobId, event) })),

      addBookingPhoto: (jobId, photo) =>
        set((s) => {
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, photos: [...b.photos, photo] } : b
          );
          updated = logEvent(updated, jobId, `${photo.type.charAt(0).toUpperCase() + photo.type.slice(1)} Photo Uploaded`, "Evidence photo added", "customer");
          return { bookings: updated };
        }),

      getBooking: (jobId) => get().bookings.find((b) => b.jobId === jobId),
      getRecentBookings: () => get().bookings.slice(0, 10),

      // ========== SUPPLY-SIDE ACTIONS ==========

      acceptJob: (jobId, technicianId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          track("technician_job_accept", { jobId, technicianId, category: booking.categoryCode });
          let updated = s.bookings;
          if (canTransition(booking.status, "assigned")) {
            updated = updated.map((b) =>
              b.jobId === jobId ? { ...b, status: "assigned" as BookingStatus } : b
            );
          }
          updated = logEvent(updated, jobId, "Technician Accepted Job", `Technician ${technicianId} accepted the assignment`, "technician");
          return { bookings: updated };
        }),

      rejectJob: (jobId, reason) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          track("technician_job_reject", { jobId, reason, category: booking.categoryCode });
          let newStatus = booking.status;
          if (booking.status === "assigned" || booking.status === "awaiting_partner_confirmation") {
            newStatus = "matching";
          }
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: newStatus, rejectionReason: reason, technician: null } : b
          );
          updated = logEvent(updated, jobId, "Technician Rejected Job", `Reason: ${reason}`, "technician");
          return { bookings: updated };
        }),

      confirmPartnerAssignment: (jobId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          if (!canTransition(booking.status, "assigned")) return s;
          track("partner_assignment_confirmed", { jobId, category: booking.categoryCode });
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: "assigned" as BookingStatus } : b
          );
          updated = logEvent(updated, jobId, "Partner Confirmed Assignment", "Partner approved the technician assignment", "partner");
          return { bookings: updated };
        }),

      reassignTechnician: (jobId, tech) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          track("partner_reassigned_technician", { jobId, newTech: tech.name });
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, technician: tech } : b
          );
          updated = logEvent(updated, jobId, "Technician Reassigned", `New technician: ${tech.name}`, "partner");
          return { bookings: updated };
        }),

      startInspection: (jobId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          if (!canTransition(booking.status, "inspection_started")) return s;
          track("technician_inspection_start", { jobId, category: booking.categoryCode });
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: "inspection_started" as BookingStatus } : b
          );
          updated = logEvent(updated, jobId, "Inspection Started", "Technician is inspecting the issue", "technician");
          return { bookings: updated };
        }),

      startRepair: (jobId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          const validFrom: BookingStatus[] = ["quote_approved", "in_progress", "inspection_started"];
          if (!validFrom.includes(booking.status) && !canTransition(booking.status, "repair_started")) return s;
          track("technician_repair_start", { jobId, category: booking.categoryCode });
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: "repair_started" as BookingStatus } : b
          );
          updated = logEvent(updated, jobId, "Repair Started", "Technician has started the repair work", "technician");
          return { bookings: updated };
        }),

      markCompleted: (jobId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          if (!canTransition(booking.status, "completed")) {
            console.warn(`[LankaFix] Cannot complete from ${booking.status}`);
            return s;
          }
          if (booking.pricing.quoteRequired && !booking.quote?.selectedOptionId) {
            console.warn("[LankaFix] Cannot complete: quote not approved");
            return s;
          }
          track("technician_complete_job", { jobId, category: booking.categoryCode });
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: "completed" as BookingStatus } : b
          );
          updated = logEvent(updated, jobId, "Technician Marked Completed", "Service work has been completed", "technician");
          updated = logEvent(updated, jobId, "Warranty Activated", "Labor warranty now active from this date", "system");
          return { bookings: updated };
        }),

      updateTechnicianAvailability: (techId, status) =>
        set((s) => {
          track("technician_availability_updated", { techId, status });
          return { techAvailability: { ...s.techAvailability, [techId]: status } };
        }),

      attachTechnicianPhoto: (jobId, type, url) =>
        set((s) => {
          const photo: BookingPhoto = { url, type, uploadedAt: new Date().toISOString() };
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, photos: [...b.photos, photo] } : b
          );
          const label = type === "before" ? "Before Photo Uploaded" : "After Photo Uploaded";
          updated = logEvent(updated, jobId, label, "Technician uploaded evidence photo", "technician");
          return { bookings: updated };
        }),

      setInternalNote: (jobId, noteType, note) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.jobId === jobId
              ? { ...b, ...(noteType === "partner" ? { partnerInternalNote: note } : { technicianInternalNote: note }) }
              : b
          ),
        })),

      // ========== OPS HOOKS ==========

      opsAssignTechnician: (jobId, technicianId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          track("ops_assign_technician", { jobId, technicianId });
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: "assigned" as BookingStatus } : b
          );
          updated = logEvent(updated, jobId, "Ops: Technician Assigned", `Manually assigned by operations team`, "ops");
          return { bookings: updated };
        }),

      opsEscalateJob: (jobId, reason) =>
        set((s) => {
          track("ops_escalate_job", { jobId, reason });
          let updated = logEvent(s.bookings, jobId, "Ops: Job Escalated", `Reason: ${reason}`, "ops");
          return { bookings: updated };
        }),

      opsMoveToManualQueue: (jobId) =>
        set((s) => {
          track("ops_manual_queue", { jobId });
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: "matching" as BookingStatus } : b
          );
          updated = logEvent(updated, jobId, "Ops: Moved to Manual Queue", "Job requires manual technician assignment", "ops");
          return { bookings: updated };
        }),

      // ========== CHAT & OUTCOMES ==========

      addChatMessage: (jobId, msg) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, chatMessages: [...(b.chatMessages || []), msg] } : b
          ),
        })),

      setJobOutcome: (jobId, outcome) =>
        set((s) => {
          track("job_outcome_set", { jobId, outcome });
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, jobOutcome: outcome } : b
          );
          updated = logEvent(updated, jobId, `Job Outcome: ${outcome.replace(/_/g, " ")}`, `Outcome recorded`, "technician");
          return { bookings: updated };
        }),

      // ========== TRACKING ==========

      startTravel: (jobId, techLat, techLng, custLat, custLng) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking) return s;
          track("technician_travel_started", { jobId, category: booking.categoryCode });
          const { createTrackingData } = require("@/lib/trackingEngine");
          const trackingData = createTrackingData(techLat, techLng, custLat, custLng);
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, trackingData, dispatchStatus: "dispatched" as const, dispatchedAt: new Date().toISOString() } : b
          );
          if (canTransition(booking.status, "tech_en_route")) {
            updated = updated.map((b) =>
              b.jobId === jobId ? { ...b, status: "tech_en_route" as BookingStatus } : b
            );
          }
          updated = logEvent(updated, jobId, "Travel Started", "Technician is heading to your location", "technician");
          return { bookings: updated };
        }),

      updateTracking: (jobId, tracking) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, trackingData: tracking, etaMinutes: tracking.etaMinutes } : b
          ),
        })),

      stopJobTracking: (jobId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.jobId === jobId);
          if (!booking?.trackingData) return s;
          const { stopTracking } = require("@/lib/trackingEngine");
          const stoppedTracking = stopTracking(booking.trackingData);
          let updated = s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, trackingData: stoppedTracking } : b
          );
          return { bookings: updated };
        }),
    }),
    { name: "lankafix-bookings" }
  )
);
