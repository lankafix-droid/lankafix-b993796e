/**
 * LankaFix — Provider Onboarding Store (Production-safe)
 */
import { create } from "zustand";
import type { CategoryCode } from "@/types/booking";

// ─── Types ───────────────────────────────────────────────────────────

export type ProviderType = "individual" | "small_business" | "registered_company" | "authorized_partner";

export type OnboardingStep =
  | "provider_type"
  | "basic_profile"
  | "service_categories"
  | "service_area"
  | "experience"
  | "documents"
  | "tools"
  | "availability"
  | "bank_account"
  | "review";

export type VerificationState = "pending" | "under_review" | "verified" | "rejected";

export type ProviderTierLevel = "verified" | "pro" | "elite" | "enterprise";

export interface OnboardingProfile {
  providerType: ProviderType | null;
  fullName: string;
  businessName: string;
  mobileNumber: string;
  email: string;
  nicNumber: string;
  profilePhotoUrl: string;
  serviceCategories: CategoryCode[];
  serviceZones: string[];
  yearsOfExperience: number;
  previousCompany: string;
  specializations: string[];
  documents: UploadedDocument[];
  tools: string[];
  availabilityDays: string[];
  availabilityStart: string;
  availabilityEnd: string;
  emergencyAvailable: boolean;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  branch: string;
}

export interface UploadedDocument {
  type: "nic" | "business_registration" | "professional_cert" | "police_clearance";
  fileName: string;
  uploadedAt: string;
  fileUrl?: string; // Real storage URL
}

export interface ProviderApplication {
  id: string;
  profile: OnboardingProfile;
  status: VerificationState;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  tier: ProviderTierLevel;
}

// ─── Constants ───────────────────────────────────────────────────────

export const PROVIDER_TYPE_OPTIONS: { value: ProviderType; label: string; description: string }[] = [
  { value: "individual", label: "Individual Technician", description: "Freelance technician working independently" },
  { value: "small_business", label: "Small Service Business", description: "Small team with 2–10 technicians" },
  { value: "registered_company", label: "Registered Company", description: "Formally registered service company" },
  { value: "authorized_partner", label: "Authorized Brand Partner", description: "Official brand-authorized service center" },
];

export const ONBOARDING_STEPS: { key: OnboardingStep; label: string; icon: string }[] = [
  { key: "provider_type", label: "Provider Type", icon: "Building2" },
  { key: "basic_profile", label: "Basic Profile", icon: "User" },
  { key: "service_categories", label: "Services", icon: "Wrench" },
  { key: "service_area", label: "Service Area", icon: "MapPin" },
  { key: "experience", label: "Experience", icon: "Award" },
  { key: "documents", label: "Documents", icon: "FileCheck" },
  { key: "tools", label: "Tools", icon: "Hammer" },
  { key: "availability", label: "Availability", icon: "Clock" },
  { key: "bank_account", label: "Bank Account", icon: "Landmark" },
  { key: "review", label: "Review", icon: "CheckCircle" },
];

export const DOCUMENT_TYPES: { value: UploadedDocument["type"]; label: string; required: boolean }[] = [
  { value: "nic", label: "National Identity Card (NIC)", required: true },
  { value: "business_registration", label: "Business Registration", required: false },
  { value: "professional_cert", label: "Professional Certification", required: false },
  { value: "police_clearance", label: "Police Clearance Certificate", required: false },
];

export const TOOL_OPTIONS: Record<string, string[]> = {
  AC: ["AC vacuum pump", "AC gas cylinder", "Manifold gauge set", "Pipe cutter & flaring tool", "Leak detector"],
  CCTV: ["CCTV cable tester", "Crimping tools", "Drill & ladder", "PoE tester", "Monitor for testing"],
  MOBILE: ["Screwdriver precision set", "Heat gun", "Soldering station", "Multimeter", "Screen separator"],
  IT: ["Laptop diagnostic tools", "USB bootable drives", "Network cable tester", "External HDD dock", "Thermal paste"],
  COPIER: ["Printer servicing kit", "Toner vacuum", "Roller cleaning tools", "Firmware flasher"],
  SOLAR: ["Solar panel tester", "Clamp meter", "Inverter diagnostic tool", "MC4 connector kit", "Multimeter"],
  SMART_HOME_OFFICE: ["Network analyzer", "Smart device tester", "Wiring tools", "WiFi signal meter"],
  CONSUMER_ELEC: ["Multimeter", "Soldering station", "Oscilloscope", "Power supply tester"],
};

export const SPECIALIZATION_OPTIONS: Record<string, string[]> = {
  AC: ["Inverter AC Repairs", "AC Gas Refilling", "Central AC Systems", "VRF Systems", "Cassette AC Installation"],
  CCTV: ["IP Camera Systems", "Analog CCTV", "Access Control", "Video Analytics", "Remote Monitoring Setup"],
  MOBILE: ["iPhone Repairs", "Samsung Repairs", "Motherboard Repair", "Data Recovery", "Water Damage Repair"],
  IT: ["Server Administration", "Network Setup", "Data Recovery", "Virus Removal", "Hardware Diagnostics"],
  COPIER: ["Laser Printer Repair", "Inkjet Repair", "Copier Maintenance", "Motherboard Repair", "Firmware Updates"],
  SOLAR: ["PV Installation", "Inverter Repair", "Battery Systems", "Net Metering Setup", "System Expansion"],
  SMART_HOME_OFFICE: ["Home Automation", "Smart Lighting", "Security Integration", "Voice Assistant Setup"],
  CONSUMER_ELEC: ["TV Repair", "Audio Systems", "Gaming Console Repair", "Home Appliance Repair"],
};

