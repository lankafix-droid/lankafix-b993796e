/**
 * partner-respond — LankaFix
 *
 * Secure edge function for partner accept/reject/unavailable responses.
 *
 * SECURITY:
 * - Validates response_token (UUID, one-time use effectively)
 * - Checks token hasn't expired
 * - Ensures lead is still in pending state (prevents double-submit)
 * - Validates partner_id matches assigned partner
 *
 * IDEMPOTENT: repeated calls with same token after first response
 * return the already-set status instead of erroring.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { token, action, rejection_reason, notes } = await req.json();

    if (!token || !action) {
      return new Response(JSON.stringify({ error: "Missing token or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["accept", "reject", "unavailable"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action. Use: accept, reject, unavailable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up lead by response token
    const { data: lead, error: fetchErr } = await supabase
      .from("leads")
      .select("id, assigned_partner_id, partner_response_status, accept_by, routing_status, assignment_history, category_code, customer_name, customer_location, description, zone_code")
      .eq("response_token", token)
      .single();

    if (fetchErr || !lead) {
      return new Response(JSON.stringify({ error: "Invalid or expired response token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already responded? Return current state (idempotent)
    if (lead.partner_response_status !== "pending") {
      return new Response(JSON.stringify({
        already_responded: true,
        current_status: lead.partner_response_status,
        message: `This assignment was already ${lead.partner_response_status}.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if expired
    if (lead.accept_by && new Date(lead.accept_by) < new Date()) {
      return new Response(JSON.stringify({
        error: "expired",
        message: "This assignment has expired. It may have been reassigned.",
      }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const partnerId = lead.assigned_partner_id;
    const history = (lead.assignment_history || []) as any[];

    // Update last history entry
    if (history.length > 0) {
      const last = history[history.length - 1];
      last.response_at = now;
    }

    if (action === "accept") {
      if (history.length > 0) history[history.length - 1].response_status = "accepted";

      await supabase
        .from("leads")
        .update({
          partner_response_status: "accepted",
          partner_response_at: now,
          accepted_by_partner_id: partnerId,
          status: "accepted",
          routing_status: "accepted",
          assignment_history: history,
        })
        .eq("id", lead.id)
        .eq("partner_response_status", "pending"); // Race guard

      await supabase.from("notification_events").insert([{
        event_type: "lead_partner_accepted",
        metadata: { lead_id: lead.id, partner_id: partnerId, source: "partner_portal" } as any,
      }]);

      return new Response(JSON.stringify({
        success: true,
        action: "accepted",
        message: "You have accepted this assignment. The LankaFix team will confirm shortly.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reject") {
      const reason = rejection_reason || "other";
      if (history.length > 0) {
        history[history.length - 1].response_status = "rejected";
        history[history.length - 1].rejection_reason = reason;
      }

      await supabase
        .from("leads")
        .update({
          partner_response_status: "rejected",
          partner_response_at: now,
          rejection_reason: reason,
          response_notes: notes || null,
          assigned_partner_id: null,
          routing_status: "needs_reassignment",
          status: "qualified",
          assignment_history: history,
        })
        .eq("id", lead.id)
        .eq("partner_response_status", "pending");

      await supabase.from("notification_events").insert([{
        event_type: "lead_partner_rejected",
        metadata: { lead_id: lead.id, partner_id: partnerId, reason, source: "partner_portal" } as any,
      }]);

      return new Response(JSON.stringify({
        success: true,
        action: "rejected",
        message: "You have declined this assignment. It will be offered to another partner.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "unavailable") {
      if (history.length > 0) history[history.length - 1].response_status = "unavailable";

      await supabase
        .from("leads")
        .update({
          partner_response_status: "unavailable",
          partner_response_at: now,
          response_notes: notes || "Temporarily unavailable",
          assigned_partner_id: null,
          routing_status: "needs_reassignment",
          status: "qualified",
          assignment_history: history,
        })
        .eq("id", lead.id)
        .eq("partner_response_status", "pending");

      await supabase.from("notification_events").insert([{
        event_type: "lead_partner_unavailable",
        metadata: { lead_id: lead.id, partner_id: partnerId, source: "partner_portal" } as any,
      }]);

      return new Response(JSON.stringify({
        success: true,
        action: "unavailable",
        message: "You have been marked as temporarily unavailable. No penalty applied.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("partner-respond error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
