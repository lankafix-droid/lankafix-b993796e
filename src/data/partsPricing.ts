/**
 * LankaFix Spare Parts Pricing Table
 * Admin-editable pricing for parts across categories.
 */

export type PartGradeCode = "original" | "oem" | "a_grade" | "compatible";

export interface PartGradeOption {
  code: PartGradeCode;
  label: string;
  description: string;
  warrantyDays: number;
  warrantyLabel: string;
  priceMultiplier: number; // relative to base price
}

export const PART_GRADES: PartGradeOption[] = [
  {
    code: "original",
    label: "Original",
    description: "Manufacturer original part with full factory warranty",
    warrantyDays: 365,
    warrantyLabel: "12-month manufacturer warranty",
    priceMultiplier: 1.0,
  },
  {
    code: "oem",
    label: "OEM",
    description: "High-quality equivalent meeting manufacturer specifications",
    warrantyDays: 180,
    warrantyLabel: "6-month OEM warranty",
    priceMultiplier: 0.7,
  },
  {
    code: "a_grade",
    label: "A Grade",
    description: "Quality tested aftermarket part with good performance",
    warrantyDays: 90,
    warrantyLabel: "3-month LankaFix warranty",
    priceMultiplier: 0.5,
  },
  {
    code: "compatible",
    label: "Compatible",
    description: "Budget-friendly compatible replacement",
    warrantyDays: 30,
    warrantyLabel: "30-day LankaFix warranty",
    priceMultiplier: 0.35,
  },
];

export interface SparePartRecord {
  id: string;
  category: string;
  partName: string;
  deviceModel: string;
  basePrice: number;
  partGrade: PartGradeCode;
  lastUpdated: string;
}

/** Demo spare parts pricing table */
export const SPARE_PARTS_TABLE: SparePartRecord[] = [
  // Mobile displays
  { id: "mob-001", category: "MOBILE", partName: "LCD Display", deviceModel: "iPhone 14", basePrice: 28000, partGrade: "original", lastUpdated: "2026-03-01" },
  { id: "mob-002", category: "MOBILE", partName: "LCD Display", deviceModel: "iPhone 13", basePrice: 22000, partGrade: "original", lastUpdated: "2026-03-01" },
  { id: "mob-003", category: "MOBILE", partName: "LCD Display", deviceModel: "iPhone 12", basePrice: 18000, partGrade: "original", lastUpdated: "2026-03-01" },
  { id: "mob-004", category: "MOBILE", partName: "LCD Display", deviceModel: "Samsung S24", basePrice: 32000, partGrade: "original", lastUpdated: "2026-03-01" },
  { id: "mob-005", category: "MOBILE", partName: "LCD Display", deviceModel: "Samsung A54", basePrice: 12000, partGrade: "original", lastUpdated: "2026-03-01" },
  { id: "mob-006", category: "MOBILE", partName: "Battery", deviceModel: "iPhone 14", basePrice: 8500, partGrade: "original", lastUpdated: "2026-03-01" },
  { id: "mob-007", category: "MOBILE", partName: "Battery", deviceModel: "Samsung S24", basePrice: 7500, partGrade: "original", lastUpdated: "2026-03-01" },
  { id: "mob-008", category: "MOBILE", partName: "Charging Port", deviceModel: "Universal", basePrice: 3500, partGrade: "original", lastUpdated: "2026-03-01" },

  // Laptop parts
  { id: "lap-001", category: "IT", partName: "Keyboard", deviceModel: "HP Pavilion", basePrice: 8500, partGrade: "original", lastUpdated: "2026-02-28" },
  { id: "lap-002", category: "IT", partName: "Keyboard", deviceModel: "Dell Inspiron", basePrice: 7500, partGrade: "original", lastUpdated: "2026-02-28" },
  { id: "lap-003", category: "IT", partName: "SSD 256GB", deviceModel: "Universal", basePrice: 9500, partGrade: "original", lastUpdated: "2026-02-28" },
  { id: "lap-004", category: "IT", partName: "RAM 8GB DDR4", deviceModel: "Universal", basePrice: 6500, partGrade: "original", lastUpdated: "2026-02-28" },
  { id: "lap-005", category: "IT", partName: "LCD Screen 15.6\"", deviceModel: "Universal", basePrice: 15000, partGrade: "original", lastUpdated: "2026-02-28" },

  // TV panels
  { id: "tv-001", category: "CONSUMER_ELEC", partName: "LED Backlight Strip", deviceModel: "32\" Universal", basePrice: 4500, partGrade: "original", lastUpdated: "2026-02-25" },
  { id: "tv-002", category: "CONSUMER_ELEC", partName: "Power Board", deviceModel: "Samsung 43\"", basePrice: 8500, partGrade: "original", lastUpdated: "2026-02-25" },
  { id: "tv-003", category: "CONSUMER_ELEC", partName: "Main Board", deviceModel: "LG 55\"", basePrice: 18000, partGrade: "original", lastUpdated: "2026-02-25" },

  // Printer parts
  { id: "prt-001", category: "IT", partName: "Fuser Unit", deviceModel: "HP LaserJet Pro", basePrice: 12000, partGrade: "original", lastUpdated: "2026-02-20" },
  { id: "prt-002", category: "IT", partName: "Pickup Roller", deviceModel: "Universal Laser", basePrice: 3500, partGrade: "original", lastUpdated: "2026-02-20" },
  { id: "prt-003", category: "IT", partName: "Drum Unit", deviceModel: "Brother HL", basePrice: 8500, partGrade: "original", lastUpdated: "2026-02-20" },

  // AC spare parts
  { id: "ac-001", category: "AC", partName: "Compressor", deviceModel: "9000 BTU Split", basePrice: 35000, partGrade: "original", lastUpdated: "2026-02-15" },
  { id: "ac-002", category: "AC", partName: "PCB Board", deviceModel: "Universal Split", basePrice: 12000, partGrade: "original", lastUpdated: "2026-02-15" },
  { id: "ac-003", category: "AC", partName: "Fan Motor (Indoor)", deviceModel: "Universal Split", basePrice: 8500, partGrade: "original", lastUpdated: "2026-02-15" },
  { id: "ac-004", category: "AC", partName: "Capacitor", deviceModel: "Universal", basePrice: 2500, partGrade: "original", lastUpdated: "2026-02-15" },
];

