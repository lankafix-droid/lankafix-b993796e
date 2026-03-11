import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Category-specific maintenance intervals (months) ───
const MAINTENANCE_INTERVALS: Record<string, { intervalMonths: number; label: string; reminderMsg: string }[]> = {
  AC: [
    { intervalMonths: 6, label: "AC General Service", reminderMsg: "Your AC is due for a routine service. Regular maintenance keeps it efficient and extends its life." },
    { intervalMonths: 12, label: "AC Full Service & Deep Clean", reminderMsg: "It's been a year since your last full AC service. A deep clean helps prevent breakdowns." },
  ],
  CCTV: [
    { intervalMonths: 12, label: "CCTV Annual Maintenance", reminderMsg: "Your CCTV system is due for its annual checkup — camera alignment, storage health, and connection test." },
  ],
  SOLAR: [
    { intervalMonths: 6, label: "Solar Panel Cleaning", reminderMsg: "Dust and debris reduce your solar panel output. A cleaning can restore up to 25% efficiency." },
    { intervalMonths: 12, label: "Solar Inverter Inspection", reminderMsg: "Your inverter is due for an annual inspection to ensure safe and optimal performance." },
  ],
  COPIER: [
    { intervalMonths: 6, label: "Printer/Copier Service", reminderMsg: "Regular printer maintenance prevents paper jams and extends toner life." },
  ],
  NETWORK: [
    { intervalMonths: 12, label: "Network Health Check", reminderMsg: "An annual network check helps identify weak spots, security gaps, and performance issues." },
  ],
  IT: [
    { intervalMonths: 12, label: "IT Support Renewal", reminderMsg: "Your annual IT support period is ending soon. Renew to keep priority access to technicians." },
  ],
  POWER_BACKUP: [
    { intervalMonths: 6, label: "Generator/UPS Service", reminderMsg: "Your backup power system needs periodic servicing to be ready when you need it most." },
  ],
  SMART_HOME_OFFICE: [
    { intervalMonths: 12, label: "Smart System Check", reminderMsg: "Your smart home devices benefit from an annual firmware update and connectivity check." },
  ],
};

// ─── Next-best-service rules ───
const NEXT_BEST_SERVICE: Record<string, { nextCategory: string; nextService: string; action: string; reason: string; delayDays: number }[]> = {
  AC: [
    { nextCategory: "AC", nextService: "AC Care Plan", action: "subscribe_care", reason: "Save with scheduled maintenance under a care plan", delayDays: 14 },
  ],
  CCTV: [
    { nextCategory: "CCTV", nextService: "CCTV Maintenance Package", action: "subscribe_maintenance", reason: "Protect your CCTV investment with annual coverage", delayDays: 30 },
  ],
  SOLAR: [
    { nextCategory: "SOLAR", nextService: "Solar Maintenance Plan", action: "subscribe_maintenance", reason: "Keep your panels at peak output year-round", delayDays: 30 },
  ],
  MOBILE: [
    { nextCategory: "MOBILE", nextService: "Device Protection Plan", action: "subscribe_care", reason: "Guard your repaired device against future mishaps", delayDays: 7 },
  ],
  IT: [
    { nextCategory: "IT", nextService: "Annual IT Support Plan", action: "subscribe_care", reason: "Get priority support and preventive health checks", delayDays: 14 },
  ],
  ELECTRICAL: [
    { nextCategory: "HOME_SECURITY", nextService: "Home Security Assessment", action: "book_consultation", reason: "Complete your home's safety with a security check", delayDays: 30 },
  ],
  NETWORK: [
    { nextCategory: "SMART_HOME_OFFICE", nextService: "Smart Home Setup", action: "book_service", reason: "Your network is ready — add smart devices easily", delayDays: 30 },
  ],
};

