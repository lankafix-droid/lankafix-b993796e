import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Category normalization map ───
const CATEGORY_NORMALIZE: Record<string, string> = {
  // Canonical keys
  AC: "AC", MOBILE: "MOBILE", IT: "IT", CCTV: "CCTV",
  SOLAR: "SOLAR", ELECTRICAL: "ELECTRICAL", PLUMBING: "PLUMBING",
  NETWORK: "NETWORK", COPIER: "COPIER", CONSUMER_ELEC: "CONSUMER_ELEC",
  SMART_HOME_OFFICE: "SMART_HOME_OFFICE", HOME_SECURITY: "HOME_SECURITY",
  POWER_BACKUP: "POWER_BACKUP", APPLIANCE_INSTALL: "APPLIANCE_INSTALL",
  PRINT_SUPPLIES: "PRINT_SUPPLIES",
  // Common variants
  ELECTRONICS: "CONSUMER_ELEC", "CONSUMER ELECTRONICS": "CONSUMER_ELEC",
  SMARTHOME: "SMART_HOME_OFFICE", SMART_HOME: "SMART_HOME_OFFICE",
  "SMART HOME": "SMART_HOME_OFFICE", SMART_OFFICE: "SMART_HOME_OFFICE",
  SECURITY: "HOME_SECURITY", "HOME SECURITY": "HOME_SECURITY",
  SUPPLIES: "PRINT_SUPPLIES", "PRINT SUPPLIES": "PRINT_SUPPLIES",
  "COPIER_PRINTER": "COPIER", PRINTER: "COPIER",
  ac: "AC", mobile: "MOBILE", it: "IT", cctv: "CCTV",
  solar: "SOLAR", electrical: "ELECTRICAL", plumbing: "PLUMBING",
  network: "NETWORK", copier: "COPIER",
};

function normalizeCategory(code: string | null | undefined): string {
  if (!code) return "UNKNOWN";
  const upper = code.trim().toUpperCase();
  return CATEGORY_NORMALIZE[upper] || CATEGORY_NORMALIZE[code.trim()] || code.trim();
}

const CATEGORY_LABELS: Record<string, string> = {
  AC: "AC Services", MOBILE: "Mobile Repairs", IT: "IT Support", CCTV: "CCTV Solutions",
  SOLAR: "Solar Solutions", CONSUMER_ELEC: "Electronics Repairs", SMART_HOME_OFFICE: "Smart Home/Office",
  COPIER: "Copier/Printer", ELECTRICAL: "Electrical Services", PLUMBING: "Plumbing Services",
  NETWORK: "Network Support", HOME_SECURITY: "Home Security", POWER_BACKUP: "Power Backup",
  APPLIANCE_INSTALL: "Appliance Install", PRINT_SUPPLIES: "Print Supplies", UNKNOWN: "Unknown",
};

const MIN_TREND_VOLUME = 3;
const MIN_ALERT_SAMPLE = 3;