export const TIER_CONFIG: Record<ProviderTierLevel, { label: string; color: string; minJobs: number; minRating: number }> = {
  verified: { label: "Verified", color: "bg-primary/10 text-primary", minJobs: 0, minRating: 0 },
  pro: { label: "Pro", color: "bg-success/10 text-success", minJobs: 50, minRating: 4.2 },
  elite: { label: "Elite", color: "bg-warning/10 text-warning", minJobs: 200, minRating: 4.6 },
  enterprise: { label: "Enterprise Partner", color: "bg-purple-100 text-purple-700", minJobs: 500, minRating: 4.8 },
};

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const BANKS = [
  "Bank of Ceylon", "People's Bank", "Commercial Bank", "Hatton National Bank",
  "Sampath Bank", "Seylan Bank", "DFCC Bank", "NDB Bank", "Nations Trust Bank",
  "Pan Asia Banking Corporation", "Union Bank", "Amana Bank",
];

// ─── Store ───────────────────────────────────────────────────────────

const emptyProfile: OnboardingProfile = {
  providerType: null,
  fullName: "",
  businessName: "",
  mobileNumber: "",
  email: "",
  nicNumber: "",
  profilePhotoUrl: "",
  serviceCategories: [],
  serviceZones: [],
  yearsOfExperience: 0,
  previousCompany: "",
  specializations: [],
  documents: [],
  tools: [],
  availabilityDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  availabilityStart: "08:00",
  availabilityEnd: "19:00",
  emergencyAvailable: false,
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  branch: "",
};

interface ProviderOnboardingState {
  currentStep: number;
  profile: OnboardingProfile;
  applications: ProviderApplication[];
  trainingCompleted: boolean;
  conductAccepted: boolean;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateProfile: (patch: Partial<OnboardingProfile>) => void;
  toggleCategory: (cat: CategoryCode) => void;
  toggleZone: (zone: string) => void;
  toggleDay: (day: string) => void;
  toggleTool: (tool: string) => void;
  toggleSpecialization: (spec: string) => void;
  addDocument: (doc: UploadedDocument) => void;
  removeDocument: (type: UploadedDocument["type"]) => void;
  submitApplication: () => void;
  acceptConduct: () => void;
  completeTraining: () => void;
  reset: () => void;
}

export const useProviderOnboardingStore = create<ProviderOnboardingState>((set, get) => ({
  currentStep: 0,
  profile: { ...emptyProfile },
  applications: [],
  trainingCompleted: false,
  conductAccepted: false,

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, ONBOARDING_STEPS.length - 1) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),

  updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

  toggleCategory: (cat) =>
    set((s) => {
      const cats = s.profile.serviceCategories.includes(cat)
        ? s.profile.serviceCategories.filter((c) => c !== cat)
        : [...s.profile.serviceCategories, cat];
      return { profile: { ...s.profile, serviceCategories: cats } };
    }),

  toggleZone: (zone) =>
    set((s) => {
      const zones = s.profile.serviceZones.includes(zone)
        ? s.profile.serviceZones.filter((z) => z !== zone)
        : [...s.profile.serviceZones, zone];
      return { profile: { ...s.profile, serviceZones: zones } };
    }),

  toggleDay: (day) =>
    set((s) => {
      const days = s.profile.availabilityDays.includes(day)
        ? s.profile.availabilityDays.filter((d) => d !== day)
        : [...s.profile.availabilityDays, day];
      return { profile: { ...s.profile, availabilityDays: days } };
    }),

  toggleTool: (tool) =>
    set((s) => {
      const tools = s.profile.tools.includes(tool)
        ? s.profile.tools.filter((t) => t !== tool)
        : [...s.profile.tools, tool];
      return { profile: { ...s.profile, tools: tools } };
    }),

  toggleSpecialization: (spec) =>
    set((s) => {
      const specs = s.profile.specializations.includes(spec)
        ? s.profile.specializations.filter((sp) => sp !== spec)
        : [...s.profile.specializations, spec];
      return { profile: { ...s.profile, specializations: specs } };
    }),

  addDocument: (doc) =>
    set((s) => ({
      profile: {
        ...s.profile,
        documents: [...s.profile.documents.filter((d) => d.type !== doc.type), doc],
      },
    })),

  removeDocument: (type) =>
    set((s) => ({
      profile: { ...s.profile, documents: s.profile.documents.filter((d) => d.type !== type) },
    })),

  submitApplication: () => {
    const { profile } = get();
    const app: ProviderApplication = {
      id: `APP-${Date.now().toString(36).toUpperCase()}`,
      profile: { ...profile },
      status: "pending",
      submittedAt: new Date().toISOString(),
      tier: "verified",
    };
    set((s) => ({ applications: [...s.applications, app] }));
  },

  acceptConduct: () => set({ conductAccepted: true }),
  completeTraining: () => set({ trainingCompleted: true }),
  reset: () => set({ currentStep: 0, profile: { ...emptyProfile }, trainingCompleted: false, conductAccepted: false }),
}));
