/**
 * LankaFix Travel Fee Configuration
 * Zone-based travel charges for the Sri Lankan market.
 */

export interface TravelZone {
  id: string;
  label: string;
  description: string;
  fee: number;
  feeLabel: string;
  active: boolean;
}

export const TRAVEL_ZONES: TravelZone[] = [
  {
    id: "colombo_central",
    label: "Colombo Central",
    description: "Colombo 1–15",
    fee: 0,
    feeLabel: "Travel included",
    active: true,
  },
  {
    id: "colombo_suburbs",
    label: "Greater Colombo",
    description: "Dehiwala, Mt. Lavinia, Kotte, Battaramulla, Nugegoda, Maharagama",
    fee: 500,
    feeLabel: "LKR 500",
    active: true,
  },
  {
    id: "outer_suburbs",
    label: "Outer Suburbs",
    description: "Moratuwa, Piliyandala, Kaduwela, Kelaniya, Wattala, Ja-Ela",
    fee: 1000,
    feeLabel: "LKR 1,000",
    active: true,
  },
  {
    id: "outside_zone",
    label: "Outside Service Zone",
    description: "Kandy, Galle, Negombo and other areas",
    fee: -1, // Quote required
    feeLabel: "Quote required",
    active: false,
  },
];

export function getTravelFee(zoneId: string): number {
  const zone = TRAVEL_ZONES.find(z => z.id === zoneId);
  return zone ? zone.fee : -1;
}

export function getActiveZones(): TravelZone[] {
  return TRAVEL_ZONES.filter(z => z.active);
}
