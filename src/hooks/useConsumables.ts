import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Normalize search query for matching
const normalize = (q: string) =>
  q.toLowerCase().replace(/[\s\-_\.]/g, "").replace(/^(hp|canon|brother|epson|xerox|pantum)/i, (m) => m.toLowerCase());

export function useConsumableSearch(query: string) {
  return useQuery({
    queryKey: ["consumable-search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const norm = normalize(query);

      // 1. Try exact SKU match
      const { data: skuMatch } = await supabase
        .from("consumable_products")
        .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
        .ilike("sku_code", `%${query}%`)
        .eq("is_active", true)
        .limit(10);

      if (skuMatch && skuMatch.length > 0) return { results: skuMatch, matchType: "exact_sku" as const };

      // 2. Try printer model match
      const { data: modelMatch } = await supabase
        .from("printer_models")
        .select("*")
        .or(`normalized_model.ilike.%${norm}%,model_name.ilike.%${query}%`)
        .eq("is_active", true)
        .limit(10);

      if (modelMatch && modelMatch.length > 0) {
        const modelIds = modelMatch.map((m: any) => m.id);
        const { data: compatProducts } = await supabase
          .from("consumable_compatibility")
          .select("match_type, consumable_products(*)")
          .in("printer_model_id", modelIds);

        const products = (compatProducts || []).map((c: any) => ({
          ...c.consumable_products,
          match_type: c.match_type,
          matched_models: modelMatch,
        }));
        return { results: products, matchType: "model_match" as const, models: modelMatch };
      }

      // 3. Try product title search
      const { data: titleMatch } = await supabase
        .from("consumable_products")
        .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
        .ilike("title", `%${query}%`)
        .eq("is_active", true)
        .limit(10);

      return { results: titleMatch || [], matchType: "title_match" as const };
    },
  });
}

export function usePrinterModels(brand?: string) {
  return useQuery({
    queryKey: ["printer-models", brand],
    queryFn: async () => {
      let q = supabase.from("printer_models").select("*").eq("is_active", true).order("brand");
      if (brand) q = q.eq("brand", brand);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useConsumableProduct(id: string) {
  return useQuery({
    queryKey: ["consumable-product", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consumable_products")
        .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useProductsByRange(rangeType: string) {
  return useQuery({
    queryKey: ["consumable-products-range", rangeType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consumable_products")
        .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
        .eq("range_type", rangeType)
        .eq("is_active", true)
        .order("brand");
      if (error) throw error;
      return data;
    },
  });
}

export function useRefillEligibility(cartridgeCode: string) {
  return useQuery({
    queryKey: ["refill-eligibility", cartridgeCode],
    enabled: cartridgeCode.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refill_eligibility_rules")
        .select("*, printer_models(*)")
        .ilike("cartridge_code", `%${cartridgeCode}%`);
      if (error) throw error;
      return data;
    },
  });
}

export function useQRVerification(serial: string) {
  return useQuery({
    queryKey: ["qr-verification", serial],
    enabled: serial.length >= 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_qr_verifications")
        .select("*, consumable_products(*)")
        .eq("qr_serial", serial)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRefillOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await supabase
        .from("refill_orders")
        .insert(order)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Refill request submitted");
      qc.invalidateQueries({ queryKey: ["refill-orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMyRefillOrders() {
  return useQuery({
    queryKey: ["refill-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refill_orders")
        .select("*, printer_models(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSavedDevices() {
  return useQuery({
    queryKey: ["saved-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_devices")
        .select("*, printer_models(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBulkQuote() {
  return useMutation({
    mutationFn: async (quote: any) => {
      const { data, error } = await supabase
        .from("bulk_quote_requests")
        .insert(quote)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Bulk quote request submitted"),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCompareProducts(sfId: string, oemId: string) {
  return useQuery({
    queryKey: ["compare-products", sfId, oemId],
    enabled: !!sfId && !!oemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consumable_products")
        .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
        .in("id", [sfId, oemId]);
      if (error) throw error;
      const sf = data?.find((p: any) => p.range_type === "smartfix_compatible");
      const oem = data?.find((p: any) => p.range_type === "genuine_oem");
      return { smartfix: sf, oem };
    },
  });
}
