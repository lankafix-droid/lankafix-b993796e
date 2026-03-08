/**
 * Smart Diagnosis Engine — Conditional diagnostic questions per category + service type.
 * Each question supports tri-state answers (yes / no / not_sure) and conditional follow-ups.
 */

export type DiagAnswer = "yes" | "no" | "not_sure";

export interface DiagnosticQuestion {
  id: string;
  text: string;
  /** Only show this question if a prior answer matches */
  showIf?: { questionId: string; answer: DiagAnswer | DiagAnswer[] };
  /** Contextual photo request tied to this question */
  photoPrompt?: string;
}

export interface DiagnosticBlock {
  /** category code + service type id combined key */
  key: string;
  categoryCode: string;
  serviceTypeId: string;
  questions: DiagnosticQuestion[];
  /** Contextual photo hint shown at bottom */
  photoHint?: string;
  /** Summary template fields */
  likelyService: string;
  repairPath: string;
}

// ─── MOBILE ──────────────────────────────────────────────
const MOBILE_SCREEN: DiagnosticBlock = {
  key: "MOBILE__screen",
  categoryCode: "MOBILE",
  serviceTypeId: "screen",
  likelyService: "Screen Replacement",
  repairPath: "Display Assembly Replacement",
  photoHint: "Upload a photo of the screen damage",
  questions: [
    { id: "touch_working", text: "Is the touch screen still responding?" },
    { id: "display_visible", text: "Is the display still visible (not fully black)?" },
    { id: "lines_spots", text: "Do you see coloured lines or black spots on the screen?", showIf: { questionId: "display_visible", answer: "yes" } },
    { id: "glass_only", text: "Is only the outer glass cracked (display underneath looks fine)?", showIf: { questionId: "display_visible", answer: "yes" } },
    { id: "dropped", text: "Was the phone dropped or hit recently?", photoPrompt: "Take a photo showing the crack pattern" },
  ],
};

const MOBILE_BATTERY: DiagnosticBlock = {
  key: "MOBILE__battery",
  categoryCode: "MOBILE",
  serviceTypeId: "battery",
  likelyService: "Battery Replacement",
  repairPath: "Battery Unit Replacement",
  questions: [
    { id: "draining_fast", text: "Is the battery draining faster than usual?" },
    { id: "heating", text: "Does the phone get unusually hot?" },
    { id: "swollen", text: "Does the back cover look raised or swollen?", photoPrompt: "Upload a side photo showing any bulge" },
    { id: "shuts_down", text: "Does it shut down randomly even with charge?", showIf: { questionId: "draining_fast", answer: "yes" } },
    { id: "charge_percentage", text: "Does the battery percentage jump or drop suddenly?", showIf: { questionId: "draining_fast", answer: "yes" } },
  ],
};

const MOBILE_CHARGING: DiagnosticBlock = {
  key: "MOBILE__charging",
  categoryCode: "MOBILE",
  serviceTypeId: "charging",
  likelyService: "Charging Port Repair",
  repairPath: "Charging Module Replacement",
  questions: [
    { id: "cable_working", text: "Have you tried a different charging cable?" },
    { id: "port_loose", text: "Does the cable feel loose in the port?" },
    { id: "slow_charging", text: "Is the phone charging very slowly?" },
    { id: "wireless_works", text: "Does wireless charging work (if supported)?", showIf: { questionId: "cable_working", answer: "yes" } },
    { id: "water_exposure", text: "Has the phone been exposed to water or moisture recently?" },
  ],
};

const MOBILE_CAMERA: DiagnosticBlock = {
  key: "MOBILE__camera",
  categoryCode: "MOBILE",
  serviceTypeId: "camera",
  likelyService: "Camera Repair",
  repairPath: "Camera Module Replacement",
  questions: [
    { id: "front_or_back", text: "Is the issue with the front camera, back camera, or both?" },
    { id: "blurry", text: "Are photos coming out blurry?" },
    { id: "black_screen", text: "Does the camera show a black screen when opened?" },
    { id: "glass_cracked", text: "Is the camera glass cracked?", photoPrompt: "Upload a photo of the camera area" },
    { id: "flash_working", text: "Is the flash/torch working?" },
  ],
};

