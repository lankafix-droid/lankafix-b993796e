/**
 * Content Surface Fallbacks — Evergreen content for when live sources are empty.
 * These are LankaFix-branded educational/knowledge items that always look good.
 * Covers all 15 service categories for comprehensive fallback coverage.
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
  // AC
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
  // MOBILE
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
  // MOBILE safety
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
  // SOLAR
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
  // NETWORK
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
  // CCTV
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
  // AC innovation
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
  // ELECTRICAL
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
  // SMART_HOME_OFFICE
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
  // IT
  {
    content_type: 'safety_alert',
    title: 'Ransomware attacks targeting small businesses up 150% this year',
    ai_headline: 'Small Business Alert: Ransomware Is Closer Than You Think',
    ai_summary_short: 'Small businesses in South Asia face a 150% increase in ransomware attacks, often through phishing emails.',
    ai_summary_medium: 'Cybercriminals are increasingly targeting small and medium businesses with ransomware delivered via phishing emails and compromised websites. Regular backups, updated software, and employee awareness training are the most effective defenses against these attacks.',
    ai_why_it_matters: 'Small businesses often lack dedicated IT security, making them prime targets for cyberattacks.',
    ai_lankafix_angle: 'LankaFix IT support specialists can help secure your business network and set up data backups.',
    ai_banner_text: '150% increase',
    ai_cta_label: 'Secure Your Business',
    ai_keywords: ['ransomware', 'cybersecurity', 'small business'],
    category_code: 'IT',
  },
  // PLUMBING
  {
    content_type: 'knowledge_fact',
    title: 'A dripping faucet wastes over 11,000 litres of water per year',
    ai_headline: 'That Dripping Tap Is Costing More Than You Think',
    ai_summary_short: 'A single dripping faucet can waste 11,000+ litres of water annually, adding to your water bill.',
    ai_summary_medium: 'Even a slow drip of one drop per second adds up to over 11,000 litres of wasted water per year. In Sri Lanka, where water supply can be inconsistent during dry seasons, fixing leaks promptly is both economically and environmentally responsible.',
    ai_why_it_matters: 'Water conservation is critical in Sri Lanka, especially during dry seasons when supply is limited.',
    ai_lankafix_angle: 'LankaFix plumbing professionals can fix leaks quickly and help you save on water bills.',
    ai_banner_text: '11,000L/year',
    ai_cta_label: 'Fix Leaks Now',
    ai_keywords: ['plumbing', 'water waste', 'leak repair'],
    category_code: 'PLUMBING',
  },
  // POWER_BACKUP
  {
    content_type: 'knowledge_fact',
    title: 'UPS batteries typically need replacement every 2-3 years',
    ai_headline: 'Your UPS Battery May Be Silently Failing',
    ai_summary_short: 'Most UPS batteries degrade after 2-3 years, leaving your equipment unprotected during power cuts.',
    ai_summary_medium: 'UPS batteries have a typical lifespan of 2-3 years regardless of usage. After this period, they may fail to provide adequate backup during power outages, potentially causing data loss or equipment damage. Regular testing and timely replacement is essential.',
    ai_why_it_matters: 'With frequent power fluctuations in Sri Lanka, a working UPS is essential for protecting electronics and data.',
    ai_lankafix_angle: 'LankaFix power backup specialists can test your UPS and replace batteries with quality alternatives.',
    ai_banner_text: '2-3 years',
    ai_cta_label: 'Check UPS Health',
    ai_keywords: ['UPS', 'power backup', 'battery replacement'],
    category_code: 'POWER_BACKUP',
  },
  // HOME_SECURITY
  {
    content_type: 'innovation',
    title: 'Smart locks and video doorbells transforming home security in Sri Lanka',
    ai_headline: 'Beyond CCTV: Smart Security for Modern Homes',
    ai_summary_short: 'Smart locks and video doorbells offer remote monitoring and keyless entry for Sri Lankan homes.',
    ai_summary_medium: 'Modern home security goes beyond traditional CCTV. Smart locks eliminate lost key risks, video doorbells allow you to see visitors remotely, and integrated systems send instant alerts to your phone. These solutions are increasingly affordable for Sri Lankan households.',
    ai_why_it_matters: 'Home security technology is evolving fast, offering more protection with less hassle.',
    ai_lankafix_angle: 'LankaFix home security experts can install and configure smart security systems for your property.',
    ai_banner_text: null,
    ai_cta_label: 'Upgrade Security',
    ai_keywords: ['smart locks', 'home security', 'video doorbell'],
    category_code: 'HOME_SECURITY',
  },
  // CONSUMER_ELEC
  {
    content_type: 'how_to',
    title: 'Cleaning your TV screen properly avoids permanent damage',
    ai_headline: 'Stop! Are You Cleaning Your TV the Wrong Way?',
    ai_summary_short: 'Using wrong cleaning products on modern TV screens can cause permanent damage to the display coating.',
    ai_summary_medium: 'Modern LED and OLED TVs have delicate anti-reflective coatings that can be permanently damaged by alcohol-based cleaners, paper towels, or rough cloths. Use only microfiber cloths with distilled water or screen-specific cleaners to safely maintain your display.',
    ai_why_it_matters: 'A replacement TV screen often costs more than a new TV — proper care prevents expensive mistakes.',
    ai_lankafix_angle: 'If your TV needs professional repair, LankaFix connects you with certified electronics technicians.',
    ai_banner_text: null,
    ai_cta_label: 'Get TV Help',
    ai_keywords: ['TV care', 'screen cleaning', 'electronics maintenance'],
    category_code: 'CONSUMER_ELEC',
  },
  // APPLIANCE_INSTALL
  {
    content_type: 'knowledge_fact',
    title: 'Professional appliance installation reduces warranty void risk by 95%',
    ai_headline: 'DIY Installation Could Void Your Appliance Warranty',
    ai_summary_short: 'Manufacturer warranties often require professional installation — DIY attempts can void your coverage.',
    ai_summary_medium: 'Most major appliance manufacturers require professional installation for warranty validity. Incorrect installation of washing machines, air conditioners, and water heaters can not only void warranties but also create safety hazards including water damage and electrical risks.',
    ai_why_it_matters: 'Protecting your warranty saves money on repairs and ensures your appliance performs as designed.',
    ai_lankafix_angle: 'LankaFix certified installers ensure your appliances are set up correctly with warranty intact.',
    ai_banner_text: '95%',
    ai_cta_label: 'Book Installation',
    ai_keywords: ['appliance installation', 'warranty', 'professional setup'],
    category_code: 'APPLIANCE_INSTALL',
  },
  // COPIER
  {
    content_type: 'knowledge_fact',
    title: 'Regular copier maintenance extends machine life by 3-5 years',
    ai_headline: 'Your Office Copier Needs More Than Just Paper',
    ai_summary_short: 'Routine copier maintenance prevents costly breakdowns and extends equipment life significantly.',
    ai_summary_medium: 'Office copiers and multifunction printers require regular drum cleaning, fuser maintenance, and roller replacements to perform reliably. Neglected machines suffer from print quality degradation, paper jams, and premature failure — costing businesses significantly more in emergency repairs and downtime.',
    ai_why_it_matters: 'For Sri Lankan businesses, copier downtime directly impacts productivity and client deliverables.',
    ai_lankafix_angle: 'LankaFix copier maintenance specialists keep your office equipment running at peak performance.',
    ai_banner_text: '3-5 years',
    ai_cta_label: 'Service Copier',
    ai_keywords: ['copier maintenance', 'office equipment', 'printer repair'],
    category_code: 'COPIER',
  },
  // PRINT_SUPPLIES
  {
    content_type: 'safety_alert',
    title: 'Counterfeit toner cartridges can damage printers and void warranties',
    ai_headline: 'Fake Toner Alert: Protect Your Printer Investment',
    ai_summary_short: 'Non-genuine toner cartridges risk damaging your printer and producing poor quality output.',
    ai_summary_medium: 'Counterfeit and low-quality toner cartridges may save money upfront but frequently cause drum damage, toner leaks, and print quality issues. Many printer manufacturers will void warranties if non-genuine supplies are detected during service calls.',
    ai_why_it_matters: 'Using genuine supplies protects your equipment investment and ensures consistent print quality.',
    ai_lankafix_angle: 'LankaFix can source genuine printer supplies and provide professional cartridge replacement services.',
    ai_banner_text: null,
    ai_cta_label: 'Get Genuine Supplies',
    ai_keywords: ['toner', 'printer supplies', 'genuine cartridge'],
    category_code: 'PRINT_SUPPLIES',
  },
  // Market shift
  {
    content_type: 'market_shift',
    title: 'Sri Lanka electricity tariff restructuring impacts household energy costs',
    ai_headline: 'New Tariff Rates: What It Means for Your Home',
    ai_summary_short: 'Recent CEB tariff changes affect monthly energy costs for homes and businesses across Sri Lanka.',
    ai_summary_medium: 'The restructuring of electricity tariffs by the Ceylon Electricity Board impacts how much Sri Lankan households pay for power. Higher consumption brackets face steeper rates, making energy-efficient appliances and solar installations more attractive than ever for cost-conscious homeowners.',
    ai_why_it_matters: 'Understanding the new tariff structure helps you make smarter decisions about energy use and equipment upgrades.',
    ai_lankafix_angle: 'LankaFix can help you reduce energy costs through efficient AC servicing, solar installation, and smart home solutions.',
    ai_banner_text: null,
    ai_cta_label: 'Reduce Energy Bills',
    ai_keywords: ['electricity tariff', 'CEB', 'energy costs', 'Sri Lanka'],
    category_code: 'ELECTRICAL',
  },
];
