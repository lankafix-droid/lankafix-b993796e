/**
 * LankaFix Weather Context Edge Function
 * Fetches real-time weather for Sri Lankan zones from Open-Meteo (free, no key).
 * Returns weather mood classification for the adaptive theme engine.
 * Caches responses for 30 minutes per zone.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sri Lankan zone coordinates
const ZONE_COORDS: Record<string, { lat: number; lon: number }> = {
  COLOMBO: { lat: 6.9271, lon: 79.8612 },
  KANDY: { lat: 7.2906, lon: 80.6337 },
  GALLE: { lat: 6.0535, lon: 80.2210 },
  JAFFNA: { lat: 9.6615, lon: 80.0255 },
  NEGOMBO: { lat: 7.2094, lon: 79.8358 },
  NUWARA_ELIYA: { lat: 6.9497, lon: 80.7891 },
  DEHIWALA: { lat: 6.8518, lon: 79.8650 },
  MORATUWA: { lat: 6.7731, lon: 79.8824 },
};

// In-memory cache: zone → { data, expiry }
const cache = new Map<string, { data: WeatherData; expiry: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

interface WeatherData {
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
  mood_intensity: number; // 0-1
  fetched_at: string;
}

type WeatherMood =
  | "tropical_heat"
  | "monsoon_rain"
  | "overcast_cool"
  | "clear_pleasant"
  | "stormy"
  | "misty_highland"
  | "humid_warm"
  | "golden_clear";

/**
 * Classify weather into mood using WMO weather codes + temperature
 * https://open-meteo.com/en/docs#weathervariables
 */
function classifyMood(
  code: number,
  temp: number,
  humidity: number,
  precipitation: number,
  cloud: number,
  isDay: boolean,
  zone: string
): { mood: WeatherMood; intensity: number } {
  // Stormy: thunderstorm codes 95-99
  if (code >= 95) return { mood: "stormy", intensity: 0.9 };

  // Heavy rain: codes 61-67 (rain), 80-82 (showers)
  if (code >= 61 && code <= 67 || code >= 80 && code <= 82)
    return { mood: "monsoon_rain", intensity: Math.min(precipitation / 10, 1) };

  // Drizzle/light rain: 51-57
  if (code >= 51 && code <= 57)
    return { mood: "monsoon_rain", intensity: 0.4 };

  // Fog/mist: 45-48 or highland zones with high humidity
  if (code >= 45 && code <= 48 || (zone === "NUWARA_ELIYA" && humidity > 85))
    return { mood: "misty_highland", intensity: 0.6 };

  // Clear/sunny and hot: codes 0-1, temp > 32
  if (code <= 1 && temp > 32)
    return { mood: "tropical_heat", intensity: Math.min((temp - 32) / 8, 1) };

  // Clear and pleasant evening/golden hour
  if (code <= 2 && isDay && temp >= 26 && temp <= 32)
    return { mood: "golden_clear", intensity: 0.5 };

  // Overcast: codes 2-3 with cloud > 70
  if (cloud > 70)
    return { mood: "overcast_cool", intensity: cloud / 100 };

  // Humid warm: high humidity + warm but not scorching
  if (humidity > 75 && temp > 28)
    return { mood: "humid_warm", intensity: humidity / 100 };

  // Default: clear and pleasant
  return { mood: "clear_pleasant", intensity: 0.3 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const zone = (url.searchParams.get("zone") || "COLOMBO").toUpperCase();
    const coords = ZONE_COORDS[zone] || ZONE_COORDS.COLOMBO;

    // Check cache
    const cached = cache.get(zone);
    if (cached && cached.expiry > Date.now()) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    // Fetch from Open-Meteo (free, no API key)
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day,cloud_cover&timezone=Asia/Colombo`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const raw = await response.json();
    const c = raw.current;

    const { mood, intensity } = classifyMood(
      c.weather_code,
      c.temperature_2m,
      c.relative_humidity_2m,
      c.precipitation,
      c.cloud_cover,
      c.is_day === 1,
      zone
    );

    const data: WeatherData = {
      zone,
      temperature_c: c.temperature_2m,
      apparent_temperature_c: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      precipitation_mm: c.precipitation,
      weather_code: c.weather_code,
      wind_speed_kmh: c.wind_speed_10m,
      is_day: c.is_day === 1,
      cloud_cover: c.cloud_cover,
      mood,
      mood_intensity: intensity,
      fetched_at: new Date().toISOString(),
    };

    // Cache it
    cache.set(zone, { data, expiry: Date.now() + CACHE_TTL_MS });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e) {
    console.error("Weather context error:", e);

    // Return a safe fallback so the app never breaks
    const fallback: WeatherData = {
      zone: "COLOMBO",
      temperature_c: 30,
      apparent_temperature_c: 33,
      humidity: 75,
      precipitation_mm: 0,
      weather_code: 1,
      wind_speed_kmh: 10,
      is_day: true,
      cloud_cover: 30,
      mood: "clear_pleasant",
      mood_intensity: 0.3,
      fetched_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Fallback": "true" },
    });
  }
});
