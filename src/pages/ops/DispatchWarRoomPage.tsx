import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shield } from "lucide-react";
import DispatchMetricsBar from "@/components/warroom/DispatchMetricsBar";
import EmergencyQueuePanel from "@/components/warroom/EmergencyQueuePanel";
import DispatchJobTable, { type DispatchJob } from "@/components/warroom/DispatchJobTable";
import OfferInspectorPanel from "@/components/warroom/OfferInspectorPanel";
import MultiTechTeamPanel from "@/components/warroom/MultiTechTeamPanel";
import TechnicianSupplyMonitor from "@/components/warroom/TechnicianSupplyMonitor";
import TechnicianPerformanceCard from "@/components/warroom/TechnicianPerformanceCard";
import DispatchTimelineViewer from "@/components/warroom/DispatchTimelineViewer";
import OpsControlPanel from "@/components/warroom/OpsControlPanel";
import DispatchFailurePanel from "@/components/warroom/DispatchFailurePanel";
import AIOperatorCopilot from "@/components/ai/AIOperatorCopilot";
import OperatorReviewSummaryPanel from "@/components/ops/OperatorReviewSummaryPanel";
import PartnerShortlistReviewPanel, { type PartnerCandidate } from "@/components/ops/PartnerShortlistReviewPanel";

interface BookingRaw {
  id: string;
  category_code: string;
  zone_code: string | null;
  dispatch_mode: string | null;
  dispatch_round: number | null;
  dispatch_status: string | null;
  status: string;
  is_emergency: boolean | null;
  created_at: string;
  partner_id: string | null;
}

interface PartnerRaw {
  id: string;
  full_name: string;
  availability_status: string;
  current_job_count: number | null;
  max_concurrent_jobs: number | null;
  active_job_id: string | null;
  categories_supported?: string[];
  service_zones?: string[];
  rating_average?: number | null;
  completed_jobs_count?: number | null;
  business_name?: string | null;
}

interface EscalationRaw {
  id: string;
  booking_id: string;
  reason: string;
  dispatch_rounds_attempted: number | null;
  created_at: string;
  resolved_at: string | null;
}

interface OfferCountRow {
  booking_id: string;
  status: string;
  dispatch_score: number | null;
  offer_mode: string;
}

const DISPATCH_PIPELINE_STATUSES = [
  "dispatching", "pending_acceptance", "escalated", "no_provider_found",
  "accepted", "ops_confirmed", "team_assigned",
];

