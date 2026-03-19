/**
 * Content Surface Fallbacks — Evergreen content for when live sources are empty.
 * These are LankaFix-branded educational/knowledge items that always look good.
 */

export interface EvergreenFallback {
  content_type: string;
  title: string;
  ai_headline: string;
  ai_summary_short: string;
  ai_summary_medium: string;
  ai_why_it_matters: string;
  ai_lankafix_angle: string;
  ai_banner_text: string | null;
  ai_cta_label: string;
  ai_keywords: string[];
  category_code: string;
}

export const EVERGREEN_FALLBACKS: EvergreenFallback[] = [
  {
    content_type: 'knowledge_fact',
    title: 'Regular AC servicing can reduce energy bills by 15-25%',
    ai_headline: 'AC Servicing Saves You More Than You Think',
    ai_summary_short: 'Regular AC maintenance reduces energy consumption by 15-25% and extends unit lifespan.',
    ai_summary_medium: 'A well-maintained air conditioner uses 15-25% less energy than a neglected one. Regular filter cleaning and refrigerant checks keep your unit running efficiently, saving thousands of rupees annually on electricity bills while extending the lifespan of your investment.',
    ai_why_it_matters: 'With rising electricity costs in Sri Lanka, regular AC servicing is one of the simplest ways to reduce household expenses.',
    ai_lankafix_angle: 'Book a professional AC service through LankaFix to keep your cooling efficient and your bills low.',
    ai_banner_text: '15-25%',
    ai_cta_label: 'Book AC Service',
    ai_keywords: ['AC servicing', 'energy savings', 'maintenance'],
    category_code: 'AC',
  },
  {
    content_type: 'knowledge_fact',
    title: 'Battery health drops significantly after 500 charge cycles',
    ai_headline: 'Your Phone Battery Has a Hidden Expiry Date',
    ai_summary_short: 'Most smartphone batteries degrade noticeably after 500 full charge cycles.',
    ai_summary_medium: 'Smartphone lithium-ion batteries are designed to retain about 80% capacity after 500 complete charge cycles. After this point, you may notice faster battery drain and unexpected shutdowns. Proper charging habits can extend battery life significantly.',
    ai_why_it_matters: 'Understanding battery lifecycle helps you decide between a battery replacement and a new device purchase.',
    ai_lankafix_angle: 'LankaFix verified technicians can diagnose battery health and replace batteries with genuine parts.',
    ai_banner_text: '500 cycles',
    ai_cta_label: 'Check Battery Health',
    ai_keywords: ['battery health', 'phone repair', 'battery replacement'],
    category_code: 'MOBILE',
  },
  {
    content_type: 'safety_alert',
    title: 'Counterfeit phone chargers pose fire and device damage risks',
    ai_headline: 'Why Cheap Chargers Could Cost You Your Phone',
    ai_summary_short: 'Non-certified chargers lack proper voltage regulation, risking device damage and fire hazards.',
    ai_summary_medium: 'Counterfeit and uncertified phone chargers often lack voltage regulation circuits, surge protection, and proper insulation. This can lead to overcharging, overheating, battery swelling, and in extreme cases, fire. Always use certified chargers from reputable sources.',
    ai_why_it_matters: 'Protecting your device from damage caused by fake accessories saves money and prevents safety hazards.',
    ai_lankafix_angle: 'LankaFix technicians use only genuine, certified parts for all repairs and replacements.',
    ai_banner_text: null,
    ai_cta_label: 'Get Genuine Parts',
    ai_keywords: ['counterfeit chargers', 'phone safety', 'genuine parts'],
    category_code: 'MOBILE',
  },
  {
    content_type: 'numbers_insight',
    title: 'Solar panels can pay for themselves within 4-6 years in Sri Lanka',
    ai_headline: 'Solar ROI: Break Even in Under 6 Years',
    ai_summary_short: 'With current electricity rates, residential solar systems in Sri Lanka achieve ROI in 4-6 years.',
    ai_summary_medium: 'Based on current CEB electricity tariffs and average solar irradiation in Sri Lanka, a typical residential solar installation pays for itself within 4-6 years through electricity savings and net metering credits. After the payback period, the remaining 15-20 years of panel life is essentially free energy.',
    ai_why_it_matters: 'Solar energy is increasingly the smartest long-term investment for Sri Lankan homeowners facing rising electricity costs.',
    ai_lankafix_angle: 'LankaFix connects you with verified solar installation and maintenance professionals.',
    ai_banner_text: '4-6 years',
    ai_cta_label: 'Explore Solar Services',
    ai_keywords: ['solar ROI', 'energy savings', 'solar installation'],
    category_code: 'SOLAR',
  },
  {
    content_type: 'how_to',
    title: 'Simple router restart can fix 70% of common WiFi issues',
    ai_headline: 'The 70% Fix: Why Restarting Your Router Actually Works',
    ai_summary_short: 'A simple power cycle resolves most common WiFi connectivity problems instantly.',
    ai_summary_medium: 'About 70% of common WiFi issues — slow speeds, dropped connections, device disconnections — can be resolved by simply unplugging your router for 30 seconds and plugging it back in. This clears the router\'s memory cache and re-establishes connections with your ISP.',
    ai_why_it_matters: 'Knowing simple fixes saves you time and money before calling for professional network support.',
    ai_lankafix_angle: 'If a restart doesn\'t fix it, LankaFix network specialists can diagnose deeper connectivity issues.',
    ai_banner_text: '70%',
    ai_cta_label: 'Get Network Help',
    ai_keywords: ['WiFi fix', 'router restart', 'network troubleshooting'],
    category_code: 'NETWORK',
  },
  {
    content_type: 'knowledge_fact',
    title: 'CCTV systems with proper maintenance last 5-10 years longer',
    ai_headline: 'Proper CCTV Maintenance Doubles System Lifespan',
    ai_summary_short: 'Regular cleaning and firmware updates can extend CCTV system life by 5-10 years.',
    ai_summary_medium: 'Security cameras that receive regular maintenance — lens cleaning, firmware updates, cable checks, and storage management — can last 10-15 years compared to 5-7 years for neglected systems. This represents significant savings on replacement costs.',
    ai_why_it_matters: 'Security system reliability depends on regular maintenance, not just initial installation quality.',
    ai_lankafix_angle: 'LankaFix offers professional CCTV maintenance plans to keep your security system in peak condition.',
    ai_banner_text: '2x lifespan',
    ai_cta_label: 'Book CCTV Service',
    ai_keywords: ['CCTV maintenance', 'security cameras', 'system lifespan'],
    category_code: 'CCTV',
  },
  {
    content_type: 'hot_topic',
    title: 'Inverter technology reducing electricity bills across Sri Lankan homes',
    ai_headline: 'Inverter Tech: The Quiet Revolution in Sri Lankan Homes',
    ai_summary_short: 'Inverter ACs and appliances are helping Sri Lankan families cut electricity bills by up to 40%.',
    ai_summary_medium: 'The adoption of inverter technology in air conditioners, refrigerators, and washing machines is growing rapidly in Sri Lanka. These appliances adjust their compressor speed based on demand rather than cycling on and off, resulting in energy savings of 30-40% compared to conventional models.',
    ai_why_it_matters: 'Upgrading to inverter technology is one of the most impactful ways to reduce household energy costs.',
    ai_lankafix_angle: 'LankaFix technicians can service and maintain all inverter-based appliances for optimal efficiency.',
    ai_banner_text: '30-40% savings',
    ai_cta_label: 'Service Your Inverter',
    ai_keywords: ['inverter technology', 'energy efficiency', 'electricity savings'],
    category_code: 'AC',
  },
  {
    content_type: 'most_read',
    title: 'Regular electrical inspections prevent 80% of household electrical fires',
    ai_headline: 'One Inspection Could Prevent a Household Disaster',
    ai_summary_short: 'Periodic electrical wiring inspections can prevent the majority of residential electrical fires.',
    ai_summary_medium: 'Studies show that regular electrical inspections — checking wiring condition, circuit breaker functionality, and grounding — can prevent up to 80% of residential electrical fires. In Sri Lanka\'s tropical climate, moisture and heat accelerate wire insulation degradation.',
    ai_why_it_matters: 'Electrical safety is critical in tropical climates where moisture accelerates wiring degradation.',
    ai_lankafix_angle: 'Book a certified electrical safety inspection through LankaFix for peace of mind.',
    ai_banner_text: '80%',
    ai_cta_label: 'Book Safety Check',
    ai_keywords: ['electrical safety', 'fire prevention', 'wiring inspection'],
    category_code: 'ELECTRICAL',
  },
  {
    content_type: 'innovation',
    title: 'Smart home automation adoption growing 45% year-over-year in Sri Lanka',
    ai_headline: 'Smart Homes Are No Longer Just for the Wealthy',
    ai_summary_short: 'Affordable smart home devices are driving a 45% annual growth in home automation across Sri Lanka.',
    ai_summary_medium: 'Smart plugs, automated lighting, and voice-controlled systems are becoming mainstream in Sri Lankan households. With devices now available from LKR 2,000, the barrier to entry has dropped significantly. This trend is driving demand for professional installation and network setup services.',
    ai_why_it_matters: 'Smart home technology is creating new service opportunities and changing how Sri Lankans interact with their homes.',
    ai_lankafix_angle: 'LankaFix smart home specialists can set up, configure, and maintain your connected home devices.',
    ai_banner_text: '45% growth',
    ai_cta_label: 'Smart Home Setup',
    ai_keywords: ['smart home', 'home automation', 'IoT'],
    category_code: 'SMART_HOME_OFFICE',
  },
];
