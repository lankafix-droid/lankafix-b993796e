/**
 * useAIRolloutReadiness — React hook for AI rollout readiness monitoring.
 * Advisory only — read-only readiness observation.
 */
import { useState, useEffect, useCallback } from "react";
import {
  getModuleRolloutReadiness,
  getGlobalRolloutReadiness,
  type ModuleRolloutReadiness,
  type GlobalRolloutReadiness,
} from "@/services/aiRolloutReadiness";

export function useAIRolloutReadiness(pollIntervalMs = 30_000) {
  const [moduleReadiness, setModuleReadiness] = useState<ModuleRolloutReadiness[]>(() => getModuleRolloutReadiness());
  const [overallReadiness, setOverallReadiness] = useState<GlobalRolloutReadiness>(() => getGlobalRolloutReadiness());
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const refresh = useCallback(() => {
    setModuleReadiness(getModuleRolloutReadiness());
    setOverallReadiness(getGlobalRolloutReadiness());
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(id);
  }, [refresh, pollIntervalMs]);

  return { moduleReadiness, overallReadiness, lastRefreshed, refresh };
}
