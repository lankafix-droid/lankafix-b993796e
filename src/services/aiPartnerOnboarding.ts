/**
 * AI Partner Onboarding Assist
 * Helps partners select service categories, zones, and skills
 * to reduce onboarding friction.
 */

export interface OnboardingSuggestion {
  suggestedCategories: string[];
  suggestedZones: string[];
  suggestedSkills: string[];
  reasoning: string[];
}

const CATEGORY_SKILLS: Record<string, string[]> = {
  MOBILE: ["Screen replacement", "Battery replacement", "Software troubleshooting", "Water damage repair"],
  LAPTOP: ["Hardware repair", "Software installation", "Data recovery", "Screen replacement"],
  AC: ["Installation", "General service", "Deep cleaning", "Gas refilling", "Compressor repair"],
  CCTV: ["Installation", "Camera configuration", "DVR/NVR setup", "Maintenance"],
  SOLAR: ["Panel installation", "Inverter setup", "System maintenance", "Efficiency optimization"],
  ELECTRICAL: ["Wiring", "Circuit breaker repair", "Lighting installation", "Switchboard work"],
  PLUMBING: ["Pipe repair", "Leak fixing", "Water heater installation", "Drainage"],
  IT: ["Network setup", "Server maintenance", "Troubleshooting", "Security setup"],
  PRINTER: ["Repair", "Maintenance", "Toner replacement", "Network printer setup"],
};

const ZONE_NAMES: Record<string, string> = {
  CMB_CENTRAL: "Colombo Central",
  CMB_NORTH: "Colombo North",
  CMB_SOUTH: "Colombo South",
  CMB_EAST: "Colombo East",
  CMB_WEST: "Colombo West",
  DEHIWALA: "Dehiwala-Mt Lavinia",
  NUGEGODA: "Nugegoda",
  BATTARAMULLA: "Battaramulla",
  KADUWELA: "Kaduwela",
  MAHARAGAMA: "Maharagama",
};

/** Generate onboarding suggestions based on partner's experience */
export function generateOnboardingSuggestions(input: {
  experienceYears: number;
  previousCompany?: string;
  selectedCategories?: string[];
}): OnboardingSuggestion {
  const reasoning: string[] = [];
  const suggestedCategories: string[] = [];
  const suggestedZones = Object.keys(ZONE_NAMES).slice(0, 3); // Start with core zones
  let suggestedSkills: string[] = [];

  // Suggest categories based on experience
  if (input.experienceYears >= 5) {
    suggestedCategories.push("AC", "ELECTRICAL", "SOLAR");
    reasoning.push("Your experience level qualifies for complex service categories");
  } else if (input.experienceYears >= 2) {
    suggestedCategories.push("MOBILE", "LAPTOP", "IT");
    reasoning.push("These categories are ideal for your experience level");
  } else {
    suggestedCategories.push("MOBILE", "PRINTER");
    reasoning.push("Start with these categories and expand as you gain experience");
  }

  // Compile skills for selected or suggested categories
  const targetCategories = input.selectedCategories?.length
    ? input.selectedCategories
    : suggestedCategories;

  for (const cat of targetCategories) {
    const skills = CATEGORY_SKILLS[cat] || [];
    suggestedSkills.push(...skills);
  }
  suggestedSkills = [...new Set(suggestedSkills)];

  reasoning.push(`We suggest starting with ${suggestedZones.length} zones in Greater Colombo`);

  return {
    suggestedCategories,
    suggestedZones,
    suggestedSkills,
    reasoning,
  };
}
