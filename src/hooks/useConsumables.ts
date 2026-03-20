import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Normalization ────────────────────────────────────────
const BRAND_PREFIXES = ["hp", "canon", "brother", "epson", "xerox", "pantum", "ricoh", "kyocera", "samsung"];

export const normalize = (q: string): string => {
  let s = q.toLowerCase().replace(/[\s\-_\.\/\\,()]+/g, "");
  // Don't strip brand prefix if that's the entire query
  for (const b of BRAND_PREFIXES) {
    if (s.startsWith(b) && s.length > b.length) {
      s = b + s.slice(b.length); // keep brand attached
      break;
    }
  }
  return s;
};

// ─── Confidence helpers ───────────────────────────────────
export type MatchConfidence = "exact" | "likely" | "needs_verification";

function inferConfidence(matchType: string, searchMatchType: string): MatchConfidence {
  if (searchMatchType === "exact_sku") return "exact";
  if (matchType === "exact" || searchMatchType === "model_exact") return "exact";
  if (matchType === "compatible" || searchMatchType === "model_match") return "likely";
  return "needs_verification";
}

// ─── Types ────────────────────────────────────────────────
export interface ConsumableResult {
  id: string;
  title: string;
  brand: string;
  sku_code: string;
  range_type: string;
  price: number;
  stock_qty: number;
  yield_pages: number | null;
  net_weight_grams: number | null;
  warranty_days: number | null;
  warranty_text: string | null;
  color: string | null;
  qr_enabled: boolean | null;
  express_delivery_eligible: boolean | null;
  image_url: string | null;
  description: string | null;
  product_type: string;
  confidence: MatchConfidence;
  matched_models: Array<{ id: string; model_name: string; brand: string }>;
  alternative_id?: string; // opposite range_type product for same models
  refill_eligible?: boolean;
}

export interface SearchResult {
  results: ConsumableResult[];
  matchType: string;
  grouped: Map<string, { smartfix?: ConsumableResult; oem?: ConsumableResult }>;
}

// ─── Search ───────────────────────────────────────────────
export function useConsumableSearch(query: string) {
  return useQuery<SearchResult | null>({
    queryKey: ["consumable-search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const norm = normalize(query);
      let products: ConsumableResult[] = [];
      let matchType = "title_match";

      // 1. Try exact SKU match
      const { data: skuMatch } = await supabase
        .from("consumable_products")
        .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
        .ilike("sku_code", `%${query}%`)
        .eq("is_active", true)
        .limit(20);

      if (skuMatch && skuMatch.length > 0) {
        matchType = "exact_sku";
        products = skuMatch.map((p: any) => mapProduct(p, "exact_sku"));
      } else {
        // 2. Printer model match (exact then alias)
        const { data: modelMatch } = await supabase
          .from("printer_models")
          .select("*")
          .or(`normalized_model.ilike.%${norm}%,model_name.ilike.%${query}%`)
          .eq("is_active", true)
          .limit(20);

        if (modelMatch && modelMatch.length > 0) {
          matchType = "model_match";
          const modelIds = modelMatch.map((m: any) => m.id);
          const { data: compatProducts } = await supabase
            .from("consumable_compatibility")
            .select("match_type, consumable_products!inner(*)")
            .in("printer_model_id", modelIds)
            .eq("consumable_products.is_active", true);

          // Deduplicate by product ID
          const seen = new Set<string>();
          const dedupedProducts: any[] = [];
          for (const c of compatProducts || []) {
            const prod = (c as any).consumable_products;
            if (prod && !seen.has(prod.id)) {
              seen.add(prod.id);
              dedupedProducts.push({
                ...prod,
                _match_type: (c as any).match_type,
                _matched_models: modelMatch,
              });
            }
          }

          products = dedupedProducts.map((p: any) =>
            mapProduct(p, "model_match", p._match_type, p._matched_models)
          );
        } else {
          // 3. Title search fallback
          const { data: titleMatch } = await supabase
            .from("consumable_products")
            .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
            .ilike("title", `%${query}%`)
            .eq("is_active", true)
            .limit(20);

          products = (titleMatch || []).map((p: any) => mapProduct(p, "title_match"));
        }
      }

      // Build grouped alternatives (SmartFix vs OEM for same SKU family)
      const grouped = new Map<string, { smartfix?: ConsumableResult; oem?: ConsumableResult }>();
      for (const p of products) {
        // Group key: brand + color (rough grouping)
        const key = `${p.brand}-${p.color || "bk"}`.toLowerCase();
        const entry = grouped.get(key) || {};
        if (p.range_type === "smartfix_compatible") entry.smartfix = p;
        else entry.oem = p;
        grouped.set(key, entry);
      }

      // Cross-link alternatives
      for (const [, pair] of grouped) {
        if (pair.smartfix && pair.oem) {
          pair.smartfix.alternative_id = pair.oem.id;
          pair.oem.alternative_id = pair.smartfix.id;
        }
      }

      // Sort: exact first, then by range_type for visual grouping
      products.sort((a, b) => {
        const confOrder = { exact: 0, likely: 1, needs_verification: 2 };
        return (confOrder[a.confidence] || 2) - (confOrder[b.confidence] || 2);
      });

      // Log search (fire-and-forget, no await)
      supabase.from("consumable_search_logs").insert({
        raw_query: query,
        normalized_query: norm,
        search_type: matchType,
        match_status: products.length > 0 ? products[0].confidence : "no_match",
        selected_product_id: null,
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
      }).then(() => {});

      return { results: products, matchType, grouped };
    },
  });
}

