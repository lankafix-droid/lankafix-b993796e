export interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  tag: string;
  fromPrice: number;
  quoteRequired: boolean;
  services: Service[];
}

export interface Service {
  id: string;
  code: string;
  name: string;
  description: string;
  allowedModes: string[];
  requiresQuote: boolean;
  requiresDiagnostic: boolean;
  fromPrice: number;
  precheckQuestions: PrecheckQuestion[];
}

export interface PrecheckQuestion {
  key: string;
  question: string;
  inputType: "boolean" | "single_select" | "text" | "photo_optional";
  options?: { label: string; value: string }[];
  required: boolean;
}

export const categories: Category[] = [
  {
    id: "cat-ac",
    code: "AC",
    name: "AC Services",
    description: "Gas top-up • Installation • Repairs • Servicing",
    icon: "Snowflake",
    tag: "Most Popular",
    fromPrice: 2500,
    quoteRequired: false,
    services: [
      {
        id: "svc-ac-gas",
        code: "AC_GAS_TOPUP",
        name: "AC Gas Top-Up",
        description: "Refrigerant recharge for split & window units",
        allowedModes: ["on_site"],
        requiresQuote: false,
        requiresDiagnostic: false,
        fromPrice: 3500,
        precheckQuestions: [
          { key: "outdoor_accessible", question: "Is the outdoor unit accessible?", inputType: "boolean", required: true },
          { key: "high_rise", question: "Is the unit in a high-rise building (above 3rd floor)?", inputType: "boolean", required: true },
          { key: "unit_type", question: "What type of AC unit?", inputType: "single_select", options: [{ label: "Inverter Split", value: "inverter" }, { label: "Non-Inverter Split", value: "non_inverter" }, { label: "Window Unit", value: "window" }, { label: "Cassette", value: "cassette" }], required: true },
          { key: "last_service", question: "When was the last service?", inputType: "single_select", options: [{ label: "Less than 6 months", value: "<6m" }, { label: "6-12 months", value: "6-12m" }, { label: "Over a year", value: ">1y" }, { label: "Never / Don't know", value: "unknown" }], required: false },
        ],
      },
      {
        id: "svc-ac-install",
        code: "AC_INSTALL",
        name: "AC Installation",
        description: "Full installation with piping and wiring",
        allowedModes: ["on_site"],
        requiresQuote: true,
        requiresDiagnostic: false,
        fromPrice: 8000,
        precheckQuestions: [
          { key: "btu", question: "AC capacity (BTU)?", inputType: "single_select", options: [{ label: "9,000 BTU", value: "9000" }, { label: "12,000 BTU", value: "12000" }, { label: "18,000 BTU", value: "18000" }, { label: "24,000 BTU", value: "24000" }], required: true },
          { key: "piping_length", question: "Estimated piping distance (meters)?", inputType: "single_select", options: [{ label: "Under 3m", value: "<3" }, { label: "3-5m", value: "3-5" }, { label: "5-10m", value: "5-10" }, { label: "Over 10m", value: ">10" }], required: true },
        ],
      },
      {
        id: "svc-ac-service",
        code: "AC_SERVICE",
        name: "AC General Service",
        description: "Filter cleaning, gas check, performance test",
        allowedModes: ["on_site"],
        requiresQuote: false,
        requiresDiagnostic: false,
        fromPrice: 2500,
        precheckQuestions: [
          { key: "units_count", question: "Number of AC units?", inputType: "single_select", options: [{ label: "1 unit", value: "1" }, { label: "2 units", value: "2" }, { label: "3+ units", value: "3+" }], required: true },
        ],
      },
    ],
  },
  {
    id: "cat-cctv",
    code: "CCTV",
    name: "CCTV Solutions",
    description: "Installation • Configuration • Repairs • Upgrades",
    icon: "Camera",
    tag: "Quote Required",
    fromPrice: 5000,
    quoteRequired: true,
    services: [
      {
        id: "svc-cctv-install",
        code: "CCTV_INSTALL",
        name: "CCTV Installation",
        description: "Full camera system setup with DVR/NVR",
        allowedModes: ["on_site"],
        requiresQuote: true,
        requiresDiagnostic: false,
        fromPrice: 15000,
        precheckQuestions: [
          { key: "camera_count", question: "Number of cameras needed?", inputType: "single_select", options: [{ label: "2 cameras", value: "2" }, { label: "4 cameras", value: "4" }, { label: "8 cameras", value: "8" }, { label: "16+ cameras", value: "16+" }], required: true },
          { key: "property_type", question: "Property type?", inputType: "single_select", options: [{ label: "Residential", value: "residential" }, { label: "Commercial", value: "commercial" }, { label: "Industrial", value: "industrial" }], required: true },
        ],
      },
      {
        id: "svc-cctv-repair",
        code: "CCTV_REPAIR",
        name: "CCTV Repair & Troubleshoot",
        description: "Fix offline cameras, DVR issues, wiring",
        allowedModes: ["on_site"],
        requiresQuote: false,
        requiresDiagnostic: true,
        fromPrice: 3000,
        precheckQuestions: [
          { key: "issue_type", question: "What's the issue?", inputType: "single_select", options: [{ label: "Camera offline", value: "offline" }, { label: "No recording", value: "no_recording" }, { label: "Blurry image", value: "blurry" }, { label: "DVR/NVR issue", value: "dvr" }], required: true },
        ],
      },
    ],
  },
  {
    id: "cat-mobile",
    code: "MOBILE",
    name: "Mobile Repairs",
    description: "Screen • Battery • Charging • Software",
    icon: "Smartphone",
    tag: "Same Day",
    fromPrice: 1500,
    quoteRequired: false,
    services: [
      {
        id: "svc-mob-screen",
        code: "MOBILE_SCREEN",
        name: "Screen Replacement",
        description: "LCD/OLED screen replacement with warranty",
        allowedModes: ["drop_off", "on_site"],
        requiresQuote: false,
        requiresDiagnostic: false,
        fromPrice: 3500,
        precheckQuestions: [
          { key: "brand", question: "Phone brand?", inputType: "single_select", options: [{ label: "Apple", value: "apple" }, { label: "Samsung", value: "samsung" }, { label: "Huawei", value: "huawei" }, { label: "Other", value: "other" }], required: true },
          { key: "display_visible", question: "Is the display still visible?", inputType: "boolean", required: true },
          { key: "touch_working", question: "Is touch still working?", inputType: "boolean", required: true },
        ],
      },
      {
        id: "svc-mob-battery",
        code: "MOBILE_BATTERY",
        name: "Battery Replacement",
        description: "Genuine/compatible battery swap",
        allowedModes: ["drop_off", "on_site"],
        requiresQuote: false,
        requiresDiagnostic: false,
        fromPrice: 1500,
        precheckQuestions: [
          { key: "brand", question: "Phone brand?", inputType: "single_select", options: [{ label: "Apple", value: "apple" }, { label: "Samsung", value: "samsung" }, { label: "Huawei", value: "huawei" }, { label: "Other", value: "other" }], required: true },
        ],
      },
    ],
  },
  {
    id: "cat-it",
    code: "IT",
    name: "IT Support",
    description: "Networking • PC Repair • Setup • Remote",
    icon: "Monitor",
    tag: "Remote Available",
    fromPrice: 2000,
    quoteRequired: false,
    services: [
      {
        id: "svc-it-network",
        code: "IT_NETWORK",
        name: "Network Setup & Troubleshoot",
        description: "WiFi, router, LAN, connectivity issues",
        allowedModes: ["on_site", "remote"],
        requiresQuote: false,
        requiresDiagnostic: false,
        fromPrice: 3000,
        precheckQuestions: [
          { key: "issue", question: "What's the issue?", inputType: "single_select", options: [{ label: "No internet", value: "no_internet" }, { label: "Slow speeds", value: "slow" }, { label: "New setup", value: "new_setup" }, { label: "WiFi coverage", value: "coverage" }], required: true },
        ],
      },
      {
        id: "svc-it-pc",
        code: "IT_PC_REPAIR",
        name: "PC / Laptop Repair",
        description: "Hardware & software troubleshooting",
        allowedModes: ["on_site", "drop_off"],
        requiresQuote: false,
        requiresDiagnostic: true,
        fromPrice: 2000,
        precheckQuestions: [
          { key: "device_type", question: "Device type?", inputType: "single_select", options: [{ label: "Desktop", value: "desktop" }, { label: "Laptop", value: "laptop" }], required: true },
          { key: "boots", question: "Does the device turn on?", inputType: "boolean", required: true },
        ],
      },
    ],
  },
  {
    id: "cat-solar",
    code: "SOLAR",
    name: "Solar Solutions",
    description: "Installation • Maintenance • Net Metering",
    icon: "Sun",
    tag: "Quote Required",
    fromPrice: 50000,
    quoteRequired: true,
    services: [
      {
        id: "svc-solar-install",
        code: "SOLAR_INSTALL",
        name: "Solar Panel Installation",
        description: "Full rooftop solar system with net metering",
        allowedModes: ["on_site"],
        requiresQuote: true,
        requiresDiagnostic: false,
        fromPrice: 350000,
        precheckQuestions: [
          { key: "bill_range", question: "Monthly electricity bill?", inputType: "single_select", options: [{ label: "Under LKR 10,000", value: "<10000" }, { label: "LKR 10,000-20,000", value: "10000-20000" }, { label: "LKR 20,000-40,000", value: "20000-40000" }, { label: "Over LKR 40,000", value: ">40000" }], required: true },
          { key: "roof_type", question: "Roof type?", inputType: "single_select", options: [{ label: "Tile", value: "tile" }, { label: "Flat concrete", value: "flat" }, { label: "Metal sheet", value: "metal" }], required: true },
          { key: "shading", question: "Any shading on the roof?", inputType: "single_select", options: [{ label: "No shading", value: "none" }, { label: "Partial", value: "partial" }, { label: "Heavy", value: "heavy" }], required: true },
        ],
      },
    ],
  },
  {
    id: "cat-elec",
    code: "CONSUMER_ELEC",
    name: "Consumer Electronics",
    description: "TV • Washing Machine • Fridge • Appliances",
    icon: "Tv",
    tag: "Diagnostic First",
    fromPrice: 2000,
    quoteRequired: false,
    services: [
      {
        id: "svc-elec-tv",
        code: "ELEC_TV",
        name: "TV Repair",
        description: "LED, OLED, Smart TV diagnosis & repair",
        allowedModes: ["on_site", "pickup_return"],
        requiresQuote: false,
        requiresDiagnostic: true,
        fromPrice: 2500,
        precheckQuestions: [
          { key: "tv_type", question: "TV type?", inputType: "single_select", options: [{ label: "LED/LCD", value: "led" }, { label: "OLED", value: "oled" }, { label: "Smart TV", value: "smart" }], required: true },
          { key: "issue", question: "Main issue?", inputType: "single_select", options: [{ label: "No display", value: "no_display" }, { label: "No sound", value: "no_sound" }, { label: "Won't turn on", value: "no_power" }, { label: "Software issue", value: "software" }], required: true },
        ],
      },
    ],
  },
  {
    id: "cat-smart",
    code: "SMART_HOME_OFFICE",
    name: "Smart Home & Office",
    description: "Automation • Security • AV • Smart Locks",
    icon: "Home",
    tag: "Quote Required",
    fromPrice: 5000,
    quoteRequired: true,
    services: [
      {
        id: "svc-smart-auto",
        code: "SMART_AUTOMATION",
        name: "Smart Home Automation",
        description: "Lighting, curtain, climate automation setup",
        allowedModes: ["on_site"],
        requiresQuote: true,
        requiresDiagnostic: false,
        fromPrice: 15000,
        precheckQuestions: [
          { key: "scope", question: "Automation scope?", inputType: "single_select", options: [{ label: "Single room", value: "single_room" }, { label: "Whole house", value: "whole_house" }, { label: "Office", value: "office" }], required: true },
          { key: "existing_system", question: "Have an existing smart system?", inputType: "boolean", required: true },
        ],
      },
    ],
  },
];

