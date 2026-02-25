export const COLOMBO_ZONES = [
  "Colombo 1 - Fort",
  "Colombo 2 - Slave Island",
  "Colombo 3 - Kollupitiya",
  "Colombo 4 - Bambalapitiya",
  "Colombo 5 - Havelock Town",
  "Colombo 6 - Wellawatta",
  "Colombo 7 - Cinnamon Gardens",
  "Colombo 8 - Borella",
  "Colombo 9 - Dematagoda",
  "Colombo 10 - Maradana",
  "Colombo 11 - Pettah",
  "Colombo 12 - Hulftsdorp",
  "Colombo 13 - Kotahena",
  "Colombo 14 - Grandpass",
  "Colombo 15 - Modara",
  "Nugegoda",
  "Rajagiriya",
  "Battaramulla",
  "Nawala",
  "Dehiwala",
  "Mount Lavinia",
  "Thalawathugoda",
  "Maharagama",
  "Kotte",
  "Kaduwela",
  "Malabe",
  "Piliyandala",
  "Moratuwa",
  "Boralesgamuwa",
  "Athurugiriya",
] as const;

export type ColomboZone = typeof COLOMBO_ZONES[number];

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
  "Dehiwala", "Mount Lavinia", "Nawala", "Kotte", "Maharagama",
];
