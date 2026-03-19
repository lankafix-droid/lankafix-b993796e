/**
 * React hooks for leads management
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Lead {
  id: string;
  demand_request_id: string | null;
  category_code: string;
  request_type: string;
  assigned_operator_id: string | null;
  assigned_partner_id: string | null;
  status: string;
  booking_id: string | null;
  ai_classification: any;
  ai_priority_score: number;
  ai_suggested_partners: any[] | null;
  estimated_complexity: string;
  assignment_sent_at: string | null;
  accept_by: string | null;
  assignment_attempt: number;
  reassigned_from_partner_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_location: string | null;
  description: string | null;
  zone_code: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeads(status?: string) {
  return useQuery({
    queryKey: ["leads", status],
    queryFn: async () => {
      let q = supabase
        .from("leads" as any)
        .select("*")
        .order("ai_priority_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (status && status !== "all") {
        q = q.eq("status", status);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Lead[];
    },
    refetchInterval: 15_000,
  });
}

export function useClassifyDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (demandRequestId: string) => {
      const { data, error } = await supabase.functions.invoke("classify-demand", {
        body: { demand_request_id: demandRequestId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Demand classified & lead created");
    },
    onError: (err: Error) => {
      toast.error(`Classification failed: ${err.message}`);
    },
  });
}