const MOBILE_SOFTWARE: DiagnosticBlock = {
  key: "MOBILE__software",
  categoryCode: "MOBILE",
  serviceTypeId: "software",
  likelyService: "Software Repair",
  repairPath: "OS Reinstall / Software Flash",
  questions: [
    { id: "freezing", text: "Is the phone freezing or restarting on its own?" },
    { id: "stuck_logo", text: "Is the phone stuck on the logo screen?" },
    { id: "popups", text: "Are you seeing unusual pop-ups or ads?" },
    { id: "apps_crashing", text: "Do apps keep crashing?", showIf: { questionId: "freezing", answer: "yes" } },
    { id: "data_backup", text: "Have you backed up your important data?" },
  ],
};

const MOBILE_WATER: DiagnosticBlock = {
  key: "MOBILE__water",
  categoryCode: "MOBILE",
  serviceTypeId: "water",
  likelyService: "Water Damage Repair",
  repairPath: "Internal Cleaning & Component Check",
  questions: [
    { id: "when_exposed", text: "Did this happen in the last 24 hours?" },
    { id: "still_on", text: "Is the phone still turning on?" },
    { id: "screen_working", text: "Is the display working?", showIf: { questionId: "still_on", answer: "yes" } },
    { id: "tried_rice", text: "Have you tried drying it (rice bag, silica gel, etc.)?" },
    { id: "speakers", text: "Are the speakers or microphone affected?" },
  ],
};

// ─── IT / LAPTOP ──────────────────────────────────────────────
const IT_NOT_POWERING: DiagnosticBlock = {
  key: "IT__laptop_motherboard",
  categoryCode: "IT",
  serviceTypeId: "laptop_motherboard",
  likelyService: "Motherboard Repair / Power Issue",
  repairPath: "Diagnostic & Component-level Repair",
  questions: [
    { id: "power_light", text: "Do you see any power lights when you press the power button?" },
    { id: "charging_light", text: "Does the charging light come on when plugged in?" },
    { id: "dropped", text: "Was the device dropped or bumped recently?" },
    { id: "water_spill", text: "Was any liquid spilled on it?" },
    { id: "beep_sound", text: "Do you hear any beeping sounds when trying to power on?", showIf: { questionId: "power_light", answer: "yes" } },
  ],
};

const IT_SLOW: DiagnosticBlock = {
  key: "IT__laptop_storage",
  categoryCode: "IT",
  serviceTypeId: "laptop_storage",
  likelyService: "SSD Upgrade / Performance Fix",
  repairPath: "Storage Upgrade or OS Reinstall",
  questions: [
    { id: "boot_time", text: "Does it take more than 2 minutes to start up?" },
    { id: "popups", text: "Are you seeing unusual pop-ups or browser redirects?" },
    { id: "new_software", text: "Did you recently install new software?" },
    { id: "disk_full", text: "Is the hard drive nearly full?", showIf: { questionId: "boot_time", answer: "yes" } },
    { id: "age", text: "Is the device more than 3 years old?" },
  ],
};

const IT_SCREEN: DiagnosticBlock = {
  key: "IT__laptop_screen",
  categoryCode: "IT",
  serviceTypeId: "laptop_screen",
  likelyService: "Screen Replacement",
  repairPath: "LCD/LED Panel Replacement",
  photoHint: "Upload a photo of the screen showing the damage or issue",
  questions: [
    { id: "cracked", text: "Is the screen physically cracked?" },
    { id: "flickering", text: "Is the screen flickering or flashing?" },
    { id: "external_works", text: "Does an external monitor work?", showIf: { questionId: "cracked", answer: "no" } },
    { id: "lines", text: "Do you see horizontal or vertical lines?" },
    { id: "hinge_issue", text: "Does the issue change when you move the screen angle?" },
  ],
};

