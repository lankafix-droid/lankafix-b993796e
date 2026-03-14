/**
 * Service Knowledge Graph
 * 
 * Interconnected service taxonomy enabling smarter recommendations,
 * cross-sell detection, and category expansion intelligence.
 */

export interface ServiceNode {
  code: string;
  name: string;
  parent: string | null;
  related: string[];         // codes of related services
  crossSellTo: string[];     // services commonly booked after this one
  seasonalPeak: string[];    // months with highest demand (1-12)
  avgPriceLKR: [number, number]; // min-max range
  keywords: string[];        // search terms that map to this service
}

export const SERVICE_KNOWLEDGE_GRAPH: ServiceNode[] = [
  // AC
  { code: "AC_GAS_TOPUP", name: "AC Gas Top-Up", parent: "AC", related: ["AC_FULL_SERVICE", "AC_REPAIR"], crossSellTo: ["AC_FULL_SERVICE"], seasonalPeak: ["3", "4", "5", "6"], avgPriceLKR: [3500, 6500], keywords: ["ac gas", "ac not cooling", "ac warm air", "refrigerant", "ac gas refill"] },
  { code: "AC_FULL_SERVICE", name: "AC Full Service & Clean", parent: "AC", related: ["AC_GAS_TOPUP", "AC_REPAIR"], crossSellTo: ["AC_GAS_TOPUP"], seasonalPeak: ["2", "3", "4"], avgPriceLKR: [4500, 7500], keywords: ["ac cleaning", "ac service", "ac deep clean", "ac filter", "ac maintenance"] },
  { code: "AC_REPAIR", name: "AC Repair / Diagnosis", parent: "AC", related: ["AC_GAS_TOPUP", "AC_FULL_SERVICE", "AC_INSTALL"], crossSellTo: ["AC_FULL_SERVICE"], seasonalPeak: ["4", "5", "6", "7"], avgPriceLKR: [2000, 18000], keywords: ["ac repair", "ac broken", "ac not working", "ac noise", "ac compressor", "ac leak"] },
  { code: "AC_INSTALL", name: "AC Installation", parent: "AC", related: ["AC_FULL_SERVICE", "ELECTRICAL_WIRING"], crossSellTo: ["AC_FULL_SERVICE"], seasonalPeak: ["3", "4", "5"], avgPriceLKR: [5000, 15000], keywords: ["ac install", "new ac", "ac fitting", "ac mounting"] },

  // Mobile
  { code: "MOBILE_SCREEN", name: "Phone Screen Repair", parent: "MOBILE", related: ["MOBILE_BATTERY", "MOBILE_GENERAL"], crossSellTo: ["MOBILE_BATTERY"], seasonalPeak: [], avgPriceLKR: [5000, 25000], keywords: ["phone screen", "cracked screen", "broken screen", "screen repair", "display broken"] },
  { code: "MOBILE_BATTERY", name: "Phone Battery Replacement", parent: "MOBILE", related: ["MOBILE_SCREEN", "MOBILE_GENERAL"], crossSellTo: [], seasonalPeak: [], avgPriceLKR: [3000, 8000], keywords: ["phone battery", "battery drain", "battery replacement", "phone dying", "battery swollen"] },
  { code: "MOBILE_GENERAL", name: "General Phone Repair", parent: "MOBILE", related: ["MOBILE_SCREEN", "MOBILE_BATTERY"], crossSellTo: ["MOBILE_SCREEN"], seasonalPeak: [], avgPriceLKR: [2000, 15000], keywords: ["phone repair", "phone not working", "phone water damage", "phone charging issue"] },

  // IT / Laptop
  { code: "IT_LAPTOP_REPAIR", name: "Laptop Repair", parent: "IT", related: ["IT_LAPTOP_SCREEN", "IT_DATA_RECOVERY"], crossSellTo: ["IT_VIRUS_REMOVAL"], seasonalPeak: ["1", "6", "7"], avgPriceLKR: [2000, 25000], keywords: ["laptop repair", "laptop slow", "laptop not starting", "laptop overheating"] },
  { code: "IT_LAPTOP_SCREEN", name: "Laptop Screen Repair", parent: "IT", related: ["IT_LAPTOP_REPAIR"], crossSellTo: [], seasonalPeak: [], avgPriceLKR: [12000, 45000], keywords: ["laptop screen", "laptop display", "laptop cracked screen"] },
  { code: "IT_DATA_RECOVERY", name: "Data Recovery", parent: "IT", related: ["IT_LAPTOP_REPAIR"], crossSellTo: [], seasonalPeak: [], avgPriceLKR: [5000, 30000], keywords: ["data recovery", "lost files", "hard drive recovery", "ssd recovery"] },
  { code: "IT_VIRUS_REMOVAL", name: "Virus / Malware Removal", parent: "IT", related: ["IT_LAPTOP_REPAIR", "IT_NETWORK_SETUP"], crossSellTo: ["IT_NETWORK_SETUP"], seasonalPeak: [], avgPriceLKR: [3000, 8000], keywords: ["virus removal", "malware", "laptop virus", "computer virus", "slow computer"] },

  // Electronics
  { code: "ELECTRONICS_TV", name: "TV Repair", parent: "ELECTRONICS", related: ["ELECTRONICS_AUDIO"], crossSellTo: [], seasonalPeak: [], avgPriceLKR: [3000, 20000], keywords: ["tv repair", "tv not working", "tv screen", "smart tv", "tv no display"] },
  { code: "ELECTRONICS_AUDIO", name: "Audio / Speaker Repair", parent: "ELECTRONICS", related: ["ELECTRONICS_TV"], crossSellTo: [], seasonalPeak: [], avgPriceLKR: [2000, 10000], keywords: ["speaker repair", "audio repair", "sound system", "amplifier"] },

  // CCTV
  { code: "CCTV_INSTALL", name: "CCTV Installation", parent: "CCTV", related: ["CCTV_REPAIR", "NETWORK_SETUP"], crossSellTo: ["CCTV_REPAIR"], seasonalPeak: ["1", "12"], avgPriceLKR: [15000, 80000], keywords: ["cctv install", "security camera", "camera installation", "surveillance"] },
  { code: "CCTV_REPAIR", name: "CCTV Repair", parent: "CCTV", related: ["CCTV_INSTALL"], crossSellTo: [], seasonalPeak: [], avgPriceLKR: [3000, 15000], keywords: ["cctv repair", "camera not working", "dvr repair", "nvr repair"] },

  // Electrical
  { code: "ELECTRICAL_WIRING", name: "Electrical Wiring", parent: "ELECTRICAL", related: ["ELECTRICAL_REPAIR"], crossSellTo: ["ELECTRICAL_REPAIR"], seasonalPeak: [], avgPriceLKR: [1500, 25000], keywords: ["wiring", "electrical wiring", "rewiring", "new wiring"] },
  { code: "ELECTRICAL_REPAIR", name: "Electrical Repair", parent: "ELECTRICAL", related: ["ELECTRICAL_WIRING"], crossSellTo: [], seasonalPeak: ["10", "11"], avgPriceLKR: [1500, 10000], keywords: ["electrical repair", "power issue", "switch repair", "short circuit", "tripping"] },

  // Plumbing
  { code: "PLUMBING_REPAIR", name: "Plumbing Repair", parent: "PLUMBING", related: ["PLUMBING_INSTALL"], crossSellTo: [], seasonalPeak: ["5", "6", "10", "11"], avgPriceLKR: [1500, 15000], keywords: ["plumbing", "pipe leak", "tap repair", "toilet repair", "water leak", "drain blocked"] },

  // Network
  { code: "NETWORK_SETUP", name: "Network Setup", parent: "NETWORK", related: ["IT_VIRUS_REMOVAL"], crossSellTo: [], seasonalPeak: [], avgPriceLKR: [3000, 15000], keywords: ["wifi setup", "network setup", "router install", "internet slow", "wifi not working"] },

  // Solar
  { code: "SOLAR_INSTALL", name: "Solar Installation", parent: "SOLAR", related: ["SOLAR_MAINTENANCE"], crossSellTo: ["SOLAR_MAINTENANCE"], seasonalPeak: ["1", "2", "3"], avgPriceLKR: [150000, 800000], keywords: ["solar panel", "solar install", "solar power", "solar system"] },
  { code: "SOLAR_MAINTENANCE", name: "Solar Maintenance", parent: "SOLAR", related: ["SOLAR_INSTALL"], crossSellTo: [], seasonalPeak: ["6", "7"], avgPriceLKR: [5000, 15000], keywords: ["solar cleaning", "solar maintenance", "solar panel cleaning", "solar repair"] },
];

