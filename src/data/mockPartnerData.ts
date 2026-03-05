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
    responseSlaByCategory: { SOLAR: 240, SMART_HOME_OFFICE: 120 },
  },
];

export const MOCK_TECHNICIANS: TechnicianInfo[] = [
  { technicianId: "T001", name: "Kasun Perera", partnerId: "P001", partnerName: "ColomboTech Solutions", rating: 4.8, jobsCompleted: 342, verifiedSince: "2024-01-15", specializations: ["AC", "CONSUMER_ELEC"], eta: "25 mins", currentZoneId: "col_07", availabilityStatus: "available", activeJobsCount: 1 },
  { technicianId: "T002", name: "Nadeesha Silva", partnerId: "P002", partnerName: "Lanka Service Pro", rating: 4.9, jobsCompleted: 567, verifiedSince: "2023-06-20", specializations: ["CCTV", "SMART_HOME_OFFICE", "IT"], eta: "18 mins", currentZoneId: "rajagiriya", availabilityStatus: "available", activeJobsCount: 0 },
  { technicianId: "T003", name: "Ruwan Fernando", partnerId: "P003", partnerName: "QuickFix Colombo", rating: 4.7, jobsCompleted: 218, verifiedSince: "2024-03-10", specializations: ["MOBILE", "CONSUMER_ELEC", "COPIER"], eta: "30 mins", currentZoneId: "nugegoda", availabilityStatus: "available", activeJobsCount: 2 },
  { technicianId: "T004", name: "Dinesh Jayawardena", partnerId: "P003", partnerName: "QuickFix Colombo", rating: 4.6, jobsCompleted: 189, verifiedSince: "2024-05-01", specializations: ["IT", "COPIER", "PRINT_SUPPLIES"], eta: "35 mins", currentZoneId: "col_10", availabilityStatus: "busy", activeJobsCount: 3 },
  { technicianId: "T005", name: "Chaminda Bandara", partnerId: "P005", partnerName: "SmartFix Pvt Ltd", rating: 4.9, jobsCompleted: 412, verifiedSince: "2023-09-12", specializations: ["SOLAR", "SMART_HOME_OFFICE"], eta: "22 mins", currentZoneId: "battaramulla", availabilityStatus: "available", activeJobsCount: 1 },
  { technicianId: "T006", name: "Saman Kumara", partnerId: "P001", partnerName: "ColomboTech Solutions", rating: 4.5, jobsCompleted: 156, verifiedSince: "2024-07-01", specializations: ["AC", "CONSUMER_ELEC"], eta: "40 mins", currentZoneId: "maharagama", availabilityStatus: "available", activeJobsCount: 0 },
  { technicianId: "T007", name: "Priyantha de Silva", partnerId: "P003", partnerName: "QuickFix Colombo", rating: 4.8, jobsCompleted: 289, verifiedSince: "2024-02-14", specializations: ["COPIER", "PRINT_SUPPLIES", "IT"], eta: "20 mins", currentZoneId: "col_03", availabilityStatus: "available", activeJobsCount: 1 },
  { technicianId: "T008", name: "Nuwan Wickrama", partnerId: "P005", partnerName: "SmartFix Pvt Ltd", rating: 4.7, jobsCompleted: 198, verifiedSince: "2024-04-20", specializations: ["CCTV", "SMART_HOME_OFFICE", "SOLAR"], eta: "28 mins", currentZoneId: "kotte", availabilityStatus: "available", activeJobsCount: 1 },
];

export function getPartnerById(id: string): Partner | undefined {
  return MOCK_PARTNERS.find((p) => p.id === id);
}

export function getTechniciansByPartner(partnerId: string): TechnicianInfo[] {
  return MOCK_TECHNICIANS.filter((t) => t.partnerId === partnerId);
}

export function getTechnicianById(id: string): TechnicianInfo | undefined {
  return MOCK_TECHNICIANS.find((t) => t.technicianId === id);
}
