import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, CATEGORY_LABELS, type CategoryCode, type BookingStatus } from "@/types/booking";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";

// Re-export for convenience
export { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, CATEGORY_LABELS };

// Zone label map
const ZONE_MAP: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_MAP[z.id] = z.label; });

export const zoneLabel = (code: string | null | undefined): string => {
  if (!code) return "—";
  return ZONE_MAP[code] || code.replace(/_/g, " ");
};

export const catLabel = (code: string): string =>
  CATEGORY_LABELS[code as CategoryCode] || code.replace(/_/g, " ");

export const bookingStatusLabel = (status: string): string =>
  BOOKING_STATUS_LABELS[status as BookingStatus] || status.replace(/_/g, " ");

export const bookingStatusColor = (status: string): string =>
  BOOKING_STATUS_COLORS[status as BookingStatus] || "bg-muted text-muted-foreground";

// Dispatch status
export const DISPATCH_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  dispatching: "Dispatching",
  accepted: "Accepted",
  no_provider_found: "No Provider",
  timeout: "Timed Out",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const DISPATCH_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  dispatching: "bg-primary/10 text-primary",
  accepted: "bg-emerald-500/10 text-emerald-600",
  no_provider_found: "bg-destructive/10 text-destructive",
  timeout: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-emerald-500/10 text-emerald-600",
};

export const dispatchStatusLabel = (status: string | null | undefined): string => {
  if (!status) return "—";
  return DISPATCH_STATUS_LABELS[status] || status.replace(/_/g, " ");
};

export const dispatchStatusColor = (status: string | null | undefined): string => {
  if (!status) return "bg-muted text-muted-foreground";
  return DISPATCH_STATUS_COLORS[status] || "bg-muted text-muted-foreground";
};

// Payment status
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_paid: "Partial",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "text-muted-foreground",
  paid: "text-emerald-600",
  failed: "text-destructive",
  refunded: "text-primary",
  partially_paid: "text-amber-600",
};

export const paymentStatusLabel = (status: string | null | undefined): string => {
  if (!status) return "—";
  return PAYMENT_STATUS_LABELS[status] || status.replace(/_/g, " ");
};

export const paymentStatusColor = (status: string | null | undefined): string => {
  if (!status) return "text-muted-foreground";
  return PAYMENT_STATUS_COLORS[status] || "text-muted-foreground";
};

// Quote status (DB enum values)
export const QUOTE_DB_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  revised: "Revised",
  expired: "Expired",
};
