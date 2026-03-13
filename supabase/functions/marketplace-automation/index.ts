import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * marketplace-automation: Cron-driven autonomous marketplace engine.
 * Runs every 5 minutes to detect and act on operational risks.
 *
 * Covers gaps NOT handled by existing systems:
 * - Module 3: Partner fatigue protection
 * - Module 5: Customer trust recovery (low rating → auto support case)
 * - Module 7: SLA breach detection
 * - Module 9/10: Demand signals (lightweight)
 *
 * Already handled elsewhere (NOT duplicated here):
 * - booking-watchdog: stuck jobs, timeouts, abandonment
 * - dispatch-expiry-worker: offer expiry + re-dispatch
 * - compute-performance-scores: partner scoring + tiering
 * - retention-engine: maintenance reminders, quote follow-ups
 * - fraud-detection: price gouging, ghost jobs
 * - smart-dispatch: intelligent matching
 *
 * All actions logged to automation_event_log.
 */

// SLA thresholds by category (hours to first assignment)
const CATEGORY_SLA_HOURS: Record<string, number> = {
  MOBILE: 4,
  IT: 4,
  AC: 8,
  CONSUMER_ELEC: 24,
  CCTV: 24,
  COPIER: 24,
  SOLAR: 48,
  ELECTRICAL: 8,
  PLUMBING: 8,
  NETWORK: 24,
  SMART_HOME_OFFICE: 24,
  HOME_SECURITY: 24,
  POWER_BACKUP: 24,
  APPLIANCE_INSTALL: 48,
};

