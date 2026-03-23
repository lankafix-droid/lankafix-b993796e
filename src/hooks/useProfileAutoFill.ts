/**
 * useProfileAutoFill — Reusable hook to auto-fill form fields from saved profile & address data.
 * Returns structured profile + address data with loading/error states.
 * Falls back from default address → first saved address → empty.
 */
import { useCustomerProfile, type SavedAddress } from "@/hooks/useCustomerProfile";

export interface AutoFillAddress {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  landmark: string;
  floorOrUnit: string;
  parkingNotes: string;
  accessNotes: string;
  latitude: number | null;
  longitude: number | null;
  isServiceable: boolean;
  verificationState: string;
  /** Formatted display string for simple use */
  displayString: string;
}

export interface AutoFilledFields {
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  /** Structured address data (null if no address saved) */
  address: AutoFillAddress | null;
  /** Shortcut: formatted address as display string */
  addressDisplayString: string;
  /** Whether any profile data was auto-filled */
  hasProfileData: boolean;
  /** Whether address data was auto-filled */
  hasAddressData: boolean;
  /** Loading state — profile or addresses still loading */
  isLoading: boolean;
  /** Error fetching profile data */
  error: string | null;
}

function toAutoFillAddress(addr: SavedAddress): AutoFillAddress {
  const parts = [addr.address_line_1, addr.city, addr.district].filter(Boolean);
  return {
    id: addr.id,
    label: addr.label || "Address",
    addressLine1: addr.address_line_1 || "",
    addressLine2: addr.address_line_2 || "",
    city: addr.city || "",
    district: addr.district || "",
    landmark: addr.landmark || "",
    floorOrUnit: addr.floor_or_unit || "",
    parkingNotes: addr.parking_notes || "",
    accessNotes: addr.access_notes || "",
    latitude: addr.latitude ?? null,
    longitude: addr.longitude ?? null,
    isServiceable: !!(addr.phase1_serviceable || addr.admin_serviceability_override),
    verificationState: addr.verification_state || "needs_verification",
    displayString: parts.length > 0 ? parts.join(", ") : "",
  };
}

export function useProfileAutoFill(): AutoFilledFields {
  const { profile, addresses, defaultAddress, isLoading } = useCustomerProfile();

  const name = profile?.full_name || "";
  const phone = profile?.phone || "";
  const email = profile?.email || "";
  const whatsapp = profile?.whatsapp_number || phone;

  // Address fallback: default → first saved → null
  const bestAddress = defaultAddress ?? (addresses.length > 0 ? addresses[0] : null);
  const address = bestAddress ? toAutoFillAddress(bestAddress) : null;

  const hasProfileData = !!(name || phone || email);
  const hasAddressData = !!address?.addressLine1;

  return {
    name,
    phone,
    email,
    whatsapp,
    address,
    addressDisplayString: address?.displayString || "",
    hasProfileData,
    hasAddressData,
    isLoading,
    error: null, // useCustomerProfile handles errors internally via react-query
  };
}
