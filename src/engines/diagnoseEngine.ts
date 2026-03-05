import { categories } from "@/data/categories";
import type { CategoryCode, ServiceMode } from "@/types/booking";

export interface DiagnoseProbability {
  issue: string;
  probability: number;
  serviceCode: string;
}

export interface SelfFixTip {
  tip: string;
  disclaimer: string;
}

export interface DiagnoseRecommendation {
  recommendedCategoryCode: CategoryCode;
  recommendedServiceCode: string;
  recommendedServiceName: string;
  confidenceLabel: "Best Match" | "Recommended" | "General Inspection";
  recommendedMode: ServiceMode;
  estimatedFromPrice: number;
  estimatedMaxPrice: number;
  estimatedDurationHours: string;
  sameDayAvailable: boolean;
  resultType: "service" | "product";
  helperNote: string;
  probabilities: DiagnoseProbability[];
  selfFixTips: SelfFixTip[];
  educationTip: string;
  isEmergency: boolean;
}

type ProblemKey = string;

interface ProblemMapping {
  serviceCode: string;
  confidence: "Best Match" | "Recommended" | "General Inspection";
  probabilities: DiagnoseProbability[];
  selfFixTips: SelfFixTip[];
  educationTip: string;
  emergencySymptom?: boolean;
}

const DISCLAIMER = "If the issue continues, a LankaFix technician can assist.";

