import type { CategoryCode } from "@/types/booking";

export interface BundleService {
  categoryCode: CategoryCode;
  serviceCode: string;
  label: string;
  individualPriceLKR: number;
}

export interface ServiceBundle {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  targetAudience: "home" | "office" | "both";
  services: BundleService[];
  /** Total if purchased individually */
  totalIndividualPriceLKR: number;
  /** Discounted bundle price */
  bundlePriceLKR: number;
  /** Savings percentage */
  savingsPercent: number;
  /** Estimated total duration in hours */
  estimatedHours: number;
  /** What's included beyond base services */
  bonuses: string[];
  /** Trust features */
  guarantees: string[];
  popular?: boolean;
}

export const SERVICE_BUNDLES: ServiceBundle[] = [
  {
    id: "home-tech-setup",
    name: "Home Tech Setup",
    tagline: "Complete smart home in one visit",
    description:
      "Get your home fully connected and secure with WiFi, CCTV, a smart doorbell, and optimized network — all set up by verified LankaFix technicians in a single coordinated visit.",
    icon: "Home",
    targetAudience: "home",
    services: [
      {
        categoryCode: "NETWORK",
        serviceCode: "wifi_setup",
        label: "WiFi Router Setup & Optimization",
        individualPriceLKR: 2000,
      },
      {
        categoryCode: "CCTV",
        serviceCode: "cctv_install",
        label: "2-Camera CCTV Installation",
        individualPriceLKR: 12000,
      },
      {
        categoryCode: "HOME_SECURITY",
        serviceCode: "video_doorbell",
        label: "Video Doorbell Installation",
        individualPriceLKR: 5000,
      },
      {
        categoryCode: "NETWORK",
        serviceCode: "speed_optimization",
        label: "Network Speed Optimization",
        individualPriceLKR: 2000,
      },
    ],
    totalIndividualPriceLKR: 21000,
    bundlePriceLKR: 16500,
    savingsPercent: 21,
    estimatedHours: 4,
    bonuses: [
      "Single coordinated visit — no multiple appointments",
      "Free network cable routing (up to 20m)",
      "30-day post-install support",
    ],
    guarantees: [
      "Verified & background-checked technicians",
      "90-day workmanship warranty",
      "LankaFix dispute protection",
    ],
    popular: true,
  },
  {
    id: "office-setup",
    name: "Office Setup",
    tagline: "Business-ready infrastructure in a day",
    description:
      "Set up your office with professional networking, security cameras, printer integration, and workstation configuration — managed end-to-end by LankaFix's certified team.",
    icon: "Building2",
    targetAudience: "office",
    services: [
      {
        categoryCode: "NETWORK",
        serviceCode: "office_lan",
        label: "Office LAN & Network Setup",
        individualPriceLKR: 8000,
      },
      {
        categoryCode: "CCTV",
        serviceCode: "cctv_install",
        label: "4-Camera CCTV System",
        individualPriceLKR: 22000,
      },
      {
        categoryCode: "COPIER",
        serviceCode: "printer_setup",
        label: "Printer & Network Printing Setup",
        individualPriceLKR: 3000,
      },
      {
        categoryCode: "IT",
        serviceCode: "workstation_setup",
        label: "Workstation Configuration (up to 5 PCs)",
        individualPriceLKR: 7500,
      },
    ],
    totalIndividualPriceLKR: 40500,
    bundlePriceLKR: 32000,
    savingsPercent: 21,
    estimatedHours: 6,
    bonuses: [
      "Dedicated project coordinator",
      "Free structured cabling (up to 30m)",
      "60-day post-install support",
      "Network topology documentation included",
    ],
    guarantees: [
      "Certified network & IT technicians",
      "90-day workmanship warranty",
      "LankaFix dispute protection",
      "Same-day response for follow-ups",
    ],
  },
];

export function getBundleById(id: string): ServiceBundle | undefined {
  return SERVICE_BUNDLES.find((b) => b.id === id);
}

export function getBundleSavingsLKR(bundle: ServiceBundle): number {
  return bundle.totalIndividualPriceLKR - bundle.bundlePriceLKR;
}
