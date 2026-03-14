import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_DISPATCH_ROUNDS = 5;

interface AcceptRequest {
  booking_id: string;
  partner_id: string;
  offer_id?: string;
  action: "accept" | "decline" | "timeout" | "ops_confirm" | "ops_override";
  decline_reason?: string;
  override_partner_id?: string;
  ops_user_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: AcceptRequest = await req.json();
    const { booking_id, partner_id, offer_id, action, decline_reason, override_partner_id, ops_user_id } = body;

    if (!booking_id || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date().toISOString();
    const nowMs = Date.now();

    // ═══════════════════════════════════════════════════════════════
    // SAFETY GUARD: Check booking is not cancelled/completed
    // ═══════════════════════════════════════════════════════════════
    const { data: bookingGuard } = await supabase
      .from("bookings")
      .select("status, dispatch_status")
      .eq("id", booking_id)
      .single();

    if (!bookingGuard) {
      return new Response(JSON.stringify({ error: "booking_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (["cancelled", "completed"].includes(bookingGuard.status)) {
      // Cancel any remaining pending offers
      await supabase.from("dispatch_offers")
        .update({ status: "expired_by_accept", responded_at: now })
        .eq("booking_id", booking_id)
        .eq("status", "pending");

      return new Response(JSON.stringify({
        success: false, error: "cancelled_booking",
        message: "This booking has been cancelled or completed.",
      }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Ops manual confirmation ──
    if (action === "ops_confirm") {
      await Promise.all([
        supabase.from("bookings").update({
          partner_id, selected_partner_id: partner_id,
          dispatch_status: "ops_confirmed", status: "assigned",
          assigned_at: now, assignment_mode: "ops_manual",
        }).eq("id", booking_id),
        supabase.from("dispatch_offers").update({
          status: "accepted", responded_at: now,
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending"),
        // Expire all other offers
        supabase.from("dispatch_offers").update({
          status: "expired_by_accept", responded_at: now,
        }).eq("booking_id", booking_id).neq("partner_id", partner_id).eq("status", "pending"),
        supabase.from("dispatch_log").update({
          status: "ops_confirmed", response: "ops_confirmed", responded_at: now,
        }).eq("booking_id", booking_id).eq("partner_id", partner_id),
        supabase.from("job_timeline").insert({
          booking_id, status: "assigned", actor: ops_user_id || "ops",
          note: "Partner confirmed manually by operations team",
          metadata: { partner_id, action: "ops_confirmed" },
        }),
        lockPartnerAvailability(supabase, partner_id, booking_id),
      ]);
      return new Response(JSON.stringify({ success: true, status: "ops_confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Ops override ──
    if (action === "ops_override") {
      const assignId = override_partner_id || partner_id;
      await Promise.all([
        supabase.from("bookings").update({
          partner_id: assignId, selected_partner_id: assignId,
          dispatch_status: "ops_confirmed", status: "assigned",
          assigned_at: now, assignment_mode: "ops_override",
        }).eq("id", booking_id),
        // Expire all pending offers
        supabase.from("dispatch_offers").update({
          status: "expired_by_accept", responded_at: now,
        }).eq("booking_id", booking_id).eq("status", "pending"),
        supabase.from("job_timeline").insert({
          booking_id, status: "assigned", actor: ops_user_id || "ops",
          note: `Ops override: assigned partner ${assignId}`,
          metadata: { partner_id: assignId, action: "ops_override", overridden_from: partner_id },
        }),
        lockPartnerAvailability(supabase, assignId, booking_id),
      ]);
      return new Response(JSON.stringify({ success: true, status: "ops_override" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!partner_id) {
      return new Response(JSON.stringify({ error: "partner_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACCEPT
    // ═══════════════════════════════════════════════════════════════
    if (action === "accept") {
      // 1. Find the offer with expiry validation
      let offerQuery = supabase
        .from("dispatch_offers")
        .select("id, offer_mode, multi_tech_group_id, is_lead_technician, created_at, expires_at, accept_window_seconds")
        .eq("booking_id", booking_id)
        .eq("partner_id", partner_id)
        .eq("status", "pending");

      if (offer_id) offerQuery = offerQuery.eq("id", offer_id);

      const { data: offers } = await offerQuery;
      const offer = offers?.[0];

      if (!offer) {
        return new Response(JSON.stringify({
          success: false, error: "no_pending_offer",
          message: "No pending offer found. It may have expired or been claimed.",
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── EXPIRY CHECK: reject if offer has expired ──
      if (new Date(offer.expires_at).getTime() < nowMs) {
        await supabase.from("dispatch_offers")
          .update({ status: "late_accept", responded_at: now })
          .eq("id", offer.id);

        await supabase.from("job_timeline").insert({
          booking_id, status: "late_accept", actor: "partner",
          note: `Partner tried to accept after expiry (${Math.round((nowMs - new Date(offer.expires_at).getTime()) / 1000)}s late)`,
          metadata: { partner_id, offer_id: offer.id, expired_at: offer.expires_at },
        });

        return new Response(JSON.stringify({
          success: false, error: "offer_expired",
          message: "This offer has expired. The job may be reassigned.",
        }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const responseTimeMs = nowMs - new Date(offer.created_at).getTime();

      // ═══════════════════════════════════════════
      // PARALLEL MODE
      // ═══════════════════════════════════════════
      if (offer.offer_mode === "parallel") {
        // Atomic: update offer only if still pending
        const { data: updatedOffer, error: updateErr } = await supabase
          .from("dispatch_offers")
          .update({ status: "accepted", responded_at: now, response_time_ms: responseTimeMs })
          .eq("id", offer.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();

        if (updateErr || !updatedOffer) {
          return new Response(JSON.stringify({
            success: false, error: "already_claimed",
            message: "This job has already been assigned to another provider.",
          }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Expire all other parallel offers (not just supersede — use expired_by_accept)
        await supabase.from("dispatch_offers")
          .update({ status: "expired_by_accept", responded_at: now })
          .eq("booking_id", booking_id)
          .neq("id", offer.id)
          .eq("status", "pending");

        // Atomic booking claim
        const { data: updatedBooking, error: bErr } = await supabase.from("bookings")
          .update({
            partner_id, selected_partner_id: partner_id,
            dispatch_status: "accepted", status: "assigned",
            assigned_at: now, assignment_mode: "smart_dispatch_parallel",
          })
          .eq("id", booking_id)
          .in("dispatch_status", ["pending_acceptance", "dispatching"])
          .select("id")
          .maybeSingle();

        if (bErr || !updatedBooking) {
          await supabase.from("dispatch_offers")
            .update({ status: "late_accept" })
            .eq("id", offer.id);
          return new Response(JSON.stringify({
            success: false, error: "already_claimed",
          }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await Promise.all([
          supabase.from("dispatch_log").update({
            status: "accepted", response: "accepted", responded_at: now,
            response_time_seconds: Math.round(responseTimeMs / 1000),
          }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance"),
          supabase.from("dispatch_log").update({
            status: "superseded", response: "parallel_race_lost", responded_at: now,
          }).eq("booking_id", booking_id).neq("partner_id", partner_id).eq("status", "pending_acceptance"),
          supabase.from("partner_notifications").update({
            actioned_at: now, action_taken: "accepted",
          }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("notification_type", "job_offer"),
          supabase.from("job_timeline").insert({
            booking_id, status: "job_offer_accepted", actor: "partner",
            note: `Partner accepted (parallel race won, response: ${Math.round(responseTimeMs / 1000)}s)`,
            metadata: {
              partner_id, action: "accept", offer_mode: "parallel",
              response_time_ms: responseTimeMs, offer_id: offer.id,
            },
          }),
          supabase.from("notification_events").insert({
            event_type: "provider_assigned", booking_id, partner_id,
            metadata: { response_time_ms: responseTimeMs, offer_mode: "parallel" },
          }),
          lockPartnerAvailability(supabase, partner_id, booking_id),
        ]);

        return new Response(JSON.stringify({ success: true, status: "accepted", race_won: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ═══════════════════════════════════════════
      // MULTI-TECH MODE
      // ═══════════════════════════════════════════
      if (offer.offer_mode === "multi_tech") {
        // ── LEAD-FIRST GATE: support techs cannot accept before lead ──
        if (!offer.is_lead_technician) {
          const { data: leadOffers } = await supabase
            .from("dispatch_offers")
            .select("id, status")
            .eq("multi_tech_group_id", offer.multi_tech_group_id)
            .eq("is_lead_technician", true);

          const leadAccepted = leadOffers?.some((o: any) => o.status === "accepted");
          if (!leadAccepted) {
            return new Response(JSON.stringify({
              success: false, error: "lead_not_accepted",
              message: "The lead technician must accept first before support technicians can join.",
            }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }

        // Accept this offer atomically
        const { data: updatedOffer, error: updateErr } = await supabase
          .from("dispatch_offers")
          .update({ status: "accepted", responded_at: now, response_time_ms: responseTimeMs })
          .eq("id", offer.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();

        if (updateErr || !updatedOffer) {
          return new Response(JSON.stringify({
            success: false, error: "already_claimed",
          }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Check team completeness
        const { data: groupOffers } = await supabase
          .from("dispatch_offers")
          .select("id, partner_id, status, is_lead_technician")
          .eq("multi_tech_group_id", offer.multi_tech_group_id)
          .eq("status", "accepted");

        const acceptedCount = groupOffers?.length || 0;
        const MULTI_TECH_DEFAULTS: Record<string, number> = { AC: 2, SOLAR: 3, CCTV: 2, SMART_HOME_OFFICE: 2 };

        const { data: booking } = await supabase.from("bookings")
          .select("category_code")
          .eq("id", booking_id)
          .single();

        const requiredCount = MULTI_TECH_DEFAULTS[booking?.category_code || ""] || 2;
        let teamComplete = false;

        if (acceptedCount >= requiredCount) {
          teamComplete = true;
          const leadOffer = groupOffers?.find((o: any) => o.is_lead_technician);
          const leadId = leadOffer?.partner_id || partner_id;

          await Promise.all([
            supabase.from("bookings").update({
              partner_id: leadId, selected_partner_id: leadId,
              dispatch_status: "team_assigned", status: "assigned",
              assigned_at: now, assignment_mode: "multi_tech_dispatch",
            }).eq("id", booking_id),
            supabase.from("dispatch_offers")
              .update({ status: "expired_by_accept", responded_at: now })
              .eq("multi_tech_group_id", offer.multi_tech_group_id)
              .eq("status", "pending"),
          ]);

          // Lock all accepted partners
          for (const accepted of groupOffers || []) {
            await lockPartnerAvailability(supabase, accepted.partner_id, booking_id);
          }

          await supabase.from("job_timeline").insert({
            booking_id, status: "team_assigned", actor: "partner",
            note: `Technician team complete: ${acceptedCount}/${requiredCount}. Lead: ${leadId.slice(0, 8)}`,
            metadata: {
              accepted_partners: groupOffers?.map((o: any) => o.partner_id),
              lead_partner_id: leadId, required: requiredCount,
            },
          });

          await supabase.from("notification_events").insert({
            event_type: "team_assigned", booking_id,
            metadata: { team_size: acceptedCount, lead_partner_id: leadId },
          });
        }

        // Log this acceptance
        await Promise.all([
          supabase.from("dispatch_log").update({
            status: "accepted", response: "accepted", responded_at: now,
            response_time_seconds: Math.round(responseTimeMs / 1000),
          }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance"),
          supabase.from("partner_notifications").update({
            actioned_at: now, action_taken: "accepted",
          }).eq("booking_id", booking_id).eq("partner_id", partner_id),
          supabase.from("job_timeline").insert({
            booking_id, status: "job_offer_accepted", actor: "partner",
            note: `Tech accepted multi-tech job (${acceptedCount}/${requiredCount}${offer.is_lead_technician ? ", LEAD" : ""}, ${Math.round(responseTimeMs / 1000)}s)`,
            metadata: {
              partner_id, offer_mode: "multi_tech", is_lead: offer.is_lead_technician,
              response_time_ms: responseTimeMs, accepted_so_far: acceptedCount, required: requiredCount,
            },
          }),
          !teamComplete ? lockPartnerAvailability(supabase, partner_id, booking_id) : Promise.resolve(),
        ]);

        return new Response(JSON.stringify({
          success: true,
          status: teamComplete ? "team_assigned" : "partial_accept",
          accepted_count: acceptedCount,
          required_count: requiredCount,
          is_lead: offer.is_lead_technician,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ═══════════════════════════════════════════
      // SEQUENTIAL MODE (default)
      // ═══════════════════════════════════════════
      // Atomic: claim offer
      const { data: updatedOffer, error: offerErr } = await supabase
        .from("dispatch_offers")
        .update({ status: "accepted", responded_at: now, response_time_ms: responseTimeMs })
        .eq("id", offer.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (offerErr || !updatedOffer) {
        return new Response(JSON.stringify({
          success: false, error: "already_claimed",
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Atomic: claim booking
      const { data: updatedBooking, error: bookingUpdateErr } = await supabase
        .from("bookings")
        .update({
          partner_id, selected_partner_id: partner_id,
          dispatch_status: "accepted", status: "assigned",
          assigned_at: now, assignment_mode: "smart_dispatch",
        })
        .eq("id", booking_id)
        .in("dispatch_status", ["pending_acceptance", "dispatching"])
        .select("id")
        .maybeSingle();

      if (bookingUpdateErr || !updatedBooking) {
        await supabase.from("dispatch_offers")
          .update({ status: "late_accept", responded_at: now })
          .eq("id", offer.id);

        return new Response(JSON.stringify({
          success: false, error: "already_claimed",
          message: "This job has already been assigned.",
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Expire all other offers for this booking
      await supabase.from("dispatch_offers")
        .update({ status: "expired_by_accept", responded_at: now })
        .eq("booking_id", booking_id)
        .neq("id", offer.id)
        .eq("status", "pending");

      await Promise.all([
        supabase.from("dispatch_log").update({
          status: "accepted", response: "accepted", responded_at: now,
          response_time_seconds: Math.round(responseTimeMs / 1000),
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance"),
        supabase.from("dispatch_log").update({
          status: "superseded", response: "another_accepted", responded_at: now,
        }).eq("booking_id", booking_id).neq("partner_id", partner_id).eq("status", "pending_acceptance"),
        supabase.from("partner_notifications").update({
          actioned_at: now, action_taken: "accepted",
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("notification_type", "job_offer"),
        supabase.from("job_timeline").insert({
          booking_id, status: "job_offer_accepted", actor: "partner",
          note: `Partner accepted (response: ${Math.round(responseTimeMs / 1000)}s)`,
          metadata: {
            partner_id, action: "accept", offer_mode: "sequential",
            response_time_ms: responseTimeMs, offer_id: offer.id,
          },
        }),
        supabase.from("notification_events").insert({
          event_type: "provider_assigned", booking_id, partner_id,
          metadata: { response_time_ms: responseTimeMs },
        }),
        lockPartnerAvailability(supabase, partner_id, booking_id),
      ]);

      return new Response(JSON.stringify({ success: true, status: "accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // DECLINE
    // ═══════════════════════════════════════════════════════════════
    if (action === "decline") {
      const responseTimeMs = await getOfferResponseTime(supabase, booking_id, partner_id, nowMs);

      await Promise.all([
        supabase.from("dispatch_offers")
          .update({ status: "declined", decline_reason, responded_at: now, response_time_ms: responseTimeMs })
          .eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending"),
        supabase.from("dispatch_log").update({
          status: "declined", response: decline_reason || "declined", responded_at: now,
          response_time_seconds: Math.round((responseTimeMs || 0) / 1000),
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance"),
        supabase.from("partner_notifications").update({
          actioned_at: now, action_taken: "declined",
        }).eq("booking_id", booking_id).eq("partner_id", partner_id),
        supabase.from("job_timeline").insert({
          booking_id, status: "job_offer_declined", actor: "partner",
          note: `Partner declined${decline_reason ? `: ${decline_reason}` : ""}`,
          metadata: { partner_id, reason: decline_reason, response_time_ms: responseTimeMs },
        }),
      ]);

      // Check remaining pending offers
      const { data: remainingOffers } = await supabase
        .from("dispatch_offers")
        .select("id, offer_mode")
        .eq("booking_id", booking_id)
        .eq("status", "pending")
        .limit(1);

      if (!remainingOffers || remainingOffers.length === 0) {
        const { data: booking } = await supabase.from("bookings")
          .select("dispatch_round")
          .eq("id", booking_id)
          .single();

        const currentRound = booking?.dispatch_round || 1;

        if (currentRound >= MAX_DISPATCH_ROUNDS) {
          await Promise.all([
            supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", booking_id),
            supabase.from("dispatch_escalations").insert({
              booking_id, reason: "all_declined", dispatch_rounds_attempted: currentRound,
            }),
            supabase.from("job_timeline").insert({
              booking_id, status: "dispatch_failed", actor: "system",
              note: `All ${MAX_DISPATCH_ROUNDS} rounds exhausted — escalated to ops`,
            }),
            supabase.from("notification_events").insert({
              event_type: "dispatch_escalated", booking_id,
              metadata: { reason: "all_declined", round: currentRound },
            }),
          ]);
          return new Response(JSON.stringify({ success: true, status: "escalated" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Auto-trigger next round
        const { error: reErr } = await supabase.functions.invoke("dispatch-orchestrator", {
          body: { booking_id, force_round: currentRound + 1 },
        });

        if (reErr) {
          console.error("Re-dispatch failed:", reErr);
          await supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", booking_id);
          return new Response(JSON.stringify({ success: true, status: "escalated" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true, status: "next_round", dispatch_round: currentRound + 1,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, status: "declined" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // TIMEOUT (explicit partner-side)
    // ═══════════════════════════════════════════════════════════════
    if (action === "timeout") {
      await Promise.all([
        supabase.from("dispatch_offers")
          .update({ status: "expired", responded_at: now })
          .eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending"),
        supabase.from("dispatch_log").update({
          status: "timed_out", response: "timeout", responded_at: now,
        }).eq("booking_id", booking_id).eq("partner_id", partner_id).eq("status", "pending_acceptance"),
        supabase.from("job_timeline").insert({
          booking_id, status: "job_offer_expired", actor: "system",
          note: `Partner offer timed out`,
          metadata: { partner_id },
        }),
      ]);

      // Check if should retrigger (same logic as decline)
      const { data: remainingOffers } = await supabase
        .from("dispatch_offers")
        .select("id")
        .eq("booking_id", booking_id)
        .eq("status", "pending")
        .limit(1);

      if (!remainingOffers || remainingOffers.length === 0) {
        const { data: booking } = await supabase.from("bookings")
          .select("dispatch_round")
          .eq("id", booking_id)
          .single();

        const currentRound = booking?.dispatch_round || 1;

        if (currentRound >= MAX_DISPATCH_ROUNDS) {
          await Promise.all([
            supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", booking_id),
            supabase.from("dispatch_escalations").insert({
              booking_id, reason: "all_timeout", dispatch_rounds_attempted: currentRound,
            }),
            supabase.from("job_timeline").insert({
              booking_id, status: "dispatch_failed", actor: "system",
              note: `All ${MAX_DISPATCH_ROUNDS} rounds exhausted (timeout) — escalated`,
            }),
          ]);
          return new Response(JSON.stringify({ success: true, status: "escalated" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.functions.invoke("dispatch-orchestrator", {
          body: { booking_id, force_round: currentRound + 1 },
        });

        return new Response(JSON.stringify({
          success: true, status: "next_round", dispatch_round: currentRound + 1,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, status: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("dispatch-accept error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Lock partner availability after accepting a job */
async function lockPartnerAvailability(supabase: any, partnerId: string, bookingId: string) {
  try {
    const { data: partner } = await supabase
      .from("partners")
      .select("current_job_count, max_concurrent_jobs")
      .eq("id", partnerId)
      .single();

    if (!partner) return;

    const newJobCount = (partner.current_job_count || 0) + 1;
    const maxConcurrent = partner.max_concurrent_jobs || 1;
    const newStatus = newJobCount >= maxConcurrent ? "busy" : "online";

    await supabase.from("partners").update({
      current_job_count: newJobCount,
      availability_status: newStatus,
      active_job_id: bookingId,
    }).eq("id", partnerId);

    console.log(`[AvailabilityLock] Partner ${partnerId}: jobs=${newJobCount}/${maxConcurrent}, status=${newStatus}`);
  } catch (e) {
    console.error("[AvailabilityLock] Failed:", e);
  }
}

/** Get response time from offer creation */
async function getOfferResponseTime(supabase: any, bookingId: string, partnerId: string, nowMs: number): Promise<number | null> {
  const { data } = await supabase
    .from("dispatch_offers")
    .select("created_at")
    .eq("booking_id", bookingId)
    .eq("partner_id", partnerId)
    .eq("status", "pending")
    .maybeSingle();

  if (data?.created_at) {
    return nowMs - new Date(data.created_at).getTime();
  }
  return null;
}
