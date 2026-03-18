/**
 * Sri Lankan Seasonal Demand Triggers
 * Rule-based config for market condition–driven campaign boosts.
 * Architecture-ready for future AI forecasting integration.
 */
import type { SeasonalTrigger } from '@/types/campaign';

export const SRI_LANKAN_SEASONAL_TRIGGERS: SeasonalTrigger[] = [
  {
    id: 'heat-wave-ac',
    name: 'Hot Weather AC Demand',
    activeMonths: [3, 4, 5, 6, 7, 8], // Mar–Aug peak heat
    boostedCategories: ['AC'],
    priorityBoost: 15,
    condition: 'Colombo dry season / high temperature period',
  },
  {
    id: 'rainy-season-cctv',
    name: 'Rainy Season CCTV & Appliance Risk',
    activeMonths: [10, 11, 12, 1, 2], // Oct–Feb monsoon
    boostedCategories: ['CCTV', 'CONSUMER_ELEC', 'ELECTRICAL'],
    priorityBoost: 10,
    condition: 'Northeast monsoon / intermonsoon rainfall',
  },
  {
    id: 'school-reopening',
    name: 'School Reopening Device Demand',
    activeMonths: [1, 5, 9], // Jan, May, Sep term starts
    boostedCategories: ['IT', 'COPIER', 'PRINT_SUPPLIES', 'MOBILE'],
    priorityBoost: 12,
    condition: 'School term start / back-to-school demand',
  },
  {
    id: 'office-peak',
    name: 'Office Peak IT & Smart Office',
    activeMonths: [1, 2, 3, 9, 10], // Business peak periods
    boostedCategories: ['IT', 'CCTV', 'SMART_HOME_OFFICE', 'NETWORK'],
    priorityBoost: 8,
    condition: 'Post-holiday business ramp-up',
  },
  {
    id: 'power-instability',
    name: 'Power Instability Solar & Backup',
    activeMonths: [2, 3, 6, 7], // Load-shedding risk months
    boostedCategories: ['SOLAR', 'POWER_BACKUP', 'ELECTRICAL'],
    priorityBoost: 12,
    condition: 'Grid instability / load-shedding season',
  },
  {
    id: 'festive-home-electronics',
    name: 'Festive Period Home Electronics',
    activeMonths: [4, 12], // Avurudu (April) + Christmas (December)
    boostedCategories: ['CONSUMER_ELEC', 'APPLIANCE_INSTALL', 'SMART_HOME_OFFICE'],
    priorityBoost: 10,
    condition: 'Sinhala/Tamil New Year + Christmas festive demand',
  },
];