/** Service warranty definitions per category */
export interface ServiceWarranty {
  category: string;
  serviceType: string;
  laborWarrantyDays: number;
  laborWarrantyLabel: string;
  partsWarrantyNote: string;
}

export const SERVICE_WARRANTIES: ServiceWarranty[] = [
  { category: "MOBILE", serviceType: "screen", laborWarrantyDays: 30, laborWarrantyLabel: "30-day labour warranty", partsWarrantyNote: "Parts warranty depends on grade selected" },
  { category: "MOBILE", serviceType: "battery", laborWarrantyDays: 30, laborWarrantyLabel: "30-day labour warranty", partsWarrantyNote: "Parts warranty depends on grade selected" },
  { category: "MOBILE", serviceType: "charging", laborWarrantyDays: 30, laborWarrantyLabel: "30-day labour warranty", partsWarrantyNote: "Parts warranty depends on grade selected" },
  { category: "AC", serviceType: "service", laborWarrantyDays: 30, laborWarrantyLabel: "30-day service warranty", partsWarrantyNote: "No parts replaced" },
  { category: "AC", serviceType: "deep_clean", laborWarrantyDays: 30, laborWarrantyLabel: "30-day service warranty", partsWarrantyNote: "No parts replaced" },
  { category: "AC", serviceType: "repair", laborWarrantyDays: 90, laborWarrantyLabel: "90-day repair warranty", partsWarrantyNote: "Parts warranty per quote terms" },
  { category: "AC", serviceType: "gas", laborWarrantyDays: 90, laborWarrantyLabel: "90-day warranty", partsWarrantyNote: "Gas refill guaranteed" },
  { category: "IT", serviceType: "laptop", laborWarrantyDays: 30, laborWarrantyLabel: "30-day repair warranty", partsWarrantyNote: "Parts warranty depends on grade" },
  { category: "IT", serviceType: "software", laborWarrantyDays: 7, laborWarrantyLabel: "7-day software warranty", partsWarrantyNote: "N/A" },
  { category: "CONSUMER_ELEC", serviceType: "tv", laborWarrantyDays: 30, laborWarrantyLabel: "30-day repair warranty", partsWarrantyNote: "Parts warranty per quote" },
  { category: "CONSUMER_ELEC", serviceType: "washing", laborWarrantyDays: 30, laborWarrantyLabel: "30-day repair warranty", partsWarrantyNote: "Parts warranty per quote" },
  { category: "CONSUMER_ELEC", serviceType: "fridge", laborWarrantyDays: 30, laborWarrantyLabel: "30-day repair warranty", partsWarrantyNote: "Parts warranty per quote" },
];

export function getServiceWarranty(category: string, serviceType: string): ServiceWarranty | undefined {
  return SERVICE_WARRANTIES.find(w => w.category === category && w.serviceType === serviceType);
}
