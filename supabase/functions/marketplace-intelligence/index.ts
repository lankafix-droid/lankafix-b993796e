import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Category labels ───
const CATEGORY_LABELS: Record<string, string> = {
  AC: "AC Services", MOBILE: "Mobile Repairs", IT: "IT Support", CCTV: "CCTV Solutions",
  SOLAR: "Solar Solutions", CONSUMER_ELEC: "Electronics", SMART_HOME_OFFICE: "Smart Home",
  COPIER: "Copier/Printer", ELECTRICAL: "Electrical", PLUMBING: "Plumbing",
  NETWORK: "Network", HOME_SECURITY: "Home Security", POWER_BACKUP: "Power Backup",
  APPLIANCE_INSTALL: "Appliance Install", PRINT_SUPPLIES: "Print Supplies",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // ─── Parallel data fetches ───
    const [
      bookingsRes,
      prevBookingsRes,
      matchLogsRes,
      quotesRes,
      partnersRes,
      aiLogsRes,
      zonesRes,
    ] = await Promise.all([
      supabase.from("bookings").select("id, category_code, service_type, zone_code, status, is_emergency, created_at, cancellation_reason").gte("created_at", thirtyDaysAgo),
      supabase.from("bookings").select("id, category_code, status, created_at").gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo),
      supabase.from("match_logs").select("id, category_code, service_type, customer_zone, no_match_found, top_match_score, total_candidates, created_at").gte("created_at", thirtyDaysAgo),
      supabase.from("quotes").select("id, booking_id, status, total_lkr, labour_lkr, created_at").gte("created_at", thirtyDaysAgo),
      supabase.from("partners").select("id, categories_supported, service_zones, verification_status, availability_status, rating_average, completed_jobs_count"),
      supabase.from("ai_interaction_logs").select("id, interaction_type, matched_category, matched_service, input_query, user_action, converted_to_booking, confidence_score, created_at").gte("created_at", thirtyDaysAgo),
      supabase.from("service_zones").select("zone_code, zone_name, zone_group, is_active"),
    ]);

    const bookings = bookingsRes.data || [];
    const prevBookings = prevBookingsRes.data || [];
    const matchLogs = matchLogsRes.data || [];
    const quotes = quotesRes.data || [];
    const partners = partnersRes.data || [];
    const aiLogs = aiLogsRes.data || [];
    const zones = zonesRes.data || [];

    // ─── 1. DEMAND BY CATEGORY ───
    const categoryCounts: Record<string, number> = {};
    const prevCategoryCounts: Record<string, number> = {};
    const categoryEmergency: Record<string, number> = {};
    const categoryCancelled: Record<string, number> = {};
    const categoryCompleted: Record<string, number> = {};

    for (const b of bookings) {
      categoryCounts[b.category_code] = (categoryCounts[b.category_code] || 0) + 1;
      if (b.is_emergency) categoryEmergency[b.category_code] = (categoryEmergency[b.category_code] || 0) + 1;
      if (b.status === "cancelled") categoryCancelled[b.category_code] = (categoryCancelled[b.category_code] || 0) + 1;
      if (b.status === "completed") categoryCompleted[b.category_code] = (categoryCompleted[b.category_code] || 0) + 1;
    }
    for (const b of prevBookings) {
      prevCategoryCounts[b.category_code] = (prevCategoryCounts[b.category_code] || 0) + 1;
    }

    const demandByCategory = Object.entries(categoryCounts)
      .map(([code, count]) => {
        const prev = prevCategoryCounts[code] || 0;
        const growth = prev > 0 ? Math.round(((count - prev) / prev) * 100) : count > 0 ? 100 : 0;
        return {
          category_code: code,
          category_name: CATEGORY_LABELS[code] || code,
          current_period: count,
          previous_period: prev,
          growth_pct: growth,
          trending: growth > 10 ? "rising" : growth < -10 ? "declining" : "stable",
          emergency_count: categoryEmergency[code] || 0,
          cancelled_count: categoryCancelled[code] || 0,
          completed_count: categoryCompleted[code] || 0,
          completion_rate: count > 0 ? Math.round(((categoryCompleted[code] || 0) / count) * 100) : 0,
        };
      })
      .sort((a, b) => b.current_period - a.current_period);

    // ─── 2. DEMAND BY ZONE ───
    const zoneCounts: Record<string, { bookings: number; emergencies: number; categories: Record<string, number> }> = {};
    for (const b of bookings) {
      const z = b.zone_code || "unknown";
      if (!zoneCounts[z]) zoneCounts[z] = { bookings: 0, emergencies: 0, categories: {} };
      zoneCounts[z].bookings++;
      if (b.is_emergency) zoneCounts[z].emergencies++;
      zoneCounts[z].categories[b.category_code] = (zoneCounts[z].categories[b.category_code] || 0) + 1;
    }

    const zoneMap = Object.fromEntries((zones || []).map(z => [z.zone_code, z.zone_name]));
    const demandByZone = Object.entries(zoneCounts)
      .map(([code, data]) => {
        const topCat = Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0];
        return {
          zone_code: code,
          zone_name: zoneMap[code] || code,
          booking_count: data.bookings,
          emergency_count: data.emergencies,
          top_category: topCat ? topCat[0] : "N/A",
          demand_level: data.bookings > 20 ? "high" : data.bookings > 8 ? "medium" : "low",
        };
      })
      .sort((a, b) => b.booking_count - a.booking_count);

    // ─── 3. NO-MATCH ANALYSIS ───
    const noMatchByCategory: Record<string, { total: number; noMatch: number }> = {};
    const noMatchByZone: Record<string, { total: number; noMatch: number }> = {};
    for (const m of matchLogs) {
      const cat = m.category_code;
      if (!noMatchByCategory[cat]) noMatchByCategory[cat] = { total: 0, noMatch: 0 };
      noMatchByCategory[cat].total++;
      if (m.no_match_found) noMatchByCategory[cat].noMatch++;

      const zone = m.customer_zone || "unknown";
      if (!noMatchByZone[zone]) noMatchByZone[zone] = { total: 0, noMatch: 0 };
      noMatchByZone[zone].total++;
      if (m.no_match_found) noMatchByZone[zone].noMatch++;
    }

    const noMatchInsights = Object.entries(noMatchByCategory)
      .map(([code, data]) => ({
        category_code: code,
        category_name: CATEGORY_LABELS[code] || code,
        total_matches: data.total,
        no_match_count: data.noMatch,
        no_match_rate: data.total > 0 ? Math.round((data.noMatch / data.total) * 100) : 0,
      }))
      .filter(x => x.no_match_count > 0)
      .sort((a, b) => b.no_match_rate - a.no_match_rate);

    const noMatchHotspots = Object.entries(noMatchByZone)
      .map(([zone, data]) => ({
        zone_code: zone,
        zone_name: zoneMap[zone] || zone,
        total_matches: data.total,
        no_match_count: data.noMatch,
        no_match_rate: data.total > 0 ? Math.round((data.noMatch / data.total) * 100) : 0,
      }))
      .filter(x => x.no_match_count > 0)
      .sort((a, b) => b.no_match_rate - a.no_match_rate);

    // ─── 4. QUOTE APPROVAL INSIGHTS ───
    const quotesByStatus: Record<string, number> = {};
    for (const q of quotes) {
      quotesByStatus[q.status] = (quotesByStatus[q.status] || 0) + 1;
    }
    const totalQuotes = quotes.length;
    const approvedQuotes = quotesByStatus["approved"] || 0;
    const rejectedQuotes = quotesByStatus["rejected"] || 0;
    const revisionQuotes = quotesByStatus["revision_requested"] || 0;

    // Quote rejection by category (join via booking_id)
    const bookingCategoryMap = Object.fromEntries(bookings.map(b => [b.id, b.category_code]));
    const quoteRejectionByCategory: Record<string, { total: number; rejected: number; avgTotal: number[] }> = {};
    for (const q of quotes) {
      const cat = bookingCategoryMap[q.booking_id] || "unknown";
      if (!quoteRejectionByCategory[cat]) quoteRejectionByCategory[cat] = { total: 0, rejected: 0, avgTotal: [] };
      quoteRejectionByCategory[cat].total++;
      if (q.status === "rejected") quoteRejectionByCategory[cat].rejected++;
      if (q.total_lkr) quoteRejectionByCategory[cat].avgTotal.push(q.total_lkr);
    }

    const quoteInsights = Object.entries(quoteRejectionByCategory)
      .map(([code, data]) => ({
        category_code: code,
        category_name: CATEGORY_LABELS[code] || code,
        total_quotes: data.total,
        rejected_count: data.rejected,
        rejection_rate: data.total > 0 ? Math.round((data.rejected / data.total) * 100) : 0,
        avg_quote_lkr: data.avgTotal.length > 0 ? Math.round(data.avgTotal.reduce((a, b) => a + b, 0) / data.avgTotal.length) : 0,
      }))
      .sort((a, b) => b.rejection_rate - a.rejection_rate);

    // ─── 5. SUPPLY ANALYSIS ───
    const verifiedPartners = partners.filter(p => p.verification_status === "verified");
    const supplyCoverage: Record<string, { partnerCount: number; onlineCount: number; zones: Set<string> }> = {};
    for (const p of verifiedPartners) {
      for (const cat of (p.categories_supported || [])) {
        if (!supplyCoverage[cat]) supplyCoverage[cat] = { partnerCount: 0, onlineCount: 0, zones: new Set() };
        supplyCoverage[cat].partnerCount++;
        if (p.availability_status === "online") supplyCoverage[cat].onlineCount++;
        for (const z of (p.service_zones || [])) supplyCoverage[cat].zones.add(z);
      }
    }

    const supplyAnalysis = Object.entries(supplyCoverage).map(([code, data]) => {
      const demand = categoryCounts[code] || 0;
      const ratio = data.partnerCount > 0 ? Math.round((demand / data.partnerCount) * 10) / 10 : demand > 0 ? 999 : 0;
      return {
        category_code: code,
        category_name: CATEGORY_LABELS[code] || code,
        verified_partners: data.partnerCount,
        online_now: data.onlineCount,
        zones_covered: data.zones.size,
        demand_30d: demand,
        demand_to_partner_ratio: ratio,
        supply_status: data.partnerCount === 0 ? "none" : ratio > 10 ? "critical" : ratio > 5 ? "low" : "adequate",
      };
    }).sort((a, b) => b.demand_to_partner_ratio - a.demand_to_partner_ratio);

    // Zone-level supply gaps
    const zoneSupplyGaps: { zone_code: string; zone_name: string; category_code: string; demand: number; partners: number; gap_severity: string }[] = [];
    for (const [zoneCode, zoneData] of Object.entries(zoneCounts)) {
      for (const [cat, count] of Object.entries(zoneData.categories)) {
        const partnersInZoneCat = verifiedPartners.filter(p =>
          (p.categories_supported || []).includes(cat) &&
          (p.service_zones || []).includes(zoneCode)
        ).length;
        if (count > 2 && partnersInZoneCat < 2) {
          zoneSupplyGaps.push({
            zone_code: zoneCode,
            zone_name: zoneMap[zoneCode] || zoneCode,
            category_code: cat,
            demand: count,
            partners: partnersInZoneCat,
            gap_severity: partnersInZoneCat === 0 ? "critical" : "warning",
          });
        }
      }
    }
    zoneSupplyGaps.sort((a, b) => b.demand - a.demand);

    // ─── 6. SERVICE GAP DETECTION ───
    // Searches that didn't convert to bookings
    const searchLogs = aiLogs.filter(l => l.interaction_type === "search");
    const unconvertedSearches: Record<string, number> = {};
    const searchQueries: Record<string, string[]> = {};
    for (const l of searchLogs) {
      if (!l.converted_to_booking && l.matched_category) {
        unconvertedSearches[l.matched_category] = (unconvertedSearches[l.matched_category] || 0) + 1;
      }
      if (l.input_query && !l.converted_to_booking) {
        const cat = l.matched_category || "unmapped";
        if (!searchQueries[cat]) searchQueries[cat] = [];
        if (searchQueries[cat].length < 10) searchQueries[cat].push(l.input_query);
      }
    }

    const serviceGaps = Object.entries(unconvertedSearches)
      .map(([code, count]) => ({
        category_code: code,
        category_name: CATEGORY_LABELS[code] || code,
        unconverted_searches: count,
        sample_queries: searchQueries[code] || [],
        gap_score: Math.min(100, count * 5),
      }))
      .filter(x => x.unconverted_searches > 1)
      .sort((a, b) => b.unconverted_searches - a.unconverted_searches);

    // ─── 7. STRUCTURED ALERTS ───
    interface Alert {
      type: string;
      severity: "critical" | "warning" | "info";
      title: string;
      description: string;
      category?: string;
      zone?: string;
      recommended_action: string;
    }
    const alerts: Alert[] = [];

    // Supply shortage alerts
    for (const s of supplyAnalysis) {
      if (s.supply_status === "critical") {
        alerts.push({
          type: "supply_shortage",
          severity: "critical",
          title: `Critical supply shortage: ${s.category_name}`,
          description: `${s.demand_30d} bookings in 30 days but only ${s.verified_partners} verified partner(s).`,
          category: s.category_code,
          recommended_action: `Recruit ${Math.max(3, Math.ceil(s.demand_30d / 5))} more ${s.category_name} technicians.`,
        });
      } else if (s.supply_status === "low") {
        alerts.push({
          type: "supply_shortage",
          severity: "warning",
          title: `Low supply: ${s.category_name}`,
          description: `Demand-to-partner ratio is ${s.demand_to_partner_ratio}:1.`,
          category: s.category_code,
          recommended_action: `Onboard ${Math.ceil(s.demand_to_partner_ratio)} additional partners for ${s.category_name}.`,
        });
      }
    }

    // No-match hotspot alerts
    for (const nm of noMatchInsights.slice(0, 3)) {
      if (nm.no_match_rate > 30) {
        alerts.push({
          type: "no_match_hotspot",
          severity: nm.no_match_rate > 50 ? "critical" : "warning",
          title: `High no-match rate: ${nm.category_name}`,
          description: `${nm.no_match_rate}% of matching attempts found no eligible technician.`,
          category: nm.category_code,
          recommended_action: `Expand ${nm.category_name} partner pool or widen zone eligibility.`,
        });
      }
    }

    // Quote rejection spike alerts
    for (const qi of quoteInsights.slice(0, 3)) {
      if (qi.rejection_rate > 40 && qi.total_quotes > 3) {
        alerts.push({
          type: "quote_rejection_spike",
          severity: "warning",
          title: `High quote rejection: ${qi.category_name}`,
          description: `${qi.rejection_rate}% rejection rate across ${qi.total_quotes} quotes. Avg quote: LKR ${qi.avg_quote_lkr.toLocaleString()}.`,
          category: qi.category_code,
          recommended_action: `Review pricing guidance for ${qi.category_name}. Consider revising market bands.`,
        });
      }
    }

    // Zone-level alerts
    for (const gap of zoneSupplyGaps.slice(0, 5)) {
      if (gap.gap_severity === "critical") {
        alerts.push({
          type: "zone_gap",
          severity: "critical",
          title: `No coverage: ${gap.zone_name} — ${CATEGORY_LABELS[gap.category_code] || gap.category_code}`,
          description: `${gap.demand} bookings with ${gap.partners} partner(s) covering this zone.`,
          zone: gap.zone_code,
          category: gap.category_code,
          recommended_action: `Recruit ${CATEGORY_LABELS[gap.category_code] || gap.category_code} technicians in ${gap.zone_name}.`,
        });
      }
    }

    // Service gap opportunity alerts
    for (const sg of serviceGaps.slice(0, 3)) {
      if (sg.unconverted_searches > 5) {
        alerts.push({
          type: "service_opportunity",
          severity: "info",
          title: `Unmet demand: ${sg.category_name}`,
          description: `${sg.unconverted_searches} searches didn't convert to bookings. Sample: "${sg.sample_queries[0] || "N/A"}"`,
          category: sg.category_code,
          recommended_action: `Productize or improve booking flow for ${sg.category_name}.`,
        });
      }
    }

    alerts.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return sev[a.severity] - sev[b.severity];
    });

    // ─── 8. SUMMARY KPIs ───
    const summary = {
      total_bookings_30d: bookings.length,
      total_bookings_prev_30d: prevBookings.length,
      booking_growth_pct: prevBookings.length > 0 ? Math.round(((bookings.length - prevBookings.length) / prevBookings.length) * 100) : 0,
      total_emergencies_30d: bookings.filter(b => b.is_emergency).length,
      total_completed_30d: bookings.filter(b => b.status === "completed").length,
      total_cancelled_30d: bookings.filter(b => b.status === "cancelled").length,
      completion_rate: bookings.length > 0 ? Math.round((bookings.filter(b => b.status === "completed").length / bookings.length) * 100) : 0,
      total_quotes: totalQuotes,
      quote_approval_rate: totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0,
      quote_rejection_rate: totalQuotes > 0 ? Math.round((rejectedQuotes / totalQuotes) * 100) : 0,
      total_verified_partners: verifiedPartners.length,
      partners_online: verifiedPartners.filter(p => p.availability_status === "online").length,
      total_ai_searches: searchLogs.length,
      search_conversion_rate: searchLogs.length > 0 ? Math.round((searchLogs.filter(l => l.converted_to_booking).length / searchLogs.length) * 100) : 0,
      active_alerts: alerts.filter(a => a.severity === "critical").length,
      total_zones_active: zones.filter(z => z.is_active).length,
    };

    return new Response(JSON.stringify({
      summary,
      demand_by_category: demandByCategory,
      demand_by_zone: demandByZone,
      no_match_insights: noMatchInsights,
      no_match_hotspots: noMatchHotspots,
      quote_insights: quoteInsights,
      supply_analysis: supplyAnalysis,
      zone_supply_gaps: zoneSupplyGaps.slice(0, 20),
      service_gaps: serviceGaps,
      alerts,
      generated_at: now.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketplace-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