const IT_KEYBOARD: DiagnosticBlock = {
  key: "IT__laptop_keyboard",
  categoryCode: "IT",
  serviceTypeId: "laptop_keyboard",
  likelyService: "Keyboard Replacement",
  repairPath: "Keyboard Module Replacement",
  questions: [
    { id: "some_keys", text: "Are only some keys not working?" },
    { id: "liquid_spill", text: "Was any liquid spilled on the keyboard?" },
    { id: "external_works", text: "Does an external keyboard work fine?" },
    { id: "sticky", text: "Do the keys feel sticky or jammed?", showIf: { questionId: "liquid_spill", answer: "yes" } },
  ],
};

const IT_OVERHEATING: DiagnosticBlock = {
  key: "IT__laptop_overheating",
  categoryCode: "IT",
  serviceTypeId: "laptop_overheating",
  likelyService: "Thermal Service / Fan Repair",
  repairPath: "Fan Replacement & Thermal Paste Application",
  questions: [
    { id: "shuts_down", text: "Does the laptop shut down when it gets hot?" },
    { id: "fan_noise", text: "Is the fan making unusual noise or not spinning?" },
    { id: "hot_spot", text: "Is there a specific hot area on the laptop?" },
    { id: "gaming", text: "Does it mainly overheat during heavy use (gaming, video editing)?" },
  ],
};

// ─── AC ──────────────────────────────────────────────
const AC_NOT_COOLING: DiagnosticBlock = {
  key: "AC__repair",
  categoryCode: "AC",
  serviceTypeId: "repair",
  likelyService: "AC Repair",
  repairPath: "Diagnostic & Repair",
  photoHint: "Upload a photo of the indoor and outdoor units",
  questions: [
    { id: "last_service", text: "Was the AC serviced in the last 6 months?" },
    { id: "indoor_fan", text: "Is the indoor fan blowing air?" },
    { id: "outdoor_running", text: "Is the outdoor unit running?", photoPrompt: "Upload a photo of the outdoor unit" },
    { id: "ice_buildup", text: "Do you see ice on the pipes or indoor unit?", showIf: { questionId: "indoor_fan", answer: "yes" } },
    { id: "remote_working", text: "Is the remote control working?" },
  ],
};

const AC_WATER_LEAK: DiagnosticBlock = {
  key: "AC__water_leak",
  categoryCode: "AC",
  serviceTypeId: "water_leak",
  likelyService: "Water Leakage Repair",
  repairPath: "Drain Line Service & Tray Check",
  photoHint: "Upload a photo showing where the water is dripping from",
  questions: [
    { id: "drip_location", text: "Is water dripping from the indoor unit?" },
    { id: "drain_visible", text: "Can you see the drain pipe outside — is water coming out?", showIf: { questionId: "drip_location", answer: "yes" } },
    { id: "recently_serviced", text: "Was the AC recently serviced or installed?" },
    { id: "continuous", text: "Is the leak continuous or only when AC is running?" },
  ],
};

const AC_NOISE: DiagnosticBlock = {
  key: "AC__noise",
  categoryCode: "AC",
  serviceTypeId: "repair",
  likelyService: "AC Noise Diagnosis",
  repairPath: "Fan / Compressor Inspection",
  questions: [
    { id: "noise_source", text: "Is the noise coming from the indoor or outdoor unit?" },
    { id: "noise_type", text: "Is it a rattling, buzzing, or grinding sound?" },
    { id: "vibration", text: "Is the unit vibrating noticeably?" },
    { id: "when_starts", text: "Does the noise start immediately or after a few minutes?" },
  ],
};