interface Alert {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  category?: string;
  zone?: string;
  recommended_action: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 864e5).toISOString();
    const d30 = new Date(now.getTime() - 30 * 864e5).toISOString();
    const d60 = new Date(now.getTime() - 60 * 864e5).toISOString();

    const [bookingsRes, prevBookingsRes, recentBookingsRes, matchLogsRes, quotesRes, partnersRes, aiLogsRes, zonesRes] = await Promise.all([
      supabase.from("bookings").select("id, category_code, service_type, zone_code, status, is_emergency, created_at, cancellation_reason").gte("created_at", d30),
      supabase.from("bookings").select("id, category_code, status, created_at").gte("created_at", d60).lt("created_at", d30),
      supabase.from("bookings").select("id, category_code, created_at").gte("created_at", d7),
      supabase.from("match_logs").select("id, category_code, service_type, customer_zone, no_match_found, total_candidates, created_at").gte("created_at", d30),
      supabase.from("quotes").select("id, booking_id, status, total_lkr, labour_lkr, created_at").gte("created_at", d30),
      supabase.from("partners").select("id, categories_supported, service_zones, verification_status, availability_status, rating_average, completed_jobs_count, emergency_available"),
      supabase.from("ai_interaction_logs").select("id, interaction_type, matched_category, matched_service, input_query, user_action, converted_to_booking, confidence_score, created_at").gte("created_at", d30),
      supabase.from("service_zones").select("zone_code, zone_name, zone_group, is_active"),
    ]);

    const bookings = bookingsRes.data ?? [];
    const prevBookings = prevBookingsRes.data ?? [];
    const recentBookings = recentBookingsRes.data ?? [];
    const matchLogs = matchLogsRes.data ?? [];
    const quotes = quotesRes.data ?? [];
    const partners = partnersRes.data ?? [];
    const aiLogs = aiLogsRes.data ?? [];
    const zones = zonesRes.data ?? [];

    // ─── 1. DEMAND BY CATEGORY (with 7d momentum) ───
    const cat30: Record<string, number> = {};
    const catPrev: Record<string, number> = {};
    const cat7: Record<string, number> = {};
    const catEmg: Record<string, number> = {};
    const catCancel: Record<string, number> = {};
    const catComplete: Record<string, number> = {};

    for (const b of bookings) {
      const c = normalizeCategory(b.category_code);
      cat30[c] = (cat30[c] || 0) + 1;
      if (b.is_emergency) catEmg[c] = (catEmg[c] || 0) + 1;
      if (b.status === "cancelled") catCancel[c] = (catCancel[c] || 0) + 1;
      if (b.status === "completed") catComplete[c] = (catComplete[c] || 0) + 1;
    }
    for (const b of prevBookings) { const c = normalizeCategory(b.category_code); catPrev[c] = (catPrev[c] || 0) + 1; }
    for (const b of recentBookings) { const c = normalizeCategory(b.category_code); cat7[c] = (cat7[c] || 0) + 1; }

    const demandByCategory = Object.entries(cat30)
      .map(([code, count]) => {
        const prev = catPrev[code] || 0;
        const recent = cat7[code] || 0;
        const growth = prev >= MIN_TREND_VOLUME ? Math.round(((count - prev) / prev) * 100) : 0;
        // 7d momentum: project 7d rate to 30d equivalent vs actual 30d
        const projected30 = recent * (30 / 7);
        const momentum = count >= MIN_TREND_VOLUME ? (projected30 > count * 1.15 ? "accelerating" : projected30 < count * 0.85 ? "decelerating" : "steady") : "insufficient_data";
        const trending = count < MIN_TREND_VOLUME ? "insufficient_data" : growth > 15 ? "rising" : growth < -15 ? "declining" : "stable";
        return {
          category_code: code,
          category_name: CATEGORY_LABELS[code] || code,
          current_period: count,
          previous_period: prev,
          recent_7d: recent,
          growth_pct: growth,
          trending,
          momentum,
          emergency_count: catEmg[code] || 0,
          cancelled_count: catCancel[code] || 0,
          completed_count: catComplete[code] || 0,
          completion_rate: count > 0 ? Math.round(((catComplete[code] || 0) / count) * 100) : 0,
        };
      })
      .sort((a, b) => b.current_period - a.current_period);

    // ─── 2. DEMAND BY ZONE ───
    const zoneCounts: Record<string, { bookings: number; emergencies: number; categories: Record<string, number> }> = {};
    for (const b of bookings) {
      const z = b.zone_code || "unknown";
      const c = normalizeCategory(b.category_code);
      if (!zoneCounts[z]) zoneCounts[z] = { bookings: 0, emergencies: 0, categories: {} };
      zoneCounts[z].bookings++;
      if (b.is_emergency) zoneCounts[z].emergencies++;
      zoneCounts[z].categories[c] = (zoneCounts[z].categories[c] || 0) + 1;
    }

    const zoneMap = Object.fromEntries((zones).map(z => [z.zone_code, z.zone_name]));
    const demandByZone = Object.entries(zoneCounts)
      .map(([code, data]) => {
        const topCat = Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0];
        return {
          zone_code: code,
          zone_name: zoneMap[code] || code,
          booking_count: data.bookings,
          emergency_count: data.emergencies,
          top_category: topCat ? topCat[0] : "N/A",
          top_category_name: topCat ? (CATEGORY_LABELS[topCat[0]] || topCat[0]) : "N/A",
          demand_level: data.bookings > 20 ? "high" : data.bookings > 8 ? "medium" : "low",
        };
      })
      .sort((a, b) => b.booking_count - a.booking_count);

    // ─── 3. NO-MATCH ANALYSIS (normalized) ───
    const noMatchByCat: Record<string, { total: number; noMatch: number }> = {};
    const noMatchByZone: Record<string, { total: number; noMatch: number }> = {};
    for (const m of matchLogs) {
      const cat = normalizeCategory(m.category_code);
      if (!noMatchByCat[cat]) noMatchByCat[cat] = { total: 0, noMatch: 0 };
      noMatchByCat[cat].total++;
      if (m.no_match_found) noMatchByCat[cat].noMatch++;

      const zone = m.customer_zone || "unknown";
      if (!noMatchByZone[zone]) noMatchByZone[zone] = { total: 0, noMatch: 0 };
      noMatchByZone[zone].total++;
      if (m.no_match_found) noMatchByZone[zone].noMatch++;
    }

    const noMatchInsights = Object.entries(noMatchByCat)
      .map(([code, data]) => ({
        category_code: code,
        category_name: CATEGORY_LABELS[code] || code,
        total_matches: data.total,
        no_match_count: data.noMatch,
        no_match_rate: data.total > 0 ? Math.round((data.noMatch / data.total) * 100) : 0,
      }))
      .filter(x => x.no_match_count > 0 && x.total_matches >= MIN_ALERT_SAMPLE)
      .sort((a, b) => b.no_match_rate - a.no_match_rate);

    const noMatchHotspots = Object.entries(noMatchByZone)
      .map(([zone, data]) => ({
        zone_code: zone,
        zone_name: zoneMap[zone] || zone,
        total_matches: data.total,
        no_match_count: data.noMatch,
        no_match_rate: data.total > 0 ? Math.round((data.noMatch / data.total) * 100) : 0,
      }))
      .filter(x => x.no_match_count > 0 && x.total_matches >= 2)
      .sort((a, b) => b.no_match_rate - a.no_match_rate);

    // ─── 4. QUOTE APPROVAL INSIGHTS ───
    const quotesByStatus: Record<string, number> = {};
    for (const q of quotes) { quotesByStatus[q.status] = (quotesByStatus[q.status] || 0) + 1; }
    const totalQuotes = quotes.length;
    const approvedQuotes = quotesByStatus["approved"] || 0;
    const rejectedQuotes = quotesByStatus["rejected"] || 0;

    const bookingCategoryMap = Object.fromEntries(bookings.map(b => [b.id, normalizeCategory(b.category_code)]));
    const quoteRejByCat: Record<string, { total: number; rejected: number; totals: number[] }> = {};
    for (const q of quotes) {
      const cat = bookingCategoryMap[q.booking_id] || "UNKNOWN";
      if (!quoteRejByCat[cat]) quoteRejByCat[cat] = { total: 0, rejected: 0, totals: [] };
      quoteRejByCat[cat].total++;
      if (q.status === "rejected") quoteRejByCat[cat].rejected++;
      if (q.total_lkr != null && q.total_lkr > 0) quoteRejByCat[cat].totals.push(q.total_lkr);
    }

    const quoteInsights = Object.entries(quoteRejByCat)
      .map(([code, data]) => ({
        category_code: code,
        category_name: CATEGORY_LABELS[code] || code,
        total_quotes: data.total,
        rejected_count: data.rejected,
        rejection_rate: data.total > 0 ? Math.round((data.rejected / data.total) * 100) : 0,
        avg_quote_lkr: data.totals.length > 0 ? Math.round(data.totals.reduce((a, b) => a + b, 0) / data.totals.length) : 0,
      }))
      .filter(x => x.total_quotes >= 1)
      .sort((a, b) => b.rejection_rate - a.rejection_rate);

    // ─── 5. SUPPLY ANALYSIS (normalized) ───
    const verifiedPartners = partners.filter(p => p.verification_status === "verified");
    const supplyCoverage: Record<string, { count: number; online: number; emergency: number; zones: Set<string> }> = {};
    for (const p of verifiedPartners) {
      for (const rawCat of (p.categories_supported || [])) {
        const cat = normalizeCategory(rawCat);
        if (!supplyCoverage[cat]) supplyCoverage[cat] = { count: 0, online: 0, emergency: 0, zones: new Set() };
        supplyCoverage[cat].count++;
        if (p.availability_status === "online") supplyCoverage[cat].online++;
        if (p.emergency_available) supplyCoverage[cat].emergency++;
        for (const z of (p.service_zones || [])) supplyCoverage[cat].zones.add(z);
      }
    }

    // Merge all known categories (from demand + supply)
    const allCats = new Set([...Object.keys(cat30), ...Object.keys(supplyCoverage)]);
    const supplyAnalysis = [...allCats].map(code => {
      const s = supplyCoverage[code] || { count: 0, online: 0, emergency: 0, zones: new Set() };
      const demand = cat30[code] || 0;
      const ratio = s.count > 0 ? Math.round((demand / s.count) * 10) / 10 : demand > 0 ? 999 : 0;
      return {
        category_code: code,
        category_name: CATEGORY_LABELS[code] || code,
        verified_partners: s.count,
        online_now: s.online,
        emergency_capable: s.emergency,
        zones_covered: s.zones.size,
        demand_30d: demand,
        demand_to_partner_ratio: ratio,
        supply_status: s.count === 0 && demand > 0 ? "none" : ratio > 10 ? "critical" : ratio > 5 ? "low" : "adequate",
      };
    }).sort((a, b) => b.demand_to_partner_ratio - a.demand_to_partner_ratio);

    // ─── Zone supply gaps ───
    const zoneSupplyGaps: { zone_code: string; zone_name: string; category_code: string; category_name: string; demand: number; partners: number; gap_severity: string; acquisition_priority_score: number; recommended_action: string }[] = [];
    for (const [zoneCode, zoneData] of Object.entries(zoneCounts)) {
      for (const [cat, count] of Object.entries(zoneData.categories)) {
        const partnersInZoneCat = verifiedPartners.filter(p =>
          (p.categories_supported || []).map(c => normalizeCategory(c)).includes(cat) &&
          (p.service_zones || []).includes(zoneCode)
        ).length;
        if (count >= 2 && partnersInZoneCat < 2) {
          // Composite acquisition priority score
          const noMatchRate = noMatchByCat[cat] ? (noMatchByCat[cat].noMatch / Math.max(1, noMatchByCat[cat].total)) : 0;
          const quoteRejRate = quoteRejByCat[cat] ? (quoteRejByCat[cat].rejected / Math.max(1, quoteRejByCat[cat].total)) : 0;
          const emergencyDemand = (catEmg[cat] || 0) / Math.max(1, cat30[cat] || 0);
          const score = Math.min(100, Math.round(
            (count * 5) +
            (noMatchRate * 30) +
            (quoteRejRate * 15) +
            (emergencyDemand * 20) +
            (partnersInZoneCat === 0 ? 25 : 0)
          ));
          const catName = CATEGORY_LABELS[cat] || cat;
          const zoneName = zoneMap[zoneCode] || zoneCode;
          const needed = Math.max(2, Math.ceil(count / 3) - partnersInZoneCat);
          zoneSupplyGaps.push({
            zone_code: zoneCode,
            zone_name: zoneName,
            category_code: cat,
            category_name: catName,
            demand: count,
            partners: partnersInZoneCat,
            gap_severity: partnersInZoneCat === 0 ? "critical" : "warning",
            acquisition_priority_score: score,
            recommended_action: `Recruit ${needed} ${catName} technician${needed > 1 ? "s" : ""} in ${zoneName}${emergencyDemand > 0.2 ? " (emergency-capable preferred)" : ""}.`,
          });
        }
      }
    }
    zoneSupplyGaps.sort((a, b) => b.acquisition_priority_score - a.acquisition_priority_score);

    // ─── 6. SERVICE GAP DETECTION (multi-signal) ───
    const searchLogs = aiLogs.filter(l => l.interaction_type === "search");
    const searchByCat: Record<string, { total: number; unconverted: number; queries: string[] }> = {};
    for (const l of searchLogs) {
      const cat = normalizeCategory(l.matched_category);
      if (!searchByCat[cat]) searchByCat[cat] = { total: 0, unconverted: 0, queries: [] };
      searchByCat[cat].total++;
      if (!l.converted_to_booking) {
        searchByCat[cat].unconverted++;
        if (l.input_query && searchByCat[cat].queries.length < 10) searchByCat[cat].queries.push(l.input_query);
      }
    }

    const serviceGaps = Object.entries(searchByCat)
      .map(([code, data]) => {
        const searchConversionRate = data.total > 0 ? data.unconverted / data.total : 0;
        const noMatchRate = noMatchByCat[code] ? (noMatchByCat[code].noMatch / Math.max(1, noMatchByCat[code].total)) : 0;
        const quoteRejRate = quoteRejByCat[code] ? (quoteRejByCat[code].rejected / Math.max(1, quoteRejByCat[code].total)) : 0;
        const partnerShortage = (supplyCoverage[code]?.count || 0) < 2 ? 1 : 0;
        // Weighted composite score
        const gapScore = Math.min(100, Math.round(
          (searchConversionRate * 30) +
          (noMatchRate * 25) +
          (quoteRejRate * 15) +
          (partnerShortage * 15) +
          Math.min(15, data.unconverted * 2)
        ));
        return {
          category_code: code,
          category_name: CATEGORY_LABELS[code] || code,
          search_volume: data.total,
          unconverted_searches: data.unconverted,
          search_conversion_gap: Math.round(searchConversionRate * 100),
          no_match_rate: Math.round(noMatchRate * 100),
          quote_rejection_rate: Math.round(quoteRejRate * 100),
          sample_queries: data.queries,
          gap_score: gapScore,
        };
      })
      .filter(x => x.gap_score > 10 && x.search_volume >= 2)
      .sort((a, b) => b.gap_score - a.gap_score);

    // ─── 7. STRUCTURED ALERTS (with deduplication + minimum thresholds) ───
    const alerts: Alert[] = [];
    const alertKeys = new Set<string>();
    function addAlert(a: Alert) {
      const key = `${a.type}:${a.category || ""}:${a.zone || ""}`;
      if (alertKeys.has(key)) return;
      alertKeys.add(key);
      alerts.push(a);
    }

    for (const s of supplyAnalysis) {
      if (s.supply_status === "critical" && s.demand_30d >= MIN_ALERT_SAMPLE) {
        const needed = Math.max(3, Math.ceil(s.demand_30d / 5));
        addAlert({
          type: "supply_shortage", severity: "critical",
          title: `Critical supply shortage: ${s.category_name}`,
          description: `${s.demand_30d} bookings in 30d with only ${s.verified_partners} verified partner${s.verified_partners !== 1 ? "s" : ""}.`,
          category: s.category_code,
          recommended_action: `Recruit ${needed} more ${s.category_name} technicians across active zones.`,
        });
      } else if (s.supply_status === "none" && s.demand_30d >= 2) {
        addAlert({
          type: "supply_shortage", severity: "critical",
          title: `Zero coverage: ${s.category_name}`,
          description: `${s.demand_30d} bookings but no verified partners exist.`,
          category: s.category_code,
          recommended_action: `Urgently onboard ${s.category_name} partners to avoid customer churn.`,
        });
      } else if (s.supply_status === "low" && s.demand_30d >= MIN_ALERT_SAMPLE) {
        addAlert({
          type: "supply_shortage", severity: "warning",
          title: `Low supply: ${s.category_name}`,
          description: `Demand-to-partner ratio is ${s.demand_to_partner_ratio}:1.`,
          category: s.category_code,
          recommended_action: `Onboard ${Math.ceil(s.demand_to_partner_ratio)} additional ${s.category_name} partners.`,
        });
      }
    }

    for (const nm of noMatchInsights) {
      if (nm.no_match_rate > 30 && nm.total_matches >= MIN_ALERT_SAMPLE) {
        addAlert({
          type: "no_match_hotspot", severity: nm.no_match_rate > 50 ? "critical" : "warning",
          title: `High no-match rate: ${nm.category_name} (${nm.no_match_rate}%)`,
          description: `${nm.no_match_count} of ${nm.total_matches} matching attempts found no technician.`,
          category: nm.category_code,
          recommended_action: `Expand ${nm.category_name} partner pool or widen zone coverage eligibility.`,
        });
      }
    }

    for (const qi of quoteInsights) {
      if (qi.rejection_rate > 40 && qi.total_quotes >= MIN_ALERT_SAMPLE) {
        addAlert({
          type: "quote_rejection_spike", severity: "warning",
          title: `High quote rejection: ${qi.category_name} (${qi.rejection_rate}%)`,
          description: `${qi.rejected_count} of ${qi.total_quotes} quotes rejected. Avg: LKR ${qi.avg_quote_lkr.toLocaleString()}.`,
          category: qi.category_code,
          recommended_action: `Review ${qi.category_name} pricing guidance and improve quote explanation flow.`,
        });
      }
    }

    for (const gap of zoneSupplyGaps.slice(0, 8)) {
      if (gap.gap_severity === "critical" && gap.demand >= MIN_ALERT_SAMPLE) {
        addAlert({
          type: "zone_gap", severity: "critical",
          title: `No coverage: ${gap.zone_name} — ${gap.category_name}`,
          description: `${gap.demand} bookings with ${gap.partners} partner(s) in this zone.`,
          zone: gap.zone_code, category: gap.category_code,
          recommended_action: gap.recommended_action,
        });
      }
    }

    for (const sg of serviceGaps.slice(0, 5)) {
      if (sg.gap_score > 30 && sg.search_volume >= MIN_ALERT_SAMPLE) {
        addAlert({
          type: "service_opportunity", severity: "info",
          title: `Service opportunity: ${sg.category_name}`,
          description: `${sg.unconverted_searches} searches didn't convert. Gap score: ${sg.gap_score}/100.`,
          category: sg.category_code,
          recommended_action: `Improve ${sg.category_name} booking flow or launch dedicated service offering.`,
        });
      }
    }

    alerts.sort((a, b) => {
      const sev: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
    });

    // ─── 8. SUMMARY KPIs ───
    const summary = {
      total_bookings_30d: bookings.length,
      total_bookings_prev_30d: prevBookings.length,
      total_bookings_7d: recentBookings.length,
      booking_growth_pct: prevBookings.length >= MIN_TREND_VOLUME ? Math.round(((bookings.length - prevBookings.length) / prevBookings.length) * 100) : 0,
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
      categories_tracked: allCats.size,
    };

    return new Response(JSON.stringify({
      summary,
      demand_by_category: demandByCategory,
      demand_by_zone: demandByZone,
      no_match_insights: noMatchInsights,
      no_match_hotspots: noMatchHotspots.slice(0, 15),
      quote_insights: quoteInsights,
      supply_analysis: supplyAnalysis,
      zone_supply_gaps: zoneSupplyGaps.slice(0, 25),
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
