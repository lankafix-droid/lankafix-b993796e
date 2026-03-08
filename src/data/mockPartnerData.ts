import type { Partner, TechnicianInfo, CategoryCode, ProviderTier } from "@/types/booking";

export const MOCK_PARTNERS: Partner[] = [
  {
    id: "P001", name: "ColomboTech Solutions", companyName: "ColomboTech Solutions (Pvt) Ltd",
    verified: true, verifiedSince: "2023-01-15", licenseNumber: "LK-TECH-2023-001",
    rating: 4.8, jobsCompleted: 1245,
    coverageZones: ["col_03", "col_04", "col_05", "col_06", "col_07", "col_08", "nugegoda", "maharagama"],
    categories: ["AC", "CONSUMER_ELEC"] as CategoryCode[],
    serviceCodes: ["AC_GAS_TOPUP", "AC_FULL_SERVICE", "AC_REPAIR", "AC_INSTALL", "CE_TV_REPAIR", "CE_APPLIANCE_REPAIR"],
    responseSlaByCategory: { AC: 60, CONSUMER_ELEC: 90 }, tier: "elite" as ProviderTier,
  },
  {
    id: "P002", name: "Lanka Service Pro", companyName: "Lanka Service Pro (Pvt) Ltd",
    verified: true, verifiedSince: "2023-06-20", licenseNumber: "LK-TECH-2023-042",
    rating: 4.9, jobsCompleted: 2100,
    coverageZones: ["rajagiriya", "battaramulla", "nawala", "kotte", "col_07"],
    categories: ["CCTV", "SMART_HOME_OFFICE", "IT"] as CategoryCode[],
    serviceCodes: ["CCTV_INSTALL", "CCTV_REPAIR", "CCTV_MAINTENANCE", "IT_ONSITE", "IT_NETWORK", "SH_SETUP"],
    responseSlaByCategory: { CCTV: 120, SMART_HOME_OFFICE: 120, IT: 90 }, tier: "enterprise" as ProviderTier,
  },
  {
    id: "P003", name: "QuickFix Colombo", companyName: "QuickFix Colombo",
    verified: true, verifiedSince: "2024-02-10",
    rating: 4.7, jobsCompleted: 890,
    coverageZones: ["col_01", "col_02", "col_03", "col_10", "col_11", "nugegoda"],
    categories: ["MOBILE", "CONSUMER_ELEC", "COPIER", "PRINT_SUPPLIES"] as CategoryCode[],
    serviceCodes: ["MOBILE_SCREEN", "MOBILE_BATTERY", "MOBILE_GENERAL", "COPIER_REPAIR", "COPIER_MAINTENANCE"],
    responseSlaByCategory: { MOBILE: 60, COPIER: 120 }, tier: "pro" as ProviderTier,
  },
  {
    id: "P005", name: "SmartFix Pvt Ltd", companyName: "SmartFix (Pvt) Ltd",
    verified: true, verifiedSince: "2023-09-12", licenseNumber: "LK-SOLAR-2023-008",
    rating: 4.9, jobsCompleted: 750,
    coverageZones: ["battaramulla", "kotte", "rajagiriya", "nawala", "thalawathugoda", "malabe"],
    categories: ["SOLAR", "SMART_HOME_OFFICE"] as CategoryCode[],
    serviceCodes: ["SOLAR_INSTALL", "SOLAR_MAINTENANCE", "SOLAR_INVERTER", "SH_SETUP", "SH_INTERCOM"],
    responseSlaByCategory: { SOLAR: 240, SMART_HOME_OFFICE: 120 }, tier: "elite" as ProviderTier,
  },
];

/** Extended technician profiles with real GPS coordinates in Greater Colombo */
export interface TechnicianProfile extends TechnicianInfo {
  currentLat: number;
  currentLng: number;
  baseLat: number;
  baseLng: number;
  experienceYears: number;
  brandSpecializations: string[];
  phone: string;
  avgResponseMinutes: number;
  emergencyAvailable: boolean;
  vehicleType: "motorcycle" | "car" | "van";
  serviceZoneNames: string[];
}

