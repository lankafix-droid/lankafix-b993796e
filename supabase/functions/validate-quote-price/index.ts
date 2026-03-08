import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Market price ranges (mirrored from frontend for server-side validation)
const MARKET_RANGES: Record<string, { min: number; max: number }> = {
  it_laptop_screen: { min: 12000, max: 45000 },
  it_laptop_battery: { min: 6000, max: 18000 },
  it_laptop_motherboard: { min: 8000, max: 35000 },
  it_laptop_hinge: { min: 3500, max: 12000 },
  it_laptop_keyboard: { min: 5000, max: 15000 },
  it_laptop_overheat: { min: 2500, max: 6000 },
  it_desktop_ram: { min: 4000, max: 12000 },
  it_desktop_storage: { min: 6000, max: 25000 },
  ac_inspection: { min: 1500, max: 2500 },
  ac_general_service: { min: 3000, max: 5000 },
  ac_full_service: { min: 5000, max: 7500 },
  ac_gas_refill: { min: 8000, max: 18000 },
  ac_installation: { min: 12000, max: 25000 },
  ac_relocation: { min: 8000, max: 18000 },
  ac_water_leakage: { min: 3500, max: 8000 },
  cctv_inspection: { min: 1000, max: 2000 },
  cctv_install_per_cam: { min: 2500, max: 6000 },
  cctv_dvr_config: { min: 2000, max: 5000 },
  cctv_troubleshoot: { min: 1500, max: 4000 },
  mobile_screen: { min: 6000, max: 45000 },
  mobile_battery: { min: 3500, max: 12000 },
  mobile_charging: { min: 2500, max: 6000 },
  mobile_software: { min: 1500, max: 3500 },
  elec_tv_inspection: { min: 1500, max: 2500 },
  elec_tv_panel: { min: 6000, max: 35000 },
  elec_washing: { min: 3500, max: 12000 },
  elec_fridge: { min: 3500, max: 15000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quote_id, total_lkr, service_key, category_code, explanation } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate against market range
    const range = MARKET_RANGES[service_key];
    let level = "normal";
    let message = "Price accepted";

    if (range) {
      if (total_lkr < range.min * 0.7) {
        level = "warning";
        message = "Quote below market range";
      } else if (total_lkr > range.max * 1.5) {
        level = explanation ? "accepted_with_explanation" : "requires_explanation";
        message = `Quote exceeds market range by ${Math.round(((total_lkr - range.max) / range.max) * 100)}%`;
      } else if (total_lkr > range.max * 1.2) {
        level = "warning";
        message = "Quote above typical market range";
      }
    }

    // Log price intelligence data for learning
    if (quote_id) {
      await supabase.from("job_timeline").insert({
        booking_id: (await supabase.from("quotes").select("booking_id").eq("id", quote_id).single()).data?.booking_id,
        status: "price_validation",
        actor: "system",
        note: `${level}: ${message}`,
        metadata: {
          quote_id,
          total_lkr,
          service_key,
          category_code,
          market_min: range?.min,
          market_max: range?.max,
          validation_level: level,
          explanation: explanation || null,
        },
      });
    }

    return new Response(
      JSON.stringify({
        level,
        message,
        market_range: range || null,
        accepted: level !== "requires_explanation" && level !== "rejected",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
