/**
 * useAIAdvisory — Shared AI orchestration hook
 * Checks feature flag → consent → executes advisory service → returns UI-ready result.
 * NEVER mutates booking, dispatch, or payment state.
 *
 * HARDENED:
 * - Stable memoization via useRef for serviceFn to prevent re-execution loops
 * - Deduplication guard prevents duplicate analytics firing
 * - Single explicit execute path; guarded autoExecute
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { isAIEnabled, type AIFeatureFlags } from "@/config/aiFlags";
import { checkModuleConsent, type AIConsentCapability } from "@/services/aiConsentService";
import { track } from "@/lib/analytics";

export interface AIAdvisoryResult<T> {
  loading: boolean;
  available: boolean;
  blockedByConsent: boolean;
  requiredConsent: AIConsentCapability | null;
  data: T | null;
  confidence: number;
  fallback_used: boolean;
  advisory_only: true;
  cached: boolean;
  error: string | null;
}

interface UseAIAdvisoryOptions<T> {
  featureFlag: keyof AIFeatureFlags;
  moduleName: string;
  serviceFn: () => T | Promise<T>;
  getConfidence?: (data: T) => number;
  getFallbackUsed?: (data: T) => boolean;
  getCached?: (data: T) => boolean;
  /** Whether to auto-execute on mount/deps change (default: true) */
  autoExecute?: boolean;
  /** Dependencies that trigger re-execution — use primitives only */
  deps?: unknown[];
  analyticsEvent?: string;
  analyticsPayload?: Record<string, unknown>;
}

const INITIAL_RESULT: AIAdvisoryResult<any> = {
  loading: false,
  available: false,
  blockedByConsent: false,
  requiredConsent: null,
  data: null,
  confidence: 0,
  fallback_used: false,
  advisory_only: true,
  cached: false,
  error: null,
};

export function useAIAdvisory<T>(
  options: UseAIAdvisoryOptions<T>
): AIAdvisoryResult<T> & { execute: () => void } {
  const {
    featureFlag,
    moduleName,
    getConfidence = () => 0,
    getFallbackUsed = () => false,
    getCached = () => false,
    autoExecute = true,
    deps = [],
    analyticsEvent,
    analyticsPayload,
  } = options;

  const [result, setResult] = useState<AIAdvisoryResult<T>>(INITIAL_RESULT);
  const mountedRef = useRef(true);
  const executingRef = useRef(false);
  const analyticsTrackedRef = useRef(false);

  // Store serviceFn in ref to avoid re-execution loops from unstable callbacks
  const serviceFnRef = useRef(options.serviceFn);
  serviceFnRef.current = options.serviceFn;

  // Store extractors in refs
  const getConfidenceRef = useRef(getConfidence);
  getConfidenceRef.current = getConfidence;
  const getFallbackUsedRef = useRef(getFallbackUsed);
  getFallbackUsedRef.current = getFallbackUsed;
  const getCachedRef = useRef(getCached);
  getCachedRef.current = getCached;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Reset analytics dedup flag when deps change
  const depsKey = JSON.stringify(deps);
  useEffect(() => {
    analyticsTrackedRef.current = false;
  }, [depsKey]);

  const execute = useCallback(async () => {
    // Prevent concurrent executions
    if (executingRef.current) return;

    // 1. Feature flag check
    if (!isAIEnabled(featureFlag)) {
      setResult({
        ...INITIAL_RESULT,
        available: false,
        error: "Feature disabled",
      });
      if (analyticsEvent && !analyticsTrackedRef.current) {
        analyticsTrackedRef.current = true;
        track("fallback_rendered", { module: moduleName, reason: "feature_disabled" });
      }
      return;
    }

    // 2. Consent check
    const consent = checkModuleConsent(moduleName);
    if (!consent.allowed) {
      setResult({
        ...INITIAL_RESULT,
        available: true,
        blockedByConsent: true,
        requiredConsent: consent.requiredConsent,
      });
      if (!analyticsTrackedRef.current) {
        analyticsTrackedRef.current = true;
        track("blocked_by_consent", { module: moduleName, requiredConsent: consent.requiredConsent });
      }
      return;
    }

    // 3. Execute service
    executingRef.current = true;
    setResult(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await Promise.resolve(serviceFnRef.current());
      if (!mountedRef.current) { executingRef.current = false; return; }

      const confidence = getConfidenceRef.current(data);
      const fallback_used = getFallbackUsedRef.current(data);
      const cached = getCachedRef.current(data);

      setResult({
        loading: false,
        available: true,
        blockedByConsent: false,
        requiredConsent: null,
        data,
        confidence,
        fallback_used,
        advisory_only: true,
        cached,
        error: null,
      });

      // Analytics — fire once per deps change
      if (!analyticsTrackedRef.current) {
        analyticsTrackedRef.current = true;
        if (analyticsEvent) {
          track(analyticsEvent, {
            module: moduleName,
            confidence,
            fallback_used,
            cached,
            ...analyticsPayload,
          });
        }
        if (fallback_used) {
          track("fallback_rendered", { module: moduleName });
        }
        if (confidence > 0 && confidence < 50) {
          track("low_confidence_rendered", { module: moduleName, confidence });
        }
      }
    } catch (err: any) {
      if (!mountedRef.current) { executingRef.current = false; return; }
      setResult({
        ...INITIAL_RESULT,
        available: true,
        error: err?.message || "AI service error",
        fallback_used: true,
      });
      if (!analyticsTrackedRef.current) {
        analyticsTrackedRef.current = true;
        track("fallback_rendered", { module: moduleName, reason: "error" });
      }
    } finally {
      executingRef.current = false;
    }
  }, [featureFlag, moduleName, analyticsEvent, depsKey]);

  useEffect(() => {
    if (autoExecute) execute();
  }, [execute, autoExecute]);

  return { ...result, execute };
}