export const MOCK_TECHNICIANS: TechnicianProfile[] = [
  {
    technicianId: "T001", name: "Kasun Perera", partnerId: "P001", partnerName: "ColomboTech Solutions",
    rating: 4.8, jobsCompleted: 342, verifiedSince: "2024-01-15",
    specializations: ["AC", "CONSUMER_ELEC"], eta: "25 mins",
    currentZoneId: "col_07", availabilityStatus: "available", activeJobsCount: 1,
    currentLat: 6.9105, currentLng: 79.8635,
    baseLat: 6.9090, baseLng: 79.8620,
    experienceYears: 8, brandSpecializations: ["Daikin", "LG", "Samsung", "Panasonic"],
    phone: "+94 77 234 5678", avgResponseMinutes: 22, emergencyAvailable: true,
    vehicleType: "van", serviceZoneNames: ["Colombo 3–8", "Nugegoda"],
  },
  {
    technicianId: "T002", name: "Nadeesha Silva", partnerId: "P002", partnerName: "Lanka Service Pro",
    rating: 4.9, jobsCompleted: 567, verifiedSince: "2023-06-20",
    specializations: ["CCTV", "SMART_HOME_OFFICE", "IT"], eta: "18 mins",
    currentZoneId: "rajagiriya", availabilityStatus: "available", activeJobsCount: 0,
    currentLat: 6.9072, currentLng: 79.8965,
    baseLat: 6.9060, baseLng: 79.8950,
    experienceYears: 10, brandSpecializations: ["Hikvision", "Dahua", "HP", "Dell", "Lenovo"],
    phone: "+94 71 456 7890", avgResponseMinutes: 15, emergencyAvailable: true,
    vehicleType: "car", serviceZoneNames: ["Rajagiriya", "Battaramulla", "Nawala", "Kotte"],
  },
  {
    technicianId: "T003", name: "Ruwan Fernando", partnerId: "P003", partnerName: "QuickFix Colombo",
    rating: 4.7, jobsCompleted: 218, verifiedSince: "2024-03-10",
    specializations: ["MOBILE", "CONSUMER_ELEC", "PRINT_SUPPLIES"], eta: "30 mins",
    currentZoneId: "nugegoda", availabilityStatus: "available", activeJobsCount: 2,
    currentLat: 6.8735, currentLng: 79.8905,
    baseLat: 6.8720, baseLng: 79.8890,
    experienceYears: 5, brandSpecializations: ["Apple", "Samsung", "Xiaomi", "Oppo", "Huawei"],
    phone: "+94 76 789 0123", avgResponseMinutes: 25, emergencyAvailable: true,
    vehicleType: "motorcycle", serviceZoneNames: ["Nugegoda", "Colombo 5–6"],
  },
  {
    technicianId: "T004", name: "Dinesh Jayawardena", partnerId: "P003", partnerName: "QuickFix Colombo",
    rating: 4.6, jobsCompleted: 189, verifiedSince: "2024-05-01",
    specializations: ["IT", "COPIER", "PRINT_SUPPLIES"], eta: "35 mins",
    currentZoneId: "col_10", availabilityStatus: "busy", activeJobsCount: 3,
    currentLat: 6.9290, currentLng: 79.8655,
    baseLat: 6.9280, baseLng: 79.8640,
    experienceYears: 6, brandSpecializations: ["HP", "Canon", "Ricoh", "Epson", "Dell"],
    phone: "+94 77 012 3456", avgResponseMinutes: 30, emergencyAvailable: false,
    vehicleType: "car", serviceZoneNames: ["Colombo 10–11", "Maradana", "Pettah"],
  },
  {
    technicianId: "T005", name: "Chaminda Bandara", partnerId: "P005", partnerName: "SmartFix Pvt Ltd",
    rating: 4.9, jobsCompleted: 412, verifiedSince: "2023-09-12",
    specializations: ["SOLAR", "SMART_HOME_OFFICE"], eta: "22 mins",
    currentZoneId: "battaramulla", availabilityStatus: "available", activeJobsCount: 1,
    currentLat: 6.9015, currentLng: 79.9185,
    baseLat: 6.9000, baseLng: 79.9170,
    experienceYears: 9, brandSpecializations: ["JA Solar", "Jinko", "LONGi", "Huawei Inverters"],
    phone: "+94 71 345 6789", avgResponseMinutes: 20, emergencyAvailable: false,
    vehicleType: "van", serviceZoneNames: ["Battaramulla", "Kotte", "Thalawathugoda", "Malabe"],
  },
  {
    technicianId: "T006", name: "Saman Kumara", partnerId: "P001", partnerName: "ColomboTech Solutions",
    rating: 4.5, jobsCompleted: 156, verifiedSince: "2024-07-01",
    specializations: ["AC", "CONSUMER_ELEC"], eta: "40 mins",
    currentZoneId: "maharagama", availabilityStatus: "available", activeJobsCount: 0,
    currentLat: 6.8495, currentLng: 79.9255,
    baseLat: 6.8480, baseLng: 79.9240,
    experienceYears: 3, brandSpecializations: ["Midea", "Hisense", "Singer", "Abans"],
    phone: "+94 76 567 8901", avgResponseMinutes: 35, emergencyAvailable: true,
    vehicleType: "motorcycle", serviceZoneNames: ["Maharagama", "Nugegoda", "Boralesgamuwa"],
  },
  {
    technicianId: "T007", name: "Priyantha de Silva", partnerId: "P003", partnerName: "QuickFix Colombo",
    rating: 4.8, jobsCompleted: 289, verifiedSince: "2024-02-14",
    specializations: ["COPIER", "PRINT_SUPPLIES", "IT"], eta: "20 mins",
    currentZoneId: "col_03", availabilityStatus: "available", activeJobsCount: 1,
    currentLat: 6.9125, currentLng: 79.8525,
    baseLat: 6.9110, baseLng: 79.8510,
    experienceYears: 7, brandSpecializations: ["Ricoh", "Kyocera", "Canon", "Brother", "HP"],
    phone: "+94 77 678 9012", avgResponseMinutes: 18, emergencyAvailable: false,
    vehicleType: "car", serviceZoneNames: ["Colombo 1–3", "Kollupitiya", "Fort"],
  },
  {
    technicianId: "T008", name: "Nuwan Wickrama", partnerId: "P005", partnerName: "SmartFix Pvt Ltd",
    rating: 4.7, jobsCompleted: 198, verifiedSince: "2024-04-20",
    specializations: ["CCTV", "SMART_HOME_OFFICE", "SOLAR"], eta: "28 mins",
    currentZoneId: "kotte", availabilityStatus: "available", activeJobsCount: 1,
    currentLat: 6.8895, currentLng: 79.9025,
    baseLat: 6.8880, baseLng: 79.9010,
    experienceYears: 5, brandSpecializations: ["Hikvision", "Dahua", "TP-Link", "Google Nest"],
    phone: "+94 71 789 0123", avgResponseMinutes: 24, emergencyAvailable: true,
    vehicleType: "car", serviceZoneNames: ["Kotte", "Rajagiriya", "Nawala", "Battaramulla"],
  },
];

export function getPartnerById(id: string): Partner | undefined {
  return MOCK_PARTNERS.find((p) => p.id === id);
}

export function getTechniciansByPartner(partnerId: string): TechnicianProfile[] {
  return MOCK_TECHNICIANS.filter((t) => t.partnerId === partnerId);
}

export function getTechnicianById(id: string): TechnicianProfile | undefined {
  return MOCK_TECHNICIANS.find((t) => t.technicianId === id);
}

/** Simulate GPS drift for live feel — small random offset */
export function simulateGpsDrift(lat: number, lng: number): { lat: number; lng: number } {
  const drift = () => (Math.random() - 0.5) * 0.0008; // ~40m drift
  return { lat: lat + drift(), lng: lng + drift() };
}
