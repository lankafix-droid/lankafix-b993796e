import type { Zone } from "@/types/booking";

export const COLOMBO_ZONES_DATA: Zone[] = [
  { id: "col_01", city: "Colombo", area: "Fort", label: "Colombo 1 - Fort", geo: { lat: 6.9344, lng: 79.8428 } },
  { id: "col_02", city: "Colombo", area: "Slave Island", label: "Colombo 2 - Slave Island", geo: { lat: 6.9260, lng: 79.8530 } },
  { id: "col_03", city: "Colombo", area: "Kollupitiya", label: "Colombo 3 - Kollupitiya", geo: { lat: 6.9110, lng: 79.8510 } },
  { id: "col_04", city: "Colombo", area: "Bambalapitiya", label: "Colombo 4 - Bambalapitiya", geo: { lat: 6.8968, lng: 79.8567 } },
  { id: "col_05", city: "Colombo", area: "Havelock Town", label: "Colombo 5 - Havelock Town", geo: { lat: 6.8870, lng: 79.8630 } },
  { id: "col_06", city: "Colombo", area: "Wellawatta", label: "Colombo 6 - Wellawatta", geo: { lat: 6.8740, lng: 79.8590 } },
  { id: "col_07", city: "Colombo", area: "Cinnamon Gardens", label: "Colombo 7 - Cinnamon Gardens", geo: { lat: 6.9090, lng: 79.8620 } },
  { id: "col_08", city: "Colombo", area: "Borella", label: "Colombo 8 - Borella", geo: { lat: 6.9170, lng: 79.8730 } },
  { id: "col_09", city: "Colombo", area: "Dematagoda", label: "Colombo 9 - Dematagoda", geo: { lat: 6.9320, lng: 79.8730 } },
  { id: "col_10", city: "Colombo", area: "Maradana", label: "Colombo 10 - Maradana", geo: { lat: 6.9280, lng: 79.8640 } },
  { id: "col_11", city: "Colombo", area: "Pettah", label: "Colombo 11 - Pettah", geo: { lat: 6.9370, lng: 79.8520 } },
  { id: "col_12", city: "Colombo", area: "Hulftsdorp", label: "Colombo 12 - Hulftsdorp", geo: { lat: 6.9400, lng: 79.8580 } },
  { id: "col_13", city: "Colombo", area: "Kotahena", label: "Colombo 13 - Kotahena", geo: { lat: 6.9450, lng: 79.8600 } },
  { id: "col_14", city: "Colombo", area: "Grandpass", label: "Colombo 14 - Grandpass", geo: { lat: 6.9480, lng: 79.8640 } },
  { id: "col_15", city: "Colombo", area: "Modara", label: "Colombo 15 - Modara", geo: { lat: 6.9550, lng: 79.8620 } },
  { id: "nugegoda", city: "Colombo", area: "Nugegoda", label: "Nugegoda", geo: { lat: 6.8720, lng: 79.8890 } },
  { id: "rajagiriya", city: "Colombo", area: "Rajagiriya", label: "Rajagiriya", geo: { lat: 6.9060, lng: 79.8950 } },
  { id: "battaramulla", city: "Colombo", area: "Battaramulla", label: "Battaramulla", geo: { lat: 6.9000, lng: 79.9170 } },
  { id: "nawala", city: "Colombo", area: "Nawala", label: "Nawala", geo: { lat: 6.8930, lng: 79.8930 } },
  { id: "dehiwala", city: "Colombo", area: "Dehiwala", label: "Dehiwala", geo: { lat: 6.8540, lng: 79.8650 }, surgeFactor: 1.05 },
  { id: "mt_lavinia", city: "Colombo", area: "Mount Lavinia", label: "Mount Lavinia", geo: { lat: 6.8380, lng: 79.8650 }, surgeFactor: 1.1 },
  { id: "thalawathugoda", city: "Colombo", area: "Thalawathugoda", label: "Thalawathugoda", geo: { lat: 6.8700, lng: 79.9100 } },
  { id: "maharagama", city: "Colombo", area: "Maharagama", label: "Maharagama", geo: { lat: 6.8480, lng: 79.9240 }, surgeFactor: 1.05 },
  { id: "kotte", city: "Colombo", area: "Kotte", label: "Kotte", geo: { lat: 6.8880, lng: 79.9010 } },
  { id: "kaduwela", city: "Colombo", area: "Kaduwela", label: "Kaduwela", geo: { lat: 6.9300, lng: 79.9830 }, surgeFactor: 1.15 },
  { id: "malabe", city: "Colombo", area: "Malabe", label: "Malabe", geo: { lat: 6.9050, lng: 79.9590 }, surgeFactor: 1.1 },
  { id: "piliyandala", city: "Colombo", area: "Piliyandala", label: "Piliyandala", geo: { lat: 6.8000, lng: 79.9220 }, surgeFactor: 1.1 },
  { id: "moratuwa", city: "Colombo", area: "Moratuwa", label: "Moratuwa", geo: { lat: 6.7730, lng: 79.8840 }, surgeFactor: 1.15 },
  { id: "boralesgamuwa", city: "Colombo", area: "Boralesgamuwa", label: "Boralesgamuwa", geo: { lat: 6.8420, lng: 79.9040 } },
  { id: "athurugiriya", city: "Colombo", area: "Athurugiriya", label: "Athurugiriya", geo: { lat: 6.8870, lng: 79.9680 }, surgeFactor: 1.15 },
  { id: "wattala", city: "Colombo", area: "Wattala", label: "Wattala", geo: { lat: 6.9720, lng: 79.8910 }, surgeFactor: 1.1 },
];

export const COLOMBO_ZONES = COLOMBO_ZONES_DATA.map((z) => z.label) as readonly string[];

export type ColomboZone = typeof COLOMBO_ZONES[number];

export function getZoneByLabel(label: string): Zone | undefined {
  return COLOMBO_ZONES_DATA.find((z) => z.label === label);
}

export function getZoneSurgeFactor(label: string): number {
  return getZoneByLabel(label)?.surgeFactor ?? 1.0;
}

export const OUT_OF_ZONE_KEYWORDS = [
  "kandy", "galle", "jaffna", "matara", "kurunegala", "anuradhapura",
  "trincomalee", "batticaloa", "ratnapura", "badulla", "nuwara eliya",
  "negombo", "chilaw", "hambantota", "kalutara",
];

export function isOutOfZone(address: string): boolean {
  const lower = address.toLowerCase();
  return OUT_OF_ZONE_KEYWORDS.some((kw) => lower.includes(kw));
}

export const COLOMBO_AREAS_DISPLAY = [
  "Colombo 1–15", "Nugegoda", "Rajagiriya", "Battaramulla",
  "Dehiwala", "Mount Lavinia", "Nawala", "Kotte", "Maharagama", "Wattala",
];
