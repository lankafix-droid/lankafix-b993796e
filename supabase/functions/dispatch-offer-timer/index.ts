import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_DISPATCH_ROUNDS = 5;
const MULTI_TECH_DEFAULTS: Record<string, number> = { AC: 2, SOLAR: 3, CCTV: 2, SMART_HOME_OFFICE: 2 };

/**
 * dispatch-offer-timer: Mode-aware periodic expiry worker.
 * 
 * Sequential: expire → trigger next dispatch round
 * Parallel: expire all → if none accepted → next round
 * Multi-tech:
 *   Lead expired → select next lead candidate from same group
 *   Support expired → attempt fill; if min team reached → proceed
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();
    const nowMs = Date.now();

    // 1. Find all expired pending offers
    const { data: expiredOffers, error: fetchErr } = await supabase
      .from("dispatch_offers")
      .select("id, booking_id, partner_id, dispatch_round, offer_mode, multi_tech_group_id, is_lead_technician, category_code")
      .eq("status", "pending")
      .lt("expires_at", now);

    if (fetchErr) throw fetchErr;

    if (!expiredOffers || expiredOffers.length === 0) {
      return new Response(JSON.stringify({ success: true, expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Batch-mark all expired
    const expiredIds = expiredOffers.map((o: any) => o.id);
    await supabase.from("dispatch_offers")
      .update({ status: "expired", responded_at: now })
      .in("id", expiredIds);

    // Backward compat: dispatch_log
    const logUpdates = expiredOffers.map((o: any) =>
      supabase.from("dispatch_log")
        .update({ status: "timed_out", response: "offer_timer_expired", responded_at: now })
        .eq("booking_id", o.booking_id)
        .eq("partner_id", o.partner_id)
        .eq("status", "pending_acceptance")
    );
    await Promise.all(logUpdates);

    // 3. Group by booking
    const bookingMap = new Map<string, typeof expiredOffers>();
    for (const offer of expiredOffers) {
      const list = bookingMap.get(offer.booking_id) || [];
      list.push(offer);
      bookingMap.set(offer.booking_id, list);
    }

    let totalExpired = expiredOffers.length;
    let retriggered = 0;
    let escalated = 0;
    let leadReselected = 0;
    let teamsCompleted = 0;

    for (const [bookingId, offers] of bookingMap) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("dispatch_round, dispatch_status, category_code")
        .eq("id", bookingId)
        .single();

      if (!booking) continue;

      // Skip already-resolved bookings
      if (["accepted", "ops_confirmed", "assigned", "team_assigned", "cancelled"].includes(booking.dispatch_status || "")) continue;

      // Log each expiry
      const timelineInserts = offers.map((o: any) =>
        supabase.from("job_timeline").insert({
          booking_id: bookingId,
          status: "job_offer_expired",
          actor: "offer_timer",
          note: `Offer expired (${o.offer_mode}, partner: ${o.partner_id.slice(0, 8)}, round: ${o.dispatch_round}${o.is_lead_technician ? ", LEAD" : ""})`,
          metadata: { partner_id: o.partner_id, round: o.dispatch_round, offer_mode: o.offer_mode, is_lead: o.is_lead_technician },
        })
      );
      await Promise.all(timelineInserts);

      // Check remaining pending offers for this booking
      const { data: remainingPending } = await supabase
        .from("dispatch_offers")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("status", "pending")
        .limit(1);

      if (remainingPending && remainingPending.length > 0) {
        // Still have active offers — wait
        continue;
      }

      // ═══ MODE-SPECIFIC HANDLING ═══
      const offerMode = offers[0]?.offer_mode || "sequential";
      const groupId = offers[0]?.multi_tech_group_id;

      if (offerMode === "multi_tech" && groupId) {
        // ── MULTI-TECH EXPIRY HANDLING ──
        const { data: acceptedOffers } = await supabase
          .from("dispatch_offers")
          .select("id, partner_id, is_lead_technician")
          .eq("multi_tech_group_id", groupId)
          .eq("status", "accepted");

        const requiredCount = MULTI_TECH_DEFAULTS[booking.category_code] || 2;
        const acceptedCount = acceptedOffers?.length || 0;
        const hasLead = acceptedOffers?.some((o: any) => o.is_lead_technician) || false;
        const leadExpired = offers.some((o: any) => o.is_lead_technician);
        const currentRound = booking.dispatch_round || 1;

        if (leadExpired && !hasLead) {
          // ── Lead expired: promote highest-scored accepted tech to lead, or re-dispatch ──
          if (acceptedCount > 0) {
            const newLead = acceptedOffers![0];
            await supabase.from("dispatch_offers")
              .update({ is_lead_technician: true })
              .eq("id", newLead.id);

            await supabase.from("job_timeline").insert({
              booking_id: bookingId,
              status: "lead_reselected",
              actor: "offer_timer",
              note: `Lead tech expired — promoted ${newLead.partner_id.slice(0, 8)} to lead`,
              metadata: { new_lead: newLead.partner_id, accepted_count: acceptedCount },
            });
            leadReselected++;

            if (acceptedCount >= requiredCount) {
              const leadId = newLead.partner_id;
              await supabase.from("bookings").update({
                partner_id: leadId, selected_partner_id: leadId,
                dispatch_status: "team_assigned", status: "assigned",
                assigned_at: now, assignment_mode: "multi_tech_dispatch",
              }).eq("id", bookingId);

              await supabase.from("job_timeline").insert({
                booking_id: bookingId,
                status: "team_assigned",
                actor: "offer_timer",
                note: `Team assembled after lead re-selection: ${acceptedCount}/${requiredCount}`,
                metadata: { lead_partner_id: leadId, team_size: acceptedCount },
              });
              teamsCompleted++;
              continue;
            }

            // Need more support — check if rounds exhausted
            if (currentRound >= MAX_DISPATCH_ROUNDS) {
              // Release all accepted partners since team cannot be completed
              await releasePartners(supabase, acceptedOffers!, bookingId);
              await escalateMultiTech(supabase, bookingId, currentRound, acceptedCount, requiredCount);
              escalated++;
              continue;
            }

            await triggerNextRound(supabase, bookingId, currentRound);
            retriggered++;
            continue;
          }

          // No accepted at all — full re-dispatch
          if (currentRound >= MAX_DISPATCH_ROUNDS) {
            await escalateMultiTech(supabase, bookingId, currentRound, 0, requiredCount);
            escalated++;
            continue;
          }
          await triggerNextRound(supabase, bookingId, currentRound);
          retriggered++;
          continue;
        }

        // Lead accepted but not enough support
        if (hasLead && acceptedCount >= requiredCount) {
          // Team complete — expire any extra pending offers
          const leadOffer = acceptedOffers!.find((o: any) => o.is_lead_technician);
          const leadId = leadOffer?.partner_id || acceptedOffers![0].partner_id;

          await Promise.all([
            supabase.from("bookings").update({
              partner_id: leadId, selected_partner_id: leadId,
              dispatch_status: "team_assigned", status: "assigned",
              assigned_at: now, assignment_mode: "multi_tech_dispatch",
            }).eq("id", bookingId),
            // Expire any remaining pending multi-tech offers
            supabase.from("dispatch_offers")
              .update({ status: "expired_by_accept", responded_at: now })
              .eq("multi_tech_group_id", groupId)
              .eq("status", "pending"),
          ]);

          await supabase.from("job_timeline").insert({
            booking_id: bookingId,
            status: "team_assigned",
            actor: "offer_timer",
            note: `Team complete: ${acceptedCount}/${requiredCount}`,
            metadata: { lead_partner_id: leadId },
          });
          teamsCompleted++;
          continue;
        }

        // Partial team, not enough support — retry or escalate+release
        if (currentRound >= MAX_DISPATCH_ROUNDS) {
          // Release all accepted partners — team formation failed
          if (acceptedOffers && acceptedOffers.length > 0) {
            await releasePartners(supabase, acceptedOffers, bookingId);
          }
          await escalateMultiTech(supabase, bookingId, currentRound, acceptedCount, requiredCount);
          escalated++;
          continue;
        }

        await triggerNextRound(supabase, bookingId, currentRound);
        retriggered++;
        continue;
      }

      // ── SEQUENTIAL / PARALLEL: standard next-round logic ──
      const currentRound = booking.dispatch_round || 1;

      if (currentRound >= MAX_DISPATCH_ROUNDS) {
        await Promise.all([
          supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId),
          supabase.from("dispatch_escalations").insert({
            booking_id: bookingId,
            reason: offerMode === "parallel" ? "parallel_all_expired" : "sequential_all_expired",
            dispatch_rounds_attempted: currentRound,
          }),
          supabase.from("job_timeline").insert({
            booking_id: bookingId,
            status: "dispatch_failed",
            actor: "offer_timer",
            note: `All ${MAX_DISPATCH_ROUNDS} dispatch rounds exhausted (${offerMode}). Escalated to operations.`,
            metadata: { round: currentRound, offer_mode: offerMode, reason: "all_rounds_exhausted" },
          }),
          supabase.from("notification_events").insert({
            event_type: "dispatch_escalated",
            booking_id: bookingId,
            metadata: { reason: "all_rounds_exhausted", round: currentRound, offer_mode: offerMode },
          }),
        ]);
        escalated++;
      } else {
        await triggerNextRound(supabase, bookingId, currentRound);
        retriggered++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      expired: totalExpired,
      retriggered,
      escalated,
      lead_reselected: leadReselected,
      teams_completed: teamsCompleted,
      bookings_processed: bookingMap.size,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("dispatch-offer-timer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Release partner availability locks when multi-tech team formation fails */
