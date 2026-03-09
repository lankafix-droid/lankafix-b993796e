export interface SMEPackage {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  features: string[];
  pricingModel: "one_time" | "monthly" | "annual";
  pricingLabel: string;
  fromPriceLKR: number;
  /** Optional upper range */
  toPriceLKR?: number;
  popular?: boolean;
  /** Related category codes for booking */
  categoryCodes: string[];
  /** What the customer gets */
  deliverables: string[];
  /** SLA / guarantees */
  sla: string[];
}

export const SME_PACKAGES: SMEPackage[] = [
  {
    id: "office-network",
    name: "Office Network Setup",
    tagline: "Reliable connectivity for your business",
    description:
      "Complete office networking — from structured cabling and router configuration to WiFi optimization. Designed for offices with 5–50 workstations.",
    icon: "Network",
    features: [
      "Structured LAN cabling",
      "Router & switch configuration",
      "WiFi coverage optimization",
      "Network security setup",
      "VPN configuration",
      "Network documentation",
    ],
    pricingModel: "one_time",
    pricingLabel: "From",
    fromPriceLKR: 15000,
    toPriceLKR: 75000,
    categoryCodes: ["NETWORK", "IT"],
    deliverables: [
      "Network topology diagram",
      "Cable labeling & documentation",
      "Speed test report",
      "Admin credentials handover",
    ],
    sla: [
      "Site survey within 48 hours",
      "Installation within 5 business days",
      "30-day post-install support",
    ],
    popular: true,
  },
  {
    id: "pos-installation",
    name: "POS System Installation",
    tagline: "Point-of-sale ready in a day",
    description:
      "End-to-end POS system setup — hardware installation, software configuration, receipt printer setup, and staff training for retail shops and restaurants.",
    icon: "Monitor",
    features: [
      "POS terminal setup",
      "Receipt printer installation",
      "Cash drawer configuration",
      "Barcode scanner setup",
      "Software installation & config",
      "Staff training session",
    ],
    pricingModel: "one_time",
    pricingLabel: "From",
    fromPriceLKR: 8000,
    toPriceLKR: 25000,
    categoryCodes: ["IT"],
    deliverables: [
      "Fully configured POS system",
      "Test transactions completed",
      "Staff training (up to 3 people)",
      "Troubleshooting guide",
    ],
    sla: [
      "Setup within 3 business days",
      "7-day adjustment support",
      "Remote support for 30 days",
    ],
  },
  {
    id: "cctv-maintenance",
    name: "CCTV Maintenance Contract",
    tagline: "Keep your security systems reliable",
    description:
      "Annual maintenance contract for CCTV systems — scheduled inspections, camera cleaning, DVR/NVR health checks, and priority emergency support.",
    icon: "Camera",
    features: [
      "Quarterly preventive inspections",
      "Camera lens & housing cleaning",
      "DVR/NVR health check & backup",
      "Cable & connector inspection",
      "Night vision calibration",
      "Priority emergency response",
    ],
    pricingModel: "annual",
    pricingLabel: "Per year from",
    fromPriceLKR: 18000,
    toPriceLKR: 48000,
    categoryCodes: ["CCTV"],
    deliverables: [
      "4 scheduled maintenance visits",
      "Health report after each visit",
      "Footage backup verification",
      "Priority dispatch (< 4 hours)",
    ],
    sla: [
      "Emergency response within 4 hours",
      "Scheduled visits on your preferred day",
      "Annual system health report",
    ],
    popular: true,
  },
  {
    id: "printer-fleet",
    name: "Printer Fleet Management",
    tagline: "Zero downtime printing for your office",
    description:
      "Managed printing services — toner/ink management, preventive maintenance, usage monitoring, and rapid repair response for offices with 3+ printers.",
    icon: "Printer",
    features: [
      "Toner & ink level monitoring",
      "Preventive maintenance schedule",
      "Rapid repair response",
      "Usage & cost reporting",
      "Network printing optimization",
      "Supplies procurement support",
    ],
    pricingModel: "monthly",
    pricingLabel: "Per month from",
    fromPriceLKR: 5000,
    toPriceLKR: 15000,
    categoryCodes: ["COPIER", "PRINT_SUPPLIES"],
    deliverables: [
      "Monthly maintenance visit",
      "Usage analytics dashboard",
      "Supplies ordered before depletion",
      "Same-day repair for critical issues",
    ],
    sla: [
      "Critical repair within 4 hours",
      "Monthly preventive maintenance",
      "Quarterly usage report",
    ],
  },
  {
    id: "it-support-subscription",
    name: "IT Support Subscription",
    tagline: "Your outsourced IT department",
    description:
      "Dedicated IT support for small businesses — remote helpdesk, on-site visits, workstation maintenance, software updates, and security monitoring.",
    icon: "Headset",
    features: [
      "Remote helpdesk (Mon–Sat)",
      "Monthly on-site visit",
      "Workstation health checks",
      "Software updates & patches",
      "Antivirus & security monitoring",
      "Data backup verification",
    ],
    pricingModel: "monthly",
    pricingLabel: "Per month from",
    fromPriceLKR: 12000,
    toPriceLKR: 35000,
    categoryCodes: ["IT", "NETWORK"],
    deliverables: [
      "Unlimited remote support tickets",
      "1 scheduled on-site visit/month",
      "Monthly IT health report",
      "Priority dispatch for emergencies",
    ],
    sla: [
      "Remote response within 1 hour",
      "On-site response within 4 hours",
      "99% system uptime target",
    ],
    popular: true,
  },
];

export function getSMEPackageById(id: string): SMEPackage | undefined {
  return SME_PACKAGES.find((p) => p.id === id);
}
