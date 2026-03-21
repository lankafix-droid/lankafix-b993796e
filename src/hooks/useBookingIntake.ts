/**
 * useBookingIntake — Persists category intake answers to backend.
 * Survives page refresh. Backend validation reads from this table.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { checkEscalationRules, type EscalationRule } from "@/lib/categoryOnboardingConfig";

export type EscalationOutcome = "pending" | "info_only" | "inspection_only" | "diagnostic_fee_required" | "blocked";

export function useBookingIntake(categoryCode: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const intakeQuery = useQuery({
    queryKey: ["booking-intake", user?.id, categoryCode],
    queryFn: async () => {
      if (!user || !categoryCode) return null;
      const { data, error } = await supabase
        .from("booking_intake_answers")
        .select("*")
        .eq("user_id", user.id)
        .eq("category_code", categoryCode)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; answers: Record<string, any>; escalation_outcome: string } | null;
    },
    enabled: !!user && !!categoryCode,
  });

  const upsertAnswers = useMutation({
    mutationFn: async (params: { answers: Record<string, any>; escalationOutcome?: EscalationOutcome }) => {
      if (!user || !categoryCode) throw new Error("Missing user or category");
      const { error } = await supabase
        .from("booking_intake_answers")
        .upsert({
          user_id: user.id,
          category_code: categoryCode,
          answers: params.answers,
          escalation_outcome: params.escalationOutcome || "pending",
        } as any, { onConflict: "user_id,category_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-intake", user?.id, categoryCode] });
    },
  });

  /** Compute the escalation outcome from current answers */
  function computeEscalationOutcome(answers: Record<string, any>): EscalationOutcome {
    if (!categoryCode) return "pending";
    const fired = checkEscalationRules(categoryCode, answers);
    if (fired.some(r => r.action === "block")) return "blocked";
    if (fired.some(r => r.action === "inspection_required")) return "inspection_only";
    if (fired.some(r => r.action === "diagnostic_fee")) return "diagnostic_fee_required";
    if (fired.some(r => r.action === "warn")) return "info_only";
    return "pending";
  }

  return {
    intake: intakeQuery.data,
    answers: (intakeQuery.data?.answers || {}) as Record<string, any>,
    escalationOutcome: (intakeQuery.data?.escalation_outcome || "pending") as EscalationOutcome,
    isLoading: intakeQuery.isLoading,
    upsertAnswers,
    computeEscalationOutcome,
  };
}
