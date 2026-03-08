/**
 * LankaFix Location Store
 * Manages customer location, saved addresses, and service zone validation.
 * Uses Zustand with localStorage persistence.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { calculateDistance } from "@/lib/locationUtils";

// ─── Types ───────────────────────────────────────────────────

export type AddressLabel = "home" | "office" | "apartment" | "parents" | "other";

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  customLabel?: string;
  displayName: string;
  houseNumber?: string;
  street?: string;
  area: string;
  city: string;
  landmark?: string;
  floor?: string;
  accessNotes?: string;
  lat: number;
  lng: number;
  zoneId: string | null;
  zoneStatus: "inside" | "edge" | "outside";
  createdAt: string;
}

export type LocationPermissionState = "prompt" | "granted" | "denied" | "unavailable";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface LocationState {
  // Permission
  permissionState: LocationPermissionState;
  setPermissionState: (state: LocationPermissionState) => void;

  // Current GPS position (transient, not persisted as coords)
  currentPosition: GeoPosition | null;
  setCurrentPosition: (pos: GeoPosition | null) => void;

  // Selected address for current booking
  activeAddressId: string | null;
  setActiveAddressId: (id: string | null) => void;

  // Saved addresses
  savedAddresses: SavedAddress[];
  addAddress: (address: Omit<SavedAddress, "id" | "createdAt" | "zoneId" | "zoneStatus">) => SavedAddress;
  updateAddress: (id: string, updates: Partial<SavedAddress>) => void;
  removeAddress: (id: string) => void;

  // Location setup flow
  locationSetupComplete: boolean;
  setLocationSetupComplete: (v: boolean) => void;

  // Helpers
  getActiveAddress: () => SavedAddress | null;
  getPrimaryAddress: () => SavedAddress | null;
}

// ─── Zone Validation ─────────────────────────────────────────

/** Maximum distance in km to be considered "inside" a service zone */
const ZONE_INSIDE_RADIUS = 5;
/** Maximum distance to be considered "edge" (may have travel fee) */
const ZONE_EDGE_RADIUS = 12;

export function validateServiceZone(lat: number, lng: number): {
  zoneId: string | null;
  zoneLabel: string | null;
  status: "inside" | "edge" | "outside";
  nearestZoneDistance: number;
  surgeFactor: number;
} {
  let nearestZone = COLOMBO_ZONES_DATA[0];
  let nearestDist = Infinity;

  for (const zone of COLOMBO_ZONES_DATA) {
    if (!zone.geo) continue;
    const dist = calculateDistance(lat, lng, zone.geo.lat, zone.geo.lng);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestZone = zone;
    }
  }

  // Cities outside Greater Colombo are "outside" regardless
  const outsideCities = ["Kandy", "Kurunegala", "Galle"];
  if (outsideCities.includes(nearestZone.city) && nearestDist > 2) {
    return { zoneId: null, zoneLabel: null, status: "outside", nearestZoneDistance: nearestDist, surgeFactor: 1.0 };
  }

  if (nearestDist <= ZONE_INSIDE_RADIUS) {
    return {
      zoneId: nearestZone.id,
      zoneLabel: nearestZone.label,
      status: "inside",
      nearestZoneDistance: nearestDist,
      surgeFactor: nearestZone.surgeFactor ?? 1.0,
    };
  }

  if (nearestDist <= ZONE_EDGE_RADIUS) {
    return {
      zoneId: nearestZone.id,
      zoneLabel: nearestZone.label,
      status: "edge",
      nearestZoneDistance: nearestDist,
      surgeFactor: nearestZone.surgeFactor ?? 1.1,
    };
  }

  return { zoneId: null, zoneLabel: null, status: "outside", nearestZoneDistance: nearestDist, surgeFactor: 1.0 };
}

/** Get travel fee based on zone status */
export function getTravelFeeForZone(status: "inside" | "edge" | "outside"): {
  fee: number;
  label: string;
} {
  switch (status) {
    case "inside":
      return { fee: 0, label: "Travel included" };
    case "edge":
      return { fee: 500, label: "LKR 500 travel fee" };
    case "outside":
      return { fee: -1, label: "Outside service zone" };
  }
}

// ─── Store ───────────────────────────────────────────────────

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      permissionState: "prompt",
      setPermissionState: (state) => set({ permissionState: state }),

      currentPosition: null,
      setCurrentPosition: (pos) => set({ currentPosition: pos }),

      activeAddressId: null,
      setActiveAddressId: (id) => set({ activeAddressId: id }),

      savedAddresses: [],
      addAddress: (address) => {
        const zoneResult = validateServiceZone(address.lat, address.lng);
        const newAddr: SavedAddress = {
          ...address,
          id: `addr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          zoneId: zoneResult.zoneId,
          zoneStatus: zoneResult.status,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          savedAddresses: [...state.savedAddresses, newAddr],
          activeAddressId: state.activeAddressId || newAddr.id,
        }));
        return newAddr;
      },
      updateAddress: (id, updates) =>
        set((state) => ({
          savedAddresses: state.savedAddresses.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      removeAddress: (id) =>
        set((state) => ({
          savedAddresses: state.savedAddresses.filter((a) => a.id !== id),
          activeAddressId: state.activeAddressId === id ? null : state.activeAddressId,
        })),

      locationSetupComplete: false,
      setLocationSetupComplete: (v) => set({ locationSetupComplete: v }),

      getActiveAddress: () => {
        const state = get();
        if (!state.activeAddressId) return state.savedAddresses[0] || null;
        return state.savedAddresses.find((a) => a.id === state.activeAddressId) || null;
      },
      getPrimaryAddress: () => {
        const state = get();
        return state.savedAddresses.find((a) => a.label === "home") || state.savedAddresses[0] || null;
      },
    }),
    {
      name: "lankafix_location",
      partialize: (state) => ({
        savedAddresses: state.savedAddresses,
        activeAddressId: state.activeAddressId,
        locationSetupComplete: state.locationSetupComplete,
        permissionState: state.permissionState,
      }),
    }
  )
);

// ─── GPS Helper ──────────────────────────────────────────────

export function requestCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// ─── Address Labels ──────────────────────────────────────────

export const ADDRESS_LABEL_OPTIONS: { value: AddressLabel; label: string; icon: string }[] = [
  { value: "home", label: "Home", icon: "🏠" },
  { value: "office", label: "Office", icon: "🏢" },
  { value: "apartment", label: "Apartment", icon: "🏬" },
  { value: "parents", label: "Parents' House", icon: "👨‍👩‍👧" },
  { value: "other", label: "Other", icon: "📍" },
];