// ─── CONSUMER ELECTRONICS ──────────────────────────────────────────────
const CE_TV: DiagnosticBlock = {
  key: "CONSUMER_ELEC__tv",
  categoryCode: "CONSUMER_ELEC",
  serviceTypeId: "tv",
  likelyService: "TV Repair",
  repairPath: "Panel / Board Diagnosis",
  photoHint: "Upload a photo of the TV screen and any error messages",
  questions: [
    { id: "screen_visible", text: "Is the screen displaying anything?" },
    { id: "sound_working", text: "Is the sound working?" },
    { id: "hdmi_working", text: "Have you tried different HDMI inputs?", showIf: { questionId: "screen_visible", answer: "no" } },
    { id: "smart_features", text: "Are Smart TV features (WiFi/apps) working?", showIf: { questionId: "screen_visible", answer: "yes" } },
    { id: "power_light", text: "Is the power/standby light on?" },
  ],
};

const CE_FRIDGE: DiagnosticBlock = {
  key: "CONSUMER_ELEC__fridge",
  categoryCode: "CONSUMER_ELEC",
  serviceTypeId: "fridge",
  likelyService: "Refrigerator Repair",
  repairPath: "Compressor / Thermostat Diagnosis",
  questions: [
    { id: "not_cooling", text: "Is the fridge not cooling at all?" },
    { id: "compressor_running", text: "Can you hear the compressor running?" },
    { id: "ice_buildup", text: "Is there ice buildup inside?", showIf: { questionId: "compressor_running", answer: "yes" } },
    { id: "water_leak", text: "Is water leaking from the fridge?" },
    { id: "noise", text: "Is it making unusual noise?" },
  ],
};

const CE_WASHING: DiagnosticBlock = {
  key: "CONSUMER_ELEC__washing",
  categoryCode: "CONSUMER_ELEC",
  serviceTypeId: "washing",
  likelyService: "Washing Machine Repair",
  repairPath: "Motor / Pump / Control Board Diagnosis",
  questions: [
    { id: "not_spinning", text: "Is the drum not spinning?" },
    { id: "not_draining", text: "Is water not draining after a wash?" },
    { id: "leaking", text: "Is water leaking from the machine?" },
    { id: "error_code", text: "Is there an error code on the display?", photoPrompt: "Upload a photo of the error code" },
    { id: "noise", text: "Is it making unusual noise during operation?" },
  ],
};

const CE_MICROWAVE: DiagnosticBlock = {
  key: "CONSUMER_ELEC__microwave",
  categoryCode: "CONSUMER_ELEC",
  serviceTypeId: "microwave",
  likelyService: "Microwave Repair",
  repairPath: "Magnetron / Control Diagnosis",
  questions: [
    { id: "not_heating", text: "Is the microwave not heating food?" },
    { id: "turntable", text: "Is the turntable not rotating?" },
    { id: "sparking", text: "Do you see sparks inside when running?" },
    { id: "display_working", text: "Is the display and buttons working?" },
  ],
};

// ─── CCTV ──────────────────────────────────────────────
const CCTV_REPAIR: DiagnosticBlock = {
  key: "CCTV__repair",
  categoryCode: "CCTV",
  serviceTypeId: "repair",
  likelyService: "CCTV System Repair",
  repairPath: "Camera / DVR Diagnosis",
  photoHint: "Upload a photo of the DVR unit and affected camera",
  questions: [
    { id: "which_camera", text: "Is a specific camera not working, or the whole system?" },
    { id: "dvr_lights", text: "Are the DVR/NVR indicator lights on?" },
    { id: "internet_connected", text: "Is the DVR connected to the internet?" },
    { id: "remote_viewing", text: "Can you view cameras on your phone app?", showIf: { questionId: "internet_connected", answer: "yes" } },
    { id: "night_vision", text: "Is the issue happening only at night?" },
  ],
};

