/**
 * LankaFix Invoice Engine
 * Generates platform-controlled digital invoices with full breakdown,
 * commission details, warranty info, and platform reference.
 */
import type { BookingState, CategoryCode, WarrantyTerms } from "@/types/booking";
import { calculateCommission, type CommissionResult } from "./commissionEngine";

// ─── Invoice Types ──────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: "labor" | "parts" | "service_fee" | "materials" | "surcharge" | "discount";
}

export interface InvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  bookingRef: string;
  issuedAt: string;
  dueDate: string;

  // Customer info
  customerName: string;
  customerAddress: string;
  customerZone: string;

  // Service info
  categoryCode: CategoryCode;
  categoryName: string;
  serviceName: string;
  serviceMode: string;

  // Technician info
  technicianName: string;
  partnerName: string;
  verifiedSince: string;

  // Line items
  lineItems: InvoiceLineItem[];

  // Subtotals
  subtotalLabor: number;
  subtotalParts: number;
  subtotalServiceFee: number;
  subtotalMaterials: number;
  subtotalSurcharges: number;
  subtotalDiscounts: number;
  totalBeforeTax: number;

  // Tax (future-ready)
  taxRate: number;
  taxAmount: number;

  // Final
  grandTotal: number;

  // Commission (internal, visible to partner)
  commission: CommissionResult;

  // Warranty
  warranty?: {
    labor: string;
    parts: string;
    laborDays: number;
    partsDays: number;
    validFrom: string;
    laborExpiresAt: string;
    partsExpiresAt: string;
  };

  // Platform reference
  platformRef: string;
  completionOtpVerified: boolean;
  jobCompletedAt?: string;

  // Payment summary
  depositPaid: number;
  balanceDue: number;
  paymentMethod: string;
  paymentStatus: string;

  // Status
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
}

// ─── Invoice Generator ──────────────────────────────────────────

function generateInvoiceNumber(jobId: string): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const seq = Date.now().toString(36).slice(-4).toUpperCase();
  return `INV-${y}${m}-${jobId}-${seq}`;
}

