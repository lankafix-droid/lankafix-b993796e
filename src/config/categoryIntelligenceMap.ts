/**
 * Category Intelligence Map
 * Maps LankaFix service categories to content themes for relevance scoring.
 */

export interface CategoryContentThemes {
  newsTopics: string[];
  innovationTopics: string[];
  scamSafetyThemes: string[];
  educationThemes: string[];
  seasonalThemes: string[];
  trendThemes: string[];
  numbersThemes: string[];
  sriLankaThemes: string[];
  bookingAssistThemes: string[];
}

export const CATEGORY_INTELLIGENCE_MAP: Record<string, CategoryContentThemes> = {
  MOBILE: {
    newsTopics: ['smartphone repair', 'mobile device', 'phone durability', 'right to repair', 'device recall'],
    innovationTopics: ['foldable phone', 'battery technology', 'display technology', 'repairability index', 'modular phone'],
    scamSafetyThemes: ['counterfeit parts', 'fake screen replacement', 'phone scam', 'stolen device', 'IMEI fraud'],
    educationThemes: ['battery care', 'screen protection', 'water damage prevention', 'genuine parts', 'phone maintenance'],
    seasonalThemes: ['monsoon phone protection', 'new year phone deals', 'back to school devices'],
    trendThemes: ['screen repair demand', 'battery replacement trend', 'used phone market', 'trade-in programs'],
    numbersThemes: ['screen repair cost', 'battery lifespan', 'phone repair frequency', 'parts pricing'],
    sriLankaThemes: ['Sri Lanka mobile market', 'local phone repair', 'import regulations', 'popular phone brands LK'],
    bookingAssistThemes: ['when to repair vs replace', 'genuine vs aftermarket parts', 'repair warranty'],
  },
  AC: {
    newsTopics: ['air conditioning', 'HVAC', 'cooling technology', 'energy efficiency', 'heat wave'],
    innovationTopics: ['inverter technology', 'smart AC', 'energy-efficient cooling', 'eco-friendly refrigerant'],
    scamSafetyThemes: ['fake refrigerant', 'unlicensed AC repair', 'overcharging AC service', 'gas refill scam'],
    educationThemes: ['AC maintenance tips', 'filter cleaning', 'optimal temperature', 'energy saving cooling'],
    seasonalThemes: ['pre-summer AC service', 'monsoon humidity', 'dry season cooling', 'festival season comfort'],
    trendThemes: ['inverter AC adoption', 'smart home cooling', 'commercial HVAC', 'split vs window'],
    numbersThemes: ['AC servicing cost', 'energy savings inverter', 'cooling efficiency', 'service frequency'],
    sriLankaThemes: ['Sri Lanka heat index', 'tropical cooling needs', 'electricity costs LK', 'popular AC brands LK'],
    bookingAssistThemes: ['AC service frequency', 'gas refill signs', 'when to replace AC', 'compressor repair vs replace'],
  },
  IT: {
    newsTopics: ['cybersecurity', 'laptop repair', 'data recovery', 'malware', 'tech support'],
    innovationTopics: ['AI tools', 'cloud computing', 'remote work tech', 'productivity software'],
    scamSafetyThemes: ['tech support scam', 'phishing', 'ransomware', 'fake antivirus', 'data theft'],
    educationThemes: ['laptop maintenance', 'backup strategy', 'password security', 'software updates'],
    seasonalThemes: ['back to work IT setup', 'year-end data cleanup', 'new year tech refresh'],
    trendThemes: ['remote work tools', 'cloud migration', 'AI productivity', 'endpoint security'],
    numbersThemes: ['data breach cost', 'laptop lifespan', 'IT support response time', 'backup statistics'],
    sriLankaThemes: ['Sri Lanka IT sector', 'local tech support', 'ISP issues LK', 'BPO industry growth'],
    bookingAssistThemes: ['slow laptop diagnosis', 'virus removal', 'data recovery options', 'network setup'],
  },
  CCTV: {
    newsTopics: ['surveillance', 'security camera', 'home security', 'smart monitoring'],
    innovationTopics: ['AI camera', '4K surveillance', 'cloud recording', 'facial recognition', 'night vision'],
    scamSafetyThemes: ['fake CCTV brands', 'poor installation', 'privacy violation', 'data security camera'],
    educationThemes: ['camera placement', 'storage options', 'night vision importance', 'remote monitoring setup'],
    seasonalThemes: ['holiday security', 'festival season protection', 'monsoon-proof cameras'],
    trendThemes: ['wireless cameras', 'AI detection', 'solar powered CCTV', 'cloud storage adoption'],
    numbersThemes: ['burglary statistics', 'camera effectiveness', 'installation cost', 'storage costs'],
    sriLankaThemes: ['Sri Lanka security needs', 'commercial CCTV LK', 'residential security trends LK'],
    bookingAssistThemes: ['how many cameras needed', 'wired vs wireless', 'NVR vs DVR', 'maintenance schedule'],
  },
  SOLAR: {
    newsTopics: ['solar energy', 'renewable energy', 'solar panel', 'inverter', 'battery storage'],
    innovationTopics: ['solar efficiency', 'battery technology', 'smart inverter', 'bifacial panels', 'microinverter'],
    scamSafetyThemes: ['solar scam', 'fake panels', 'oversized system sales', 'warranty fraud'],
    educationThemes: ['solar maintenance', 'panel cleaning', 'inverter care', 'net metering basics'],
    seasonalThemes: ['dry season output', 'monsoon solar performance', 'year-end energy review'],
    trendThemes: ['rooftop solar adoption', 'battery backup demand', 'EV charging solar', 'community solar'],
    numbersThemes: ['solar ROI', 'payback period', 'electricity savings', 'panel degradation rate'],
    sriLankaThemes: ['Sri Lanka solar policy', 'CEB net metering', 'tropical solar advantage', 'local installers'],
    bookingAssistThemes: ['system sizing', 'inverter replacement', 'panel inspection', 'battery upgrade'],
  },
  CONSUMER_ELEC: {
    newsTopics: ['electronics repair', 'appliance recall', 'product safety', 'consumer electronics'],
    innovationTopics: ['smart appliance', 'energy efficient devices', 'IoT home devices'],
    scamSafetyThemes: ['counterfeit electronics', 'fake warranty', 'repair fraud'],
    educationThemes: ['appliance care', 'power surge protection', 'device lifespan tips'],
    seasonalThemes: ['festive electronics deals', 'new year electronics setup'],
    trendThemes: ['smart TV repair', 'streaming device issues', 'audio equipment care'],
    numbersThemes: ['repair vs replace cost', 'appliance lifespan', 'warranty claim rates'],
    sriLankaThemes: ['popular electronics LK', 'import duty impact', 'local repair market'],
    bookingAssistThemes: ['TV repair options', 'audio system service', 'home theater setup'],
  },
  SMART_HOME_OFFICE: {
    newsTopics: ['smart home', 'home automation', 'IoT devices', 'smart office'],
    innovationTopics: ['voice assistant', 'smart lighting', 'home automation hub', 'energy management'],
    scamSafetyThemes: ['IoT security', 'smart device hacking', 'privacy risks'],
    educationThemes: ['smart home setup', 'device integration', 'automation tips', 'network security'],
    seasonalThemes: ['smart home for festive season', 'energy management summer'],
    trendThemes: ['matter protocol', 'smart energy', 'home office automation'],
    numbersThemes: ['smart home adoption', 'energy savings automation', 'device connectivity stats'],
    sriLankaThemes: ['smart home LK adoption', 'local smart home installers', 'compatible devices LK'],
    bookingAssistThemes: ['smart home consultation', 'device troubleshooting', 'network optimization'],
  },
  ELECTRICAL: {
    newsTopics: ['electrical safety', 'wiring standards', 'power outage', 'electrical fire'],
    innovationTopics: ['smart circuit breaker', 'EV charger', 'energy monitor', 'LED technology'],
    scamSafetyThemes: ['unlicensed electrician', 'substandard wiring', 'fake MCB', 'electrical fire risk'],
    educationThemes: ['electrical safety home', 'circuit breaker maintenance', 'earthing importance', 'surge protection'],
    seasonalThemes: ['monsoon electrical safety', 'festive lighting safety', 'storm preparedness'],
    trendThemes: ['EV charging installation', 'smart metering', 'energy audit demand'],
    numbersThemes: ['electrical fire statistics', 'wiring lifespan', 'energy consumption data'],
    sriLankaThemes: ['CEB standards', 'Sri Lanka electrical code', 'local electrician certification'],
    bookingAssistThemes: ['wiring inspection', 'circuit upgrade', 'earthing test', 'emergency electrical'],
  },
  PLUMBING: {
    newsTopics: ['plumbing', 'water conservation', 'pipe standards', 'water quality'],
    innovationTopics: ['smart water monitor', 'tankless water heater', 'water recycling system'],
    scamSafetyThemes: ['substandard pipes', 'overcharging plumber', 'hidden damage claims'],
    educationThemes: ['pipe maintenance', 'leak detection', 'water heater care', 'drain maintenance'],
    seasonalThemes: ['monsoon drainage prep', 'dry season water conservation', 'pre-festive plumbing check'],
    trendThemes: ['water efficiency', 'smart leak detection', 'rainwater harvesting'],
    numbersThemes: ['water waste from leaks', 'plumbing repair cost', 'pipe lifespan data'],
    sriLankaThemes: ['water board standards LK', 'local plumbing practices', 'water quality LK'],
    bookingAssistThemes: ['emergency leak repair', 'pipe replacement', 'water heater service', 'drain clearing'],
  },
  NETWORK: {
    newsTopics: ['internet service', 'WiFi', 'network security', 'broadband', '5G'],
    innovationTopics: ['WiFi 7', 'mesh networking', 'fiber optic', 'network automation'],
    scamSafetyThemes: ['fake ISP calls', 'WiFi hacking', 'DNS hijacking'],
    educationThemes: ['router placement', 'WiFi optimization', 'network security basics', 'speed testing'],
    seasonalThemes: ['work from home connectivity', 'streaming season bandwidth'],
    trendThemes: ['fiber adoption', 'mesh WiFi', '5G home internet'],
    numbersThemes: ['average broadband speed LK', 'internet penetration', 'network downtime cost'],
    sriLankaThemes: ['Sri Lanka ISPs', 'fiber rollout LK', 'internet pricing LK'],
    bookingAssistThemes: ['WiFi setup', 'network troubleshooting', 'router configuration', 'cable management'],
  },
  POWER_BACKUP: {
    newsTopics: ['power backup', 'UPS', 'generator', 'battery backup', 'power outage'],
    innovationTopics: ['lithium UPS', 'smart inverter', 'solar backup integration', 'whole home battery'],
    scamSafetyThemes: ['fake UPS batteries', 'overrated generators', 'unsafe backup wiring'],
    educationThemes: ['UPS maintenance', 'battery replacement timing', 'generator safety', 'load calculation'],
    seasonalThemes: ['monsoon power cuts', 'storm season preparedness', 'dry season stable power'],
    trendThemes: ['home battery adoption', 'solar+battery combo', 'commercial backup solutions'],
    numbersThemes: ['power outage frequency LK', 'UPS cost comparison', 'battery lifespan data'],
    sriLankaThemes: ['CEB outage patterns', 'Sri Lanka power grid', 'local backup solutions'],
    bookingAssistThemes: ['UPS sizing', 'battery replacement', 'generator servicing', 'backup system installation'],
  },
  HOME_SECURITY: {
    newsTopics: ['home security', 'alarm system', 'access control', 'smart lock'],
    innovationTopics: ['smart doorbell', 'biometric lock', 'AI security', 'integrated alarm'],
    scamSafetyThemes: ['fake security company', 'poor alarm installation', 'security system hacking'],
    educationThemes: ['security assessment', 'alarm maintenance', 'access control basics', 'security layers'],
    seasonalThemes: ['holiday home security', 'festive season protection', 'travel security tips'],
    trendThemes: ['smart lock adoption', 'video doorbell', 'integrated security systems'],
    numbersThemes: ['break-in statistics', 'alarm effectiveness', 'security system costs'],
    sriLankaThemes: ['Sri Lanka home security market', 'gated community trends', 'residential alarm adoption'],
    bookingAssistThemes: ['security assessment', 'alarm installation', 'smart lock setup', 'system upgrade'],
  },
  APPLIANCE_INSTALL: {
    newsTopics: ['appliance installation', 'appliance safety', 'product recall'],
    innovationTopics: ['smart appliance', 'energy efficient appliance', 'connected home'],
    scamSafetyThemes: ['improper installation', 'warranty voiding', 'non-certified installer'],
    educationThemes: ['proper installation importance', 'ventilation requirements', 'electrical requirements'],
    seasonalThemes: ['new home appliance setup', 'renovation season', 'festive appliance deals'],
    trendThemes: ['built-in appliances', 'smart kitchen', 'energy star adoption'],
    numbersThemes: ['installation cost data', 'appliance lifespan', 'warranty claim rates'],
    sriLankaThemes: ['popular appliance brands LK', 'local installation standards', 'voltage compatibility'],
    bookingAssistThemes: ['washer installation', 'oven setup', 'dishwasher installation', 'AC mounting'],
  },
  COPIER: {
    newsTopics: ['copier maintenance', 'printer technology', 'office equipment'],
    innovationTopics: ['cloud printing', 'smart MFP', 'eco-friendly printing'],
    scamSafetyThemes: ['fake toner', 'copier lease scam', 'overpriced service contracts'],
    educationThemes: ['copier maintenance', 'toner vs ink', 'paper jam prevention', 'drum care'],
    seasonalThemes: ['back to office printing', 'year-end document archiving'],
    trendThemes: ['paperless office', 'managed print services', 'refurbished copiers'],
    numbersThemes: ['cost per page', 'print volume statistics', 'copier lifespan data'],
    sriLankaThemes: ['office equipment market LK', 'local copier brands', 'service availability'],
    bookingAssistThemes: ['copier servicing', 'toner replacement', 'paper feed issues', 'network printing setup'],
  },
  PRINT_SUPPLIES: {
    newsTopics: ['printing supplies', 'toner cartridge', 'ink technology'],
    innovationTopics: ['eco ink', 'high yield cartridge', 'refill technology'],
    scamSafetyThemes: ['counterfeit cartridge', 'refilled toner quality', 'fake original supplies'],
    educationThemes: ['genuine vs compatible', 'storage tips', 'cartridge recycling', 'yield optimization'],
    seasonalThemes: ['bulk supply planning', 'year-end stock up'],
    trendThemes: ['subscription ink', 'eco printing', 'digital vs print'],
    numbersThemes: ['ink cost comparison', 'yield per cartridge', 'printing cost trends'],
    sriLankaThemes: ['local supply availability', 'import pricing', 'genuine dealer network LK'],
    bookingAssistThemes: ['supply consultation', 'compatible cartridge advice', 'printer supply setup'],
  },
};

/** Get all theme keywords for a category (flat list for matching) */
export function getCategoryKeywords(categoryCode: string): string[] {
  const themes = CATEGORY_INTELLIGENCE_MAP[categoryCode];
  if (!themes) return [];
  return [
    ...themes.newsTopics,
    ...themes.innovationTopics,
    ...themes.scamSafetyThemes,
    ...themes.educationThemes,
    ...themes.trendThemes,
    ...themes.sriLankaThemes,
  ];
}

/** Score content relevance to a category (0-1) */
export function scoreCategoryRelevance(text: string, categoryCode: string): number {
  const keywords = getCategoryKeywords(categoryCode);
  if (!keywords.length || !text) return 0;
  const lower = text.toLowerCase();
  const matches = keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
  return Math.min(1, matches / Math.max(3, keywords.length * 0.15));
}