function mapProduct(
  p: any,
  searchMatchType: string,
  compatMatchType?: string,
  matchedModels?: any[]
): ConsumableResult {
  const models = matchedModels ||
    (p.consumable_compatibility || []).map((c: any) => c.printer_models).filter(Boolean);

  return {
    id: p.id,
    title: p.title,
    brand: p.brand,
    sku_code: p.sku_code,
    range_type: p.range_type,
    price: p.price,
    stock_qty: p.stock_qty ?? 0,
    yield_pages: p.yield_pages,
    net_weight_grams: p.net_weight_grams,
    warranty_days: p.warranty_days,
    warranty_text: p.warranty_text,
    color: p.color,
    qr_enabled: p.qr_enabled,
    express_delivery_eligible: p.express_delivery_eligible,
    image_url: p.image_url,
    description: p.description,
    product_type: p.product_type,
    confidence: inferConfidence(compatMatchType || "exact", searchMatchType),
    matched_models: models.map((m: any) => ({
      id: m.id,
      model_name: m.model_name,
      brand: m.brand,
    })),
  };
}

// ─── Single Product ───────────────────────────────────────
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

// ─── Compare Two Products ─────────────────────────────────
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
      const sf = data?.find((p: any) => p.range_type === "smartfix_compatible") || data?.[0];
      const oem = data?.find((p: any) => p.range_type === "genuine_oem") || data?.[1];
      return { smartfix: sf, oem };
    },
  });
}

// ─── Range listing ────────────────────────────────────────
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

// ─── Refill ───────────────────────────────────────────────
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