// Partner fatigue: max dispatch offers in window
const FATIGUE_WINDOW_MINUTES = 30;
const FATIGUE_MAX_OFFERS = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const results = {
      sla_breaches: 0,
      trust_recovery: 0,
      fatigue_flags: 0,
      stale_quotes: 0,
      supply_gaps: 0,
    };

    const logEvent = async (event: {
      event_type: string;
      booking_id?: string;
      partner_id?: string;
      customer_id?: string;
      trigger_reason: string;
      action_taken: string;
      severity: string;
      metadata?: Record<string, unknown>;
    }) => {
      await supabase.from("automation_event_log").insert({
        event_type: event.event_type,
        booking_id: event.booking_id || null,
        partner_id: event.partner_id || null,
        customer_id: event.customer_id || null,
        trigger_reason: event.trigger_reason,
        action_taken: event.action_taken,
        severity: event.severity,
        metadata: event.metadata || {},
      });
    };

    // ═══════════════════════════════════════════════════════════
    // MODULE 5: CUSTOMER TRUST RECOVERY — Low ratings auto-create support cases
    // ═══════════════════════════════════════════════════════════
    const oneHourAgo = new Date(now.getTime() - 60 * 60_000).toISOString();
    const { data: lowRatings } = await supabase
      .from("bookings")
      .select("id, customer_id, partner_id, customer_rating, category_code")
      .lte("customer_rating", 2)
      .gte("updated_at", oneHourAgo)
      .not("customer_rating", "is", null);

    for (const booking of lowRatings || []) {
      // Check if support case already exists for this booking
      const { data: existingCase } = await supabase
        .from("support_cases" as any)
        .select("id")
        .eq("booking_id", booking.id)
        .limit(1)
        .maybeSingle();

      if (existingCase) continue;

      // Check if we already logged this automation
      const { data: existingLog } = await supabase
        .from("automation_event_log")
        .select("id")
        .eq("event_type", "trust_recovery")
        .eq("booking_id", booking.id)
        .limit(1)
        .maybeSingle();

      if (existingLog) continue;

      // Auto-create support case
      await supabase.from("support_cases" as any).insert({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        partner_id: booking.partner_id,
        issue_type: "low_rating_auto",
        description: `Customer rated ${booking.customer_rating}/5 stars. Auto-created for review.`,
        priority: booking.customer_rating <= 1 ? "high" : "medium",
        status: "open",
        reported_by: "system",
      });

      // Notify ops
      await supabase.from("notification_events").insert({
        event_type: "rating_low",
        booking_id: booking.id,
        partner_id: booking.partner_id,
        customer_id: booking.customer_id,
        metadata: {
          rating: booking.customer_rating,
          category: booking.category_code,
          action: "support_case_created",
        },
      });

      await logEvent({
        event_type: "trust_recovery",
        booking_id: booking.id,
        partner_id: booking.partner_id || undefined,
        customer_id: booking.customer_id || undefined,
        trigger_reason: `Customer rating ${booking.customer_rating}/5`,
        action_taken: "support_case_created",
        severity: booking.customer_rating <= 1 ? "high" : "medium",
        metadata: { rating: booking.customer_rating, category: booking.category_code },
      });

      results.trust_recovery++;
    }

    // ═══════════════════════════════════════════════════════════
    // MODULE 7: SLA BREACH DETECTION
    // ═══════════════════════════════════════════════════════════
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id, category_code, created_at, status, dispatch_status, is_emergency, sla_breached, customer_id")
      .in("status", ["requested", "matching", "awaiting_partner_confirmation"])
      .eq("sla_breached", false)
      .order("created_at", { ascending: true })
      .limit(200);

    for (const booking of activeBookings || []) {
      const slaHours = booking.is_emergency ? 1 : (CATEGORY_SLA_HOURS[booking.category_code] || 24);
      const ageMs = now.getTime() - new Date(booking.created_at).getTime();
      const ageHours = ageMs / (3600 * 1000);

      if (ageHours >= slaHours) {
        // Mark SLA breached
        await supabase.from("bookings").update({
          sla_breached: true,
        }).eq("id", booking.id);

        await supabase.from("notification_events").insert({
          event_type: "sla_breach",
          booking_id: booking.id,
          customer_id: booking.customer_id,
          metadata: {
            category: booking.category_code,
            sla_hours: slaHours,
            age_hours: Math.round(ageHours * 10) / 10,
            dispatch_status: booking.dispatch_status,
          },
        });

        await supabase.from("job_timeline").insert({
          booking_id: booking.id,
          status: "sla_breached",
          actor: "automation",
          note: `SLA breach: ${Math.round(ageHours)}h elapsed, limit ${slaHours}h for ${booking.category_code}`,
        });

        await logEvent({
          event_type: "sla_breach",
          booking_id: booking.id,
          customer_id: booking.customer_id || undefined,
          trigger_reason: `${Math.round(ageHours)}h elapsed exceeds ${slaHours}h SLA`,
          action_taken: "sla_breached_flagged",
          severity: booking.is_emergency ? "critical" : "high",
          metadata: { category: booking.category_code, sla_hours: slaHours, age_hours: ageHours },
        });

        results.sla_breaches++;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MODULE 3: PARTNER FATIGUE PROTECTION
    // ═══════════════════════════════════════════════════════════
    const fatigueWindow = new Date(now.getTime() - FATIGUE_WINDOW_MINUTES * 60_000).toISOString();
    const { data: recentDispatches } = await supabase
      .from("dispatch_log")
      .select("partner_id, id")
      .gte("created_at", fatigueWindow);

    // Count offers per partner in window
    const partnerOfferCounts: Record<string, number> = {};
    for (const d of recentDispatches || []) {
      partnerOfferCounts[d.partner_id] = (partnerOfferCounts[d.partner_id] || 0) + 1;
    }

    for (const [partnerId, count] of Object.entries(partnerOfferCounts)) {
      if (count >= FATIGUE_MAX_OFFERS) {
        // Check if already flagged recently
        const { data: existingFlag } = await supabase
          .from("automation_event_log")
          .select("id")
          .eq("event_type", "partner_fatigue")
          .eq("partner_id", partnerId)
          .gte("created_at", fatigueWindow)
          .limit(1)
          .maybeSingle();

        if (existingFlag) continue;

        await logEvent({
          event_type: "partner_fatigue",
          partner_id: partnerId,
          trigger_reason: `${count} dispatch offers in ${FATIGUE_WINDOW_MINUTES}min window`,
          action_taken: "fatigue_flagged",
          severity: count >= 8 ? "high" : "medium",
          metadata: { offer_count: count, window_minutes: FATIGUE_WINDOW_MINUTES },
        });

        results.fatigue_flags++;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MODULE 4: STALE QUOTE DETECTION
    // ═══════════════════════════════════════════════════════════
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const { data: staleQuotes } = await supabase
      .from("quotes")
      .select("id, booking_id, partner_id, created_at, total_lkr")
      .eq("status", "submitted")
      .lt("created_at", twentyFourHoursAgo)
      .limit(50);

    for (const quote of staleQuotes || []) {
      // Check if already flagged
      const { data: existingFlag } = await supabase
        .from("automation_event_log")
        .select("id")
        .eq("event_type", "quote_stale")
        .eq("booking_id", quote.booking_id)
        .limit(1)
        .maybeSingle();

      if (existingFlag) continue;

      await supabase.from("notification_events").insert({
        event_type: "quote_stale",
        booking_id: quote.booking_id,
        partner_id: quote.partner_id,
        metadata: {
          quote_id: quote.id,
          total_lkr: quote.total_lkr,
          age_hours: Math.round((now.getTime() - new Date(quote.created_at).getTime()) / 3600_000),
        },
      });

      await logEvent({
        event_type: "quote_stale",
        booking_id: quote.booking_id,
        partner_id: quote.partner_id,
        trigger_reason: "Quote pending approval > 24 hours",
        action_taken: "ops_notified",
        severity: "medium",
        metadata: { quote_id: quote.id, total_lkr: quote.total_lkr },
      });

      results.stale_quotes++;
    }

    // ═══════════════════════════════════════════════════════════
    // MODULE 8: SUPPLY GAP DETECTION (lightweight)
    // ═══════════════════════════════════════════════════════════
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000).toISOString();
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("category_code, zone_code")
      .gte("created_at", sevenDaysAgo)
      .not("zone_code", "is", null)
      .limit(1000);

    const { data: verifiedPartners } = await supabase
      .from("partners")
      .select("categories_supported, service_zones")
      .eq("verification_status", "verified");

    // Aggregate demand by zone+category
    const demandMap: Record<string, number> = {};
    for (const b of recentBookings || []) {
      const key = `${b.zone_code}:${b.category_code}`;
      demandMap[key] = (demandMap[key] || 0) + 1;
    }

    // Aggregate supply
    const supplyMap: Record<string, number> = {};
    for (const p of verifiedPartners || []) {
      for (const cat of (p.categories_supported || [])) {
        for (const zone of (p.service_zones || [])) {
          const key = `${zone}:${cat}`;
          supplyMap[key] = (supplyMap[key] || 0) + 1;
        }
      }
    }

    // Detect gaps: demand > 5 and supply < 2
    for (const [key, demand] of Object.entries(demandMap)) {
      if (demand < 5) continue;
      const supply = supplyMap[key] || 0;
      if (supply >= 2) continue;

      const [zone, category] = key.split(":");

      // Check if already flagged this week for this specific zone+category
      const { data: existingGap } = await supabase
        .from("automation_event_log")
        .select("id")
        .eq("event_type", "supply_gap_detected")
        .gte("created_at", sevenDaysAgo)
        .contains("metadata", { zone, category })
        .limit(1)
        .maybeSingle();

      // Only log first few per run to avoid spam
      if (existingGap || results.supply_gaps >= 5) continue;

      await logEvent({
        event_type: "supply_gap_detected",
        trigger_reason: `${demand} bookings, ${supply} partners in ${zone} for ${category}`,
        action_taken: "gap_flagged",
        severity: supply === 0 ? "high" : "medium",
        metadata: { zone, category, demand_7d: demand, verified_partners: supply, recruit_recommended: Math.max(2, Math.ceil(demand / 5) - supply) },
      });

      results.supply_gaps++;
    }

    console.log("[marketplace-automation] Run complete:", results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
      checked_at: now.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[marketplace-automation] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
