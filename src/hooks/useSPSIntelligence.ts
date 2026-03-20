import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sps-intelligence`;

async function callIntelligence(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(FUNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok && resp.status !== 200) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Error ${resp.status}`);
  }
  return resp.json();
}

// ── Asset Health Scores (from DB) ──
export function useAssetHealthScores() {
  return useQuery({
    queryKey: ["sps-asset-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sps_ai_asset_health_scores")
        .select("*")
        .order("score_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Predictive Maintenance (from DB) ──
export function usePredictiveMaintenance() {
  return useQuery({
    queryKey: ["sps-predictive-maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sps_ai_predictive_maintenance")
        .select("*")
        .order("prediction_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Contract Profitability (from DB) ──
export function useContractProfitability() {
  return useQuery({
    queryKey: ["sps-contract-profitability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sps_ai_contract_profitability")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Contract Signals (from DB) ──
export function useContractSignals() {
  return useQuery({
    queryKey: ["sps-contract-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sps_ai_contract_signals")
        .select("*")
        .order("signal_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Alerts (from DB) ──
export function useSPSAlerts() {
  return useQuery({
    queryKey: ["sps-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sps_ai_alerts")
        .select("*")
        .eq("status", "active")
        .order("generated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Copilot Notes (from DB) ──
export function useCopilotNotes(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["sps-copilot-notes", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sps_ai_admin_copilot_notes")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("generated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!entityType && !!entityId,
  });
}

// ── Compute mutations ──
export function useComputeAssetHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => callIntelligence({ action: "compute_asset_health", asset_id: assetId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sps-asset-health"] }),
  });
}

export function useComputePredictiveMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => callIntelligence({ action: "compute_predictive_maintenance", asset_id: assetId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sps-predictive-maintenance"] }),
  });
}

export function useComputeContractProfitability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => callIntelligence({ action: "compute_contract_profitability", contract_id: contractId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sps-contract-profitability"] }),
  });
}

export function useComputeContractSignals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => callIntelligence({ action: "compute_contract_signals", contract_id: contractId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sps-contract-signals"] }),
  });
}

export function useGenerateCopilotNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: string }) =>
      callIntelligence({ action: "generate_copilot_note", entity_type: entityType, entity_id: entityId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sps-copilot-notes"] }),
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => callIntelligence({ action: "dismiss_alert", entity_id: alertId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sps-alerts"] }),
  });
}
