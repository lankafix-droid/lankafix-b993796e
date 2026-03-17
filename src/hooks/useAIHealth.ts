/**
 * useAIHealth — React hook for AI module health monitoring.
 * Lightweight polling with configurable interval.
 * Advisory only — read-only health observation.
 */
import { useState, useEffect, useCallback } from "react";
import { getAllModuleHealth, getAIReadinessSummary, type AIModuleHealth } from "@/services/aiHealthService";

export function useAIHealth(pollIntervalMs = 30_000) {
  const [modules, setModules] = useState<AIModuleHealth[]>(() => getAllModuleHealth());
  const [readiness, setReadiness] = useState(() => getAIReadinessSummary());
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const refresh = useCallback(() => {
    setModules(getAllModuleHealth());
    setReadiness(getAIReadinessSummary());
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(id);
  }, [refresh, pollIntervalMs]);

  return { modules, readiness, lastRefreshed, refresh };
}
