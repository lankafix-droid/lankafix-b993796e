/**
 * useProfileAutoFill — Reusable hook to auto-fill form fields from saved profile & address data.
 * Returns pre-populated values for name, phone, email, address fields.
 */
import { useCustomerProfile } from "@/hooks/useCustomerProfile";

export interface AutoFilledFields {
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  addressLine1: string;
  city: string;
  district: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  /** Whether any data was auto-filled */
  hasAutoFill: boolean;
}

export function useProfileAutoFill(): AutoFilledFields {
  const { profile, defaultAddress } = useCustomerProfile();

  const name = profile?.full_name || "";
  const phone = profile?.phone || "";
  const email = profile?.email || "";
  const whatsapp = profile?.whatsapp_number || phone;

  const addressLine1 = defaultAddress?.address_line_1 || "";
  const city = defaultAddress?.city || "";
  const district = defaultAddress?.district || profile?.district || "";
  const landmark = defaultAddress?.landmark || "";
  const latitude = defaultAddress?.latitude ?? null;
  const longitude = defaultAddress?.longitude ?? null;

  return {
    name,
    phone,
    email,
    whatsapp,
    addressLine1,
    city,
    district,
    landmark,
    latitude,
    longitude,
    hasAutoFill: !!(name || phone || email || addressLine1),
  };
}