export function generateInvoice(booking: BookingState): InvoiceData {
  const now = new Date();
  const invoiceNumber = generateInvoiceNumber(booking.jobId);

  const selectedOption = booking.quote?.options?.find(
    (o) => o.id === booking.quote?.selectedOptionId
  );

  // Build line items
  const lineItems: InvoiceLineItem[] = [];

  // Labor items
  const laborItems = selectedOption?.laborItems || booking.quote?.laborItems || [];
  for (const item of laborItems) {
    lineItems.push({
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.amount,
      totalPrice: item.amount,
      category: "labor",
    });
  }

  // Parts items
  const partsItems = selectedOption?.partsItems || booking.quote?.partsItems || [];
  for (const item of partsItems) {
    lineItems.push({
      description: item.description + (item.partQuality ? ` (${item.partQuality})` : ""),
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.amount,
      totalPrice: item.amount,
      category: "parts",
    });
  }

  // Add-ons / additional materials
  const addOns = selectedOption?.addOns || booking.quote?.addOns || [];
  for (const item of addOns) {
    lineItems.push({
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.amount,
      totalPrice: item.amount,
      category: "materials",
    });
  }

  // Visit/diagnostic fee
  if (booking.pricing.visitFee > 0) {
    lineItems.push({
      description: "Visit / Inspection Fee",
      quantity: 1,
      unitPrice: booking.pricing.visitFee,
      totalPrice: booking.pricing.visitFee,
      category: "service_fee",
    });
  }
  if (booking.pricing.diagnosticFee > 0) {
    lineItems.push({
      description: "Diagnostic Fee",
      quantity: 1,
      unitPrice: booking.pricing.diagnosticFee,
      totalPrice: booking.pricing.diagnosticFee,
      category: "service_fee",
    });
  }

  // Emergency surcharge
  if (booking.pricing.emergencySurcharge > 0) {
    lineItems.push({
      description: "Emergency Surcharge",
      quantity: 1,
      unitPrice: booking.pricing.emergencySurcharge,
      totalPrice: booking.pricing.emergencySurcharge,
      category: "surcharge",
    });
  }

  // Calculate subtotals
  const subtotalLabor = lineItems.filter((i) => i.category === "labor").reduce((s, i) => s + i.totalPrice, 0);
  const subtotalParts = lineItems.filter((i) => i.category === "parts").reduce((s, i) => s + i.totalPrice, 0);
  const subtotalServiceFee = lineItems.filter((i) => i.category === "service_fee").reduce((s, i) => s + i.totalPrice, 0);
  const subtotalMaterials = lineItems.filter((i) => i.category === "materials").reduce((s, i) => s + i.totalPrice, 0);
  const subtotalSurcharges = lineItems.filter((i) => i.category === "surcharge").reduce((s, i) => s + i.totalPrice, 0);
  const subtotalDiscounts = lineItems.filter((i) => i.category === "discount").reduce((s, i) => s + i.totalPrice, 0);

  const totalBeforeTax = subtotalLabor + subtotalParts + subtotalServiceFee + subtotalMaterials + subtotalSurcharges - subtotalDiscounts;
  const taxRate = 0; // No VAT for now
  const taxAmount = Math.round(totalBeforeTax * taxRate);
  const grandTotal = totalBeforeTax + taxAmount;

  // Commission
  const diagnosticFee = booking.pricing.diagnosticFee + booking.pricing.visitFee;
  const commission = calculateCommission(booking.categoryCode, grandTotal, diagnosticFee);

  // Warranty
  const warranty = selectedOption?.warranty ? {
    labor: selectedOption.warranty.labor,
    parts: selectedOption.warranty.parts,
    laborDays: selectedOption.warranty.laborDays,
    partsDays: selectedOption.warranty.partsDays,
    validFrom: booking.completionOtpVerifiedAt || now.toISOString(),
    laborExpiresAt: new Date(
      new Date(booking.completionOtpVerifiedAt || now).getTime() + selectedOption.warranty.laborDays * 86400000
    ).toISOString(),
    partsExpiresAt: new Date(
      new Date(booking.completionOtpVerifiedAt || now).getTime() + selectedOption.warranty.partsDays * 86400000
    ).toISOString(),
  } : undefined;

  const depositPaid = booking.finance?.depositAmount && booking.finance.paymentStatus !== "unpaid"
    ? booking.finance.depositAmount : 0;

  return {
    invoiceId: `INV-${booking.jobId}-${Date.now().toString(36).toUpperCase()}`,
    invoiceNumber,
    bookingRef: booking.jobId,
    issuedAt: now.toISOString(),
    dueDate: new Date(now.getTime() + 7 * 86400000).toISOString(),
    customerName: "Customer", // Will be populated from auth
    customerAddress: booking.address,
    customerZone: booking.zone,
    categoryCode: booking.categoryCode,
    categoryName: booking.categoryName,
    serviceName: booking.serviceName,
    serviceMode: booking.serviceMode,
    technicianName: booking.technician?.name || "Assigned Technician",
    partnerName: booking.technician?.partnerName || "LankaFix Partner",
    verifiedSince: booking.technician?.verifiedSince || "",
    lineItems,
    subtotalLabor,
    subtotalParts,
    subtotalServiceFee,
    subtotalMaterials,
    subtotalSurcharges,
    subtotalDiscounts,
    totalBeforeTax,
    taxRate,
    taxAmount,
    grandTotal,
    commission,
    warranty,
    platformRef: `LF-${booking.jobId}`,
    completionOtpVerified: !!booking.completionOtpVerifiedAt,
    jobCompletedAt: booking.completionOtpVerifiedAt || undefined,
    depositPaid,
    balanceDue: grandTotal - depositPaid,
    paymentMethod: booking.finance?.collectionMode || "cash",
    paymentStatus: booking.finance?.paymentStatus || "unpaid",
    status: booking.finance?.paymentStatus === "fully_paid" || booking.finance?.paymentStatus === "settled"
      ? "paid"
      : booking.status === "cancelled" ? "cancelled" : "issued",
  };
}

// ─── Format helpers ─────────────────────────────────────────────

export function formatInvoiceLKR(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK")}`;
}