async function releasePartners(supabase: any, partners: { partner_id: string }[], bookingId: string) {
  for (const p of partners) {
    try {
      const { data: partner } = await supabase
        .from("partners")
        .select("current_job_count")
        .eq("id", p.partner_id)
        .single();

      if (partner) {
        const newCount = Math.max(0, (partner.current_job_count || 1) - 1);
        await supabase.from("partners").update({
          current_job_count: newCount,
          availability_status: newCount === 0 ? "online" : "busy",
          active_job_id: null,
        }).eq("id", p.partner_id);
      }
    } catch (e) {
      console.error(`[ReleasePartner] Failed for ${p.partner_id}:`, e);
    }
  }

  await supabase.from("job_timeline").insert({
    booking_id: bookingId,
    status: "partners_released",
    actor: "offer_timer",
    note: `Released ${partners.length} partner(s) from incomplete multi-tech team`,
    metadata: { partner_ids: partners.map(p => p.partner_id) },
  });
}

/** Escalate a failed multi-tech dispatch */
async function escalateMultiTech(supabase: any, bookingId: string, round: number, accepted: number, required: number) {
  await Promise.all([
    supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId),
    supabase.from("dispatch_escalations").insert({
      booking_id: bookingId,
      reason: "multi_tech_team_incomplete",
      dispatch_rounds_attempted: round,
    }),
    supabase.from("job_timeline").insert({
      booking_id: bookingId,
      status: "dispatch_failed",
      actor: "offer_timer",
      note: `Multi-tech team incomplete (${accepted}/${required}) after ${round} rounds — escalated`,
      metadata: { accepted, required, round },
    }),
    supabase.from("notification_events").insert({
      event_type: "dispatch_escalated",
      booking_id: bookingId,
      metadata: { reason: "multi_tech_team_incomplete", accepted, required, round },
    }),
  ]);
}

/** Trigger next dispatch round via orchestrator */
async function triggerNextRound(supabase: any, bookingId: string, currentRound: number) {
  if (currentRound >= MAX_DISPATCH_ROUNDS) {
    await Promise.all([
      supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId),
      supabase.from("dispatch_escalations").insert({
        booking_id: bookingId, reason: "max_rounds_exceeded", dispatch_rounds_attempted: currentRound,
      }),
      supabase.from("job_timeline").insert({
        booking_id: bookingId, status: "dispatch_failed", actor: "offer_timer",
        note: `Max dispatch rounds (${MAX_DISPATCH_ROUNDS}) exceeded — escalated`,
      }),
    ]);
    return;
  }

  const { error } = await supabase.functions.invoke("dispatch-orchestrator", {
    body: { booking_id: bookingId, force_round: currentRound + 1 },
  });

  if (error) {
    console.error(`Re-dispatch failed for ${bookingId}:`, error);
    await supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId);
  } else {
    await supabase.from("job_timeline").insert({
      booking_id: bookingId,
      status: "dispatch_retry",
      actor: "offer_timer",
      note: `Auto-retrying dispatch round ${currentRound + 1}`,
      metadata: { next_round: currentRound + 1 },
    });
  }
}
