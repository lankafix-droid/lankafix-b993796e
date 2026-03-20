/**
 * useAdaptiveTheme — LankaFix Living Atmosphere Hook
 * 
 * Fuses 4 layers into real-time CSS custom property overrides:
 *   1. OS preference (prefers-color-scheme)
 *   2. Time-of-day (existing Sri Lankan engine)
 *   3. Cultural moments (existing festival calendar)
 *   4. Live weather (Open-Meteo via edge function)
 * 
 * Applies atmosphere tokens as CSS vars on <html> for seamless
 * integration with the existing Tailwind token system.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useVisualContext } from "./useVisualContext";
import {
  fetchWeatherContext,
  computeAtmosphere,
  type WeatherContext,
  type AtmosphereOutput,
} from "@/services/weatherAtmosphereEngine";
import { useLocationStore } from "@/store/locationStore";

const WEATHER_REFRESH_MS = 30 * 60 * 1000; // 30 min

export interface AdaptiveThemeState {
  /** Current weather data (null if not yet loaded) */
  weather: WeatherContext | null;
  /** Computed atmosphere output */
  atmosphere: AtmosphereOutput;
  /** Whether weather has been loaded at least once */
  isLoaded: boolean;
  /** Current mood label for display */
  moodLabel: string;
  /** Service categories boosted by current weather */
  servicePriority: string[];
}

export function useAdaptiveTheme(): AdaptiveThemeState {
  const visualContext = useVisualContext();
  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Get user's zone from location store
  const activeAddress = useLocationStore((s) => s.getActiveAddress());
  const zone = activeAddress?.zoneId?.replace("zone_", "").toUpperCase() || "COLOMBO";

  // Detect current color scheme
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Fetch weather
  const refreshWeather = useCallback(async () => {
    const data = await fetchWeatherContext(zone);
    if (data) {
      setWeather(data);
      setIsLoaded(true);
    }
  }, [zone]);

  // Initial fetch + interval
  useEffect(() => {
    refreshWeather();
    intervalRef.current = setInterval(refreshWeather, WEATHER_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshWeather]);

  // Compute atmosphere
  const atmosphere = computeAtmosphere(weather, isDark ? "dark" : "light");

  // Apply CSS custom properties to <html>
  useEffect(() => {
    const root = document.documentElement;

    // Apply atmosphere vars
    Object.entries(atmosphere.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Also expose visual context vars for components
    if (visualContext.culturalMoment) {
      root.style.setProperty(
        "--atmosphere-festive",
        "1"
      );
      root.style.setProperty(
        "--atmosphere-festival",
        visualContext.culturalMoment.id
      );
    } else {
      root.style.setProperty("--atmosphere-festive", "0");
      root.style.removeProperty("--atmosphere-festival");
    }

    root.style.setProperty(
      "--atmosphere-time-period",
      visualContext.timeTheme.period
    );

    // Cleanup on unmount
    return () => {
      Object.keys(atmosphere.cssVars).forEach((key) => {
        root.style.removeProperty(key);
      });
      root.style.removeProperty("--atmosphere-festive");
      root.style.removeProperty("--atmosphere-festival");
      root.style.removeProperty("--atmosphere-time-period");
    };
  }, [atmosphere, visualContext]);

  return {
    weather,
    atmosphere,
    isLoaded,
    moodLabel: atmosphere.moodLabel,
    servicePriority: atmosphere.servicePriority,
  };
}
