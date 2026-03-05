/**
 * LankaFix Live Tracking Engine
 * GPS simulation, location history, arrival detection.
 * In production, replace simulation with real GPS via Capacitor/browser geolocation.
 */
import { calculateDistance } from "@/lib/locationUtils";
import { calculateETA, detectTrafficLevel } from "@/lib/etaEngine";
import type { TrafficLevel } from "@/lib/etaEngine";

// ── Data Models ──────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string;
}

export interface TrackingData {
  technicianLocation: GeoPoint | null;
  customerLocation: GeoPoint | null;
  routePath: GeoPoint[];
  etaMinutes: number;
  distanceRemainingKm: number;
  lastUpdated: string;
  travelStartedAt: string | null;
  travelDistanceKm: number;
  isTracking: boolean;
  trafficLevel: TrafficLevel;
  arrivedAt: string | null;
}

// ── Constants ────────────────────────────────────────────────

const MAX_HISTORY_POINTS = 50;
const ARRIVAL_RADIUS_KM = 0.12; // 120 meters
const MIN_ACCURACY_METERS = 50;
const UPDATE_INTERVAL_MOVING = 15_000; // 15s
const UPDATE_INTERVAL_IDLE = 30_000; // 30s

// ── Tracking State (in-memory for simulation) ────────────────

const trackingState = new Map<string, {
  data: TrackingData;
  intervalId: ReturnType<typeof setInterval> | null;
  simulationStep: number;
  offlineBuffer: GeoPoint[];
}>();

/** Create initial tracking data */
export function createTrackingData(
  techLat: number, techLng: number,
  custLat: number, custLng: number
): TrackingData {
  const dist = calculateDistance(techLat, techLng, custLat, custLng);
  const traffic = detectTrafficLevel();
  return {
    technicianLocation: { lat: techLat, lng: techLng, accuracy: 10, timestamp: new Date().toISOString() },
    customerLocation: { lat: custLat, lng: custLng, timestamp: new Date().toISOString() },
    routePath: [{ lat: techLat, lng: techLng, timestamp: new Date().toISOString() }],
    etaMinutes: calculateETA(dist, traffic),
    distanceRemainingKm: Math.round(dist * 10) / 10,
    lastUpdated: new Date().toISOString(),
    travelStartedAt: new Date().toISOString(),
    travelDistanceKm: 0,
    isTracking: true,
    trafficLevel: traffic,
    arrivedAt: null,
  };
}

/** Validate GPS accuracy — reject if > 50m */
export function validateLocationAccuracy(point: GeoPoint): boolean {
  return (point.accuracy ?? 0) <= MIN_ACCURACY_METERS;
}

/** Update technician location */
export function updateTechnicianLocation(
  tracking: TrackingData,
  newPoint: GeoPoint
): TrackingData {
  if (!validateLocationAccuracy(newPoint)) {
    return tracking; // reject inaccurate
  }

  const prevLoc = tracking.technicianLocation;
  const movedKm = prevLoc
    ? calculateDistance(prevLoc.lat, prevLoc.lng, newPoint.lat, newPoint.lng)
    : 0;

  const custLoc = tracking.customerLocation;
  const distRemaining = custLoc
    ? calculateDistance(newPoint.lat, newPoint.lng, custLoc.lat, custLoc.lng)
    : tracking.distanceRemainingKm;

  const traffic = detectTrafficLevel();
  const eta = calculateETA(distRemaining, traffic);

  // Keep route history capped
  const routePath = [...tracking.routePath, newPoint].slice(-MAX_HISTORY_POINTS);

  return {
    ...tracking,
    technicianLocation: newPoint,
    routePath,
    distanceRemainingKm: Math.round(distRemaining * 10) / 10,
    etaMinutes: eta,
    lastUpdated: newPoint.timestamp,
    travelDistanceKm: Math.round((tracking.travelDistanceKm + movedKm) * 10) / 10,
    trafficLevel: traffic,
  };
}

/** Check if technician has arrived (within 120m) */
export function detectArrival(tracking: TrackingData): boolean {
  if (!tracking.technicianLocation || !tracking.customerLocation) return false;
  return tracking.distanceRemainingKm <= ARRIVAL_RADIUS_KM;
}

/** Store location history (returns trimmed array) */
export function storeLocationHistory(history: GeoPoint[], point: GeoPoint): GeoPoint[] {
  return [...history, point].slice(-MAX_HISTORY_POINTS);
}

/** Stop tracking */
export function stopTracking(tracking: TrackingData): TrackingData {
  return { ...tracking, isTracking: false, arrivedAt: new Date().toISOString() };
}

// ── Simulation Engine ────────────────────────────────────────
// For demo purposes — simulates technician moving toward customer

/** Generate a simulated path between two points */
function interpolate(from: GeoPoint, to: GeoPoint, steps: number): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Add slight randomness to simulate real road movement
    const jitter = () => (Math.random() - 0.5) * 0.001;
    points.push({
      lat: from.lat + (to.lat - from.lat) * t + jitter(),
      lng: from.lng + (to.lng - from.lng) * t + jitter(),
      accuracy: 5 + Math.random() * 15,
      timestamp: new Date(Date.now() + i * UPDATE_INTERVAL_MOVING).toISOString(),
    });
  }
  return points;
}

export interface TrackingSimulation {
  bookingId: string;
  tracking: TrackingData;
  simulatedPath: GeoPoint[];
  currentStep: number;
  isRunning: boolean;
}

/** Start a tracking simulation */
export function createSimulation(
  bookingId: string,
  techLat: number, techLng: number,
  custLat: number, custLng: number,
  totalSteps: number = 20
): TrackingSimulation {
  const tracking = createTrackingData(techLat, techLng, custLat, custLng);
  const techPoint: GeoPoint = { lat: techLat, lng: techLng, timestamp: new Date().toISOString() };
  const custPoint: GeoPoint = { lat: custLat, lng: custLng, timestamp: new Date().toISOString() };
  const simulatedPath = interpolate(techPoint, custPoint, totalSteps);

  return {
    bookingId,
    tracking,
    simulatedPath,
    currentStep: 0,
    isRunning: true,
  };
}

/** Advance simulation by one step */
export function advanceSimulation(sim: TrackingSimulation): TrackingSimulation {
  if (!sim.isRunning || sim.currentStep >= sim.simulatedPath.length) {
    return { ...sim, isRunning: false };
  }

  const nextPoint = sim.simulatedPath[sim.currentStep];
  const updatedTracking = updateTechnicianLocation(sim.tracking, {
    ...nextPoint,
    timestamp: new Date().toISOString(),
  });

  const arrived = detectArrival(updatedTracking);

  return {
    ...sim,
    tracking: arrived ? stopTracking(updatedTracking) : updatedTracking,
    currentStep: sim.currentStep + 1,
    isRunning: !arrived && sim.currentStep + 1 < sim.simulatedPath.length,
  };
}

// ── Offline Recovery Buffer ──────────────────────────────────

const OFFLINE_BUFFER_MAX = 5;

export function bufferOfflinePoint(buffer: GeoPoint[], point: GeoPoint): GeoPoint[] {
  return [...buffer, point].slice(-OFFLINE_BUFFER_MAX);
}

export function flushOfflineBuffer(
  tracking: TrackingData,
  buffer: GeoPoint[]
): TrackingData {
  let updated = tracking;
  for (const point of buffer) {
    updated = updateTechnicianLocation(updated, point);
  }
  return updated;
}

export { UPDATE_INTERVAL_MOVING, UPDATE_INTERVAL_IDLE };
