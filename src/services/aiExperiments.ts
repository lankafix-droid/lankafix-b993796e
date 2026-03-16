/**
 * AI Experimentation System
 * A/B testing infrastructure for tracking experiments.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Experiment {
  name: string;
  variants: string[];
  module: string;
  description: string;
}

const ACTIVE_EXPERIMENTS: Experiment[] = [
  {
    name: "booking_flow_layout",
    variants: ["control", "simplified", "guided"],
    module: "booking",
    description: "Test different booking flow layouts",
  },
  {
    name: "cta_wording",
    variants: ["control", "urgent", "friendly"],
    module: "homepage",
    description: "Test CTA button wording variants",
  },
  {
    name: "trust_badge_placement",
    variants: ["control", "above_fold", "inline"],
    module: "trust",
    description: "Test trust badge positions",
  },
  {
    name: "pricing_display",
    variants: ["control", "range", "estimate_with_disclaimer"],
    module: "pricing",
    description: "Test price display formats",
  },
];

/** Get the assigned variant for a user in an experiment */
export function getVariant(experimentName: string, userId: string): string {
  const experiment = ACTIVE_EXPERIMENTS.find((e) => e.name === experimentName);
  if (!experiment) return "control";

  // Deterministic variant assignment based on user ID hash
  const hash = simpleHash(userId + experimentName);
  const index = hash % experiment.variants.length;
  return experiment.variants[index];
}

/** Get all active experiments */
export function getActiveExperiments(): Experiment[] {
  return [...ACTIVE_EXPERIMENTS];
}

/** Record an experiment metric */
export async function recordExperimentMetric(
  experimentName: string,
  variant: string,
  userId: string,
  metricName: string,
  metricValue: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const experiment = ACTIVE_EXPERIMENTS.find((e) => e.name === experimentName);
  if (!experiment) return;

  try {
    await supabase.from("ai_experiments" as any).insert({
      experiment_name: experimentName,
      variant,
      user_id: userId,
      module: experiment.module,
      metric_name: metricName,
      metric_value: metricValue,
      metadata,
    });
  } catch {
    // Silent
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
