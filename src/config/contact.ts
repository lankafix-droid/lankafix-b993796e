export const SUPPORT_WHATSAPP = "94771234567";
export const TECHNICIAN_WHATSAPP = "94772345678"; // placeholder
export const SUPPORT_PHONE = "+94 11 234 5678";
export const SUPPORT_EMAIL = "info@lankafix.lk";

export function whatsappLink(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
