/**
 * useAIAdvisory — Shared AI orchestration hook
 * Checks feature flag → consent → cache → executes advisory service → returns UI-ready result.
 * NEVER mutates booking, dispatch, or payment state.
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
  /** Feature flag key for this AI module */
  featureFlag: keyof AIFeatureFlags;
  /** Module name for consent check (maps to MODULE_CONSENT_MAP) */
  moduleName: string;
  /** The advisory service function to execute */
  serviceFn: () => T | Promise<T>;
  /** Extract confidence score from the result */
  getConfidence?: (data: T) => number;
  /** Extract fallback_used from the result */
  getFallbackUsed?: (data: T) => boolean;
  /** Extract cached flag from the result */
  getCached?: (data: T) => boolean;
  /** Whether to auto-execute on mount (default: true) */
  autoExecute?: boolean;
  /** Dependencies that trigger re-execution */
  deps?: unknown[];
  /** Analytics event name to fire on render */
  analyticsEvent?: string;
  /** Additional analytics payload */
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
    serviceFn,
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

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async () => {
    // 1. Feature flag check
    if (!isAIEnabled(featureFlag)) {
      setResult({
        ...INITIAL_RESULT,
        available: false,
        error: "Feature disabled",
      });
      if (analyticsEvent) {
        track("fallback_rendered", { module: moduleName, reason: "feature_disabled", ...analyticsPayload });
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
      track("blocked_by_consent", { module: moduleName, requiredConsent: consent.requiredConsent });
      return;
    }

    // 3. Execute service
    setResult(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await Promise.resolve(serviceFn());
      if (!mountedRef.current) return;

      const confidence = getConfidence(data);
      const fallback_used = getFallbackUsed(data);
      const cached = getCached(data);

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

      // Analytics
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
    } catch (err: any) {
      if (!mountedRef.current) return;
      setResult({
        ...INITIAL_RESULT,
        available: true,
        error: err?.message || "AI service error",
        fallback_used: true,
      });
      track("fallback_rendered", { module: moduleName, reason: "error" });
    }
  }, [featureFlag, moduleName, serviceFn, ...deps]);

  useEffect(() => {
    if (autoExecute) execute();
  }, [execute, autoExecute]);

  return { ...result, execute };
}
