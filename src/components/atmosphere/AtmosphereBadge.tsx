/**
 * AtmosphereBadge — Tiny mood indicator pill
 * 
 * Shows current weather mood as a subtle badge in the hero section.
 * "Colombo · 32°C · Scorching Day"
 */
import { Cloud, Sun, CloudRain, CloudLightning, CloudFog, Thermometer, Droplets } from "lucide-react";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import type { WeatherMood } from "@/services/weatherAtmosphereEngine";

const MOOD_ICONS: Record<WeatherMood, typeof Sun> = {
  tropical_heat: Sun,
  monsoon_rain: CloudRain,
  overcast_cool: Cloud,
  clear_pleasant: Sun,
  stormy: CloudLightning,
  misty_highland: CloudFog,
  humid_warm: Droplets,
  golden_clear: Thermometer,
};

const AtmosphereBadge = () => {
  const { weather, moodLabel, isLoaded } = useAdaptiveTheme();

  if (!isLoaded || !weather) return null;

  const Icon = MOOD_ICONS[weather.mood] || Sun;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/60 backdrop-blur-sm border border-border/40 text-[10px] text-muted-foreground transition-all duration-1000">
      <Icon className="w-3 h-3" style={{ color: `hsl(${weather.mood === "monsoon_rain" ? "200 50% 55%" : weather.mood === "tropical_heat" ? "30 80% 55%" : "var(--primary)"})` }} />
      <span className="font-medium">{weather.zone.charAt(0) + weather.zone.slice(1).toLowerCase()}</span>
      <span className="opacity-40">·</span>
      <span>{Math.round(weather.temperature_c)}°C</span>
      <span className="opacity-40">·</span>
      <span className="opacity-80">{moodLabel}</span>
    </div>
  );
};

export default AtmosphereBadge;
