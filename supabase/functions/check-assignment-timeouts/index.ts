/**
 * check-assignment-timeouts — LankaFix
 *
 * Scheduled edge function that finds all leads with expired accept_by
 * and partner_response_status = pending, then expires them and triggers
 * reassignment to the next eligible partner.
 *
 * IDEMPOTENT: safe to run repeatedly. Only processes leads that are
 * still in "pending" response state with passed deadline.
 *
 * SAFETY:
 * - Does not expire already accepted/rejected/unavailable leads
 * - Does not process leads without an assigned partner
 * - Respects max assignment attempts (5)
 * - Logs all actions for audit
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ASSIGNMENT_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Find all overdue assignments:
    // - partner_response_status = 'pending'
    // - accept_by < now
    // - assigned_partner_id is not null
    // - routing_status = 'awaiting_response'
    const { data: overdueLeads, error: fetchErr } = await supabase
      .from("leads")
      .select("id, assigned_partner_id, assignment_attempt, assignment_history, category_code, zone_code, accept_by")
      .eq("partner_response_status", "pending")
      .eq("routing_status", "awaiting_response")
      .not("assigned_partner_id", "is", null)
      .lt("accept_by", now)
      .limit(50); // Batch size for safety

    if (fetchErr) {
      console.error("Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!overdueLeads || overdueLeads.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No overdue assignments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let expired = 0;
    let reassigned = 0;
    let escalated = 0;

    for (const lead of overdueLeads) {
      // 1. Mark as expired
      const history = (lead.assignment_history || []) as any[];
      if (history.length > 0) {
        const last = history[history.length - 1];
        last.response_status = "expired";
        last.expired_at = now;
      }

      await supabase
        .from("leads")
        .update({
          partner_response_status: "expired",
          partner_response_at: now,
          assigned_partner_id: null,
          routing_status: "needs_reassignment",
          status: "qualified",
          assignment_history: history,
        })
        .eq("id", lead.id)
        .eq("partner_response_status", "pending"); // Guard: only if still pending

      // Log expiry event
      await supabase.from("notification_events").insert([{
        event_type: "lead_partner_expired",
        metadata: {
          lead_id: lead.id,
          partner_id: lead.assigned_partner_id,
          accept_by: lead.accept_by,
          expired_at: now,
          attempt: lead.assignment_attempt,
        } as any,
      }]);

      expired++;

      // 2. Check if we can reassign
      const currentAttempt = lead.assignment_attempt || 0;
      if (currentAttempt >= MAX_ASSIGNMENT_ATTEMPTS) {
        // Escalate to operator
        await supabase
          .from("leads")
          .update({
            routing_status: "no_supply",
            status: "qualified",
            operator_notes: `Auto-escalated: max ${MAX_ASSIGNMENT_ATTEMPTS} attempts exhausted.`,
          })
          .eq("id", lead.id);

        await supabase.from("notification_events").insert([{
          event_type: "lead_no_supply",
          metadata: {
            lead_id: lead.id,
            reason: "max_attempts_exhausted",
            total_attempts: currentAttempt,
          } as any,
        }]);

        escalated++;
        continue;
      }

      // 3. Find next eligible partner
      const excludedIds = history
        .filter((h: any) => ["rejected", "unavailable", "expired"].includes(h.response_status) || h.outcome === "reassigned")
        .map((h: any) => h.partner_id)
        .filter(Boolean);

      // Get eligible partners for this category + zone
      let partnerQuery = supabase
        .from("partners")
        .select("id, full_name, service_zones, rating_average, availability_status")
        .contains("categories_supported", [lead.category_code])
        .eq("availability_status", "online")
        .limit(10);

      const { data: candidates } = await partnerQuery;

      const eligible = (candidates || []).filter(
        (p: any) => !excludedIds.includes(p.id)
      );

      if (eligible.length === 0) {
        // No partners left → escalate
        await supabase
          .from("leads")
          .update({
            routing_status: "no_supply",
            status: "qualified",
            operator_notes: `No eligible partners remaining after ${currentAttempt} attempts.`,
          })
          .eq("id", lead.id);

        await supabase.from("notification_events").insert([{
          event_type: "lead_no_supply",
          metadata: {
            lead_id: lead.id,
            reason: "no_eligible_partners",
            excluded_count: excludedIds.length,
          } as any,
        }]);

        escalated++;
        continue;
      }

      // Simple best-pick: highest rating among zone-matching, then any
      let best = eligible[0];
      if (lead.zone_code) {
        const zoneMatch = eligible.find((p: any) =>
          (p.service_zones || []).includes(lead.zone_code)
        );
        if (zoneMatch) best = zoneMatch;
      }

      // 4. Reassign
      const newAttempt = currentAttempt + 1;
      const acceptWindowMinutes = 10; // Default; archetype-aware in client
      const acceptBy = new Date(Date.now() + acceptWindowMinutes * 60000).toISOString();

      history.push({
        attempt: newAttempt,
        partner_id: best.id,
        partner_name: best.full_name,
        assigned_at: now,
        accept_by: acceptBy,
        response_status: "assigned",
        reassigned_from_partner_id: lead.assigned_partner_id,
      });

      // Generate new response token
      const newToken = crypto.randomUUID();

      await supabase
        .from("leads")
        .update({
          assigned_partner_id: best.id,
          status: "assigned",
          partner_response_status: "pending",
          partner_response_at: null,
          rejection_reason: null,
          assignment_sent_at: now,
          accept_by: acceptBy,
          assignment_attempt: newAttempt,
          assignment_history: history,
          routing_status: "awaiting_response",
          reassigned_from_partner_id: lead.assigned_partner_id,
          response_token: newToken,
          response_token_expires_at: acceptBy,
        })
        .eq("id", lead.id);

      await supabase.from("notification_events").insert([{
        event_type: "lead_partner_reassigned",
        metadata: {
          lead_id: lead.id,
          new_partner_id: best.id,
          new_partner_name: best.full_name,
          attempt: newAttempt,
          reason: "timeout_auto_reassign",
        } as any,
      }]);

      reassigned++;
    }

    // Log executor run
    await supabase.from("notification_events").insert([{
      event_type: "timeout_executor_run",
      metadata: {
        processed: overdueLeads.length,
        expired,
        reassigned,
        escalated,
        run_at: now,
      } as any,
    }]);

    return new Response(
      JSON.stringify({ processed: overdueLeads.length, expired, reassigned, escalated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Timeout executor error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
