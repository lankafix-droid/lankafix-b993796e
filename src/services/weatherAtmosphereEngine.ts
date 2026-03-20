/**
 * LankaFix Living Atmosphere Engine
 * 
 * Fuses weather mood + time-of-day + cultural moments + zone
 * into dynamic CSS custom property overrides.
 * 
 * This is the world's first weather-aware adaptive theme engine
 * for a service marketplace — uniquely Sri Lankan.
 */

export type WeatherMood =
  | "tropical_heat"
  | "monsoon_rain"
  | "overcast_cool"
  | "clear_pleasant"
  | "stormy"
  | "misty_highland"
  | "humid_warm"
  | "golden_clear";

export interface WeatherContext {
  zone: string;
  temperature_c: number;
  apparent_temperature_c: number;
  humidity: number;
  precipitation_mm: number;
  weather_code: number;
  wind_speed_kmh: number;
  is_day: boolean;
  cloud_cover: number;
  mood: WeatherMood;
  mood_intensity: number;
  fetched_at: string;
}

// ─── Weather → Visual Token Mapping ──────────────────────────
// Each mood shifts HSL values relative to base theme tokens

interface AtmosphereTokens {
  /** HSL shift for --primary (h s l adjustments) */
  primaryShift: [number, number, number];
  /** HSL shift for --accent */
  accentShift: [number, number, number];
  /** Background warmth adjustment */
  bgWarmth: number; // -10 to +10 on hue
  /** Card glass opacity override */
  glassOpacity: number;
  /** Ambient glow color (HSL) */
  ambientGlow: string;
  /** Mood label for analytics */
  moodLabel: string;
  /** Suggested service categories to boost */
  servicePriority: string[];
}

const MOOD_TOKENS: Record<WeatherMood, AtmosphereTokens> = {
  tropical_heat: {
    primaryShift: [15, 5, 3],      // Warmer, more saturated
    accentShift: [-20, 8, 2],      // Push accent toward amber
    bgWarmth: 8,
    glassOpacity: 0.7,
    ambientGlow: "30 80% 55%",     // Warm amber glow
    moodLabel: "Scorching Day",
    servicePriority: ["AC", "ELECTRICAL", "CONSUMER_ELEC"],
  },
  monsoon_rain: {
    primaryShift: [-5, -3, -4],    // Cooler, muted
    accentShift: [10, -5, -3],     // Teal-ish shift
    bgWarmth: -6,
    glassOpacity: 0.85,
    ambientGlow: "200 50% 45%",    // Cool blue rain glow
    moodLabel: "Monsoon",
    servicePriority: ["PLUMBING", "ELECTRICAL", "CCTV"],
  },
  overcast_cool: {
    primaryShift: [0, -4, -2],     // Slightly desaturated
    accentShift: [5, -3, 0],
    bgWarmth: -3,
    glassOpacity: 0.78,
    ambientGlow: "220 30% 50%",    // Soft grey-blue
    moodLabel: "Overcast",
    servicePriority: ["MOBILE", "IT", "NETWORK"],
  },
  clear_pleasant: {
    primaryShift: [0, 0, 0],       // No shift — base theme
    accentShift: [0, 0, 0],
    bgWarmth: 0,
    glassOpacity: 0.75,
    ambientGlow: "147 57% 43%",    // LankaFix green
    moodLabel: "Clear",
    servicePriority: [],
  },
  stormy: {
    primaryShift: [-15, -8, -6],   // Dark, desaturated
    accentShift: [-30, -10, -5],
    bgWarmth: -10,
    glassOpacity: 0.9,
    ambientGlow: "260 40% 35%",    // Deep storm purple
    moodLabel: "Storm",
    servicePriority: ["ELECTRICAL", "POWER_BACKUP", "HOME_SECURITY"],
  },
  misty_highland: {
    primaryShift: [-8, -6, 2],     // Cooler, slightly lighter
    accentShift: [15, -4, 3],      // Push toward sage green
    bgWarmth: -4,
    glassOpacity: 0.82,
    ambientGlow: "180 35% 48%",    // Misty teal
    moodLabel: "Misty",
    servicePriority: ["SOLAR", "SMART_HOME_OFFICE"],
  },
  humid_warm: {
    primaryShift: [8, 3, 1],       // Slightly warmer
    accentShift: [-10, 4, 1],
    bgWarmth: 4,
    glassOpacity: 0.72,
    ambientGlow: "25 65% 50%",     // Humid warmth
    moodLabel: "Humid",
    servicePriority: ["AC", "PLUMBING", "APPLIANCE_INSTALL"],
  },
  golden_clear: {
    primaryShift: [12, 6, 4],      // Golden warmth
    accentShift: [-25, 10, 5],     // Rich gold accent
    bgWarmth: 10,
    glassOpacity: 0.7,
    ambientGlow: "35 85% 55%",     // Golden hour glow
    moodLabel: "Golden Hour",
    servicePriority: [],
  },
};

