/**
 * LankaFix Self-Healing Monitor
 * Ops page showing healing events, success rate, escalations, and manual trigger.
 */
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, RefreshCw, Shield, CheckCircle2, AlertTriangle, XCircle,
  Activity, Clock, Zap, CreditCard, Cpu, Heart, TrendingUp,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import {
  COOLDOWN_MINUTES, MAX_RETRIES, RECOVERY_TYPE_LABELS, STALE_BOOKING_MINUTES,
  STALE_STATUSES, type HealingEntityType, type HealingRecoveryType, type HealingStatus,
} from "@/config/selfHealingConfig";
import {
  MAX_PAYMENT_FAILURES_CHECKLIST, MAX_ESCALATIONS_CHECKLIST,
  MAX_STALE_BOOKINGS_CHECKLIST,
} from "@/config/launchReadinessConfig";

// ── Types ──
interface HealingEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  recovery_type: string;
  attempt_number: number;
  status: string;
  cooldown_until: string | null;
  metadata: any;
  created_at: string;
}

// ── Status styles ──
const STATUS_CFG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  success: { color: "text-success", icon: CheckCircle2, label: "Success" },
  failed: { color: "text-destructive", icon: XCircle, label: "Failed" },
  escalated: { color: "text-warning", icon: AlertTriangle, label: "Escalated" },
  skipped_cooldown: { color: "text-muted-foreground", icon: Clock, label: "Cooldown" },
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  booking: Activity,
  dispatch: Zap,
  payment: CreditCard,
  automation: Cpu,
};

