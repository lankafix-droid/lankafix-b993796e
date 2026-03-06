import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CategoryCode } from "@/types/booking";

// ─── Device Passport Types ──────────────────────────────────────

export type WarrantyType = "manufacturer" | "lankafix_labor" | "extended_maintenance";
export type WarrantyStatus = "active" | "expired" | "claimed";
export type PartType = "original" | "oem_compatible" | "aftermarket";

export interface DevicePassport {
  devicePassportId: string;
  customerId: string;
  deviceCategory: CategoryCode | "ROUTER";
  brand: string;
  model: string;
  serialNumber?: string;
  deviceNickname: string;
  installationLocation: string;
  installationDate?: string;
  purchaseDate?: string;
  purchaseSeller?: string;
  purchaseInvoiceUrl?: string;
  createdAt: string;
  updatedAt: string;
  healthScore: number;
  totalServiceCost: number;
  totalServicesPerformed: number;
  ownerId: string;
  ownerName?: string;
  qrCode: string;
}

export interface ServiceLedgerEntry {
  id: string;
  devicePassportId: string;
  serviceDate: string;
  technicianId: string;
  technicianName: string;
  partnerId?: string;
  partnerName?: string;
  serviceType: string;
  diagnosisResult?: string;
  workCompleted: string;
  partsReplaced: ReplacedPart[];
  servicePhotos: { url: string; type: "before" | "after"; uploadedAt: string }[];
  serviceCost: number;
  jobId?: string;
  recommendations?: string;
}

export interface ReplacedPart {
  partName: string;
  partBrand: string;
  partType: PartType;
  supplier: string;
  partSerialNumber?: string;
  cost: number;
}

export interface WarrantyRecord {
  id: string;
  devicePassportId: string;
  warrantyProvider: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  warrantyType: WarrantyType;
  status: WarrantyStatus;
  description: string;
}

export interface InstallationRecord {
  devicePassportId: string;
  installationProvider: string;
  installationDate: string;
  installationReport?: string;
  installationPhotos: string[];
}

export interface MaintenanceAlert {
  id: string;
  devicePassportId: string;
  type: "maintenance_due" | "warranty_expiring" | "health_low" | "upgrade_recommended";
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  dismissed: boolean;
}

export interface OwnershipTransfer {
  id: string;
  devicePassportId: string;
  fromOwnerId: string;
  toOwnerId: string;
  toOwnerName: string;
  transferDate: string;
}

// ─── Health Score Calculator ────────────────────────────────────

export function calculateHealthScore(
  ageYears: number,
  repairCount: number,
  lastServiceMonthsAgo: number,
  partsReplacedCount: number
): number {
  let score = 100;
  // Age penalty: -3 per year after 2
  if (ageYears > 2) score -= (ageYears - 2) * 3;
  // Repair frequency penalty: -5 per repair after 2
  if (repairCount > 2) score -= (repairCount - 2) * 5;
  // Maintenance compliance: -8 if overdue
  if (lastServiceMonthsAgo > 8) score -= Math.min((lastServiceMonthsAgo - 8) * 2, 20);
  // Parts replacement penalty: -3 per major part
  score -= partsReplacedCount * 3;
  return Math.max(10, Math.min(100, Math.round(score)));
}

export function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-success" };
  if (score >= 60) return { label: "Good", color: "text-primary" };
  if (score >= 40) return { label: "Fair", color: "text-warning" };
  return { label: "Poor", color: "text-destructive" };
}

// ─── Maintenance Recommendations ────────────────────────────────

