// Smart Upsell Engine — post-booking recommendations by category
export interface UpsellRecommendation {
  id: string;
  label: string;
  description: string;
  estimatedPrice: string;
  type: 'addon' | 'upgrade' | 'subscription' | 'product';
}

const UPSELL_MAP: Record<string, UpsellRecommendation[]> = {
  AC: [
    { id: 'ac-coil', label: 'Deep Coil Cleaning', description: 'Remove stubborn buildup for better cooling', estimatedPrice: 'LKR 2,500 – 4,000', type: 'addon' },
    { id: 'ac-gas', label: 'Gas Top-Up', description: 'Restore optimal cooling performance', estimatedPrice: 'LKR 8,000 – 18,000', type: 'addon' },
    { id: 'ac-care', label: 'AC Annual Care Plan', description: '2 services/year with priority booking', estimatedPrice: 'LKR 4,500/year', type: 'subscription' },
  ],
  MOBILE: [
    { id: 'mob-guard', label: 'Tempered Glass + Case', description: 'Protect your new screen', estimatedPrice: 'LKR 800 – 2,500', type: 'product' },
    { id: 'mob-battery', label: 'Battery Replacement', description: 'Restore full-day battery life', estimatedPrice: 'LKR 3,000 – 8,000', type: 'addon' },
  ],
  IT: [
    { id: 'it-ssd', label: 'SSD Upgrade', description: '5× faster boot and app loading', estimatedPrice: 'LKR 8,000 – 18,000', type: 'upgrade' },
    { id: 'it-thermal', label: 'Thermal Paste Refresh', description: 'Reduce overheating and fan noise', estimatedPrice: 'LKR 1,500 – 3,000', type: 'addon' },
    { id: 'it-backup', label: 'Data Backup Service', description: 'Secure your files before any repair', estimatedPrice: 'LKR 2,000 – 5,000', type: 'addon' },
  ],
  CCTV: [
    { id: 'cctv-cloud', label: 'Cloud Storage Plan', description: '30-day cloud recording backup', estimatedPrice: 'LKR 1,500/month', type: 'subscription' },
    { id: 'cctv-maint', label: 'Annual CCTV Maintenance', description: 'Cleaning, alignment & health check', estimatedPrice: 'LKR 5,000/year', type: 'subscription' },
  ],
  ELECTRICAL: [
    { id: 'elec-surge', label: 'Surge Protector Installation', description: 'Protect appliances from power spikes', estimatedPrice: 'LKR 3,000 – 8,000', type: 'addon' },
    { id: 'elec-earthing', label: 'Earthing Check', description: 'Ensure safety compliance', estimatedPrice: 'LKR 2,000 – 4,000', type: 'addon' },
  ],
  PLUMBING: [
    { id: 'plumb-filter', label: 'Water Filter Installation', description: 'Clean drinking water for your home', estimatedPrice: 'LKR 5,000 – 15,000', type: 'addon' },
    { id: 'plumb-tank', label: 'Tank Cleaning', description: 'Annual water tank sanitization', estimatedPrice: 'LKR 3,000 – 6,000', type: 'addon' },
  ],
  SOLAR: [
    { id: 'solar-monitor', label: 'Performance Monitoring Plan', description: 'Annual inspection + performance report', estimatedPrice: 'LKR 8,000/year', type: 'subscription' },
    { id: 'solar-battery', label: 'Battery Storage Add-on', description: 'Store excess solar energy', estimatedPrice: 'LKR 150,000 – 400,000', type: 'upgrade' },
  ],
  NETWORK: [
    { id: 'net-mesh', label: 'Mesh WiFi Upgrade', description: 'Eliminate dead zones in your home', estimatedPrice: 'LKR 15,000 – 35,000', type: 'upgrade' },
    { id: 'net-ups', label: 'Network UPS', description: 'Keep internet during power cuts', estimatedPrice: 'LKR 8,000 – 15,000', type: 'product' },
  ],
  SMART_HOME: [
    { id: 'smart-voice', label: 'Voice Assistant Setup', description: 'Control your home with voice commands', estimatedPrice: 'LKR 12,000 – 25,000', type: 'addon' },
  ],
  SECURITY: [
    { id: 'sec-alarm', label: 'Smart Alarm Add-on', description: 'Motion-triggered alerts to your phone', estimatedPrice: 'LKR 8,000 – 20,000', type: 'addon' },
  ],
  POWER_BACKUP: [
    { id: 'ups-maint', label: 'UPS Battery Replacement', description: 'Restore full backup capacity', estimatedPrice: 'LKR 5,000 – 15,000', type: 'addon' },
  ],
  APPLIANCE_INSTALL: [
    { id: 'appl-care', label: 'Appliance Care Plan', description: 'Annual check-up for all appliances', estimatedPrice: 'LKR 3,500/year', type: 'subscription' },
  ],
  ELECTRONICS: [
    { id: 'tv-mount', label: 'Wall Mount Installation', description: 'Clean cable-free TV setup', estimatedPrice: 'LKR 3,000 – 6,000', type: 'addon' },
  ],
  COPIER: [
    { id: 'copier-toner', label: 'Toner Subscription', description: 'Auto-delivery before you run out', estimatedPrice: 'LKR 4,000 – 12,000/refill', type: 'subscription' },
  ],
  SUPPLIES: [
    { id: 'supplies-bulk', label: 'Bulk Order Discount', description: 'Save 15% on 5+ cartridge orders', estimatedPrice: 'Varies', type: 'product' },
  ],
};

export function getUpsellsForCategory(categoryCode: string): UpsellRecommendation[] {
  return UPSELL_MAP[categoryCode] || [];
}

export function getTopUpsell(categoryCode: string): UpsellRecommendation | null {
  const upsells = UPSELL_MAP[categoryCode];
  return upsells?.[0] ?? null;
}