// ─── SOLAR ──────────────────────────────────────────────
const SOLAR_TROUBLE: DiagnosticBlock = {
  key: "SOLAR__troubleshoot",
  categoryCode: "SOLAR",
  serviceTypeId: "troubleshoot",
  likelyService: "Solar System Troubleshooting",
  repairPath: "Inverter / Panel Inspection",
  photoHint: "Upload photos of the inverter display and solar panels",
  questions: [
    { id: "error_code", text: "Is the inverter showing an error code?", photoPrompt: "Upload a photo of the inverter display" },
    { id: "panel_damage", text: "Are any panels visibly damaged or dirty?" },
    { id: "generation_low", text: "Has power generation dropped noticeably?" },
    { id: "battery_backup", text: "Is battery backup duration reduced?", showIf: { questionId: "generation_low", answer: "yes" } },
  ],
};

// ─── REGISTRY ──────────────────────────────────────────────
const ALL_BLOCKS: DiagnosticBlock[] = [
  MOBILE_SCREEN, MOBILE_BATTERY, MOBILE_CHARGING, MOBILE_CAMERA, MOBILE_SOFTWARE, MOBILE_WATER,
  IT_NOT_POWERING, IT_SLOW, IT_SCREEN, IT_KEYBOARD, IT_OVERHEATING,
  AC_NOT_COOLING, AC_WATER_LEAK, AC_NOISE,
  CE_TV, CE_FRIDGE, CE_WASHING, CE_MICROWAVE,
  CCTV_REPAIR,
  SOLAR_TROUBLE,
];

/**
 * Get the diagnostic question block for a category + service type.
 * Returns undefined if no diagnostic questions exist for this combination.
 */
export function getDiagnosticBlock(categoryCode: string, serviceTypeId: string): DiagnosticBlock | undefined {
  return ALL_BLOCKS.find(b => b.categoryCode === categoryCode && b.serviceTypeId === serviceTypeId);
}

/**
 * Filter questions based on current answers (conditional logic).
 */
export function getVisibleQuestions(block: DiagnosticBlock, answers: Record<string, DiagAnswer>): DiagnosticQuestion[] {
  return block.questions.filter(q => {
    if (!q.showIf) return true;
    const parentAnswer = answers[q.showIf.questionId];
    if (!parentAnswer) return false;
    const expected = Array.isArray(q.showIf.answer) ? q.showIf.answer : [q.showIf.answer];
    return expected.includes(parentAnswer);
  });
}

/**
 * Generate a smart diagnosis summary from answers.
 */
export function generateDiagnosisSummary(
  block: DiagnosticBlock,
  answers: Record<string, DiagAnswer>,
  deviceInfo: Record<string, string | boolean>
): {
  device: string;
  reportedProblem: string;
  likelyService: string;
  repairPath: string;
  confidence: "high" | "medium" | "low";
  keyFindings: string[];
  technicianNotes: string[];
} {
  const brand = (deviceInfo.brand as string) || "Unknown";
  const model = (deviceInfo.model as string) || (deviceInfo.model_number as string) || "Unknown";
  const device = `${brand} ${model}`.trim();

  const answeredCount = Object.keys(answers).length;
  const notSureCount = Object.values(answers).filter(a => a === "not_sure").length;
  const confidence: "high" | "medium" | "low" =
    notSureCount > answeredCount / 2 ? "low" :
    notSureCount > 0 ? "medium" : "high";

  const keyFindings: string[] = [];
  const technicianNotes: string[] = [];

  for (const q of block.questions) {
    const answer = answers[q.id];
    if (!answer) continue;
    if (answer === "yes") keyFindings.push(`✓ ${q.text.replace("?", "")}`);
    if (answer === "no") keyFindings.push(`✗ ${q.text.replace("?", "")} — No`);
    if (answer === "not_sure") technicianNotes.push(`⚠ Customer unsure: ${q.text}`);
  }

  return {
    device,
    reportedProblem: block.likelyService,
    likelyService: block.likelyService,
    repairPath: block.repairPath,
    confidence,
    keyFindings: keyFindings.slice(0, 5),
    technicianNotes,
  };
}
