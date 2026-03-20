
-- =====================================================
-- CONSUMABLES ECOSYSTEM TABLES
-- =====================================================

-- 1. Printer Models
CREATE TABLE public.printer_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  device_type text NOT NULL DEFAULT 'printer',
  model_name text NOT NULL,
  model_family text,
  normalized_model text NOT NULL,
  aliases text[] DEFAULT '{}',
  mono_or_color text DEFAULT 'mono',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_printer_models_normalized ON public.printer_models (normalized_model);
CREATE INDEX idx_printer_models_brand ON public.printer_models (brand);
ALTER TABLE public.printer_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read printer_models" ON public.printer_models FOR SELECT USING (true);
CREATE POLICY "Admin manage printer_models" ON public.printer_models FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. Consumable Products
CREATE TABLE public.consumable_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  range_type text NOT NULL CHECK (range_type IN ('smartfix_compatible', 'genuine_oem')),
  product_type text NOT NULL DEFAULT 'toner',
  sku_code text NOT NULL UNIQUE,
  title text NOT NULL,
  color text DEFAULT 'black',
  yield_pages integer,
  net_weight_grams integer,
  warranty_days integer DEFAULT 180,
  warranty_text text,
  qr_enabled boolean DEFAULT false,
  description text,
  price numeric(10,2) NOT NULL,
  stock_qty integer DEFAULT 0,
  is_active boolean DEFAULT true,
  express_delivery_eligible boolean DEFAULT false,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_consumable_products_sku ON public.consumable_products (sku_code);
CREATE INDEX idx_consumable_products_brand_range ON public.consumable_products (brand, range_type);
ALTER TABLE public.consumable_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read consumable_products" ON public.consumable_products FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manage consumable_products" ON public.consumable_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Consumable Compatibility
CREATE TABLE public.consumable_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumable_product_id uuid REFERENCES public.consumable_products(id) ON DELETE CASCADE NOT NULL,
  printer_model_id uuid REFERENCES public.printer_models(id) ON DELETE CASCADE NOT NULL,
  match_type text DEFAULT 'exact' CHECK (match_type IN ('exact', 'likely', 'needs_verification')),
  notes text
);
CREATE INDEX idx_compat_product ON public.consumable_compatibility (consumable_product_id);
CREATE INDEX idx_compat_printer ON public.consumable_compatibility (printer_model_id);
ALTER TABLE public.consumable_compatibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read compatibility" ON public.consumable_compatibility FOR SELECT USING (true);
CREATE POLICY "Admin manage compatibility" ON public.consumable_compatibility FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Refill Eligibility Rules
CREATE TABLE public.refill_eligibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  printer_model_id uuid REFERENCES public.printer_models(id) ON DELETE SET NULL,
  cartridge_code text NOT NULL,
  refill_supported boolean DEFAULT true,
  refill_type text DEFAULT 'ink_refill',
  max_recommended_cycles integer DEFAULT 3,
  notes text,
  caution_text text
);
CREATE INDEX idx_refill_cartridge ON public.refill_eligibility_rules (cartridge_code);
ALTER TABLE public.refill_eligibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read refill rules" ON public.refill_eligibility_rules FOR SELECT USING (true);
CREATE POLICY "Admin manage refill rules" ON public.refill_eligibility_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Consumable Search Logs
CREATE TABLE public.consumable_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  raw_query text,
  normalized_query text,
  search_type text DEFAULT 'model',
  match_status text DEFAULT 'none',
  selected_product_id uuid REFERENCES public.consumable_products(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_search_logs_created ON public.consumable_search_logs (created_at DESC);
ALTER TABLE public.consumable_search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own search logs" ON public.consumable_search_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone insert search logs" ON public.consumable_search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read all search logs" ON public.consumable_search_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 6. Product QR Verifications
CREATE TABLE public.product_qr_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumable_product_id uuid REFERENCES public.consumable_products(id) ON DELETE CASCADE NOT NULL,
  qr_serial text NOT NULL UNIQUE,
  batch_no text,
  verification_status text DEFAULT 'unverified',
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.product_qr_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read QR verifications" ON public.product_qr_verifications FOR SELECT USING (true);
CREATE POLICY "Admin manage QR verifications" ON public.product_qr_verifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 7. Consumable Orders
CREATE TABLE public.consumable_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_no text NOT NULL UNIQUE DEFAULT 'CO-' || substr(gen_random_uuid()::text, 1, 8),
  delivery_method text DEFAULT 'standard',
  address_text text,
  phone text,
  subtotal numeric(10,2) DEFAULT 0,
  delivery_fee numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  payment_status text DEFAULT 'unpaid',
  order_status text DEFAULT 'pending',
  match_confirmation boolean DEFAULT false,
  invoice_requested boolean DEFAULT false,
  vat_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_consumable_orders_user ON public.consumable_orders (user_id);
ALTER TABLE public.consumable_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own orders" ON public.consumable_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own orders" ON public.consumable_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage all orders" ON public.consumable_orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 8. Consumable Order Items
CREATE TABLE public.consumable_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.consumable_orders(id) ON DELETE CASCADE NOT NULL,
  consumable_product_id uuid REFERENCES public.consumable_products(id) ON DELETE SET NULL,
  qty integer DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  line_total numeric(10,2) NOT NULL,
  selected_by_match_engine boolean DEFAULT false
);
ALTER TABLE public.consumable_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own order items" ON public.consumable_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.consumable_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
CREATE POLICY "Users create own order items" ON public.consumable_order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.consumable_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
CREATE POLICY "Admin manage order items" ON public.consumable_order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 9. Refill Orders
CREATE TABLE public.refill_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  refill_order_no text NOT NULL UNIQUE DEFAULT 'RF-' || substr(gen_random_uuid()::text, 1, 8),
  brand text,
  printer_model_id uuid REFERENCES public.printer_models(id) ON DELETE SET NULL,
  cartridge_code text,
  quantity integer DEFAULT 1,
  refill_status text DEFAULT 'request_received',
  eligibility_status text DEFAULT 'pending',
  inspection_status text DEFAULT 'pending',
  pickup_method text DEFAULT 'pickup',
  address_text text,
  phone text,
  service_fee numeric(10,2) DEFAULT 0,
  pickup_fee numeric(10,2) DEFAULT 0,
  return_fee numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_refill_orders_user ON public.refill_orders (user_id);