/**
 * Find services related to a given service code.
 */
export function getRelatedServices(serviceCode: string): ServiceNode[] {
  const node = SERVICE_KNOWLEDGE_GRAPH.find(n => n.code === serviceCode);
  if (!node) return [];
  return SERVICE_KNOWLEDGE_GRAPH.filter(n => node.related.includes(n.code));
}

/**
 * Find cross-sell opportunities for a completed service.
 */
export function getCrossSellServices(serviceCode: string): ServiceNode[] {
  const node = SERVICE_KNOWLEDGE_GRAPH.find(n => n.code === serviceCode);
  if (!node) return [];
  return SERVICE_KNOWLEDGE_GRAPH.filter(n => node.crossSellTo.includes(n.code));
}

/**
 * Match a search query to services using keyword matching.
 * Returns scored results sorted by relevance.
 */
export function matchSearchToServices(query: string): { node: ServiceNode; score: number }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: { node: ServiceNode; score: number }[] = [];

  for (const node of SERVICE_KNOWLEDGE_GRAPH) {
    let score = 0;
    for (const kw of node.keywords) {
      if (q.includes(kw)) score += kw.split(" ").length * 10; // longer matches score higher
      else if (kw.includes(q)) score += 5;
      else {
        // partial word match
        const words = kw.split(" ");
        for (const w of words) {
          if (q.includes(w) && w.length > 2) score += 3;
        }
      }
    }
    if (score > 0) results.push({ node, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get services by seasonal peak for a given month.
 */
export function getSeasonalServices(month: number): ServiceNode[] {
  const m = String(month);
  return SERVICE_KNOWLEDGE_GRAPH.filter(n => n.seasonalPeak.includes(m));
}

/**
 * Get all services under a parent category.
 */
export function getServicesByCategory(categoryCode: string): ServiceNode[] {
  return SERVICE_KNOWLEDGE_GRAPH.filter(n => n.parent === categoryCode);
}