export default function SelfHealingMonitorPage() {
  const queryClient = useQueryClient();
  const [healing, setHealing] = useState(false);

  // ── Fetch recent healing events ──
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["self-healing-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("self_healing_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as HealingEvent[];
    },
    refetchInterval: 30_000,
  });

  // ── Compute stats ──
  const last24h = events.filter(e => {
    const age = Date.now() - new Date(e.created_at).getTime();
    return age < 24 * 60 * 60 * 1000;
  });
  const successCount = last24h.filter(e => e.status === "success").length;
  const failedCount = last24h.filter(e => e.status === "failed").length;
  const escalatedCount = last24h.filter(e => e.status === "escalated").length;
  const skippedCount = last24h.filter(e => e.status === "skipped_cooldown").length;
  const totalActions = last24h.length;
  const successRate = totalActions > 0 ? Math.round((successCount / totalActions) * 100) : 100;

  // ── Manual healing cycle trigger ──
  const runHealingCycle = useCallback(async () => {
    setHealing(true);
    try {
      await runStaleBookingHealing();
      await runExpiredDispatchHealing();
      await runPaymentRetryHealing();
      queryClient.invalidateQueries({ queryKey: ["self-healing-events"] });
    } catch (e) {
      console.warn("[SelfHealing] Cycle error:", e);
    } finally {
      setHealing(false);
    }
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top">
      <Header />
      <main className="flex-1 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/ops/command-center">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Self-Healing Monitor
              </h1>
              <p className="text-xs text-muted-foreground">Controlled recovery engine for operational failures</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={runHealingCycle} disabled={healing}>
              <RefreshCw className={`w-3.5 h-3.5 ${healing ? "animate-spin" : ""}`} />
              {healing ? "Healing…" : "Run Cycle"}
            </Button>
          </div>

          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Success Rate" value={`${successRate}%`} icon={TrendingUp} color="text-success" />
            <StatCard label="Recovered" value={successCount} icon={CheckCircle2} color="text-success" />
            <StatCard label="Escalated" value={escalatedCount} icon={AlertTriangle} color="text-warning" />
            <StatCard label="Failed" value={failedCount} icon={XCircle} color="text-destructive" />
          </div>

          {/* ── Config Reference ── */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" /> Recovery Limits & Cooldowns
              </h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Booking retries:</span>{" "}
                  <span className="font-semibold">{MAX_RETRIES.booking}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Dispatch retries:</span>{" "}
                  <span className="font-semibold">{MAX_RETRIES.dispatch}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Payment retries:</span>{" "}
                  <span className="font-semibold">{MAX_RETRIES.payment}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Cooldown:</span>{" "}
                  <span className="font-semibold">{COOLDOWN_MINUTES} min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Recent Events ── */}
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Healing Events</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Heart className="w-8 h-8 text-success mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">System Healthy</p>
                <p className="text-xs text-muted-foreground mt-1">No recovery actions needed</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {events.map(ev => (
                <HealingEventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// ── Event Card ──
function HealingEventCard({ event }: { event: HealingEvent }) {
  const statusCfg = STATUS_CFG[event.status] || STATUS_CFG.failed;
  const StatusIcon = statusCfg.icon;
  const EntityIcon = ENTITY_ICONS[event.entity_type] || Activity;
  const recoveryLabel = RECOVERY_TYPE_LABELS[event.recovery_type as HealingRecoveryType] || event.recovery_type;
  const ago = getRelativeTime(event.created_at);

  return (
    <Card className="border">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <EntityIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground truncate">{recoveryLabel}</span>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${statusCfg.color}`}>
                <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                {statusCfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Attempt #{event.attempt_number}</span>
              <span>•</span>
              <span>{event.entity_type}/{event.entity_id.slice(0, 8)}</span>
              <span>•</span>
              <span>{ago}</span>
            </div>
            {event.metadata?.reason && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">{event.metadata.reason}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Relative time helper ──
function getRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ══════════════════════════════════════════════════
// HEALING RECOVERY FUNCTIONS
// Safe, idempotent, cooldown-aware, retry-limited
// ══════════════════════════════════════════════════

async function checkCooldown(entityType: string, entityId: string, recoveryType: string): Promise<{ allowed: boolean; attempts: number }> {
  const { data } = await supabase
    .from("self_healing_events")
    .select("attempt_number, cooldown_until, status")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("recovery_type", recoveryType)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return { allowed: true, attempts: 0 };

  const last = data[0];
  // Check cooldown
  if (last.cooldown_until && new Date(last.cooldown_until) > new Date()) {
    return { allowed: false, attempts: last.attempt_number };
  }
  // Check if escalated
  if (last.status === "escalated") return { allowed: false, attempts: last.attempt_number };

  return { allowed: true, attempts: last.attempt_number };
}

async function logHealingEvent(
  entityType: HealingEntityType,
  entityId: string,
  recoveryType: HealingRecoveryType,
  attemptNumber: number,
  status: HealingStatus,
  metadata?: Record<string, any>,
) {
  const cooldownUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000).toISOString();
  await supabase.from("self_healing_events").insert({
    entity_type: entityType,
    entity_id: entityId,
    recovery_type: recoveryType,
    attempt_number: attemptNumber,
    status,
    cooldown_until: cooldownUntil,
    metadata: metadata || {},
  });
}

async function escalateToIncident(incidentType: string, description: string, triggerMetric: string) {
  // Check for existing open incident of same type (dedup)
  const { data: existing } = await supabase
    .from("incident_playbooks")
    .select("id")
    .eq("incident_type", incidentType)
    .in("status", ["open", "acknowledged", "in_progress"])
    .limit(1);

  if (existing && existing.length > 0) {
    // Just refresh last_detected_at
    await supabase.from("incident_playbooks")
      .update({ last_detected_at: new Date().toISOString() })
      .eq("id", existing[0].id);
    return;
  }

  await supabase.from("incident_playbooks").insert({
    incident_type: incidentType,
    severity: "critical",
    description,
    trigger_metric: triggerMetric,
    recommended_steps: JSON.stringify([
      "Review self-healing event log",
      "Investigate root cause",
      "Manual intervention may be required",
    ]),
    responsible_team: "Operations",
    status: "open",
  });
}

// ── 1: Stale Booking Reassignment ──
async function runStaleBookingHealing() {
  const cutoff = new Date(Date.now() - STALE_BOOKING_MINUTES * 60 * 1000).toISOString();
  const { data: staleBookings } = await supabase
    .from("bookings")
    .select("id, partner_id, status, dispatch_round")
    .in("status", ["assigned", "tech_en_route"])
    .lt("updated_at", cutoff)
    .limit(10);

  if (!staleBookings || staleBookings.length === 0) return;

  for (const booking of staleBookings) {
    const { allowed, attempts } = await checkCooldown("booking", booking.id, "stale_booking_reassignment");
    if (!allowed) {
      await logHealingEvent("booking", booking.id, "stale_booking_reassignment", attempts, "skipped_cooldown", { reason: "Cooldown active or already escalated" });
      continue;
    }

    const nextAttempt = attempts + 1;
    if (nextAttempt > MAX_RETRIES.booking) {
      await logHealingEvent("booking", booking.id, "stale_booking_reassignment", nextAttempt, "escalated", { reason: "Max retries exceeded" });
      await escalateToIncident("service_delivery_delay", `Booking ${booking.id.slice(0, 8)} stuck after ${MAX_RETRIES.booking} healing retries`, "staleBookingCount");
      continue;
    }

    try {
      // Clear partner and set to dispatch_retry
      await supabase.from("bookings").update({
        partner_id: null,
        status: "requested" as any,
        dispatch_status: "pending",
        dispatch_round: (booking.dispatch_round || 0) + 1,
      }).eq("id", booking.id);

      await supabase.from("job_timeline").insert({
        booking_id: booking.id,
        status: "dispatch_retry",
        actor: "system",
        note: `Self-healing: reassignment attempt #${nextAttempt}`,
        metadata: { healing: true, attempt: nextAttempt },
      });

      await logHealingEvent("booking", booking.id, "stale_booking_reassignment", nextAttempt, "success", { previous_partner: booking.partner_id });
    } catch (e: any) {
      await logHealingEvent("booking", booking.id, "stale_booking_reassignment", nextAttempt, "failed", { error: e.message });
    }
  }
}

// ── 2: Dispatch Offer Expiry Recovery ──
async function runExpiredDispatchHealing() {
  // Find bookings with all offers expired and no assignment
  const { data: expiredOffers } = await supabase
    .from("dispatch_offers")
    .select("booking_id")
    .eq("status", "expired")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!expiredOffers || expiredOffers.length === 0) return;

  // Get unique booking IDs
  const bookingIds = [...new Set(expiredOffers.map(o => o.booking_id))];

  for (const bookingId of bookingIds.slice(0, 5)) {
    // Check booking isn't already assigned
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, partner_id, dispatch_round")
      .eq("id", bookingId)
      .single();

    if (!booking || booking.partner_id || booking.status === "completed" || booking.status === "cancelled") continue;

    const { allowed, attempts } = await checkCooldown("dispatch", bookingId, "dispatch_offer_expiry");
    if (!allowed) continue;

    const nextAttempt = attempts + 1;
    if (nextAttempt > MAX_RETRIES.dispatch) {
      await logHealingEvent("dispatch", bookingId, "dispatch_offer_expiry", nextAttempt, "escalated", { reason: "Max dispatch retries exceeded" });
      await escalateToIncident("dispatch_reliability_degradation", `Dispatch for booking ${bookingId.slice(0, 8)} failed after ${MAX_RETRIES.dispatch} healing retries`, "dispatchAcceptRate");
      continue;
    }

    try {
      await supabase.from("bookings").update({
        dispatch_status: "pending",
        dispatch_round: (booking.dispatch_round || 0) + 1,
      }).eq("id", bookingId);

      await logHealingEvent("dispatch", bookingId, "dispatch_offer_expiry", nextAttempt, "success", { round: (booking.dispatch_round || 0) + 1 });
    } catch (e: any) {
      await logHealingEvent("dispatch", bookingId, "dispatch_offer_expiry", nextAttempt, "failed", { error: e.message });
    }
  }
}

// ── 3: Payment Retry Recovery ──
async function runPaymentRetryHealing() {
  const { data: failedPayments } = await supabase
    .from("payments")
    .select("id, booking_id, payment_status")
    .eq("payment_status", "failed")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!failedPayments || failedPayments.length === 0) return;

  for (const payment of failedPayments) {
    const { allowed, attempts } = await checkCooldown("payment", payment.id, "payment_retry");
    if (!allowed) continue;

    const nextAttempt = attempts + 1;
    if (nextAttempt > MAX_RETRIES.payment) {
      await logHealingEvent("payment", payment.id, "payment_retry", nextAttempt, "escalated", { reason: "Max payment retries exceeded" });
      await escalateToIncident("payment_gateway_instability", `Payment ${payment.id.slice(0, 8)} failed after ${MAX_RETRIES.payment} retries`, "paymentFailureCount");
      continue;
    }

    try {
      // Non-destructive: mark as pending for re-verification, never auto-charge
      await supabase.from("payments").update({
        payment_status: "pending" as any,
      }).eq("id", payment.id);

      await logHealingEvent("payment", payment.id, "payment_retry", nextAttempt, "success", { booking_id: payment.booking_id });
    } catch (e: any) {
      await logHealingEvent("payment", payment.id, "payment_retry", nextAttempt, "failed", { error: e.message });
    }
  }
}
