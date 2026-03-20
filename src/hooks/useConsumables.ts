import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Normalization ────────────────────────────────────────
const BRAND_PREFIXES = ["hp", "canon", "brother", "epson", "xerox", "pantum", "ricoh", "kyocera", "samsung"];

export const normalize = (q: string): string => {
  let s = q.toLowerCase().replace(/[\s\-_\.\/\\,()]+/g, "");
  for (const b of BRAND_PREFIXES) {
    if (s.startsWith(b) && s.length > b.length) {
      s = b + s.slice(b.length);
      break;
    }
  }
  return s;
};

// ─── Confidence ───────────────────────────────────────────
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
  compare_group: string | null;
  confidence: MatchConfidence;
  matched_models: Array<{ id: string; model_name: string; brand: string }>;
  alternative_id?: string;
  refill_eligible?: boolean;
}

export interface CompareGroup {
  key: string;
  smartfix?: ConsumableResult;
  oem?: ConsumableResult;
}

export interface SearchResult {
  results: ConsumableResult[];
  matchType: string;
  groups: CompareGroup[];
}

// ─── Search log helper (best-effort, non-blocking) ───────
async function logSearch(
  raw_query: string,
  normalized_query: string,
  search_type: string,
  match_status: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("consumable_search_logs").insert({
      raw_query: raw_query.slice(0, 500),
      normalized_query: normalized_query.slice(0, 500),
      search_type,
      match_status,
      selected_product_id: null,
      user_id: user?.id || null,
    });
  } catch {
    // best-effort — never break user flow
  }
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
        // 2. Printer model match
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

      // Build groups by compare_group (explicit DB field)
      const groupMap = new Map<string, CompareGroup>();
      for (const p of products) {
        const key = p.compare_group || `_solo_${p.id}`;
        const entry = groupMap.get(key) || { key };
        if (p.range_type === "smartfix_compatible") entry.smartfix = p;
        else if (p.range_type === "genuine_oem") entry.oem = p;
        else {
          // fallback: put in whichever slot is free
          if (!entry.smartfix) entry.smartfix = p;
          else if (!entry.oem) entry.oem = p;
        }
        groupMap.set(key, entry);
      }

      // Cross-link alternatives
      for (const [, pair] of groupMap) {
        if (pair.smartfix && pair.oem) {
          pair.smartfix.alternative_id = pair.oem.id;
          pair.oem.alternative_id = pair.smartfix.id;
        }
      }

      const groups = Array.from(groupMap.values());

      // Sort: exact first
      products.sort((a, b) => {
        const confOrder: Record<MatchConfidence, number> = { exact: 0, likely: 1, needs_verification: 2 };
        return (confOrder[a.confidence] ?? 2) - (confOrder[b.confidence] ?? 2);
      });

      // Log search (non-blocking)
      logSearch(query, norm, matchType, products.length > 0 ? products[0].confidence : "no_match");

      return { results: products, matchType, groups };
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
    price: Number(p.price),
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
    compare_group: p.compare_group ?? null,
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
        .maybeSingle();
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
      if (!data || data.length < 2) return null;

      // Validate both exist and ideally share compare_group
      const sf = data.find((p: any) => p.id === sfId);
      const oem = data.find((p: any) => p.id === oemId);
      if (!sf || !oem) return null;

      // Warn if compare_group mismatch (but still allow)
      const groupMismatch = sf.compare_group && oem.compare_group && sf.compare_group !== oem.compare_group;

      return { smartfix: sf, oem, groupMismatch };
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

export interface RefillOrderPayload {
  brand: string;
  printer_model_id: string | null;
  cartridge_code: string;
  quantity: number;
  pickup_method: string;
  address_text: string;
  phone: string;
  notes: string;
  service_fee: number;
  pickup_fee: number;
  total: number;
  condition_data: Record<string, unknown>;
}

