/**
 * LankaFix Payment Engine
 * Payment method labels and helpers for Sri Lankan market.
 */
import type { PaymentMethod } from "@/types/booking";

export interface PaymentMethodConfig {
  label: string;
  description: string;
  available: boolean;
  icon: string;
}

export const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodConfig> = {
  cash: {
    label: "Cash",
    description: "Pay cash on completion",
    available: true,
    icon: "Banknote",
  },
  bank_transfer: {
    label: "Bank Transfer",
    description: "Upload receipt or reference",
    available: true,
    icon: "Building2",
  },
  card: {
    label: "Online Payment",
    description: "PayHere / LankaQR / Genie (Coming Soon)",
    available: false,
    icon: "CreditCard",
  },
};

export function formatLKR(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK")}`;
}
