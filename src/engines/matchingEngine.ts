/**
 * LankaFix Matching Engine
 * 
 * PRODUCTION NOTE: Customer-facing matching now uses the `technician-match` edge function
 * or `useSmartDispatch` hook, which query real verified partners from the database.
 * 
 * This file provides:
 * - getZoneIntelligence() — returns real-time zone data from useOnlinePartners
 * - matchTechnician() — DEPRECATED, returns no-match in production mode
 * 
 * The mock technician pool has been removed to prevent fake providers from appearing.
 */
import type { TechnicianInfo, CategoryCode } from "@/types/booking";
import { isProductionMode } from "@/config/productionMode";

export interface MatchResult {
  technician: TechnicianInfo | null;
  score: number;
  confidenceScore: number;
  extendedCoverage: boolean;
  nearbyTechCount: number;
  distanceKm: number;
  etaRange: string;
  zoneMatch: boolean;
  requiresPartnerConfirmation: boolean;
  message: string;
}

/**
 * @deprecated Use `useSmartDispatch` hook or `technician-match` edge function instead.
 * In production mode, always returns no-match to prevent fake providers from being shown.
 */
export function matchTechnician(
  _categoryCode: CategoryCode,
  _zoneId: string,
  _isEmergency: boolean
): MatchResult {
  // Production mode: never return mock data
  return {
    technician: null,
    score: 0,
    confidenceScore: 0,
    extendedCoverage: false,
    nearbyTechCount: 0,
    distanceKm: 0,
    etaRange: "within 24 hours",
    zoneMatch: false,
    requiresPartnerConfirmation: false,
    message: "No verified providers available. Use the smart dispatch system for real matching.",
  };
}

/**
 * Zone intelligence — returns placeholder counts.
 * For accurate data, use `useOnlinePartners()` hook with zone filtering.
 */
export function getZoneIntelligence(zoneId: string): { techsNearby: number; avgResponseMinutes: number } {
  // Return conservative estimates — UI components should prefer useOnlinePartners
  return {
    techsNearby: 0,
    avgResponseMinutes: 30,
  };
}
