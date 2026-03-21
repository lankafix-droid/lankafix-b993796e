/**
 * Intake Intelligence — Structured AI-assisted helpers for the booking flow.
 * Provides problem guidance, urgency hints, inspection-needed signals,
 * and next-step explanations. All advisory, no fake certainty.
 */

import { CATEGORY_PROBLEMS, PROBLEM_SERVICE_MAP_PUBLIC } from "@/engines/diagnoseEngine";
import type { CategoryCode } from "@/types/booking";

// ─── Problem Guidance ──────────────────────────────────

export interface ProblemGuidance {
  hint: string;
  inspectionNeeded: boolean;
  urgencyHint: "low" | "moderate" | "high" | "critical" | null;
  safetyFlag: boolean;
  tagLabel: string | null;
}

/** Safety keywords that trigger red-flag guidance */
const SAFETY_KEYWORDS = ["smoke", "spark", "burning", "fire", "shock", "electr", "gas_leak", "flooding"];

const INSPECTION_CATEGORIES: CategoryCode[] = ["CCTV", "SOLAR", "SMART_HOME_OFFICE", "HOME_SECURITY", "POWER_BACKUP"];

/** Returns structured guidance for a selected problem within a category */
export function getProblemGuidance(category: CategoryCode, problemKey: string): ProblemGuidance {
  const isSafetyRisk = SAFETY_KEYWORDS.some(kw => problemKey.toLowerCase().includes(kw));
  const needsInspection = INSPECTION_CATEGORIES.includes(category) || problemKey.includes("install");
  const isNotSure = problemKey === "not_sure";
  const isEmergencyCategory = ["ELECTRICAL", "PLUMBING"].includes(category);

  // Urgency hinting
  let urgencyHint: ProblemGuidance["urgencyHint"] = null;
  if (isSafetyRisk) urgencyHint = "critical";
  else if (problemKey.includes("not_turning_on") || problemKey.includes("not_working")) urgencyHint = "high";
  else if (problemKey.includes("noise") || problemKey.includes("slow") || problemKey.includes("leak")) urgencyHint = "moderate";
  else if (problemKey.includes("clean") || problemKey.includes("maintenance")) urgencyHint = "low";

  // Tag label
  let tagLabel: string | null = null;
  if (isSafetyRisk) tagLabel = "⚠️ Safety Priority";
  else if (needsInspection) tagLabel = "🔍 Inspection Recommended";
  else if (isNotSure) tagLabel = "💬 Tell us more — our team will help";
  else if (isEmergencyCategory && urgencyHint === "high") tagLabel = "⚡ Fast Response Available";

  // Hint text
  let hint = "";
  if (isSafetyRisk) {
    hint = "This may involve a safety risk. We'll prioritise getting a qualified technician to you quickly.";
  } else if (needsInspection) {
    hint = "This typically requires an on-site inspection before we can give you an accurate quote.";
  } else if (isNotSure) {
    hint = "No worries — describe what you're experiencing and our team will identify the right service for you.";
  } else if (urgencyHint === "high") {
    hint = "This sounds like it needs prompt attention. Same-day service may be available in your area.";
  } else if (urgencyHint === "low") {
    hint = "Routine service — you can schedule this at a time that's convenient for you.";
  } else {
    hint = "Select the option that best describes your situation. If none match, choose 'Not sure'.";
  }

  return {
    hint,
    inspectionNeeded: needsInspection,
    urgencyHint,
    safetyFlag: isSafetyRisk,
    tagLabel,
  };
}

// ─── Next-Step Explanations ────────────────────────────

export interface NextStepExplanation {
  title: string;
  description: string;
  expectation: string;
}

export function getNextStepExplanation(
  category: CategoryCode,
  problemKey: string,
  urgency: string
): NextStepExplanation {
  const guidance = getProblemGuidance(category, problemKey);

  if (guidance.inspectionNeeded) {
    return {
      title: "Site Inspection First",
      description: "A verified technician will visit to assess the situation and provide a detailed quote.",
      expectation: "No charges until you approve the quote. Typical inspection takes 30–60 minutes.",
    };
  }

  if (guidance.safetyFlag) {
    return {
      title: "Priority Safety Response",
      description: "We'll fast-track a qualified technician for safety-related issues.",
      expectation: "You'll receive a call within 15 minutes to confirm details and dispatch.",
    };
  }

  if (urgency === "emergency" || urgency === "same_day") {
    return {
      title: "Fast Technician Matching",
      description: "We'll find the nearest available verified technician for your area.",
      expectation: "Expect assignment confirmation within 30 minutes during business hours.",
    };
  }

  return {
    title: "Technician Matching",
    description: "Our team will review your request and match you with the best available technician.",
    expectation: "You'll be updated at each step. No work starts without your approval.",
  };
}

// ─── Urgency Recommendation ────────────────────────────

export function getRecommendedUrgency(category: CategoryCode, problemKey: string): string | null {
  const guidance = getProblemGuidance(category, problemKey);
  if (guidance.urgencyHint === "critical") return "emergency";
  if (guidance.urgencyHint === "high") return "same_day";
  if (guidance.urgencyHint === "low") return "flexible";
  return null;
}