export default function DispatchWarRoomPage() {
  const [bookings, setBookings] = useState<BookingRaw[]>([]);
  const [partners, setPartners] = useState<PartnerRaw[]>([]);
  const [escalations, setEscalations] = useState<EscalationRaw[]>([]);
  const [offerCounts, setOfferCounts] = useState<OfferCountRow[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bkRes, ptRes, escRes, offRes] = await Promise.all([
      supabase.from("bookings")
        .select("id, category_code, zone_code, dispatch_mode, dispatch_round, dispatch_status, status, is_emergency, created_at, partner_id")
        .in("dispatch_status", DISPATCH_PIPELINE_STATUSES)
        .neq("booking_source", "pilot_simulation")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("partners")
        .select("id, full_name, availability_status, current_job_count, max_concurrent_jobs, active_job_id, categories_supported, service_zones, rating_average, completed_jobs_count, business_name"),
      supabase.from("dispatch_escalations")
        .select("id, booking_id, reason, dispatch_rounds_attempted, created_at, resolved_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("dispatch_offers")
        .select("booking_id, status, dispatch_score, offer_mode")
        .in("status", ["pending", "accepted", "declined", "expired", "expired_by_accept"]),
    ]);

    setBookings((bkRes.data || []) as BookingRaw[]);
    setPartners((ptRes.data || []) as PartnerRaw[]);
    setEscalations((escRes.data || []) as EscalationRaw[]);
    setOfferCounts((offRes.data || []) as OfferCountRow[]);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 5000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // Realtime subscriptions
  useEffect(() => {
    const chan = supabase
      .channel("war-room-dispatch")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_offers" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "partners" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dispatch_escalations" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, [fetchAll]);

  // ── Derived data ──
  const emergencyBookings = bookings.filter(b => b.is_emergency);

  // Build offer stats per booking
  const offerStats = useMemo(() => {
    const map: Record<string, { pending: number; accepted: number; total: number; topScore: number | null; hasParallel: boolean; hasMultiTech: boolean }> = {};
    offerCounts.forEach(o => {
      if (!map[o.booking_id]) map[o.booking_id] = { pending: 0, accepted: 0, total: 0, topScore: null, hasParallel: false, hasMultiTech: false };
      const entry = map[o.booking_id];
      entry.total++;
      if (o.status === "pending") entry.pending++;
      if (o.status === "accepted") entry.accepted++;
      if (o.dispatch_score && (entry.topScore === null || o.dispatch_score > entry.topScore)) entry.topScore = o.dispatch_score;
      if (o.offer_mode === "parallel") entry.hasParallel = true;
      if (o.offer_mode === "multi_tech") entry.hasMultiTech = true;
    });
    return map;
  }, [offerCounts]);

  const dispatchJobs: DispatchJob[] = bookings.map(b => {
    const stats = offerStats[b.id] || { pending: 0, accepted: 0, total: 0, topScore: null };
    return {
      id: b.id,
      category_code: b.category_code,
      zone_code: b.zone_code,
      dispatch_mode: b.dispatch_mode,
      dispatch_round: b.dispatch_round,
      dispatch_status: b.dispatch_status,
      status: b.status,
      is_emergency: b.is_emergency,
      created_at: b.created_at,
      partner_id: b.partner_id,
      pending_offers: stats.pending,
      accepted_offers: stats.accepted,
      total_offers: stats.total,
      top_score: stats.topScore,
    };
  });

  // Partner metrics
  const supply = useMemo(() => ({
    available: partners.filter(p => p.availability_status === "online" || p.availability_status === "available").length,
    busy: partners.filter(p => p.availability_status === "busy").length,
    offline: partners.filter(p => p.availability_status === "offline").length,
    in_dispatch: partners.filter(p => (p.current_job_count || 0) > 0).length,
  }), [partners]);

  const lockedPartners = useMemo(() =>
    partners
      .filter(p => p.availability_status === "busy" || (p.current_job_count || 0) > 0)
      .map(p => ({
        partner_id: p.id,
        name: p.full_name,
        current_jobs: p.current_job_count || 0,
        max_jobs: p.max_concurrent_jobs || 1,
        active_job_id: p.active_job_id,
      })),
  [partners]);

  // Metrics bar values
  const activeDispatch = bookings.filter(b => b.dispatch_status === "dispatching").length;
  const awaitingAcceptance = bookings.filter(b => b.dispatch_status === "pending_acceptance").length;
  const parallelRaces = Object.values(offerStats).filter(s => s.hasParallel && s.pending > 1).length;
  const multiTechJobs = Object.values(offerStats).filter(s => s.hasMultiTech).length;
  const escalatedCount = bookings.filter(b => b.dispatch_status === "escalated").length;

  // Avg dispatch time from accepted offers
  const acceptedOfferBookings = bookings.filter(b => ["accepted", "ops_confirmed", "team_assigned"].includes(b.dispatch_status || ""));
  const avgDispatchTimeSec = acceptedOfferBookings.length > 0
    ? Math.round(acceptedOfferBookings.reduce((s, b) => {
        const age = (Date.now() - new Date(b.created_at).getTime()) / 1000;
        return s + Math.min(age, 300);
      }, 0) / acceptedOfferBookings.length)
    : 0;

  const totalDispatch = bookings.length;
  const acceptedCount = acceptedOfferBookings.length;
  const successRate = totalDispatch > 0 ? Math.round((acceptedCount / totalDispatch) * 100) : 100;

  // Selected booking details
  const selectedBooking = bookings.find(b => b.id === selectedBookingId);
  const selectedPartnerId = selectedBooking?.partner_id || null;

  // SLA breach detection
  const slaBreaches = bookings.filter(b => {
    const ageMin = (Date.now() - new Date(b.created_at).getTime()) / 60000;
    return ageMin > 1 && ["dispatching", "pending_acceptance"].includes(b.dispatch_status || "");
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-2 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h1 className="font-heading font-bold text-base">Dispatch War Room</h1>
          <Badge variant="outline" className="text-[10px]">LIVE</Badge>
          {slaBreaches.length > 0 && (
            <Badge className="bg-destructive/10 text-destructive text-[10px] animate-pulse">
              ⚠ {slaBreaches.length} SLA Breach{slaBreaches.length > 1 ? "es" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {lastRefresh.toLocaleTimeString()}
          </span>
          <Button variant="ghost" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </header>

      <div className="p-3 space-y-3">
        {/* Section 1: Metrics Bar */}
        <DispatchMetricsBar
          activeDispatch={activeDispatch}
          awaitingAcceptance={awaitingAcceptance}
          parallelRaces={parallelRaces}
          multiTechJobs={multiTechJobs}
          escalated={escalatedCount}
          avgDispatchTimeSec={avgDispatchTimeSec}
          successRate={successRate}
          activeTechnicians={supply.available + supply.busy}
          availableTechnicians={supply.available}
          busyTechnicians={supply.busy}
          offlineTechnicians={supply.offline}
        />

        {/* Section 2: Emergency Queue */}
        <EmergencyQueuePanel bookings={emergencyBookings} onSelect={setSelectedBookingId} />

        {/* Section 12: Dispatch Failures */}
        <DispatchFailurePanel escalations={escalations} />

        {/* Main content: Table + Right Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Section 3: Dispatch Table */}
          <div className="lg:col-span-2">
            <DispatchJobTable
              jobs={dispatchJobs}
              selectedId={selectedBookingId}
              onSelect={setSelectedBookingId}
            />
          </div>

          {/* Right Panel: Inspector + Controls */}
          <div className="space-y-3">
            {/* Section 4: Offer Inspector */}
            <OfferInspectorPanel bookingId={selectedBookingId} />

            {/* Section 8: Technician Performance */}
            <TechnicianPerformanceCard partnerId={selectedPartnerId} />

            {/* Section 6: Multi-Tech Team */}
            <MultiTechTeamPanel
              bookingId={selectedBookingId}
              categoryCode={selectedBooking?.category_code || ""}
            />

            {/* Section 13: Ops Controls */}
            <OpsControlPanel
              bookingId={selectedBookingId}
              currentRound={selectedBooking?.dispatch_round || 1}
            />

            {/* AI Operator Advisory — strictly informational */}
            {selectedBookingId && (
              <AIOperatorCopilot
                bookingId={selectedBookingId}
                className="mt-3"
              />
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Section 5: Dispatch Timeline */}
          <div className="lg:col-span-2">
            <DispatchTimelineViewer bookingId={selectedBookingId} />
          </div>

          {/* Section 7 & 9: Supply + Lock Monitor */}
          <TechnicianSupplyMonitor supply={supply} lockedPartners={lockedPartners} />
        </div>
      </div>
    </div>
  );
}
