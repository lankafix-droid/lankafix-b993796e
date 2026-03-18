/**
 * React hook for the Sri Lankan Visual Context system.
 * Updates on mount and every 30 minutes for time-of-day transitions.
 */
import { useState, useEffect, useMemo } from 'react';
import { getVisualContext, type VisualContext } from '@/services/sriLankanThemeEngine';

const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

export function useVisualContext(userZone?: string): VisualContext {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return useMemo(
    () => getVisualContext(userZone),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userZone, tick],
  );
}
