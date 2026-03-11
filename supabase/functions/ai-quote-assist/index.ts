import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Market Price Bands (LKR) ───
const MARKET_BANDS: Record<string, { min: number; max: number; typical: number }> = {
  // AC
  ac_inspection: { min: 1500, max: 2500, typical: 1500 },
  ac_general_service: { min: 3000, max: 5000, typical: 3500 },
  ac_full_service: { min: 5000, max: 7500, typical: 5500 },
  ac_gas_refill: { min: 8000, max: 18000, typical: 12000 },
  ac_installation: { min: 12000, max: 25000, typical: 15000 },
  ac_relocation: { min: 8000, max: 18000, typical: 10000 },
  ac_water_leakage: { min: 3500, max: 8000, typical: 5000 },
  // MOBILE
  mobile_screen: { min: 6000, max: 45000, typical: 18000 },
  mobile_battery: { min: 3500, max: 12000, typical: 6500 },
  mobile_charging: { min: 2500, max: 6000, typical: 3500 },
  mobile_software: { min: 1500, max: 3500, typical: 2000 },
  mobile_water_damage: { min: 5000, max: 25000, typical: 12000 },
  mobile_board: { min: 8000, max: 35000, typical: 18000 },
  // IT
  it_laptop_screen: { min: 12000, max: 45000, typical: 22000 },
  it_laptop_battery: { min: 6000, max: 18000, typical: 10000 },
  it_laptop_motherboard: { min: 8000, max: 35000, typical: 18000 },
  it_laptop_keyboard: { min: 5000, max: 15000, typical: 8500 },
  it_laptop_overheat: { min: 2500, max: 6000, typical: 3500 },
  it_remote_support: { min: 1500, max: 5000, typical: 2500 },
  it_data_recovery: { min: 5000, max: 25000, typical: 12000 },
  it_desktop_ram: { min: 4000, max: 12000, typical: 7000 },
  it_desktop_storage: { min: 6000, max: 25000, typical: 12000 },
  // CCTV
  cctv_inspection: { min: 1000, max: 2000, typical: 1500 },
  cctv_install_per_cam: { min: 2500, max: 6000, typical: 4000 },
  cctv_dvr_config: { min: 2000, max: 5000, typical: 3000 },
  cctv_troubleshoot: { min: 1500, max: 4000, typical: 2500 },
  // SOLAR
  solar_inspection: { min: 2000, max: 5000, typical: 3000 },
  solar_maintenance: { min: 5000, max: 12000, typical: 7500 },
  // ELECTRICAL
  electrical_inspection: { min: 1500, max: 3000, typical: 2000 },
  electrical_wiring: { min: 3000, max: 15000, typical: 6000 },
  electrical_repair: { min: 2000, max: 8000, typical: 4000 },
  // PLUMBING
  plumbing_inspection: { min: 1500, max: 3000, typical: 2000 },
  plumbing_repair: { min: 2500, max: 12000, typical: 5000 },
  // ELECTRONICS
  elec_tv_inspection: { min: 1500, max: 2500, typical: 1500 },
  elec_tv_panel: { min: 6000, max: 35000, typical: 15000 },
  elec_washing: { min: 3500, max: 12000, typical: 6000 },
  elec_fridge: { min: 3500, max: 15000, typical: 7500 },
  // COPIER
  copier_inspection: { min: 1500, max: 3000, typical: 2000 },
  copier_service: { min: 3500, max: 8000, typical: 5000 },
  copier_repair: { min: 5000, max: 25000, typical: 12000 },
  // NETWORK
  network_setup: { min: 2000, max: 8000, typical: 4000 },
  network_troubleshoot: { min: 1500, max: 5000, typical: 3000 },
  // SMART HOME
  smart_consultation: { min: 2000, max: 5000, typical: 3000 },
  smart_installation: { min: 3000, max: 15000, typical: 8000 },
};

// ─── Category-specific labor bands ───
const CATEGORY_LABOR_BANDS: Record<string, { min: number; max: number }> = {
  AC: { min: 2000, max: 8000 },
  MOBILE: { min: 1500, max: 8000 },
  IT: { min: 2000, max: 10000 },
  CCTV: { min: 2000, max: 8000 },
  SOLAR: { min: 3000, max: 15000 },
  ELECTRICAL: { min: 1500, max: 8000 },
  PLUMBING: { min: 1500, max: 8000 },
  CONSUMER_ELEC: { min: 2000, max: 8000 },
  COPIER: { min: 2000, max: 8000 },
  NETWORK: { min: 2000, max: 6000 },
  SMART_HOME_OFFICE: { min: 2000, max: 10000 },
  HOME_SECURITY: { min: 2000, max: 8000 },
  POWER_BACKUP: { min: 2000, max: 8000 },
  APPLIANCE_INSTALL: { min: 2000, max: 6000 },
  PRINT_SUPPLIES: { min: 0, max: 2000 },
};