export const serviceModeLabels: Record<string, string> = {
  on_site: "On-Site",
  drop_off: "Drop-Off",
  pickup_return: "Pickup & Return",
  remote: "Remote",
};

export interface MockBooking {
  id: string;
  jobId: string;
  categoryName: string;
  serviceName: string;
  status: string;
  serviceMode: string;
  urgency: string;
  scheduledDate: string;
  scheduledTime: string;
  technician: {
    name: string;
    rating: number;
    photo: string;
    eta: string;
  } | null;
  timeline: { label: string; completed: boolean; time?: string }[];
  estimate: {
    visitFee: number;
    diagnosticFee?: number;
    emergencySurcharge?: number;
    estimatedRange: [number, number];
    depositRequired: boolean;
    depositAmount: number;
  };
}

export const mockBooking: MockBooking = {
  id: "bk-001",
  jobId: "LK-AC-000123",
  categoryName: "AC Services",
  serviceName: "AC Gas Top-Up",
  status: "tech_en_route",
  serviceMode: "On-Site",
  urgency: "scheduled",
  scheduledDate: "2026-02-25",
  scheduledTime: "10:00 AM – 12:00 PM",
  technician: {
    name: "Kamal Perera",
    rating: 4.8,
    photo: "",
    eta: "15 mins",
  },
  timeline: [
    { label: "Requested", completed: true, time: "Feb 23, 9:00 AM" },
    { label: "Assigned", completed: true, time: "Feb 23, 9:05 AM" },
    { label: "Technician On The Way", completed: true, time: "Feb 25, 9:45 AM" },
    { label: "In Progress", completed: false },
    { label: "Completed", completed: false },
  ],
  estimate: {
    visitFee: 2500,
    diagnosticFee: 0,
    estimatedRange: [3500, 6000],
    depositRequired: false,
    depositAmount: 0,
  },
};

export const mockQuote = {
  id: "qt-001",
  jobId: "LK-SOLAR-000042",
  technicianName: "Ruwan Silva",
  submittedDate: "Feb 22, 2026",
  laborItems: [
    { description: "Panel Installation (10 panels)", amount: 25000 },
    { description: "Inverter Configuration", amount: 8000 },
    { description: "Net Metering Setup", amount: 5000 },
  ],
  partsItems: [
    { description: "Solar Panel 450W x 10", amount: 350000 },
    { description: "Hybrid Inverter 5kW", amount: 120000 },
    { description: "Mounting Rails & Hardware", amount: 15000 },
  ],
  addOns: [
    { description: "Battery Backup 5kWh", amount: 180000 },
  ],
  warranty: {
    labor: "90 days",
    parts: "Manufacturer warranty (25 years panels, 10 years inverter)",
  },
  totals: {
    labor: 38000,
    parts: 485000,
    addOns: 180000,
    total: 703000,
  },
};

export const colomboAreas = [
  "Colombo 1–15",
  "Nugegoda",
  "Rajagiriya",
  "Dehiwala",
  "Battaramulla",
  "Mount Lavinia",
  "Maharagama",
  "Kotte",
];