// ─── Compute Atmosphere CSS Properties ───────────────────────

export interface AtmosphereOutput {
  cssVars: Record<string, string>;
  mood: WeatherMood;
  moodLabel: string;
  moodIntensity: number;
  servicePriority: string[];
  ambientGlow: string;
}

/**
 * Given weather context, compute CSS custom property overrides
 * that blend into the existing theme system.
 * 
 * The intensity factor (0-1) controls how strongly the weather
 * affects the theme — subtle by default, stronger in extremes.
 */
export function computeAtmosphere(
  weather: WeatherContext | null,
  baseTheme: "light" | "dark" = "light"
): AtmosphereOutput {
  // Default: no weather data, no shift
  if (!weather) {
    return {
      cssVars: {},
      mood: "clear_pleasant",
      moodLabel: "Clear",
      moodIntensity: 0,
      servicePriority: [],
      ambientGlow: "147 57% 43%",
    };
  }

  const tokens = MOOD_TOKENS[weather.mood];
  const intensity = weather.mood_intensity;

  // Scale shifts by intensity (subtle: 0.3, extreme: 0.9)
  const scale = (shift: number) => Math.round(shift * intensity);

  // Base primary HSL values (from index.css)
  const basePrimary = baseTheme === "dark"
    ? { h: 211, s: 78, l: 44 }
    : { h: 211, s: 82, l: 31 };

  const baseAccent = baseTheme === "dark"
    ? { h: 147, s: 48, l: 40 }
    : { h: 147, s: 57, l: 43 };

  // Apply shifts
  const primaryH = basePrimary.h + scale(tokens.primaryShift[0]);
  const primaryS = Math.max(0, Math.min(100, basePrimary.s + scale(tokens.primaryShift[1])));
  const primaryL = Math.max(0, Math.min(100, basePrimary.l + scale(tokens.primaryShift[2])));

  const accentH = baseAccent.h + scale(tokens.accentShift[0]);
  const accentS = Math.max(0, Math.min(100, baseAccent.s + scale(tokens.accentShift[1])));
  const accentL = Math.max(0, Math.min(100, baseAccent.l + scale(tokens.accentShift[2])));

  const cssVars: Record<string, string> = {
    "--atmosphere-primary": `${primaryH} ${primaryS}% ${primaryL}%`,
    "--atmosphere-accent": `${accentH} ${accentS}% ${accentL}%`,
    "--atmosphere-glow": tokens.ambientGlow,
    "--atmosphere-glass-opacity": tokens.glassOpacity.toString(),
    "--atmosphere-intensity": intensity.toFixed(2),
    "--atmosphere-mood": weather.mood,
  };

  return {
    cssVars,
    mood: weather.mood,
    moodLabel: tokens.moodLabel,
    moodIntensity: intensity,
    servicePriority: tokens.servicePriority,
    ambientGlow: tokens.ambientGlow,
  };
}

// ─── Fetch Weather from Edge Function ────────────────────────

const WEATHER_CACHE_KEY = "lankafix_weather_cache";
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 min

interface CachedWeather {
  data: WeatherContext;
  expiry: number;
}

export async function fetchWeatherContext(zone: string = "COLOMBO"): Promise<WeatherContext | null> {
  try {
    // Check localStorage cache first
    const cacheKey = `${WEATHER_CACHE_KEY}_${zone}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed: CachedWeather = JSON.parse(cached);
      if (parsed.expiry > Date.now()) {
        return parsed.data;
      }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/weather-context?zone=${zone}`,
      {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) return null;

    const data: WeatherContext = await response.json();

    // Cache in localStorage
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      expiry: Date.now() + WEATHER_CACHE_TTL,
    }));

    return data;
  } catch (e) {
    console.warn("[Atmosphere] Weather fetch failed, using default:", e);
    return null;
  }
}