export function useCreateRefillOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to submit a refill request");
      const { data, error } = await supabase
        .from("refill_orders")
        .insert({ ...order, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Refill request submitted successfully");
      qc.invalidateQueries({ queryKey: ["refill-orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMyRefillOrders() {
  return useQuery({
    queryKey: ["refill-orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("refill_orders")
        .select("*, printer_models(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── QR Verification ──────────────────────────────────────
export function useQRVerification(serial: string) {
  return useQuery({
    queryKey: ["qr-verification", serial],
    enabled: serial.length >= 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_qr_verifications")
        .select("*, consumable_products(*)")
        .eq("qr_serial", serial)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Cart (Zustand-free, React Query + localStorage) ─────
export interface CartItem {
  productId: string;
  title: string;
  sku_code: string;
  brand: string;
  range_type: string;
  price: number;
  qty: number;
  stock_qty: number;
  express_eligible: boolean;
  confidence: MatchConfidence;
}

const CART_KEY = "lankafix_consumables_cart";

function readCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
}
function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery<CartItem[]>({
    queryKey: ["consumable-cart"],
    queryFn: () => readCart(),
    staleTime: Infinity,
  });

  const addItem = (item: Omit<CartItem, "qty"> & { qty?: number }) => {
    const cart = readCart();
    const existing = cart.find((c) => c.productId === item.productId);
    if (existing) {
      existing.qty = Math.min(existing.qty + (item.qty || 1), existing.stock_qty);
    } else {
      cart.push({ ...item, qty: item.qty || 1 } as CartItem);
    }
    writeCart(cart);
    qc.setQueryData(["consumable-cart"], cart);
    toast.success("Added to cart");
  };

  const updateQty = (productId: string, qty: number) => {
    const cart = readCart().map((c) =>
      c.productId === productId ? { ...c, qty: Math.max(1, Math.min(qty, c.stock_qty)) } : c
    );
    writeCart(cart);
    qc.setQueryData(["consumable-cart"], cart);
  };

  const removeItem = (productId: string) => {
    const cart = readCart().filter((c) => c.productId !== productId);
    writeCart(cart);
    qc.setQueryData(["consumable-cart"], cart);
    toast.success("Removed from cart");
  };

  const clearCart = () => {
    writeCart([]);
    qc.setQueryData(["consumable-cart"], []);
  };

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const hasLowConfidence = items.some((i) => i.confidence === "needs_verification");
  const hasOutOfStock = items.some((i) => i.stock_qty <= 0);

  return { items, addItem, updateQty, removeItem, clearCart, subtotal, hasLowConfidence, hasOutOfStock, count: items.length };
}

// ─── Orders ───────────────────────────────────────────────
export function useCreateOrder() {
  const qc = useQueryClient();
  const { clearCart } = useCart();
  return useMutation({
    mutationFn: async (payload: {
      delivery_method: string;
      address_text: string;
      phone: string;
      invoice_requested: boolean;
      vat_number?: string;
      match_confirmation: boolean;
      items: CartItem[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to place an order");

      const subtotal = payload.items.reduce((s, i) => s + i.price * i.qty, 0);
      const delivery_fee = payload.delivery_method === "express" ? 500 : payload.delivery_method === "scheduled" ? 250 : 0;
      const total = subtotal + delivery_fee;

      const { data: order, error: orderError } = await supabase
        .from("consumable_orders")
        .insert({
          user_id: user.id,
          delivery_method: payload.delivery_method,
          address_text: payload.address_text,
          phone: payload.phone,
          invoice_requested: payload.invoice_requested,
          vat_number: payload.vat_number || null,
          match_confirmation: payload.match_confirmation,
          subtotal,
          delivery_fee,
          total,
          order_status: "pending",
          payment_status: "unpaid",
        })
        .select()
        .single();
      if (orderError) throw orderError;

      // Insert line items
      const lineItems = payload.items.map((i) => ({
        order_id: order.id,
        consumable_product_id: i.productId,
        qty: i.qty,
        unit_price: i.price,
        line_total: i.price * i.qty,
        selected_by_match_engine: i.confidence === "exact",
      }));
      const { error: itemsError } = await supabase.from("consumable_order_items").insert(lineItems);
      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      toast.success("Order placed successfully");
      clearCart();
      qc.invalidateQueries({ queryKey: ["consumable-orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ["consumable-orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("consumable_orders")
        .select("*, consumable_order_items(*, consumable_products(title, sku_code, brand))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Saved Devices ────────────────────────────────────────
export function useSavedDevices() {
  return useQuery({
    queryKey: ["saved-devices"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_devices")
        .select("*, printer_models(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (device: { printer_model_id: string; nickname: string; preferred_range_type: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in");
      const { data, error } = await supabase
        .from("saved_devices")
        .insert({ ...device, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Device saved");
      qc.invalidateQueries({ queryKey: ["saved-devices"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Bulk Quote ───────────────────────────────────────────
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
