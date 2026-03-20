import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Normalization ────────────────────────────────────────
const BRAND_PREFIXES = ["hp", "canon", "brother", "epson", "xerox", "pantum", "ricoh", "kyocera", "samsung"];

export const normalize = (q: string): string => {
  let s = q.toLowerCase().replace(/[\s\-_./\\,()]+/g, "");
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
export interface MatchedModel {
  id: string;
  model_name: string;
  brand: string;
}

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
  matched_models: MatchedModel[];
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

// ─── Refill eligibility derived status ────────────────────
export type RefillEligibilityStatus = "eligible" | "likely_eligible" | "not_recommended";

export interface ConditionData {
  is_original: boolean;
  refilled_before: boolean;
  physical_damage: boolean;
  leakage: boolean;
  color_type: string;
  print_issue: string;
  urgency: string;
}

export function deriveEligibilityStatus(
  rule: { refill_supported: boolean | null; max_recommended_cycles: number | null; caution_text: string | null } | null,
  condition: ConditionData | null
): RefillEligibilityStatus {
  if (!rule || !rule.refill_supported) return "not_recommended";
  if (!condition) return "eligible"; // no condition data yet, rule says supported

  // Hard disqualifiers
  if (condition.physical_damage && condition.leakage) return "not_recommended";

  // Soft caution flags → likely_eligible
  if (condition.physical_damage || condition.leakage || condition.refilled_before) return "likely_eligible";
  if (rule.caution_text) return "likely_eligible";
  if (!condition.is_original) return "likely_eligible";

  return "eligible";
}

// ─── QR verification result types ─────────────────────────
export type QRVerificationStatus = "verified" | "invalid" | "flagged" | "inactive" | "not_found";

export interface QRVerificationResult {
  status: QRVerificationStatus;
  qr_serial: string;
  batch_no: string | null;
  verification_status: string | null;
  verified_at: string | null;
  created_at: string | null;
  consumable_product_id: string | null;
  product: {
    id: string;
    title: string;
    sku_code: string;
    brand: string;
    range_type: string;
    warranty_days: number | null;
    warranty_text: string | null;
    price: number;
  } | null;
}

// ─── Search log helper (best-effort, non-blocking) ───────
function logSearch(
  raw_query: string,
  normalized_query: string,
  search_type: string,
  match_status: string
): void {
  // fire-and-forget — never await, never block
  supabase.auth.getUser().then(({ data: { user } }) => {
    supabase.from("consumable_search_logs").insert({
      raw_query: raw_query.slice(0, 500),
      normalized_query: normalized_query.slice(0, 500),
      search_type,
      match_status,
      selected_product_id: null,
      user_id: user?.id ?? null,
    }).then(() => { /* swallow */ });
  }).catch(() => { /* swallow */ });
}

// ─── Search ───────────────────────────────────────────────
export function useConsumableSearch(query: string) {
  return useQuery<SearchResult | null>({
    queryKey: ["consumable-search", query],
    enabled: query.length >= 2,
    queryFn: async (): Promise<SearchResult> => {
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
        products = deduplicateProducts(skuMatch, "exact_sku");
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
          const modelIds = modelMatch.map((m: Record<string, unknown>) => m.id as string);
          const { data: compatProducts } = await supabase
            .from("consumable_compatibility")
            .select("match_type, consumable_products!inner(*)")
            .in("printer_model_id", modelIds)
            .eq("consumable_products.is_active", true);

          // Deduplicate by product ID
          const seen = new Set<string>();
          const dedupedProducts: Array<Record<string, unknown>> = [];
          for (const c of compatProducts || []) {
            const prod = (c as Record<string, unknown>).consumable_products as Record<string, unknown>;
            if (prod && !seen.has(prod.id as string)) {
              seen.add(prod.id as string);
              dedupedProducts.push({
                ...prod,
                _match_type: (c as Record<string, unknown>).match_type,
                _matched_models: modelMatch,
              });
            }
          }

          products = dedupedProducts.map((p) =>
            mapProduct(p, "model_match", p._match_type as string | undefined, p._matched_models as Record<string, unknown>[] | undefined)
          );
        } else {
          // 3. Title search fallback
          const { data: titleMatch } = await supabase
            .from("consumable_products")
            .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
            .ilike("title", `%${query}%`)
            .eq("is_active", true)
            .limit(20);

          products = deduplicateProducts(titleMatch || [], "title_match");
        }
      }

      // Build groups by compare_group
      const groupMap = new Map<string, CompareGroup>();
      for (const p of products) {
        const key = p.compare_group || `_solo_${p.id}`;
        const entry = groupMap.get(key) || { key };
        if (p.range_type === "smartfix_compatible") entry.smartfix = p;
        else if (p.range_type === "genuine_oem") entry.oem = p;
        else {
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
      const confOrder: Record<MatchConfidence, number> = { exact: 0, likely: 1, needs_verification: 2 };
      products.sort((a, b) => (confOrder[a.confidence] ?? 2) - (confOrder[b.confidence] ?? 2));

      // Log search (non-blocking)
      logSearch(query, norm, matchType, products.length > 0 ? products[0].confidence : "no_match");

      return { results: products, matchType, groups };
    },
  });
}

function deduplicateProducts(rawProducts: Record<string, unknown>[], searchMatchType: string): ConsumableResult[] {
  const seen = new Set<string>();
  const results: ConsumableResult[] = [];
  for (const p of rawProducts) {
    const id = p.id as string;
    if (!seen.has(id)) {
      seen.add(id);
      results.push(mapProduct(p, searchMatchType));
    }
  }
  return results;
}

function mapProduct(
  p: Record<string, unknown>,
  searchMatchType: string,
  compatMatchType?: string,
  matchedModels?: Record<string, unknown>[]
): ConsumableResult {
  const compat = (p.consumable_compatibility as Array<Record<string, unknown>>) || [];
  const models: MatchedModel[] = matchedModels
    ? matchedModels.map((m) => ({ id: m.id as string, model_name: m.model_name as string, brand: m.brand as string }))
    : compat.map((c) => c.printer_models as Record<string, unknown>).filter(Boolean).map((m) => ({
        id: m.id as string,
        model_name: m.model_name as string,
        brand: m.brand as string,
      }));

  return {
    id: p.id as string,
    title: p.title as string,
    brand: p.brand as string,
    sku_code: p.sku_code as string,
    range_type: p.range_type as string,
    price: Number(p.price),
    stock_qty: (p.stock_qty as number) ?? 0,
    yield_pages: (p.yield_pages as number | null) ?? null,
    net_weight_grams: (p.net_weight_grams as number | null) ?? null,
    warranty_days: (p.warranty_days as number | null) ?? null,
    warranty_text: (p.warranty_text as string | null) ?? null,
    color: (p.color as string | null) ?? null,
    qr_enabled: (p.qr_enabled as boolean | null) ?? null,
    express_delivery_eligible: (p.express_delivery_eligible as boolean | null) ?? null,
    image_url: (p.image_url as string | null) ?? null,
    description: (p.description as string | null) ?? null,
    product_type: (p.product_type as string) ?? "toner_cartridge",
    compare_group: (p.compare_group as string | null) ?? null,
    confidence: inferConfidence(compatMatchType || "exact", searchMatchType),
    matched_models: models,
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
export interface CompareResult {
  smartfix: Record<string, unknown>;
  oem: Record<string, unknown>;
  groupMismatch: boolean;
  noGroupData: boolean;
}

export function useCompareProducts(sfId: string, oemId: string) {
  return useQuery<CompareResult | null>({
    queryKey: ["compare-products", sfId, oemId],
    enabled: !!sfId && !!oemId && sfId !== oemId,
    queryFn: async (): Promise<CompareResult | null> => {
      const { data, error } = await supabase
        .from("consumable_products")
        .select("*, consumable_compatibility(printer_model_id, match_type, printer_models(*))")
        .in("id", [sfId, oemId]);
      if (error) throw error;
      if (!data || data.length < 2) return null;

      const sf = data.find((p) => p.id === sfId);
      const oem = data.find((p) => p.id === oemId);
      if (!sf || !oem) return null;

      // Stricter validation: verify products have different range_types
      const rangeTypes = new Set([sf.range_type, oem.range_type]);
      if (rangeTypes.size < 2) {
        // Both same range_type — still allow but flag
      }

      const noGroupData = !sf.compare_group && !oem.compare_group;
      const groupMismatch = !!(sf.compare_group && oem.compare_group && sf.compare_group !== oem.compare_group);

      return {
        smartfix: sf as unknown as Record<string, unknown>,
        oem: oem as unknown as Record<string, unknown>,
        groupMismatch,
        noGroupData,
      };
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
  condition_data: ConditionData;
  derived_eligibility: RefillEligibilityStatus;
}

export function useCreateRefillOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: RefillOrderPayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to submit a refill request");

      if (!order.phone || order.phone.length < 9) throw new Error("Valid phone number required");
      if (order.quantity < 1 || order.quantity > 20) throw new Error("Quantity must be 1-20");
      if (order.derived_eligibility === "not_recommended") throw new Error("This cartridge is not recommended for refill");

      const { data, error } = await supabase
        .from("refill_orders")
        .insert([{
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
          eligibility_status: order.derived_eligibility,
          condition_data: order.condition_data as never,
        }])
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
  return useQuery<QRVerificationResult | null>({
    queryKey: ["qr-verification", serial],
    enabled: serial.length >= 5,
    queryFn: async (): Promise<QRVerificationResult | null> => {
      const { data, error } = await supabase
        .from("product_qr_verifications")
        .select("*, consumable_products(id, title, sku_code, brand, range_type, warranty_days, warranty_text, price)")
        .eq("qr_serial", serial)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { status: "not_found", qr_serial: serial, batch_no: null, verification_status: null, verified_at: null, created_at: null, consumable_product_id: null, product: null };

      // Derive rich status
      const rawStatus = (data.verification_status as string) || "unverified";
      let status: QRVerificationStatus = "verified";
      if (rawStatus === "flagged") status = "flagged";
      else if (rawStatus === "inactive") status = "inactive";
      else if (rawStatus === "invalid") status = "invalid";
      else if (rawStatus === "verified" || rawStatus === "unverified") status = "verified";

      const prod = data.consumable_products as Record<string, unknown> | null;

      return {
        status,
        qr_serial: data.qr_serial,
        batch_no: data.batch_no,
        verification_status: data.verification_status,
        verified_at: data.verified_at,
        created_at: data.created_at,
        consumable_product_id: (data as Record<string, unknown>).consumable_product_id as string | null,
        product: prod ? {
          id: prod.id as string,
          title: prod.title as string,
          sku_code: prod.sku_code as string,
          brand: prod.brand as string,
          range_type: prod.range_type as string,
          warranty_days: prod.warranty_days as number | null,
          warranty_text: prod.warranty_text as string | null,
          price: Number(prod.price),
        } : null,
      };
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
    return parsed.filter(
      (c: Record<string, unknown>) =>
        c &&
        typeof c.productId === "string" &&
        typeof c.price === "number" &&
        typeof c.qty === "number" &&
        c.qty > 0
    ) as CartItem[];
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

function writeCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery<CartItem[]>({
    queryKey: ["consumable-cart"],
    queryFn: () => readCart(),
    staleTime: Infinity,
  });

  const syncCart = (cart: CartItem[]): void => {
    writeCart(cart);
    qc.setQueryData(["consumable-cart"], [...cart]);
  };

  const addItem = (item: Omit<CartItem, "qty"> & { qty?: number }): void => {
    if (item.stock_qty <= 0) {
      toast.error("This product is out of stock");
      return;
    }
    const cart = readCart();
    const existing = cart.find((c) => c.productId === item.productId);
    const addQty = Math.max(1, item.qty ?? 1);
    if (existing) {
      existing.qty = Math.min(existing.qty + addQty, Math.max(existing.stock_qty, 1));
    } else {
      cart.push({
        productId: item.productId,
        title: item.title,
        sku_code: item.sku_code,
        brand: item.brand,
        range_type: item.range_type,
        price: item.price,
        qty: Math.min(addQty, item.stock_qty),
        stock_qty: item.stock_qty,
        express_eligible: item.express_eligible,
        confidence: item.confidence,
      });
    }
    syncCart(cart);
    toast.success("Added to cart");
  };

  const updateQty = (productId: string, qty: number): void => {
    const cart = readCart().map((c) =>
      c.productId === productId
        ? { ...c, qty: Math.max(1, Math.min(qty, Math.max(c.stock_qty, 1))) }
        : c
    );
    syncCart(cart);
  };

  const removeItem = (productId: string): void => {
    const cart = readCart().filter((c) => c.productId !== productId);
    syncCart(cart);
    toast.success("Removed from cart");
  };

  const clearCart = (): void => {
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

      const dbMap = new Map<string, { id: string; price: number; stock_qty: number | null; is_active: boolean | null; express_delivery_eligible: boolean | null }>();
      for (const p of dbProducts || []) {
        dbMap.set(p.id, p);
      }

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
      let subtotal = 0;
      for (const i of payload.items) {
        const dbPrice = Number(dbMap.get(i.productId)!.price);
        subtotal += dbPrice * i.qty;
      }
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
        // Attempt rollback
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