// ─── Churn risk scoring ───
function computeChurnRisk(params: {
  daysSinceLastBooking: number;
  totalBookings: number;
  hadCancellation: boolean;
  hadRejectedQuote: boolean;
  hasActiveReminder: boolean;
}): { score: number; level: "low" | "medium" | "high" } {
  let score = 0;
  if (params.daysSinceLastBooking > 180) score += 35;
  else if (params.daysSinceLastBooking > 90) score += 20;
  else if (params.daysSinceLastBooking > 60) score += 10;

  if (params.totalBookings <= 1) score += 20;
  if (params.hadCancellation) score += 15;
  if (params.hadRejectedQuote) score += 15;
  if (!params.hasActiveReminder) score += 5;

  // Cap at 100
  score = Math.min(100, score);
  const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  return { score, level };
}

// ─── Rebook likelihood ───
function computeRebookLikelihood(params: {
  totalBookings: number;
  daysSinceLastBooking: number;
  hasCompletedService: boolean;
  categoryHasMaintenance: boolean;
}): number {
  let score = 30; // base
  if (params.totalBookings >= 3) score += 25;
  else if (params.totalBookings >= 2) score += 15;
  if (params.daysSinceLastBooking < 90) score += 15;
  if (params.hasCompletedService) score += 10;
  if (params.categoryHasMaintenance) score += 10;
  return Math.min(100, score);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "generate"; // "generate" | "dashboard" | "customer"
    const customerId = body.customer_id;

    const now = new Date();

    if (mode === "customer" && customerId) {
      // ─── Customer-specific reminders ───
      const [bookingsRes, quotesRes, remindersRes, warrantiesRes] = await Promise.all([
        supabase.from("bookings").select("id, category_code, service_type, status, completed_at, created_at, is_emergency, cancellation_reason").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(50),
        supabase.from("quotes").select("id, booking_id, status, total_lkr, expires_at, warranty_days, warranty_terms, created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("customer_reminders").select("*").eq("customer_id", customerId).in("status", ["pending", "sent"]).order("due_date", { ascending: true }).limit(20),
        supabase.from("device_warranties").select("id, device_passport_id, warranty_end_date, warranty_provider, status").limit(20),
      ]);

      const bookings = bookingsRes.data ?? [];
      const quotes = quotesRes.data ?? [];
      const existingReminders = remindersRes.data ?? [];
      const warranties = warrantiesRes.data ?? [];

      // Generate maintenance reminders from completed bookings
      const completedBookings = bookings.filter(b => b.status === "completed" && b.completed_at);
      const maintenanceReminders: any[] = [];

      for (const b of completedBookings) {
        const intervals = MAINTENANCE_INTERVALS[b.category_code];
        if (!intervals) continue;
        for (const sched of intervals) {
          const completedDate = new Date(b.completed_at!);
          const dueDate = new Date(completedDate);
          dueDate.setMonth(dueDate.getMonth() + sched.intervalMonths);
          const daysUntilDue = Math.round((dueDate.getTime() - now.getTime()) / 864e5);

          // Only show relevant reminders (not more than 90 days away, not more than 60 days overdue)
          if (daysUntilDue > 90 || daysUntilDue < -60) continue;

          // Check if already exists
          const exists = existingReminders.some(r =>
            r.category_code === b.category_code &&
            r.reminder_type === "maintenance" &&
            r.title === sched.label
          );
          if (exists) continue;

          maintenanceReminders.push({
            type: "maintenance",
            category_code: b.category_code,
            title: sched.label,
            message: sched.reminderMsg,
            due_date: dueDate.toISOString(),
            days_until_due: daysUntilDue,
            priority: daysUntilDue <= 0 ? "urgent" : daysUntilDue <= 14 ? "high" : "normal",
            linked_booking_id: b.id,
            source_service: b.service_type,
          });
        }
      }

      // Quote follow-ups
      const bookingIds = new Set(bookings.map(b => b.id));
      const pendingQuotes = quotes.filter(q =>
        bookingIds.has(q.booking_id) &&
        (q.status === "submitted" || q.status === "awaiting_approval")
      );
      const rejectedQuotes = quotes.filter(q =>
        bookingIds.has(q.booking_id) && q.status === "rejected"
      );
      const expiringQuotes = pendingQuotes.filter(q => {
        if (!q.expires_at) return false;
        const d = Math.round((new Date(q.expires_at).getTime() - now.getTime()) / 864e5);
        return d >= 0 && d <= 3;
      });

      const quoteReminders: any[] = [];
      for (const q of expiringQuotes) {
        const daysLeft = Math.round((new Date(q.expires_at!).getTime() - now.getTime()) / 864e5);
        quoteReminders.push({
          type: "quote_expiry",
          category_code: bookings.find(b => b.id === q.booking_id)?.category_code || "UNKNOWN",
          title: "Quote Expiring Soon",
          message: `Your quote of LKR ${(q.total_lkr || 0).toLocaleString()} expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Review and approve to lock in this price.`,
          due_date: q.expires_at,
          days_until_due: daysLeft,
          priority: daysLeft <= 1 ? "urgent" : "high",
          linked_quote_id: q.id,
          linked_booking_id: q.booking_id,
        });
      }

      // Rejected quote follow-up (gentle, 3 days after rejection)
      for (const q of rejectedQuotes.slice(0, 3)) {
        const rejectedDaysAgo = Math.round((now.getTime() - new Date(q.created_at).getTime()) / 864e5);
        if (rejectedDaysAgo >= 3 && rejectedDaysAgo <= 14) {
          quoteReminders.push({
            type: "quote_followup",
            category_code: bookings.find(b => b.id === q.booking_id)?.category_code || "UNKNOWN",
            title: "Need a Revised Quote?",
            message: "We noticed you didn't approve a recent quote. Would you like us to arrange a revised offer or connect you with a different technician?",
            due_date: now.toISOString(),
            days_until_due: 0,
            priority: "normal",
            linked_quote_id: q.id,
            linked_booking_id: q.booking_id,
          });
        }
      }

      // Warranty reminders
      const warrantyReminders: any[] = [];
      for (const w of warranties) {
        if (w.status !== "active") continue;
        const daysLeft = Math.round((new Date(w.warranty_end_date).getTime() - now.getTime()) / 864e5);
        if (daysLeft >= 0 && daysLeft <= 30) {
          warrantyReminders.push({
            type: "warranty_expiry",
            category_code: "DEVICE",
            title: "Warranty Expiring",
            message: `Your ${w.warranty_provider} warranty expires in ${daysLeft} days. Consider extending or booking a checkup before it ends.`,
            due_date: w.warranty_end_date,
            days_until_due: daysLeft,
            priority: daysLeft <= 7 ? "urgent" : "high",
          });
        }
      }

      // Next-best-service suggestions (from most recent completed booking)
      const nextBestSuggestions: any[] = [];
      if (completedBookings.length > 0) {
        const mostRecent = completedBookings[0];
        const daysSince = Math.round((now.getTime() - new Date(mostRecent.completed_at!).getTime()) / 864e5);
        const rules = NEXT_BEST_SERVICE[mostRecent.category_code] || [];
        for (const rule of rules) {
          if (daysSince >= rule.delayDays) {
            nextBestSuggestions.push({
              type: "next_best_service",
              category_code: rule.nextCategory,
              title: rule.nextService,
              message: rule.reason,
              action: rule.action,
              source_category: mostRecent.category_code,
              source_booking_id: mostRecent.id,
            });
          }
        }
      }

      // Quick rebook candidates
      const quickRebookCandidates = completedBookings
        .slice(0, 5)
        .map(b => ({
          booking_id: b.id,
          category_code: b.category_code,
          service_type: b.service_type,
          completed_at: b.completed_at,
          days_ago: Math.round((now.getTime() - new Date(b.completed_at!).getTime()) / 864e5),
        }));

      // Churn & rebook scores
      const daysSinceLast = completedBookings.length > 0
        ? Math.round((now.getTime() - new Date(completedBookings[0].completed_at!).getTime()) / 864e5)
        : 999;
      const churnRisk = computeChurnRisk({
        daysSinceLastBooking: daysSinceLast,
        totalBookings: bookings.length,
        hadCancellation: bookings.some(b => b.status === "cancelled"),
        hadRejectedQuote: rejectedQuotes.length > 0,
        hasActiveReminder: existingReminders.length > 0,
      });
      const rebookLikelihood = computeRebookLikelihood({
        totalBookings: bookings.length,
        daysSinceLastBooking: daysSinceLast,
        hasCompletedService: completedBookings.length > 0,
        categoryHasMaintenance: completedBookings.some(b => !!MAINTENANCE_INTERVALS[b.category_code]),
      });

      // Combine all reminders sorted by priority
      const allReminders = [
        ...maintenanceReminders,
        ...quoteReminders,
        ...warrantyReminders,
      ].sort((a, b) => {
        const pOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
        return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      });

      return new Response(JSON.stringify({
        reminders: allReminders,
        next_best_suggestions: nextBestSuggestions,
        quick_rebook: quickRebookCandidates,
        churn_risk: churnRisk,
        rebook_likelihood: rebookLikelihood,
        existing_reminders: existingReminders,
        stats: {
          total_bookings: bookings.length,
          completed_bookings: completedBookings.length,
          pending_quotes: pendingQuotes.length,
          active_warranties: warranties.filter(w => w.status === "active").length,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "dashboard") {
      // ─── Internal ops dashboard ───
      const [remindersRes, bookingsRes, quotesRes, partnersRes] = await Promise.all([
        supabase.from("customer_reminders").select("id, customer_id, reminder_type, category_code, status, priority, due_date, viewed_at, clicked_at, completed_at, created_at").order("due_date", { ascending: true }).limit(500),
        supabase.from("bookings").select("id, customer_id, category_code, status, completed_at, created_at, is_emergency").order("created_at", { ascending: false }).limit(1000),
        supabase.from("quotes").select("id, booking_id, status, total_lkr, expires_at, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("partners").select("id, categories_supported, verification_status").limit(200),
      ]);

      const reminders = remindersRes.data ?? [];
      const bookings = bookingsRes.data ?? [];
      const quotes = quotesRes.data ?? [];

      // Compute retention segments
      const customerBookings: Record<string, { count: number; lastAt: string; categories: Set<string>; cancelled: boolean; hasRejectedQuote: boolean }> = {};
      const bookingIdToCategory: Record<string, string> = {};
      for (const b of bookings) {
        if (!b.customer_id) continue;
        bookingIdToCategory[b.id] = b.category_code;
        if (!customerBookings[b.customer_id]) {
          customerBookings[b.customer_id] = { count: 0, lastAt: b.created_at, categories: new Set(), cancelled: false, hasRejectedQuote: false };
        }
        customerBookings[b.customer_id].count++;
        customerBookings[b.customer_id].categories.add(b.category_code);
        if (b.status === "cancelled") customerBookings[b.customer_id].cancelled = true;
        if (new Date(b.created_at) > new Date(customerBookings[b.customer_id].lastAt)) {
          customerBookings[b.customer_id].lastAt = b.created_at;
        }
      }

      for (const q of quotes) {
        const cat = bookingIdToCategory[q.booking_id];
        if (!cat) continue;
        // Find customer from booking
        const booking = bookings.find(b => b.id === q.booking_id);
        if (booking?.customer_id && q.status === "rejected") {
          if (customerBookings[booking.customer_id]) {
            customerBookings[booking.customer_id].hasRejectedQuote = true;
          }
        }
      }

      let highChurnCount = 0, mediumChurnCount = 0, lowChurnCount = 0;
      let repeatCustomers = 0;
      const totalCustomers = Object.keys(customerBookings).length;

      for (const [, data] of Object.entries(customerBookings)) {
        const daysSince = Math.round((now.getTime() - new Date(data.lastAt).getTime()) / 864e5);
        const risk = computeChurnRisk({
          daysSinceLastBooking: daysSince,
          totalBookings: data.count,
          hadCancellation: data.cancelled,
          hadRejectedQuote: data.hasRejectedQuote,
          hasActiveReminder: false,
        });
        if (risk.level === "high") highChurnCount++;
        else if (risk.level === "medium") mediumChurnCount++;
        else lowChurnCount++;
        if (data.count >= 2) repeatCustomers++;
      }

      // Quotes expiring soon
      const quotesExpiringSoon = quotes.filter(q => {
        if (!q.expires_at || q.status === "approved" || q.status === "rejected") return false;
        const d = Math.round((new Date(q.expires_at).getTime() - now.getTime()) / 864e5);
        return d >= 0 && d <= 3;
      }).length;

      // Reminders stats
      const remindersDueToday = reminders.filter(r => {
        const d = Math.round((new Date(r.due_date).getTime() - now.getTime()) / 864e5);
        return d >= -1 && d <= 1 && r.status === "pending";
      }).length;

      const remindersViewed = reminders.filter(r => r.viewed_at).length;
      const remindersClicked = reminders.filter(r => r.clicked_at).length;
      const remindersCompleted = reminders.filter(r => r.completed_at).length;
      const viewRate = reminders.length > 0 ? Math.round((remindersViewed / reminders.length) * 100) : 0;
      const clickRate = reminders.length > 0 ? Math.round((remindersClicked / reminders.length) * 100) : 0;
      const conversionRate = reminders.length > 0 ? Math.round((remindersCompleted / reminders.length) * 100) : 0;

      // Category retention opportunities
      const categoryRetention: Record<string, { total: number; repeat: number; churning: number }> = {};
      for (const [, data] of Object.entries(customerBookings)) {
        for (const cat of data.categories) {
          if (!categoryRetention[cat]) categoryRetention[cat] = { total: 0, repeat: 0, churning: 0 };
          categoryRetention[cat].total++;
          if (data.count >= 2) categoryRetention[cat].repeat++;
          const daysSince = Math.round((now.getTime() - new Date(data.lastAt).getTime()) / 864e5);
          if (daysSince > 120) categoryRetention[cat].churning++;
        }
      }

      const CATEGORY_LABELS: Record<string, string> = {
        AC: "AC Services", MOBILE: "Mobile Repairs", IT: "IT Support", CCTV: "CCTV Solutions",
        SOLAR: "Solar Solutions", CONSUMER_ELEC: "Electronics", SMART_HOME_OFFICE: "Smart Home",
        COPIER: "Copier/Printer", ELECTRICAL: "Electrical", PLUMBING: "Plumbing",
        NETWORK: "Network", HOME_SECURITY: "Home Security", POWER_BACKUP: "Power Backup",
      };

      const categoryInsights = Object.entries(categoryRetention)
        .map(([code, data]) => ({
          category_code: code,
          category_name: CATEGORY_LABELS[code] || code,
          total_customers: data.total,
          repeat_customers: data.repeat,
          retention_rate: data.total > 0 ? Math.round((data.repeat / data.total) * 100) : 0,
          churning_customers: data.churning,
          has_maintenance_schedule: !!MAINTENANCE_INTERVALS[code],
        }))
        .sort((a, b) => b.total_customers - a.total_customers);

      return new Response(JSON.stringify({
        summary: {
          total_customers: totalCustomers,
          repeat_customers: repeatCustomers,
          repeat_rate: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
          high_churn_risk: highChurnCount,
          medium_churn_risk: mediumChurnCount,
          low_churn_risk: lowChurnCount,
          quotes_expiring_soon: quotesExpiringSoon,
          reminders_due_today: remindersDueToday,
          total_reminders: reminders.length,
        },
        reminder_performance: {
          total: reminders.length,
          viewed: remindersViewed,
          clicked: remindersClicked,
          completed: remindersCompleted,
          view_rate: viewRate,
          click_rate: clickRate,
          conversion_rate: conversionRate,
        },
        category_insights: categoryInsights,
        churn_segments: {
          high: highChurnCount,
          medium: mediumChurnCount,
          low: lowChurnCount,
        },
        generated_at: now.toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default: return config info
    return new Response(JSON.stringify({
      available_modes: ["customer", "dashboard", "generate"],
      maintenance_categories: Object.keys(MAINTENANCE_INTERVALS),
      next_best_categories: Object.keys(NEXT_BEST_SERVICE),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("retention-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