// ─── Risk flag detection ───
interface RiskFlag {
  code: string;
  label: string;
  severity: "info" | "warning" | "error";
  message: string;
}

function detectRiskFlags(params: {
  category_code: string;
  service_type: string;
  labor_amount: number;
  parts_total: number;
  estimated_total: number;
  service_key?: string;
  has_warranty: boolean;
  parts_count: number;
  issue_summary?: string;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const band = params.service_key ? MARKET_BANDS[params.service_key] : null;

  // Overpriced
  if (band && params.estimated_total > band.max * 1.3) {
    flags.push({
      code: "overpriced_vs_band",
      label: "Above Market Range",
      severity: "warning",
      message: `Total LKR ${params.estimated_total.toLocaleString()} is above the market range of LKR ${band.min.toLocaleString()}–${band.max.toLocaleString()}. Consider adding an explanation.`,
    });
  }

  // Underpriced
  if (band && params.estimated_total < band.min * 0.6) {
    flags.push({
      code: "underpriced_vs_band",
      label: "Below Market Range",
      severity: "warning",
      message: `Total LKR ${params.estimated_total.toLocaleString()} is significantly below market minimum LKR ${band.min.toLocaleString()}. May indicate missing line items.`,
    });
  }

  // Missing parts for categories that typically need parts
  const partsExpectedCategories = ["MOBILE", "IT", "AC", "CONSUMER_ELEC", "CCTV"];
  if (partsExpectedCategories.includes(params.category_code) && params.parts_count === 0 && params.parts_total === 0) {
    flags.push({
      code: "missing_parts_line",
      label: "No Parts Listed",
      severity: "warning",
      message: "No parts included in quote. If parts are needed, add them for transparency.",
    });
  }

  // Missing labor
  if (params.labor_amount === 0) {
    flags.push({
      code: "missing_labor_line",
      label: "No Labor Charge",
      severity: "warning",
      message: "Labor charge is zero. Ensure labor is included or explain why.",
    });
  }

  // Missing warranty
  if (!params.has_warranty) {
    flags.push({
      code: "warranty_missing",
      label: "No Warranty",
      severity: "info",
      message: "Adding warranty information increases customer trust and approval rate.",
    });
  }

  // Unusual total
  if (params.estimated_total > 100000) {
    flags.push({
      code: "unusual_total",
      label: "High Value Quote",
      severity: "info",
      message: "High-value quote. Detailed itemization and explanation recommended.",
    });
  }

  // Category-specific inspection recommendations
  const issueLC = (params.issue_summary || "").toLowerCase();
  const inspectionKeywords: Record<string, string[]> = {
    AC: ["compressor", "gas", "refrigerant", "uncertain", "unknown fault"],
    ELECTRICAL: ["sparking", "fire", "hazard", "short circuit", "burning"],
    MOBILE: ["water damage", "liquid", "motherboard", "board level"],
    SOLAR: ["install", "new system", "site assessment"],
  };

  const keywords = inspectionKeywords[params.category_code] || [];
  for (const kw of keywords) {
    if (issueLC.includes(kw)) {
      flags.push({
        code: "inspection_recommended",
        label: "Inspection Recommended",
        severity: "warning",
        message: `Issue "${kw}" detected. On-site inspection recommended before finalizing quote.`,
      });
      break;
    }
  }

  return flags;
}

// ─── Approval probability ───
function calculateApprovalProbability(params: {
  estimated_total: number;
  service_key?: string;
  risk_flags_count: number;
  has_warranty: boolean;
  parts_itemized: boolean;
  has_explanation: boolean;
}): number {
  let score = 75; // base

  const band = params.service_key ? MARKET_BANDS[params.service_key] : null;

  // Price within band → +15
  if (band) {
    if (params.estimated_total >= band.min && params.estimated_total <= band.max) {
      score += 15;
    } else if (params.estimated_total <= band.typical) {
      score += 10;
    } else if (params.estimated_total > band.max * 1.3) {
      score -= 20;
    } else if (params.estimated_total > band.max) {
      score -= 10;
    }
  }

  // Warranty → +5
  if (params.has_warranty) score += 5;
  // Parts itemized → +5
  if (params.parts_itemized) score += 5;
  // Explanation → +5
  if (params.has_explanation) score += 5;
  // Risk flags penalty
  score -= params.risk_flags_count * 5;

  return Math.max(20, Math.min(98, score));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startMs = Date.now();

  try {
    const body = await req.json();
    const {
      booking_id,
      partner_id,
      category_code,
      service_type,
      service_key,
      issue_summary,
      labor_amount = 0,
      parts = [],
      transport_amount = 0,
      add_on_amount = 0,
      warranty_text,
      technician_note,
    } = body;

    if (!category_code) {
      return new Response(JSON.stringify({ error: "category_code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partsTotal = (parts as any[]).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const estimatedTotal = labor_amount + partsTotal + transport_amount + add_on_amount;

    // Get market band
    const band = service_key ? MARKET_BANDS[service_key] : null;
    const laborBand = CATEGORY_LABOR_BANDS[category_code] || { min: 2000, max: 8000 };

    // Detect risk flags
    const riskFlags = detectRiskFlags({
      category_code,
      service_type: service_type || "",
      labor_amount,
      parts_total: partsTotal,
      estimated_total: estimatedTotal,
      service_key,
      has_warranty: !!warranty_text,
      parts_count: (parts as any[]).length,
      issue_summary,
    });

    // Approval probability
    const approvalProbability = calculateApprovalProbability({
      estimated_total: estimatedTotal,
      service_key,
      risk_flags_count: riskFlags.length,
      has_warranty: !!warranty_text,
      parts_itemized: (parts as any[]).length > 0,
      has_explanation: !!technician_note,
    });

    // AI-generated suggestions
    const suggestions: string[] = [];

    if (!warranty_text) {
      suggestions.push("Add warranty details to increase customer confidence.");
    }
    if (labor_amount === 0) {
      suggestions.push(`Suggested labor: LKR ${laborBand.min.toLocaleString()}–${laborBand.max.toLocaleString()} for ${category_code} services.`);
    }
    if (band && estimatedTotal > band.max * 1.2) {
      suggestions.push("Add a detailed technician note explaining the higher cost.");
    }
    if ((parts as any[]).length === 0 && ["MOBILE", "IT", "AC"].includes(category_code)) {
      suggestions.push("Consider adding itemized parts for transparency.");
    }

    // Build suggested warranty wording
    let suggestedWarranty = "30 days labor warranty";
    if (category_code === "AC") suggestedWarranty = "90 days labor · 6 months compressor";
    else if (category_code === "MOBILE") suggestedWarranty = "90 days labor · Part warranty per grade";
    else if (category_code === "IT") suggestedWarranty = "90 days labor · 6 months parts";
    else if (category_code === "CCTV") suggestedWarranty = "90 days labor · 12 months equipment";
    else if (category_code === "SOLAR") suggestedWarranty = "90 days labor · Manufacturer warranty on panels";
    else if (category_code === "ELECTRICAL") suggestedWarranty = "90 days labor · Wiring 12 months";

    const responseTimeMs = Date.now() - startMs;

    // Log to ai_interaction_logs if booking_id exists
    if (booking_id) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase.from("ai_interaction_logs").insert({
          interaction_type: "quote_assist",
          input_query: issue_summary || `${category_code}/${service_type}`,
          matched_category: category_code,
          matched_service: service_type,
          confidence_score: approvalProbability,
          confidence_bucket: approvalProbability >= 80 ? "high" : approvalProbability >= 60 ? "medium" : "low",
          response_time_ms: responseTimeMs,
          ai_model: "rule-based",
          metadata: {
            booking_id,
            partner_id,
            service_key,
            estimated_total: estimatedTotal,
            labor_amount,
            parts_total: partsTotal,
            risk_flags: riskFlags.map(f => f.code),
            approval_probability: approvalProbability,
            ai_price_band_low: band?.min || laborBand.min,
            ai_price_band_high: band?.max || laborBand.max,
          },
        });
      } catch (logErr) {
        console.error("Quote assist log error:", logErr);
      }
    }

    return new Response(JSON.stringify({
      ai_suggested_labor: {
        min: laborBand.min,
        max: laborBand.max,
        typical: Math.round((laborBand.min + laborBand.max) / 2),
      },
      ai_price_band: band ? { min: band.min, max: band.max, typical: band.typical } : null,
      approval_probability: approvalProbability,
      risk_flags: riskFlags,
      suggestions,
      suggested_warranty: suggestedWarranty,
      estimated_total: estimatedTotal,
      response_time_ms: responseTimeMs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-quote-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
