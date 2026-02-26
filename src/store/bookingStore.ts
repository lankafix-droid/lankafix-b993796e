import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BookingState, BookingStatus, CategoryCode, PricingBreakdown, QuoteData, ServiceMode, TechnicianInfo, PaymentIntent } from "@/types/booking";

interface BookingDraft {
  categoryCode: CategoryCode | null;
  categoryName: string;
  serviceCode: string | null;
  serviceName: string;
  serviceMode: ServiceMode;
  isEmergency: boolean;
  precheckAnswers: Record<string, string | boolean>;
  photos: string[];
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
  setBookingTechnician: (jobId: string, tech: TechnicianInfo) => void;
  setBookingRating: (jobId: string, rating: number) => void;
  cancelBooking: (jobId: string, reason: string) => void;
  verifyOtp: (jobId: string, type: "start" | "completion") => void;
  addPayment: (jobId: string, payment: PaymentIntent) => void;
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

const TECH_NAMES = [
  { name: "Kasun Perera", partner: "ColomboTech Solutions", rating: 4.8, jobs: 342 },
  { name: "Nadeesha Silva", partner: "Lanka Service Pro", rating: 4.9, jobs: 567 },
  { name: "Ruwan Fernando", partner: "QuickFix Colombo", rating: 4.7, jobs: 218 },
  { name: "Dinesh Jayawardena", partner: "ProTech Lanka", rating: 4.6, jobs: 189 },
  { name: "Chaminda Bandara", partner: "SmartFix Pvt Ltd", rating: 4.9, jobs: 412 },
];

function seedTechnician(): TechnicianInfo {
  const t = TECH_NAMES[Math.floor(Math.random() * TECH_NAMES.length)];
  return {
    name: t.name,
    rating: t.rating,
    eta: `${15 + Math.floor(Math.random() * 30)} mins`,
    partnerName: t.partner,
    jobsCompleted: t.jobs,
  };
}

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

      confirmBooking: (pricing, quoteRequired) => {
        const { draft } = get();
        const jobId = generateJobId();
        const booking: BookingState = {
          jobId,
          categoryCode: draft.categoryCode!,
          serviceCode: draft.serviceCode!,
          serviceName: draft.serviceName,
          categoryName: draft.categoryName,
          serviceMode: draft.serviceMode,
          isEmergency: draft.isEmergency,
          precheckAnswers: { ...draft.precheckAnswers },
          photos: [...draft.photos],
          zone: draft.zone,
          address: draft.address,
          scheduledDate: draft.scheduledDate,
          scheduledTime: draft.scheduledTime,
          preferredWindow: draft.preferredWindow,
          pricing,
          technician: seedTechnician(),
          status: quoteRequired ? "scheduled" : "requested",
          createdAt: new Date().toISOString(),
          quote: null,
          rating: null,
          cancelReason: null,
          startOtpRequired: true,
          completionOtpRequired: true,
          startOtpVerifiedAt: null,
          completionOtpVerifiedAt: null,
          payments: pricing.depositRequired
            ? [{ type: "deposit", amount: pricing.depositAmount, method: null, status: "pending", refundableAmount: pricing.depositAmount, refundStatus: "none" }]
            : [],
        };
        set((s) => ({
          bookings: [booking, ...s.bookings],
          draft: { ...initialDraft },
        }));
        return jobId;
      },

      updateBookingStatus: (jobId, status) =>
        set((s) => ({
          bookings: s.bookings.map((b) => (b.jobId === jobId ? { ...b, status } : b)),
        })),

      setBookingQuote: (jobId, quote) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, quote, status: "quote_submitted" as BookingStatus } : b
          ),
        })),

      setBookingTechnician: (jobId, tech) =>
        set((s) => ({
          bookings: s.bookings.map((b) => (b.jobId === jobId ? { ...b, technician: tech } : b)),
        })),

      setBookingRating: (jobId, rating) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, rating, status: "rated" as BookingStatus } : b
          ),
        })),

      cancelBooking: (jobId, reason) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, status: "cancelled" as BookingStatus, cancelReason: reason } : b
          ),
        })),

      verifyOtp: (jobId, type) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.jobId === jobId
              ? {
                  ...b,
                  ...(type === "start" ? { startOtpVerifiedAt: new Date().toISOString() } : { completionOtpVerifiedAt: new Date().toISOString() }),
                }
              : b
          ),
        })),

      addPayment: (jobId, payment) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.jobId === jobId ? { ...b, payments: [...b.payments, payment] } : b
          ),
        })),

      getBooking: (jobId) => get().bookings.find((b) => b.jobId === jobId),

      getRecentBookings: () => get().bookings.slice(0, 10),
    }),
    {
      name: "lankafix-bookings",
    }
  )
);