ALTER TABLE public.refill_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own refill orders" ON public.refill_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own refill orders" ON public.refill_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage all refill orders" ON public.refill_orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 10. Refill Inspection Logs
CREATE TABLE public.refill_inspection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refill_order_id uuid REFERENCES public.refill_orders(id) ON DELETE CASCADE NOT NULL,
  intake_photos text[] DEFAULT '{}',
  condition_notes text,
  accepted_status text DEFAULT 'pending' CHECK (accepted_status IN ('pending', 'accepted', 'accepted_with_caution', 'rejected')),
  caution_flag boolean DEFAULT false,
  recommended_action text,
  test_result text,
  completed_at timestamptz
);
ALTER TABLE public.refill_inspection_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own inspection logs" ON public.refill_inspection_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.refill_orders r WHERE r.id = refill_order_id AND r.user_id = auth.uid())
);
CREATE POLICY "Admin manage inspection logs" ON public.refill_inspection_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 11. Saved Devices
CREATE TABLE public.saved_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  printer_model_id uuid REFERENCES public.printer_models(id) ON DELETE SET NULL,
  nickname text,
  location_name text,
  preferred_range_type text DEFAULT 'smartfix_compatible',
  preferred_cartridge_code text,
  average_monthly_usage integer,
  last_ordered_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.saved_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved devices" ON public.saved_devices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admin read saved devices" ON public.saved_devices FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 12. Bulk Quote Requests
CREATE TABLE public.bulk_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name text NOT NULL,
  organization_name text,
  phone text NOT NULL,
  email text,
  request_type text DEFAULT 'bulk',
  product_notes text,
  qty integer,
  refill_required boolean DEFAULT false,
  oem_preference text DEFAULT 'either',
  recurring_frequency text,
  invoice_requirement text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bulk_quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone create bulk quotes" ON public.bulk_quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage bulk quotes" ON public.bulk_quote_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_printer_models_updated_at BEFORE UPDATE ON public.printer_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consumable_products_updated_at BEFORE UPDATE ON public.consumable_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consumable_orders_updated_at BEFORE UPDATE ON public.consumable_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_refill_orders_updated_at BEFORE UPDATE ON public.refill_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