export function generateMaintenanceAlerts(passport: DevicePassport, services: ServiceLedgerEntry[], warranties: WarrantyRecord[]): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];
  const now = new Date();

  // Check last service date
  const lastService = services.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0];
  if (lastService) {
    const monthsSince = Math.round((now.getTime() - new Date(lastService.serviceDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (monthsSince >= 6) {
      alerts.push({
        id: `alert-maint-${passport.devicePassportId}`,
        devicePassportId: passport.devicePassportId,
        type: "maintenance_due",
        message: `${passport.deviceNickname} was last serviced ${monthsSince} months ago. Maintenance is recommended.`,
        severity: monthsSince >= 12 ? "critical" : "warning",
        createdAt: now.toISOString(),
        dismissed: false,
      });
    }
  }

  // Check warranty expiry
  warranties.filter((w) => w.status === "active").forEach((w) => {
    const daysUntilExpiry = Math.round((new Date(w.warrantyEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
      alerts.push({
        id: `alert-warr-${w.id}`,
        devicePassportId: passport.devicePassportId,
        type: "warranty_expiring",
        message: `${w.warrantyType === "manufacturer" ? "Manufacturer" : "LankaFix"} warranty expires in ${daysUntilExpiry} days.`,
        severity: "warning",
        createdAt: now.toISOString(),
        dismissed: false,
      });
    }
  });

  // Health score alert
  if (passport.healthScore < 50) {
    alerts.push({
      id: `alert-health-${passport.devicePassportId}`,
      devicePassportId: passport.devicePassportId,
      type: passport.healthScore < 30 ? "upgrade_recommended" : "health_low",
      message: passport.healthScore < 30
        ? `${passport.deviceNickname} has required frequent repairs. Consider upgrading this device.`
        : `${passport.deviceNickname} health score is ${passport.healthScore}/100. Schedule maintenance soon.`,
      severity: passport.healthScore < 30 ? "critical" : "warning",
      createdAt: now.toISOString(),
      dismissed: false,
    });
  }

  return alerts;
}

// ─── Resale Value Estimator ─────────────────────────────────────

export function estimateResaleValue(
  originalPrice: number,
  ageYears: number,
  healthScore: number,
  repairCount: number
): number {
  const depreciationRate = 0.15; // 15% per year
  let value = originalPrice * Math.pow(1 - depreciationRate, ageYears);
  value *= healthScore / 100;
  value *= Math.max(0.5, 1 - repairCount * 0.05);
  return Math.max(0, Math.round(value));
}

// ─── QR Code Generator ─────────────────────────────────────────

export function generateDeviceQR(passportId: string): string {
  return `https://lankafix.lk/device/${passportId}`;
}

// ─── Mock Data ──────────────────────────────────────────────────

function generateId(): string {
  return `DP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

const MOCK_PASSPORTS: DevicePassport[] = [
  {
    devicePassportId: "DP-LR-AC01",
    customerId: "CUST-001",
    deviceCategory: "AC",
    brand: "Samsung",
    model: "AR18TYHYCWK",
    serialNumber: "SAM-AC-2022-48291",
    deviceNickname: "Living Room AC",
    installationLocation: "Living Room",
    installationDate: "2022-03-15",
    purchaseDate: "2022-02-20",
    purchaseSeller: "Abans",
    createdAt: "2022-03-15T10:00:00Z",
    updatedAt: new Date().toISOString(),
    healthScore: 82,
    totalServiceCost: 18500,
    totalServicesPerformed: 3,
    ownerId: "CUST-001",
    ownerName: "Samitha Perera",
    qrCode: "https://lankafix.lk/device/DP-LR-AC01",
  },
  {
    devicePassportId: "DP-OFF-PR01",
    customerId: "CUST-001",
    deviceCategory: "COPIER",
    brand: "Canon",
    model: "G3010",
    deviceNickname: "Office Printer",
    installationLocation: "Home Office",
    purchaseDate: "2023-06-10",
    createdAt: "2023-07-01T10:00:00Z",
    updatedAt: new Date().toISOString(),
    healthScore: 95,
    totalServiceCost: 4500,
    totalServicesPerformed: 1,
    ownerId: "CUST-001",
    ownerName: "Samitha Perera",
    qrCode: "https://lankafix.lk/device/DP-OFF-PR01",
  },
  {
    devicePassportId: "DP-HOME-CCTV01",
    customerId: "CUST-001",
    deviceCategory: "CCTV",
    brand: "Hikvision",
    model: "DS-2CE16D0T",
    serialNumber: "HIK-CCTV-2021-77230",
    deviceNickname: "Home CCTV System",
    installationLocation: "Entrance & Garden",
    installationDate: "2021-11-05",
    purchaseDate: "2021-10-28",
    purchaseSeller: "LankaFix Partner",
    createdAt: "2021-11-05T10:00:00Z",
    updatedAt: new Date().toISOString(),
    healthScore: 68,
    totalServiceCost: 12000,
    totalServicesPerformed: 4,
    ownerId: "CUST-001",
    ownerName: "Samitha Perera",
    qrCode: "https://lankafix.lk/device/DP-HOME-CCTV01",
  },
];

const MOCK_SERVICE_LEDGER: ServiceLedgerEntry[] = [
  {
    id: "SL-001", devicePassportId: "DP-LR-AC01", serviceDate: "2023-04-10",
    technicianId: "T-001", technicianName: "Kasun Jayawardena", partnerName: "CoolTech Services",
    serviceType: "AC Full Service & Clean", workCompleted: "Deep cleaning of indoor/outdoor units, filter wash, gas pressure check",
    partsReplaced: [], servicePhotos: [], serviceCost: 4500, jobId: "LF-ABC001",
    recommendations: "Gas level is adequate. Recommend next service in 6 months.",
  },
  {
    id: "SL-002", devicePassportId: "DP-LR-AC01", serviceDate: "2023-09-22",
    technicianId: "T-002", technicianName: "Nuwan Silva",
    serviceType: "AC Gas Refill", diagnosisResult: "Low refrigerant — slow leak detected",
    workCompleted: "Gas top-up (R410A), leak test, minor sealant applied",
    partsReplaced: [{ partName: "R410A Refrigerant", partBrand: "Honeywell", partType: "original", supplier: "LankaFix", cost: 3500 }],
    servicePhotos: [], serviceCost: 8000, jobId: "LF-DEF002",
    recommendations: "Monitor for recurring leak. If pressure drops again, pipe replacement may be needed.",
  },
  {
    id: "SL-003", devicePassportId: "DP-LR-AC01", serviceDate: "2024-06-15",
    technicianId: "T-001", technicianName: "Kasun Jayawardena",
    serviceType: "AC Inspection", workCompleted: "Routine inspection, filter clean, thermostat calibration",
    partsReplaced: [], servicePhotos: [], serviceCost: 6000, jobId: "LF-GHI003",
  },
  {
    id: "SL-004", devicePassportId: "DP-HOME-CCTV01", serviceDate: "2022-05-20",
    technicianId: "T-003", technicianName: "Amila Fernando",
    serviceType: "CCTV Maintenance", workCompleted: "Camera lens cleaning, angle adjustment, HDD health check",
    partsReplaced: [], servicePhotos: [], serviceCost: 4000, jobId: "LF-JKL004",
  },
  {
    id: "SL-005", devicePassportId: "DP-HOME-CCTV01", serviceDate: "2023-11-10",
    technicianId: "T-003", technicianName: "Amila Fernando",
    serviceType: "CCTV Repair", diagnosisResult: "Camera 3 — night vision IR LEDs failed",
    workCompleted: "Replaced Camera 3 IR board, tested night vision",
    partsReplaced: [{ partName: "IR LED Board", partBrand: "Hikvision", partType: "original", supplier: "Hikvision Lanka", cost: 2800 }],
    servicePhotos: [], serviceCost: 5500, jobId: "LF-MNO005",
  },
  {
    id: "SL-006", devicePassportId: "DP-OFF-PR01", serviceDate: "2024-02-08",
    technicianId: "T-004", technicianName: "Roshan Bandara",
    serviceType: "Printer Maintenance", workCompleted: "Print head cleaning, ink system flush, paper feed calibration",
    partsReplaced: [], servicePhotos: [], serviceCost: 4500, jobId: "LF-PQR006",
  },
];

const MOCK_WARRANTIES: WarrantyRecord[] = [
  { id: "W-001", devicePassportId: "DP-LR-AC01", warrantyProvider: "Samsung Lanka", warrantyStartDate: "2022-02-20", warrantyEndDate: "2024-02-20", warrantyType: "manufacturer", status: "expired", description: "2-year manufacturer warranty" },
  { id: "W-002", devicePassportId: "DP-LR-AC01", warrantyProvider: "LankaFix", warrantyStartDate: "2024-06-15", warrantyEndDate: "2025-06-15", warrantyType: "lankafix_labor", status: "active", description: "1-year labor warranty on inspection service" },
  { id: "W-003", devicePassportId: "DP-HOME-CCTV01", warrantyProvider: "Hikvision Lanka", warrantyStartDate: "2021-10-28", warrantyEndDate: "2023-10-28", warrantyType: "manufacturer", status: "expired", description: "2-year manufacturer warranty" },
  { id: "W-004", devicePassportId: "DP-OFF-PR01", warrantyProvider: "Canon Lanka", warrantyStartDate: "2023-06-10", warrantyEndDate: "2025-06-10", warrantyType: "manufacturer", status: "active", description: "2-year manufacturer warranty" },
];

// ─── Store ──────────────────────────────────────────────────────

interface DevicePassportStore {
  passports: DevicePassport[];
  serviceLedger: ServiceLedgerEntry[];
  warranties: WarrantyRecord[];
  installations: InstallationRecord[];
  transfers: OwnershipTransfer[];

  getPassport: (id: string) => DevicePassport | undefined;
  getPassportServices: (id: string) => ServiceLedgerEntry[];
  getPassportWarranties: (id: string) => WarrantyRecord[];
  getCustomerPassports: (customerId: string) => DevicePassport[];
  getAlerts: (passportId: string) => MaintenanceAlert[];

  addPassport: (passport: Omit<DevicePassport, "devicePassportId" | "createdAt" | "updatedAt" | "qrCode" | "healthScore" | "totalServiceCost" | "totalServicesPerformed">) => string;
  addServiceEntry: (entry: Omit<ServiceLedgerEntry, "id">) => void;
  addWarranty: (warranty: Omit<WarrantyRecord, "id">) => void;
  transferOwnership: (passportId: string, newOwnerId: string, newOwnerName: string) => void;
  recalculateHealth: (passportId: string) => void;
}

export const useDevicePassportStore = create<DevicePassportStore>()(
  persist(
    (set, get) => ({
      passports: MOCK_PASSPORTS,
      serviceLedger: MOCK_SERVICE_LEDGER,
      warranties: MOCK_WARRANTIES,
      installations: [],
      transfers: [],

      getPassport: (id) => get().passports.find((p) => p.devicePassportId === id),
      getPassportServices: (id) => get().serviceLedger.filter((s) => s.devicePassportId === id).sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)),
      getPassportWarranties: (id) => get().warranties.filter((w) => w.devicePassportId === id),
      getCustomerPassports: (customerId) => get().passports.filter((p) => p.customerId === customerId),

      getAlerts: (passportId) => {
        const passport = get().getPassport(passportId);
        if (!passport) return [];
        return generateMaintenanceAlerts(passport, get().getPassportServices(passportId), get().getPassportWarranties(passportId));
      },

      addPassport: (data) => {
        const id = generateId();
        const now = new Date().toISOString();
        const passport: DevicePassport = {
          ...data,
          devicePassportId: id,
          createdAt: now,
          updatedAt: now,
          qrCode: generateDeviceQR(id),
          healthScore: 100,
          totalServiceCost: 0,
          totalServicesPerformed: 0,
        };
        set((s) => ({ passports: [...s.passports, passport] }));
        return id;
      },

      addServiceEntry: (data) => {
        const entry: ServiceLedgerEntry = { ...data, id: `SL-${Date.now().toString(36)}` };
        set((s) => {
          const updatedPassports = s.passports.map((p) =>
            p.devicePassportId === data.devicePassportId
              ? {
                  ...p,
                  totalServicesPerformed: p.totalServicesPerformed + 1,
                  totalServiceCost: p.totalServiceCost + data.serviceCost,
                  updatedAt: new Date().toISOString(),
                }
              : p
          );
          return { serviceLedger: [...s.serviceLedger, entry], passports: updatedPassports };
        });
        get().recalculateHealth(data.devicePassportId);
      },

      addWarranty: (data) => {
        const warranty: WarrantyRecord = { ...data, id: `W-${Date.now().toString(36)}` };
        set((s) => ({ warranties: [...s.warranties, warranty] }));
      },

      transferOwnership: (passportId, newOwnerId, newOwnerName) => {
        const passport = get().getPassport(passportId);
        if (!passport) return;
        const transfer: OwnershipTransfer = {
          id: `TR-${Date.now().toString(36)}`,
          devicePassportId: passportId,
          fromOwnerId: passport.ownerId,
          toOwnerId: newOwnerId,
          toOwnerName: newOwnerName,
          transferDate: new Date().toISOString(),
        };
        set((s) => ({
          transfers: [...s.transfers, transfer],
          passports: s.passports.map((p) =>
            p.devicePassportId === passportId
              ? { ...p, ownerId: newOwnerId, ownerName: newOwnerName, customerId: newOwnerId, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      recalculateHealth: (passportId) => {
        const passport = get().getPassport(passportId);
        if (!passport) return;
        const services = get().getPassportServices(passportId);
        const installDate = passport.installationDate || passport.purchaseDate || passport.createdAt;
        const ageYears = Math.round((Date.now() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24 * 365));
        const lastService = services[0];
        const lastServiceMonths = lastService
          ? Math.round((Date.now() - new Date(lastService.serviceDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
          : 24;
        const totalParts = services.reduce((sum, s) => sum + s.partsReplaced.length, 0);
        const health = calculateHealthScore(ageYears, services.length, lastServiceMonths, totalParts);
        set((s) => ({
          passports: s.passports.map((p) =>
            p.devicePassportId === passportId ? { ...p, healthScore: health, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },
    }),
    { name: "lankafix_device_passports" }
  )
);