/** Maps categoryCode -> problemType -> full mapping with probabilities */
const PROBLEM_SERVICE_MAP: Record<string, Record<ProblemKey, ProblemMapping>> = {
  AC: {
    not_cooling: {
      serviceCode: "AC_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Low refrigerant gas", probability: 60, serviceCode: "AC_GAS_TOPUP" },
        { issue: "Clogged filter", probability: 25, serviceCode: "AC_FULL_SERVICE" },
        { issue: "Compressor fault", probability: 15, serviceCode: "AC_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Clean the AC filter — remove and rinse under water, dry before reinserting.", disclaimer: DISCLAIMER },
        { tip: "Make sure the thermostat is set to cool mode (not fan only).", disclaimer: DISCLAIMER },
      ],
      educationTip: "Most AC cooling issues are caused by clogged filters. Regular servicing every 6 months prevents this problem.",
    },
    leaking_water: {
      serviceCode: "AC_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Clogged drainage pipe", probability: 55, serviceCode: "AC_REPAIR" },
        { issue: "Dirty evaporator coil", probability: 30, serviceCode: "AC_FULL_SERVICE" },
        { issue: "Low refrigerant causing ice", probability: 15, serviceCode: "AC_GAS_TOPUP" },
      ],
      selfFixTips: [
        { tip: "Check if the drain pipe outlet is blocked or bent.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Water leakage is usually caused by blocked drainage. Annual cleaning prevents this.",
    },
    making_noise: {
      serviceCode: "AC_REPAIR", confidence: "Recommended",
      probabilities: [
        { issue: "Loose fan blade", probability: 40, serviceCode: "AC_REPAIR" },
        { issue: "Compressor vibration", probability: 35, serviceCode: "AC_REPAIR" },
        { issue: "Debris in outdoor unit", probability: 25, serviceCode: "AC_FULL_SERVICE" },
      ],
      selfFixTips: [
        { tip: "Check if any objects are near the outdoor unit causing vibration.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Unusual noise often indicates loose parts. Early inspection prevents further damage.",
    },
    not_turning_on: {
      serviceCode: "AC_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Electrical / PCB fault", probability: 50, serviceCode: "AC_REPAIR" },
        { issue: "Capacitor failure", probability: 30, serviceCode: "AC_REPAIR" },
        { issue: "Remote / receiver issue", probability: 20, serviceCode: "AC_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Check if the power supply breaker is turned on.", disclaimer: DISCLAIMER },
        { tip: "Replace the remote batteries and try again.", disclaimer: DISCLAIMER },
      ],
      educationTip: "If your AC won't turn on, always check the breaker first before calling a technician.",
      emergencySymptom: false,
    },
    need_cleaning: {
      serviceCode: "AC_FULL_SERVICE", confidence: "Best Match",
      probabilities: [
        { issue: "Regular maintenance needed", probability: 80, serviceCode: "AC_FULL_SERVICE" },
        { issue: "Minor gas top-up needed", probability: 20, serviceCode: "AC_GAS_TOPUP" },
      ],
      selfFixTips: [
        { tip: "You can clean the front filter yourself with water and mild soap.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Service your AC every 6 months for optimal cooling and lower electricity bills.",
    },
    not_sure: {
      serviceCode: "AC_REPAIR", confidence: "General Inspection",
      probabilities: [
        { issue: "General AC issue — inspection needed", probability: 100, serviceCode: "AC_REPAIR" },
      ],
      selfFixTips: [],
      educationTip: "A professional inspection will identify the exact issue. Most AC problems are fixable within 1-2 hours.",
    },
  },
  CCTV: {
    camera_not_showing: {
      serviceCode: "CCTV_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Cable / connector fault", probability: 45, serviceCode: "CCTV_REPAIR" },
        { issue: "Camera hardware failure", probability: 35, serviceCode: "CCTV_REPAIR" },
        { issue: "DVR channel issue", probability: 20, serviceCode: "CCTV_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Check if the camera power adapter is plugged in properly.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Most camera feed issues are caused by loose connections. Check cables before calling support.",
    },
    dvr_nvr_issue: {
      serviceCode: "CCTV_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Hard drive failure", probability: 40, serviceCode: "CCTV_REPAIR" },
        { issue: "DVR firmware crash", probability: 35, serviceCode: "CCTV_REPAIR" },
        { issue: "Power supply issue", probability: 25, serviceCode: "CCTV_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Try restarting the DVR by unplugging for 30 seconds.", disclaimer: DISCLAIMER },
      ],
      educationTip: "DVR hard drives typically last 2-3 years. Regular health checks prevent data loss.",
    },
    remote_not_working: {
      serviceCode: "CCTV_REMOTE_VIEW", confidence: "Best Match",
      probabilities: [
        { issue: "Network configuration issue", probability: 50, serviceCode: "CCTV_REMOTE_VIEW" },
        { issue: "App outdated", probability: 30, serviceCode: "CCTV_REMOTE_VIEW" },
        { issue: "ISP blocking ports", probability: 20, serviceCode: "CCTV_REMOTE_VIEW" },
      ],
      selfFixTips: [
        { tip: "Update the DVR mobile app and check your internet connection.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Remote viewing requires port forwarding or P2P — a technician can set this up in 30 minutes.",
    },
    new_installation: {
      serviceCode: "CCTV_INSTALL", confidence: "Best Match",
      probabilities: [{ issue: "New CCTV installation", probability: 100, serviceCode: "CCTV_INSTALL" }],
      selfFixTips: [],
      educationTip: "Professional installation ensures proper coverage. We recommend 1 camera per entry point.",
    },
    need_maintenance: {
      serviceCode: "CCTV_MAINTENANCE", confidence: "Best Match",
      probabilities: [
        { issue: "General maintenance needed", probability: 70, serviceCode: "CCTV_MAINTENANCE" },
        { issue: "Storage health check needed", probability: 30, serviceCode: "CCTV_MAINTENANCE" },
      ],
      selfFixTips: [
        { tip: "Gently wipe camera lenses with a soft cloth.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Regular CCTV maintenance every 6 months ensures your security system works when you need it.",
    },
    not_sure: {
      serviceCode: "CCTV_REPAIR", confidence: "General Inspection",
      probabilities: [{ issue: "CCTV issue — inspection needed", probability: 100, serviceCode: "CCTV_REPAIR" }],
      selfFixTips: [],
      educationTip: "A professional will diagnose and fix your CCTV issue on-site.",
    },
  },
  MOBILE: {
    screen_broken: {
      serviceCode: "MOBILE_SCREEN", confidence: "Best Match",
      probabilities: [
        { issue: "Screen replacement needed", probability: 85, serviceCode: "MOBILE_SCREEN" },
        { issue: "Digitizer only damage", probability: 15, serviceCode: "MOBILE_SCREEN" },
      ],
      selfFixTips: [
        { tip: "Apply a screen protector to prevent further cracking until repair.", disclaimer: DISCLAIMER },
      ],
      educationTip: "A tempered glass screen protector can prevent most screen damage. Install one after repair.",
    },
    battery_draining: {
      serviceCode: "MOBILE_BATTERY", confidence: "Best Match",
      probabilities: [
        { issue: "Battery degraded", probability: 60, serviceCode: "MOBILE_BATTERY" },
        { issue: "App consuming excess power", probability: 25, serviceCode: "MOBILE_SOFTWARE" },
        { issue: "Charging circuit issue", probability: 15, serviceCode: "MOBILE_GENERAL" },
      ],
      selfFixTips: [
        { tip: "Check battery health in Settings > Battery. Replace if below 80%.", disclaimer: DISCLAIMER },
        { tip: "Close background apps and reduce screen brightness.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Phone batteries typically last 2-3 years. Battery replacement is quick and affordable.",
    },
    not_charging: {
      serviceCode: "MOBILE_GENERAL", confidence: "Recommended",
      probabilities: [
        { issue: "Charging port blocked / dirty", probability: 45, serviceCode: "MOBILE_GENERAL" },
        { issue: "Charging IC failure", probability: 35, serviceCode: "MOBILE_GENERAL" },
        { issue: "Cable / adapter issue", probability: 20, serviceCode: "MOBILE_GENERAL" },
      ],
      selfFixTips: [
        { tip: "Try a different charging cable and adapter first.", disclaimer: DISCLAIMER },
        { tip: "Gently clean the charging port with a toothpick (power off first).", disclaimer: DISCLAIMER },
      ],
      educationTip: "Dust in the charging port is the #1 cause of charging issues. Clean it monthly.",
    },
    not_turning_on: {
      serviceCode: "MOBILE_GENERAL", confidence: "Recommended",
      probabilities: [
        { issue: "Battery completely drained", probability: 40, serviceCode: "MOBILE_BATTERY" },
        { issue: "Motherboard issue", probability: 35, serviceCode: "MOBILE_GENERAL" },
        { issue: "Software crash", probability: 25, serviceCode: "MOBILE_SOFTWARE" },
      ],
      selfFixTips: [
        { tip: "Charge for at least 30 minutes before trying to turn on.", disclaimer: DISCLAIMER },
        { tip: "Try a force restart (hold power + volume down for 10 seconds).", disclaimer: DISCLAIMER },
      ],
      educationTip: "If your phone won't turn on after charging, it may need professional diagnosis.",
    },
    software_issue: {
      serviceCode: "MOBILE_SOFTWARE", confidence: "Best Match",
      probabilities: [
        { issue: "OS corruption", probability: 50, serviceCode: "MOBILE_SOFTWARE" },
        { issue: "Malware / virus", probability: 30, serviceCode: "MOBILE_SOFTWARE" },
        { issue: "Storage full", probability: 20, serviceCode: "MOBILE_SOFTWARE" },
      ],
      selfFixTips: [
        { tip: "Clear app cache: Settings > Storage > Cached data.", disclaimer: DISCLAIMER },
        { tip: "Restart your phone in safe mode to check for problematic apps.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Keep your phone updated and avoid installing apps from unknown sources.",
    },
    not_sure: {
      serviceCode: "MOBILE_GENERAL", confidence: "General Inspection",
      probabilities: [{ issue: "Mobile issue — diagnosis needed", probability: 100, serviceCode: "MOBILE_GENERAL" }],
      selfFixTips: [],
      educationTip: "Bring your device for a free initial diagnosis. Most issues are identifiable within 15 minutes.",
    },
  },
  IT: {
    laptop_slow: {
      serviceCode: "IT_REMOTE", confidence: "Best Match",
      probabilities: [
        { issue: "Storage full / fragmented", probability: 40, serviceCode: "IT_REMOTE" },
        { issue: "Malware / bloatware", probability: 30, serviceCode: "IT_REMOTE" },
        { issue: "RAM insufficient", probability: 20, serviceCode: "IT_ONSITE" },
        { issue: "HDD failing — needs SSD", probability: 10, serviceCode: "IT_ONSITE" },
      ],
      selfFixTips: [
        { tip: "Delete unused files and empty the recycle bin.", disclaimer: DISCLAIMER },
        { tip: "Disable startup programs: Task Manager > Startup tab.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Upgrading from HDD to SSD can make your laptop 5x faster. Ask our technician about an upgrade.",
    },
    wifi_network: {
      serviceCode: "IT_NETWORK", confidence: "Best Match",
      probabilities: [
        { issue: "Router configuration issue", probability: 40, serviceCode: "IT_NETWORK" },
        { issue: "ISP problem", probability: 30, serviceCode: "IT_NETWORK" },
        { issue: "WiFi interference", probability: 20, serviceCode: "IT_NETWORK" },
        { issue: "Network card issue", probability: 10, serviceCode: "IT_ONSITE" },
      ],
      selfFixTips: [
        { tip: "Restart your router by unplugging for 30 seconds.", disclaimer: DISCLAIMER },
        { tip: "Move the router to a central location away from walls.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Place your router in a central, elevated position for best coverage.",
    },
    desktop_not_on: {
      serviceCode: "IT_ONSITE", confidence: "Recommended",
      probabilities: [
        { issue: "Power supply failure", probability: 40, serviceCode: "IT_ONSITE" },
        { issue: "Motherboard issue", probability: 30, serviceCode: "IT_ONSITE" },
        { issue: "RAM or CPU fault", probability: 20, serviceCode: "IT_ONSITE" },
        { issue: "Power cable issue", probability: 10, serviceCode: "IT_ONSITE" },
      ],
      selfFixTips: [
        { tip: "Check if the power cable is securely connected.", disclaimer: DISCLAIMER },
        { tip: "Try a different power outlet.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Power supply units typically last 5-7 years. Replacement is quick and affordable.",
    },
    printer_connectivity: {
      serviceCode: "IT_ONSITE", confidence: "Recommended",
      probabilities: [
        { issue: "Driver issue", probability: 40, serviceCode: "IT_ONSITE" },
        { issue: "Network printer offline", probability: 35, serviceCode: "IT_ONSITE" },
        { issue: "USB connection fault", probability: 25, serviceCode: "IT_ONSITE" },
      ],
      selfFixTips: [
        { tip: "Reinstall the printer driver from the manufacturer website.", disclaimer: DISCLAIMER },
        { tip: "Try connecting via USB cable to test if it's a network issue.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Keep printer drivers updated for best compatibility with your operating system.",
    },
    software_os: {
      serviceCode: "IT_REMOTE", confidence: "Best Match",
      probabilities: [
        { issue: "OS corruption", probability: 40, serviceCode: "IT_REMOTE" },
        { issue: "Software conflict", probability: 30, serviceCode: "IT_REMOTE" },
        { issue: "Virus / malware", probability: 30, serviceCode: "IT_REMOTE" },
      ],
      selfFixTips: [
        { tip: "Run Windows Update to install latest patches.", disclaimer: DISCLAIMER },
        { tip: "Run built-in antivirus scan: Windows Security > Virus & Threat Protection.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Keep your OS and software updated to prevent security vulnerabilities.",
    },
    not_sure: {
      serviceCode: "IT_ONSITE", confidence: "General Inspection",
      probabilities: [{ issue: "IT issue — diagnosis needed", probability: 100, serviceCode: "IT_ONSITE" }],
      selfFixTips: [],
      educationTip: "Our IT professionals can diagnose issues remotely or on-site.",
    },
  },
  SOLAR: {
    low_output: {
      serviceCode: "SOLAR_MAINTENANCE", confidence: "Recommended",
      probabilities: [
        { issue: "Dirty panels", probability: 45, serviceCode: "SOLAR_MAINTENANCE" },
        { issue: "Inverter underperformance", probability: 30, serviceCode: "SOLAR_REPAIR" },
        { issue: "Wiring degradation", probability: 25, serviceCode: "SOLAR_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Hose down panels with clean water (morning or evening, not midday).", disclaimer: DISCLAIMER },
      ],
      educationTip: "Clean solar panels every 3 months for optimal power generation in Sri Lanka's dusty climate.",
    },
    inverter_issue: {
      serviceCode: "SOLAR_REPAIR", confidence: "Best Match", emergencySymptom: true,
      probabilities: [
        { issue: "Inverter fault", probability: 60, serviceCode: "SOLAR_REPAIR" },
        { issue: "Grid connection issue", probability: 25, serviceCode: "SOLAR_REPAIR" },
        { issue: "Overheating", probability: 15, serviceCode: "SOLAR_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Check if the inverter display shows an error code — note it down for the technician.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Inverter issues should be addressed promptly to prevent damage to your solar system.",
    },
    battery_issue: {
      serviceCode: "SOLAR_REPAIR", confidence: "Recommended",
      probabilities: [
        { issue: "Battery degradation", probability: 50, serviceCode: "SOLAR_REPAIR" },
        { issue: "Charge controller fault", probability: 30, serviceCode: "SOLAR_REPAIR" },
        { issue: "Wiring issue", probability: 20, serviceCode: "SOLAR_REPAIR" },
      ],
      selfFixTips: [],
      educationTip: "Solar batteries typically last 5-10 years. Regular health checks extend their life.",
    },
    need_installation: {
      serviceCode: "SOLAR_INSTALL", confidence: "Best Match",
      probabilities: [{ issue: "New solar installation", probability: 100, serviceCode: "SOLAR_INSTALL" }],
      selfFixTips: [],
      educationTip: "Solar can reduce your electricity bill by up to 80%. Get a free site survey today.",
    },
    need_inspection: {
      serviceCode: "SOLAR_MAINTENANCE", confidence: "Recommended",
      probabilities: [
        { issue: "General inspection needed", probability: 70, serviceCode: "SOLAR_MAINTENANCE" },
        { issue: "Efficiency audit needed", probability: 30, serviceCode: "SOLAR_MAINTENANCE" },
      ],
      selfFixTips: [],
      educationTip: "Annual solar inspections ensure your system operates at peak efficiency.",
    },
    not_sure: {
      serviceCode: "SOLAR_MAINTENANCE", confidence: "General Inspection",
      probabilities: [{ issue: "Solar system issue — inspection needed", probability: 100, serviceCode: "SOLAR_MAINTENANCE" }],
      selfFixTips: [],
      educationTip: "Our certified solar technicians will perform a comprehensive system check.",
    },
  },
  CONSUMER_ELEC: {
    tv_not_on: {
      serviceCode: "CE_TV_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Power board failure", probability: 45, serviceCode: "CE_TV_REPAIR" },
        { issue: "Main board issue", probability: 35, serviceCode: "CE_TV_REPAIR" },
        { issue: "Power cable / outlet issue", probability: 20, serviceCode: "CE_TV_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Unplug the TV for 60 seconds, then plug back in.", disclaimer: DISCLAIMER },
        { tip: "Try a different power outlet.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Power surges can damage your TV. Use a surge protector for all electronics.",
    },
    no_display_sound: {
      serviceCode: "CE_TV_REPAIR", confidence: "Recommended",
      probabilities: [
        { issue: "Backlight failure", probability: 40, serviceCode: "CE_TV_REPAIR" },
        { issue: "HDMI / input issue", probability: 35, serviceCode: "CE_TV_REPAIR" },
        { issue: "Speaker / amp fault", probability: 25, serviceCode: "CE_TV_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Check all HDMI cables and try switching input sources.", disclaimer: DISCLAIMER },
      ],
      educationTip: "HDMI connection issues are the most common cause of no-display problems.",
    },
    remote_input: {
      serviceCode: "CE_TV_REPAIR", confidence: "Recommended",
      probabilities: [
        { issue: "Remote IR sensor fault", probability: 50, serviceCode: "CE_TV_REPAIR" },
        { issue: "Remote batteries / damage", probability: 50, serviceCode: "CE_TV_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Replace remote batteries and point directly at the TV sensor.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Use your phone camera to check if the remote IR LED lights up when pressing buttons.",
    },
    appliance_issue: {
      serviceCode: "CE_WASHING", confidence: "Recommended",
      probabilities: [
        { issue: "Motor / pump failure", probability: 40, serviceCode: "CE_WASHING" },
        { issue: "Electronic control issue", probability: 35, serviceCode: "CE_WASHING" },
        { issue: "Mechanical wear", probability: 25, serviceCode: "CE_WASHING" },
      ],
      selfFixTips: [
        { tip: "Check if the appliance is properly plugged in and the outlet works.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Regular cleaning and maintenance extends appliance life by 3-5 years.",
    },
    need_inspection: {
      serviceCode: "CE_TV_REPAIR", confidence: "General Inspection",
      probabilities: [{ issue: "Electronics issue — inspection needed", probability: 100, serviceCode: "CE_TV_REPAIR" }],
      selfFixTips: [],
      educationTip: "Our electronics technicians can diagnose and repair most brands on-site.",
    },
    not_sure: {
      serviceCode: "CE_TV_REPAIR", confidence: "General Inspection",
      probabilities: [{ issue: "Electronics issue — diagnosis needed", probability: 100, serviceCode: "CE_TV_REPAIR" }],
      selfFixTips: [],
      educationTip: "Bring your device in or book an on-site visit for professional diagnosis.",
    },
  },
  COPIER: {
    not_printing: {
      serviceCode: "COPIER_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Toner / ink empty", probability: 35, serviceCode: "COPIER_REPAIR" },
        { issue: "Paper feed jam", probability: 30, serviceCode: "COPIER_REPAIR" },
        { issue: "Driver / connectivity issue", probability: 20, serviceCode: "COPIER_REPAIR" },
        { issue: "Print head clogged", probability: 15, serviceCode: "COPIER_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Check toner / ink levels and replace if empty.", disclaimer: DISCLAIMER },
        { tip: "Clear any paper jams and restart the printer.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Most printing issues can be resolved by checking toner levels and clearing paper jams.",
    },
    paper_jam: {
      serviceCode: "COPIER_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Paper feed roller worn", probability: 45, serviceCode: "COPIER_REPAIR" },
        { issue: "Wrong paper type / size", probability: 30, serviceCode: "COPIER_REPAIR" },
        { issue: "Foreign object inside", probability: 25, serviceCode: "COPIER_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Open all access doors and gently remove stuck paper (pull in print direction).", disclaimer: DISCLAIMER },
        { tip: "Fan paper before loading to prevent multiple sheets feeding.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Frequent paper jams indicate worn rollers. Regular maintenance prevents this.",
    },
    poor_quality: {
      serviceCode: "COPIER_REPAIR", confidence: "Best Match",
      probabilities: [
        { issue: "Toner low / defective", probability: 40, serviceCode: "COPIER_REPAIR" },
        { issue: "Drum unit worn", probability: 35, serviceCode: "COPIER_REPAIR" },
        { issue: "Print head alignment off", probability: 25, serviceCode: "COPIER_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Run the printer's built-in cleaning cycle from the settings menu.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Print quality issues often indicate the drum unit needs replacement — typically every 2-3 years.",
    },
    error_message: {
      serviceCode: "COPIER_REPAIR", confidence: "Recommended",
      probabilities: [
        { issue: "Firmware error", probability: 40, serviceCode: "COPIER_REPAIR" },
        { issue: "Sensor malfunction", probability: 35, serviceCode: "COPIER_REPAIR" },
        { issue: "Component failure", probability: 25, serviceCode: "COPIER_REPAIR" },
      ],
      selfFixTips: [
        { tip: "Note down the exact error code and restart the printer.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Error codes help technicians diagnose issues faster. Always note them down.",
    },
    need_service: {
      serviceCode: "COPIER_MAINTENANCE", confidence: "Best Match",
      probabilities: [
        { issue: "Regular maintenance needed", probability: 80, serviceCode: "COPIER_MAINTENANCE" },
        { issue: "Parts replacement due", probability: 20, serviceCode: "COPIER_MAINTENANCE" },
      ],
      selfFixTips: [],
      educationTip: "Regular printer maintenance every 3-6 months extends its life and prevents costly repairs.",
    },
    not_sure: {
      serviceCode: "COPIER_REPAIR", confidence: "General Inspection",
      probabilities: [{ issue: "Printer / copier issue — diagnosis needed", probability: 100, serviceCode: "COPIER_REPAIR" }],
      selfFixTips: [],
      educationTip: "Our copier technicians service all major brands including Canon, Ricoh, and HP.",
    },
  },
  SMART_HOME_OFFICE: {
    cctv_smart_lock: {
      serviceCode: "SH_LOCK", confidence: "Recommended",
      probabilities: [
        { issue: "Smart lock connectivity issue", probability: 50, serviceCode: "SH_LOCK" },
        { issue: "Integration configuration needed", probability: 50, serviceCode: "SH_LOCK" },
      ],
      selfFixTips: [
        { tip: "Check if the smart lock battery is charged or replace it.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Smart locks require regular battery replacement — typically every 6-12 months.",
    },
    wifi_smart_device: {
      serviceCode: "SH_AUTOMATION", confidence: "Recommended",
      probabilities: [
        { issue: "WiFi configuration issue", probability: 50, serviceCode: "SH_AUTOMATION" },
        { issue: "Device firmware outdated", probability: 30, serviceCode: "SH_AUTOMATION" },
        { issue: "Router compatibility issue", probability: 20, serviceCode: "SH_AUTOMATION" },
      ],
      selfFixTips: [
        { tip: "Reset the smart device and reconnect to your WiFi network.", disclaimer: DISCLAIMER },
      ],
      educationTip: "Most smart home devices work on 2.4GHz WiFi. Make sure your router supports it.",
    },
    intercom_access: {
      serviceCode: "SH_AUTOMATION", confidence: "Recommended",
      probabilities: [
        { issue: "Wiring / connection issue", probability: 50, serviceCode: "SH_AUTOMATION" },
        { issue: "Intercom unit failure", probability: 50, serviceCode: "SH_AUTOMATION" },
      ],
      selfFixTips: [],
      educationTip: "Modern video intercoms can be connected to your smartphone for remote access.",
    },
    office_automation: {
      serviceCode: "SH_NETWORK_INFRA", confidence: "Recommended",
      probabilities: [
        { issue: "Network infrastructure setup", probability: 60, serviceCode: "SH_NETWORK_INFRA" },
        { issue: "Device automation configuration", probability: 40, serviceCode: "SH_AUTOMATION" },
      ],
      selfFixTips: [],
      educationTip: "Office automation can reduce energy costs by up to 30% with smart scheduling.",
    },
    need_installation: {
      serviceCode: "SH_AUTOMATION", confidence: "Best Match",
      probabilities: [{ issue: "New smart home installation", probability: 100, serviceCode: "SH_AUTOMATION" }],
      selfFixTips: [],
      educationTip: "A professional smart home setup ensures all devices work together seamlessly.",
    },
    not_sure: {
      serviceCode: "SH_AUTOMATION", confidence: "General Inspection",
      probabilities: [{ issue: "Smart home issue — consultation needed", probability: 100, serviceCode: "SH_AUTOMATION" }],
      selfFixTips: [],
      educationTip: "Our smart home experts can design a solution tailored to your needs.",
    },
  },
  PRINT_SUPPLIES: {
    need_toner: {
      serviceCode: "PS_TONER_ORDER", confidence: "Best Match",
      probabilities: [{ issue: "Toner cartridge needed", probability: 100, serviceCode: "PS_TONER_ORDER" }],
      selfFixTips: [],
      educationTip: "Order genuine toner for best print quality and to protect your printer warranty.",
    },
    need_ink: {
      serviceCode: "PS_INK_ORDER", confidence: "Best Match",
      probabilities: [{ issue: "Ink cartridge needed", probability: 100, serviceCode: "PS_INK_ORDER" }],
      selfFixTips: [],
      educationTip: "Compatible ink cartridges offer similar quality at lower cost for many printer models.",
    },
    need_printer: {
      serviceCode: "PS_PRINTER_SETUP", confidence: "Recommended",
      probabilities: [{ issue: "New printer setup needed", probability: 100, serviceCode: "PS_PRINTER_SETUP" }],
      selfFixTips: [],
      educationTip: "We can help you choose the right printer for your needs and set it up professionally.",
    },
    need_accessories: {
      serviceCode: "PS_TONER_ORDER", confidence: "Recommended",
      probabilities: [{ issue: "Printer accessories needed", probability: 100, serviceCode: "PS_TONER_ORDER" }],
      selfFixTips: [],
      educationTip: "LankaFix stocks accessories for all major printer brands.",
    },
    compatibility_help: {
      serviceCode: "PS_TONER_ORDER", confidence: "General Inspection",
      probabilities: [{ issue: "Model compatibility check needed", probability: 100, serviceCode: "PS_TONER_ORDER" }],
      selfFixTips: [],
      educationTip: "Share your printer model number and we'll find the right supplies for you.",
    },
    not_sure: {
      serviceCode: "PS_TONER_ORDER", confidence: "General Inspection",
      probabilities: [{ issue: "Print supplies — consultation needed", probability: 100, serviceCode: "PS_TONER_ORDER" }],
      selfFixTips: [],
      educationTip: "Chat with our team to find the right supplies for your printer.",
    },
  },
};

const EMERGENCY_CATEGORIES: CategoryCode[] = ["AC", "CCTV", "MOBILE", "IT", "COPIER", "CONSUMER_ELEC"];

/** Emergency symptom keywords */
const EMERGENCY_KEYWORDS = ["burning smell", "electrical sparks", "smoke", "fire", "inverter failure", "short circuit"];

export function isEmergencySymptom(problemKey: string, category: CategoryCode): boolean {
  const mapping = PROBLEM_SERVICE_MAP[category]?.[problemKey];
  return mapping?.emergencySymptom === true;
}

export function getDiagnoseRecommendation(
  selectedCategory: CategoryCode,
  problemType: string,
  urgencyLevel: string,
  _userArea: string
): DiagnoseRecommendation {
  const mapping = PROBLEM_SERVICE_MAP[selectedCategory]?.[problemType];
  const serviceCode = mapping?.serviceCode ?? categories.find(c => c.code === selectedCategory)?.services[0]?.code ?? "";
  const confidence = mapping?.confidence ?? "General Inspection";

  const cat = categories.find(c => c.code === selectedCategory);
  const svc = cat?.services.find(s => s.code === serviceCode);

  const isProduct = selectedCategory === "PRINT_SUPPLIES" &&
    ["need_toner", "need_ink", "need_accessories", "need_printer"].includes(problemType);

  const sameDayAvailable = urgencyLevel === "emergency" || urgencyLevel === "same_day" ||
    (svc?.slaMinutesEmergency !== undefined && EMERGENCY_CATEGORIES.includes(selectedCategory));

  const defaultMode: ServiceMode = svc?.allowedModes[0] ?? "on_site";

  const helperNotes: Record<string, string> = {
    "Best Match": "High confidence — this service matches your problem description.",
    "Recommended": "Based on your description, this is our recommended starting point.",
    "General Inspection": "We'll start with a diagnostic inspection to identify the exact issue.",
  };

  const estimatedFromPrice = svc?.fromPrice ?? cat?.fromPrice ?? 0;
  const estimatedMaxPrice = Math.round(estimatedFromPrice * 2.2);
  const durationMin = svc?.typicalDurationMinutes ?? 60;
  const durationHours = durationMin >= 60
    ? `${Math.floor(durationMin / 60)} – ${Math.ceil(durationMin / 60) + 1} hours`
    : `${durationMin} – ${durationMin + 30} minutes`;

  return {
    recommendedCategoryCode: selectedCategory,
    recommendedServiceCode: serviceCode,
    recommendedServiceName: svc?.name ?? "General Service",
    confidenceLabel: confidence,
    recommendedMode: defaultMode,
    estimatedFromPrice,
    estimatedMaxPrice,
    estimatedDurationHours: durationHours,
    sameDayAvailable,
    resultType: isProduct ? "product" : "service",
    helperNote: helperNotes[confidence],
    probabilities: mapping?.probabilities ?? [{ issue: "General issue", probability: 100, serviceCode }],
    selfFixTips: mapping?.selfFixTips ?? [],
    educationTip: mapping?.educationTip ?? "A verified LankaFix technician will diagnose and resolve your issue.",
    isEmergency: mapping?.emergencySymptom === true || urgencyLevel === "emergency",
  };
}

/** Problem options per category */
export const CATEGORY_PROBLEMS: Record<string, { key: string; label: string }[]> = {
  AC: [
    { key: "not_cooling", label: "Not cooling" },
    { key: "leaking_water", label: "Leaking water" },
    { key: "making_noise", label: "Making noise" },
    { key: "not_turning_on", label: "Not turning on" },
    { key: "need_cleaning", label: "Need cleaning / service" },
    { key: "not_sure", label: "Not sure" },
  ],
  CCTV: [
    { key: "camera_not_showing", label: "Camera not showing" },
    { key: "dvr_nvr_issue", label: "DVR / NVR issue" },
    { key: "remote_not_working", label: "Remote viewing not working" },
    { key: "new_installation", label: "Need new installation" },
    { key: "need_maintenance", label: "Need maintenance" },
    { key: "not_sure", label: "Not sure" },
  ],
  MOBILE: [
    { key: "screen_broken", label: "Screen broken" },
    { key: "battery_draining", label: "Battery draining fast" },
    { key: "not_charging", label: "Not charging" },
    { key: "not_turning_on", label: "Not turning on" },
    { key: "software_issue", label: "Software issue" },
    { key: "not_sure", label: "Not sure" },
  ],
  IT: [
    { key: "laptop_slow", label: "Laptop slow" },
    { key: "wifi_network", label: "Wi-Fi / network issue" },
    { key: "desktop_not_on", label: "Desktop not turning on" },
    { key: "printer_connectivity", label: "Printer connectivity issue" },
    { key: "software_os", label: "Software / OS issue" },
    { key: "not_sure", label: "Not sure" },
  ],
  SOLAR: [
    { key: "low_output", label: "Low power generation" },
    { key: "inverter_issue", label: "Inverter issue" },
    { key: "battery_issue", label: "Battery issue" },
    { key: "need_installation", label: "Need installation" },
    { key: "need_inspection", label: "Need inspection" },
    { key: "not_sure", label: "Not sure" },
  ],
  CONSUMER_ELEC: [
    { key: "tv_not_on", label: "TV not turning on" },
    { key: "no_display_sound", label: "No display / sound issue" },
    { key: "remote_input", label: "Remote / input issue" },
    { key: "appliance_issue", label: "Appliance issue" },
    { key: "need_inspection", label: "Need inspection" },
    { key: "not_sure", label: "Not sure" },
  ],
  COPIER: [
    { key: "not_printing", label: "Not printing" },
    { key: "paper_jam", label: "Paper jam" },
    { key: "poor_quality", label: "Poor print quality" },
    { key: "error_message", label: "Error message" },
    { key: "need_service", label: "Need service / maintenance" },
    { key: "not_sure", label: "Not sure" },
  ],
  SMART_HOME_OFFICE: [
    { key: "cctv_smart_lock", label: "CCTV / smart lock integration" },
    { key: "wifi_smart_device", label: "Wi-Fi smart device setup" },
    { key: "intercom_access", label: "Intercom / access issue" },
    { key: "office_automation", label: "Office device automation" },
    { key: "need_installation", label: "Need installation" },
    { key: "not_sure", label: "Not sure" },
  ],
  PRINT_SUPPLIES: [
    { key: "need_toner", label: "Need toner" },
    { key: "need_ink", label: "Need ink" },
    { key: "need_printer", label: "Need printer" },
    { key: "need_accessories", label: "Need accessories" },
    { key: "compatibility_help", label: "Need model compatibility help" },
    { key: "not_sure", label: "Not sure" },
  ],
};

/** Urgency options — category-aware */
export function getUrgencyOptions(categoryCode: CategoryCode): { key: string; label: string; description: string }[] {
  if (categoryCode === "PRINT_SUPPLIES") {
    return [
      { key: "same_day", label: "Same day delivery", description: "Get it delivered today" },
      { key: "next_day", label: "Next day delivery", description: "Delivery by tomorrow" },
      { key: "flexible", label: "Flexible", description: "No rush — best price" },
    ];
  }

  const hasEmergency = EMERGENCY_CATEGORIES.includes(categoryCode);
  const options = [];

  if (hasEmergency) {
    options.push({ key: "emergency", label: "Emergency (today)", description: "Fastest response — surcharge may apply" });
  }
  options.push(
    { key: "same_day", label: "Same day", description: "Service within today" },
    { key: "within_24h", label: "Within 24 hours", description: "Scheduled for tomorrow" },
    { key: "flexible", label: "Flexible", description: "Best available slot" },
  );

  return options;
}

/** Display info per category for the wizard */
export const DIAGNOSE_CATEGORY_DISPLAY: { code: CategoryCode; label: string; icon: string }[] = [
  { code: "AC", label: "Air Conditioner", icon: "Snowflake" },
  { code: "CCTV", label: "CCTV / Security", icon: "Camera" },
  { code: "MOBILE", label: "Mobile Phone", icon: "Smartphone" },
  { code: "IT", label: "Laptop / IT", icon: "Monitor" },
  { code: "SOLAR", label: "Solar System", icon: "Sun" },
  { code: "CONSUMER_ELEC", label: "TV / Electronics", icon: "Tv" },
  { code: "COPIER", label: "Printer / Copier", icon: "Printer" },
  { code: "SMART_HOME_OFFICE", label: "Smart Home / Office", icon: "Home" },
  { code: "PRINT_SUPPLIES", label: "Printing Supplies", icon: "ShoppingBag" },
];

/** Popular issues database for analytics and quick access */
export const POPULAR_ISSUES: { category: CategoryCode; problem: string; label: string; serviceCode: string }[] = [
  { category: "AC", problem: "not_cooling", label: "AC not cooling", serviceCode: "AC_REPAIR" },
  { category: "AC", problem: "leaking_water", label: "AC water leakage", serviceCode: "AC_REPAIR" },
  { category: "AC", problem: "need_cleaning", label: "AC cleaning / service", serviceCode: "AC_FULL_SERVICE" },
  { category: "COPIER", problem: "paper_jam", label: "Printer paper jam", serviceCode: "COPIER_REPAIR" },
  { category: "IT", problem: "wifi_network", label: "Router slow internet", serviceCode: "IT_NETWORK" },
  { category: "IT", problem: "laptop_slow", label: "Laptop overheating / slow", serviceCode: "IT_REMOTE" },
  { category: "MOBILE", problem: "screen_broken", label: "Mobile screen broken", serviceCode: "MOBILE_SCREEN" },
  { category: "MOBILE", problem: "battery_draining", label: "Battery draining fast", serviceCode: "MOBILE_BATTERY" },
  { category: "CCTV", problem: "camera_not_showing", label: "CCTV camera not showing", serviceCode: "CCTV_REPAIR" },
  { category: "SOLAR", problem: "low_output", label: "Solar low output", serviceCode: "SOLAR_MAINTENANCE" },
];

/** Cancellation reasons for intelligence */
export const CANCELLATION_REASONS = [
  { key: "price_high", label: "Price too high" },
  { key: "issue_resolved", label: "Issue resolved on its own" },
  { key: "booked_elsewhere", label: "Booked elsewhere" },
  { key: "technician_delay", label: "Technician delay" },
  { key: "wrong_diagnosis", label: "Wrong diagnosis" },
  { key: "changed_mind", label: "Changed mind" },
];