export function useCreateRefillOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: RefillOrderPayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to submit a refill request");

      // Validate input
      if (!order.phone || order.phone.length < 9) throw new Error("Valid phone number required");
      if (order.quantity < 1 || order.quantity > 20) throw new Error("Quantity must be 1-20");

      const { data, error } = await supabase
        .from("refill_orders")
        .insert({
          user_id: user.id,
          brand: order.brand,
          printer_model_id: order.printer_model_id,
          cartridge_code: order.cartridge_code,
          quantity: order.quantity,
          pickup_method: order.pickup_method,
          address_text: order.address_text.slice(0, 500),
          phone: order.phone.slice(0, 20),
          notes: order.notes.slice(0, 1000),
          service_fee: order.service_fee,
          pickup_fee: order.pickup_fee,
          total: order.total,
          refill_status: "request_received",
          eligibility_status: "eligible",
          condition_data: order.condition_data,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Refill request submitted successfully");
      qc.invalidateQueries({ queryKey: ["refill-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
        .select("*, consumable_products(id, title, sku_code, brand, range_type, warranty_days, warranty_text, price)")
        .eq("qr_serial", serial)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Cart (localStorage + React Query) ───────────────────
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
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate each item has required fields
    return parsed.filter(
      (c: any) => c && typeof c.productId === "string" && typeof c.price === "number" && typeof c.qty === "number"
    );
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
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

  const syncCart = (cart: CartItem[]) => {
    writeCart(cart);
    qc.setQueryData(["consumable-cart"], [...cart]);
  };

  const addItem = (item: Omit<CartItem, "qty"> & { qty?: number }) => {
    if (item.stock_qty <= 0) {
      toast.error("This product is out of stock");
      return;
    }
    const cart = readCart();
    const existing = cart.find((c) => c.productId === item.productId);
    if (existing) {
      existing.qty = Math.min(existing.qty + (item.qty || 1), Math.max(existing.stock_qty, 1));
    } else {
      cart.push({ ...item, qty: Math.min(item.qty || 1, item.stock_qty) } as CartItem);
    }
    syncCart(cart);
    toast.success("Added to cart");
  };

  const updateQty = (productId: string, qty: number) => {
    const cart = readCart().map((c) =>
      c.productId === productId ? { ...c, qty: Math.max(1, Math.min(qty, Math.max(c.stock_qty, 1))) } : c
    );
    syncCart(cart);
  };

  const removeItem = (productId: string) => {
    const cart = readCart().filter((c) => c.productId !== productId);
    syncCart(cart);
    toast.success("Removed from cart");
  };

  const clearCart = () => {
    syncCart([]);
  };

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const hasLowConfidence = items.some((i) => i.confidence === "needs_verification");
  const hasOutOfStock = items.some((i) => i.stock_qty <= 0);

  return { items, addItem, updateQty, removeItem, clearCart, subtotal, hasLowConfidence, hasOutOfStock, count: items.length };
}

// ─── Orders ───────────────────────────────────────────────
export interface CreateOrderPayload {
  delivery_method: string;
  address_text: string;
  phone: string;
  invoice_requested: boolean;
  vat_number?: string;
  match_confirmation: boolean;
  items: CartItem[];
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to place an order");

      if (!payload.phone || payload.phone.length < 9) throw new Error("Valid phone required");
      if (payload.delivery_method !== "pickup" && !payload.address_text) throw new Error("Address required for delivery");
      if (payload.items.length === 0) throw new Error("Cart is empty");

      // ── STOCK PREFLIGHT: re-fetch all products from DB ──
      const productIds = payload.items.map((i) => i.productId);
      const { data: dbProducts, error: fetchErr } = await supabase
        .from("consumable_products")
        .select("id, price, stock_qty, is_active, express_delivery_eligible")
        .in("id", productIds);
      if (fetchErr) throw new Error("Could not verify product availability");

      const dbMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));

      // Validate each item
      for (const item of payload.items) {
        const dbProd = dbMap.get(item.productId);
        if (!dbProd) throw new Error(`Product "${item.title}" no longer exists`);
        if (!dbProd.is_active) throw new Error(`Product "${item.title}" is no longer available`);
        if ((dbProd.stock_qty ?? 0) < item.qty) throw new Error(`Insufficient stock for "${item.title}" (${dbProd.stock_qty ?? 0} available)`);
        if (payload.delivery_method === "express" && !dbProd.express_delivery_eligible) {
          throw new Error(`"${item.title}" is not eligible for express delivery`);
        }
      }

      // Calculate using DB prices (source of truth)
      const subtotal = payload.items.reduce((s, i) => {
        const dbPrice = Number(dbMap.get(i.productId)!.price);
        return s + dbPrice * i.qty;
      }, 0);
      const delivery_fee = payload.delivery_method === "express" ? 500 : payload.delivery_method === "scheduled" ? 250 : 0;
      const total = subtotal + delivery_fee;

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from("consumable_orders")
        .insert({
          user_id: user.id,
          delivery_method: payload.delivery_method,
          address_text: payload.address_text.slice(0, 500),
          phone: payload.phone.slice(0, 20),
          invoice_requested: payload.invoice_requested,
          vat_number: payload.vat_number?.slice(0, 50) || null,
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

      // Insert line items using DB-validated prices
      const lineItems = payload.items.map((i) => ({
        order_id: order.id,
        consumable_product_id: i.productId,
        qty: i.qty,
        unit_price: Number(dbMap.get(i.productId)!.price),
        line_total: Number(dbMap.get(i.productId)!.price) * i.qty,
        selected_by_match_engine: i.confidence === "exact",
      }));

      const { error: itemsError } = await supabase.from("consumable_order_items").insert(lineItems);
      if (itemsError) {
        // Attempt cleanup
        await supabase.from("consumable_orders").delete().eq("id", order.id);
        throw new Error("Failed to save order items. Please try again.");
      }

      return order;
    },
    onSuccess: () => {
      toast.success("Order placed successfully");
      qc.invalidateQueries({ queryKey: ["consumable-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
    mutationFn: async (device: { printer_model_id: string; nickname: string; preferred_range_type: string; location_name?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in");
      if (!device.nickname || device.nickname.length < 1) throw new Error("Device name required");

      const { data, error } = await supabase
        .from("saved_devices")
        .insert({
          printer_model_id: device.printer_model_id,
          nickname: device.nickname.slice(0, 100),
          preferred_range_type: device.preferred_range_type,
          location_name: device.location_name?.slice(0, 200) || null,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Device saved");
      qc.invalidateQueries({ queryKey: ["saved-devices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Bulk Quote ───────────────────────────────────────────
export interface BulkQuotePayload {
  requester_name: string;
  phone: string;
  email?: string;
  organization_name?: string;
  product_notes?: string;
  qty?: number;
  refill_required?: boolean;
  oem_preference?: string;
  recurring_frequency?: string;
  invoice_requirement?: string;
  request_type?: string;
}

export function useCreateBulkQuote() {
  return useMutation({
    mutationFn: async (quote: BulkQuotePayload) => {
      if (!quote.requester_name || quote.requester_name.length < 2) throw new Error("Name required");
      if (!quote.phone || quote.phone.length < 9) throw new Error("Valid phone required");

      const { data, error } = await supabase
        .from("bulk_quote_requests")
        .insert({
          requester_name: quote.requester_name.slice(0, 200),
          phone: quote.phone.slice(0, 20),
          email: quote.email?.slice(0, 255) || null,
          organization_name: quote.organization_name?.slice(0, 200) || null,
          product_notes: quote.product_notes?.slice(0, 2000) || null,
          qty: quote.qty && quote.qty > 0 ? Math.min(quote.qty, 100000) : null,
          refill_required: quote.refill_required ?? false,
          oem_preference: quote.oem_preference || "either",
          recurring_frequency: quote.recurring_frequency || null,
          invoice_requirement: quote.invoice_requirement || null,
          request_type: quote.request_type || "standard",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Bulk quote request submitted"),
    onError: (e: Error) => toast.error(e.message),
  });
}
