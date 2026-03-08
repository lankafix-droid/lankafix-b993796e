export const SUPPORT_WHATSAPP = "94770001234";
export const TECHNICIAN_WHATSAPP = "94770001235";
export const SUPPORT_PHONE = "+94 77 000 1234";
export const SUPPORT_EMAIL = "hello@lankafix.lk";

export function whatsappLink(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}