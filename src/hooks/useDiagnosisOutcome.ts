/**
 * Hook for persisting diagnosis outcomes to DB for the learning loop.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DiagnosisOutcomeData {
  sessionId: string;
  categoryCode: string;
  serviceType?: string;
  problemKey?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceType?: string;
  deviceAgeYears?: number;
  deviceRegistryId?: string;
  probableIssue?: string;
  recommendedServiceType?: string;
  severityLevel?: string;
  confidenceScore?: number;
  diagnosisMethod?: string;
  estimatedMinPrice?: number;
  estimatedMaxPrice?: number;
  priceConfidence?: string;
  estimatedDurationMinutes?: number;
  possibleParts?: any[];
  partsProb?: number;
  probabilities?: any[];
  keyFindings?: string[];
  selfFixTips?: any[];
  bookingPath?: string;
  skipped?: boolean;
  diagnosisDurationSeconds?: number;
}

export function useDiagnosisOutcome() {
  const saveDiagnosis = useCallback(async (data: DiagnosisOutcomeData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("diagnosis_outcomes" as any).insert({
        session_id: data.sessionId,
        customer_id: user?.id || null,
        category_code: data.categoryCode,
        service_type: data.serviceType,
        problem_key: data.problemKey,
        device_brand: data.deviceBrand,
        device_model: data.deviceModel,
        device_type: data.deviceType,
        device_age_years: data.deviceAgeYears,
        device_registry_id: data.deviceRegistryId || null,
        probable_issue: data.probableIssue,
        recommended_service_type: data.recommendedServiceType,
        severity_level: data.severityLevel || "moderate",
        confidence_score: data.confidenceScore || 0,
        diagnosis_method: data.diagnosisMethod || "symptom_tree",
        estimated_min_price: data.estimatedMinPrice,
        estimated_max_price: data.estimatedMaxPrice,
        price_confidence: data.priceConfidence || "rough_estimate",
        estimated_duration_minutes: data.estimatedDurationMinutes,
        possible_parts: data.possibleParts || [],
        parts_probability: data.partsProb,
        probabilities: data.probabilities || [],
        key_findings: data.keyFindings || [],
        self_fix_tips: data.selfFixTips || [],
        booking_path: data.bookingPath || "direct",
        skipped: data.skipped || false,
        diagnosis_duration_seconds: data.diagnosisDurationSeconds,
      } as any);
    } catch (e) {
      console.warn("Failed to save diagnosis outcome:", e);
    }
  }, []);

  const markConverted = useCallback(async (sessionId: string, bookingId: string) => {
    try {
      await supabase
        .from("diagnosis_outcomes" as any)
        .update({ converted_to_booking: true, booking_id: bookingId } as any)
        .eq("session_id", sessionId);
    } catch (e) {
      console.warn("Failed to mark diagnosis converted:", e);
    }
  }, []);

  const submitTechnicianFeedback = useCallback(async (
    bookingId: string,
    actualIssue: string,
    accuracy: "accurate" | "partially_accurate" | "inaccurate",
    actualPrice?: number,
  ) => {
    try {
      await supabase
        .from("diagnosis_outcomes" as any)
        .update({
          technician_actual_issue: actualIssue,
          technician_diagnosis_accuracy: accuracy,
          technician_actual_price: actualPrice,
          technician_feedback_at: new Date().toISOString(),
        } as any)
        .eq("booking_id", bookingId);
    } catch (e) {
      console.warn("Failed to save technician feedback:", e);
    }
  }, []);

  return { saveDiagnosis, markConverted, submitTechnicianFeedback };
}
