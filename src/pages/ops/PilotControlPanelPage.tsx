/**
 * Smart Ops Intervention Panel — LankaFix
 *
 * Live ops binding with:
 * - Queue state model (KPI cards → filtered views)
 * - Recommended action CTA bound to real backend functions
 * - Embedded recovery playbooks in action dialog
 * - Contact attempt logging
 * - Role-aware action rendering
 * - Intervention result tracking
 * - Analytics event hooks at every interaction point
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, RefreshCw, AlertTriangle, Clock, CheckCircle2, XCircle,
  Users, Activity, DollarSign, Star, Loader2, Wrench, MessageSquare,
  UserPlus, Send, FileText, TrendingUp, ChevronDown, Shield, Zap, Phone,
} from "lucide-react";
import {
  usePilotDaySummary, usePartnerSLA, usePilotKPIs,
  type StuckBooking, type OpsFilters,
} from "@/hooks/usePilotOps";
import { executeAction } from "@/hooks/useOpsActions";
import {
  getContextActions, RECOVERY_PLAYBOOKS, isActionAllowed, logOpsEvent,
  resolveCurrentOpsRole, resolveOpsQueue, QUEUE_LABELS,
  type RecoveryPlaybook, type OpsRole, type InterventionResult, type OpsQueue, type BookingActionContext,
} from "@/engines/interventionEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ── Hook: resolve current user's ops role via verified helper ──
function useOpsRole(): OpsRole {
  const [role, setRole] = useState<OpsRole>("operator");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user?.id) return;
      resolveCurrentOpsRole(data.user.id).then(setRole);
    });
  }, []);
  return role;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "MOBILE", label: "Mobile Repairs" },
  { value: "AC", label: "AC Services" },
  { value: "IT", label: "IT Support" },
  { value: "CCTV", label: "CCTV Solutions" },
  { value: "SOLAR", label: "Solar Solutions" },
  { value: "CONSUMER_ELEC", label: "Consumer Electronics" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "NETWORK", label: "Network/Internet" },
];

const ZONES = [
  { value: "", label: "All Zones" },
  { value: "COL-01", label: "Colombo 01-05" },
  { value: "COL-06", label: "Colombo 06-10" },
  { value: "COL-11", label: "Colombo 11-15" },
  { value: "DH", label: "Dehiwala" },
  { value: "MR", label: "Moratuwa" },
  { value: "NUG", label: "Nugegoda" },
];

// ── Hook: resolve current user's ops role ──
function useOpsRole(): OpsRole {
  const [role, setRole] = useState<OpsRole>("operator");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user?.id) return;
      supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" }).then(({ data: isAdmin }) => {
        if (isAdmin) setRole("admin");
      });
    });
  }, []);
  return role;
}

/* ── Stat Card (clickable KPI-to-queue) ── */
function StatCard({ label, value, icon: Icon, alert, active, onClick }: {
  label: string; value: number | string; icon: React.ElementType; alert?: boolean; active?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      className={`${alert ? "border-destructive/50 bg-destructive/5" : ""} ${active ? "ring-2 ring-primary" : ""} ${onClick ? "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all active:scale-[0.97]" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${alert ? "bg-destructive/10" : "bg-primary/10"}`}>
          <Icon size={16} className={alert ? "text-destructive" : "text-primary"} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Urgency Badge ── */
function UrgencyBadge({ urgency }: { urgency: string }) {
  const variants: Record<string, string> = {
    critical: "bg-destructive text-destructive-foreground",
    high: "bg-amber-500 text-white",
    medium: "bg-blue-500 text-white",
    low: "bg-muted text-muted-foreground",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${variants[urgency] || variants.medium}`}>{urgency}</span>;
}

/* ── Recovery Playbook Panel (inline in dialogs and rows) ── */
function PlaybookPanel({ playbookKey }: { playbookKey: string }) {
  const playbook: RecoveryPlaybook | undefined = RECOVERY_PLAYBOOKS[playbookKey];
  if (!playbook) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-primary hover:underline w-full">
        <FileText size={10} /> View Recovery Playbook <ChevronDown size={10} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1.5 pl-2 border-l-2 border-primary/20">
        <p className="text-[10px] font-semibold">{playbook.title}</p>
        {playbook.steps.map(s => (
          <div key={s.step} className="text-[10px]">
            <span className="font-medium text-primary">{s.step}.</span>{" "}
            <span className="font-medium">{s.action}</span>{" "}
            <span className="text-muted-foreground">— {s.detail}</span>
          </div>
        ))}
        <p className="text-[9px] text-amber-600 mt-1">⚠ {playbook.escalationNote}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── Stuck Booking Row with Recommended Action + Primary CTA ── */
function StuckRow({ b, onAction }: { b: StuckBooking; onAction: () => void }) {
  return (
    <TableRow className={b.severity === "critical" ? "bg-destructive/5" : "bg-amber-500/5"}>
      <TableCell className="text-xs font-mono">{b.id.slice(0, 8)}</TableCell>
      <TableCell><Badge variant="outline" className="text-[10px]">{b.category_code}</Badge></TableCell>
      <TableCell><Badge variant="outline" className="text-[10px]">{b.status}</Badge></TableCell>
      <TableCell className="text-xs">{b.minutes_stuck}m</TableCell>
      <TableCell>
        <Badge variant={b.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">
          {b.severity}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-1 flex-wrap">
            <Zap size={10} className="text-primary shrink-0" />
            <span className="text-[10px] font-medium text-primary">{b.recommended.label}</span>
            <UrgencyBadge urgency={b.recommended.urgency} />
          </div>
          <p className="text-[9px] text-muted-foreground leading-tight">{b.recommended.explanation}</p>
          <PlaybookPanel playbookKey={b.recommended.playbookKey} />
        </div>
      </TableCell>
      <TableCell>
        <Button size="sm" variant="default" className="h-7 text-[10px] px-2" onClick={onAction}>
          <Wrench size={10} className="mr-1" /> Act
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ── Status-Aware Action Dialog with live execution, playbook, role checks ── */
function SmartActionDialog({ bookingId, status, recommended, userRole, onDone }: {
  bookingId: string; status: string; recommended?: StuckBooking["recommended"]; userRole: OpsRole; onDone: (result?: InterventionResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [lastResult, setLastResult] = useState<InterventionResult | null>(null);

  // Build real booking context — never hardcode
  const bookingCtx: import("@/engines/interventionEngine").BookingActionContext = {
    hasPartner: !!recommended && ["reassign_partner", "resend_assignment", "contact_partner_progress"].includes(recommended.action),
    lowRating: !!recommended && recommended.action === "open_quality_recovery",
  };
  const contextActions = getContextActions(status, bookingCtx);

  const needsPartnerId = (key: string) => key === "assign" || key === "reassign";
  const needsReason = (key: string) => ["escalate", "cancel", "remind_customer"].includes(key);
  const needsNote = (key: string) => key === "note" || key === "payment_followup";

  const run = async (actionKey: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (needsPartnerId(actionKey)) params.partnerId = partnerId;
      if (needsReason(actionKey)) params.reason = reason;
      if (needsNote(actionKey)) params.note = note;
      if (actionKey === "verify_payment") params.method = "cash_collected";

      const result = await executeAction(actionKey, bookingId, params);
      setLastResult(result);

      // Log intervention result for analytics
      logOpsEvent("intervention_marked_resolved", bookingId, { action_key: actionKey, result });

      onDone(result);
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
    setLoading(false);
  };

  // Show the playbook for the recommended action at the top of the dialog
  const playbookKey = recommended?.playbookKey;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-mono text-muted-foreground">Booking: {bookingId.slice(0, 12)}…</p>
        <Badge variant="outline" className="text-[10px]">{status}</Badge>
        {lastResult && (
          <Badge variant={lastResult === "resolved" ? "default" : "secondary"} className="text-[9px]">
            Result: {lastResult}
          </Badge>
        )}
      </div>

      {/* Recommended action highlight */}
      {recommended && (
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-primary" />
            <span className="text-xs font-semibold text-primary">{recommended.label}</span>
            <UrgencyBadge urgency={recommended.urgency} />
          </div>
          <p className="text-[10px] text-muted-foreground">{recommended.explanation}</p>
        </div>
      )}

      {/* Inline playbook for the recommended action */}
      {playbookKey && (
        <div className="border rounded-lg p-2 bg-muted/30">
          <PlaybookPanel playbookKey={playbookKey} />
        </div>
      )}

      {/* Input fields — only show relevant ones */}
      {contextActions.some(a => needsPartnerId(a.key)) && (
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Partner ID</label>
          <Input placeholder="Partner UUID" value={partnerId} onChange={e => setPartnerId(e.target.value)} className="text-xs h-8" />
        </div>
      )}
      {contextActions.some(a => needsReason(a.key)) && (
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reason</label>
          <Input placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} className="text-xs h-8" />
        </div>
      )}
      {contextActions.some(a => needsNote(a.key)) && (
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ops Note</label>
          <Textarea placeholder="Internal note…" value={note} onChange={e => setNote(e.target.value)} className="text-xs min-h-[50px]" />
        </div>
      )}

      <Separator />

      {/* Action buttons — role-aware, recommended highlighted */}
      <div className="grid grid-cols-1 gap-1.5">
        {contextActions.map(ca => {
          const allowed = isActionAllowed(ca.key, userRole);
          const disabled = loading
            || !allowed
            || (needsPartnerId(ca.key) && !partnerId)
            || (needsReason(ca.key) && !reason && ca.key !== "remind_customer")
            || (needsNote(ca.key) && !note);

          return (
            <Button
              key={ca.key}
              size="sm"
              variant={ca.variant === "destructive" ? "destructive" : ca.variant === "success" ? "default" : "outline"}
              className={`h-8 text-xs justify-start ${ca.isPrimary ? "ring-1 ring-primary font-semibold" : ""} ${ca.variant === "warning" ? "text-amber-600 border-amber-500/30 hover:bg-amber-500/10" : ""}`}
              disabled={disabled}
              onClick={() => run(ca.key)}
              title={!allowed ? `Requires ${ca.key === "cancel" ? "admin" : "higher"} role` : undefined}
            >
              {loading && <Loader2 size={10} className="mr-1 animate-spin" />}
              {ca.isPrimary && <Zap size={10} className="mr-1" />}
              {ca.label}
              {ca.isPrimary && <span className="ml-auto text-[9px] opacity-60">Recommended</span>}
              {!allowed && <span className="ml-auto text-[9px] opacity-50">🔒</span>}
            </Button>
          );
        })}

        {/* Contact actions — always available for ops */}
        <Separator className="my-1" />
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={() => run("call_customer")}>
            <Phone size={10} className="mr-1" /> Call Customer
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={() => run("call_partner")}>
            <Phone size={10} className="mr-1" /> Call Partner
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Partner SLA Table ── */
function PartnerSLATable({ filters }: { filters: OpsFilters }) {
  const { data, isLoading } = usePartnerSLA(filters);
  if (isLoading) return <Loader2 className="animate-spin mx-auto my-4" size={16} />;
  if (!data?.length) return <p className="text-xs text-muted-foreground text-center py-4">No partner offer data</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-[10px]">Partner</TableHead>
          <TableHead className="text-[10px]">Offers</TableHead>
          <TableHead className="text-[10px]">Accepted</TableHead>
          <TableHead className="text-[10px]">Rate</TableHead>
          <TableHead className="text-[10px]">Avg Resp</TableHead>
          <TableHead className="text-[10px]">Expired</TableHead>
          <TableHead className="text-[10px]">Low Ratings</TableHead>
          <TableHead className="text-[10px]">Risk</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(p => {
          const isRisky = p.acceptance_rate < 40 || p.low_rating_count > 0 || p.offers_expired > 2;
          return (
            <TableRow key={p.partner_id} className={isRisky ? "bg-amber-500/5" : ""}>
              <TableCell className="text-xs">{p.partner_name}</TableCell>
              <TableCell className="text-xs">{p.offers_received}</TableCell>
              <TableCell className="text-xs">{p.offers_accepted}</TableCell>
              <TableCell>
                <Badge variant={p.acceptance_rate < 40 ? "destructive" : "secondary"} className="text-[10px]">
                  {p.acceptance_rate}%
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{p.avg_response_time_sec != null ? `${p.avg_response_time_sec}s` : "—"}</TableCell>
              <TableCell className="text-xs">{p.offers_expired}</TableCell>
              <TableCell className="text-xs">{p.low_rating_count || 0}</TableCell>
              <TableCell>
                {isRisky ? (
                  <Badge variant="destructive" className="text-[9px]"><AlertTriangle size={8} className="mr-0.5" />Attention</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[9px]"><CheckCircle2 size={8} className="mr-0.5" />OK</Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/* ── KPI Cards — click routes to filtered queue ── */
function KPISection({ filters, onQueueChange }: { filters: OpsFilters; onQueueChange: (q: OpsQueue) => void }) {
  const { data: kpi, isLoading } = usePilotKPIs(filters);
  if (isLoading || !kpi) return <Loader2 className="animate-spin mx-auto my-4" size={16} />;
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard label="Bookings/Day" value={kpi.bookingsPerDay} icon={TrendingUp} />
      <StatCard label="Assign Rate" value={`${kpi.assignmentSuccessRate}%`} icon={Users} alert={kpi.assignmentSuccessRate < 50} />
      <StatCard label="Avg Response" value={kpi.avgResponseTimeSec != null ? `${kpi.avgResponseTimeSec}s` : "—"} icon={Clock} />
      <StatCard label="Quote Approval" value={`${kpi.quoteApprovalRate}%`} icon={FileText}
        onClick={() => { onQueueChange("quote_pending"); logOpsEvent("kpi_queue_opened", "", { queue: "quote_pending" }); }} />
      <StatCard label="Completion" value={`${kpi.completionRate}%`} icon={CheckCircle2} />
      <StatCard label="Avg Time" value={kpi.avgCompletionTimeHrs != null ? `${kpi.avgCompletionTimeHrs}h` : "—"} icon={Clock} />
      <StatCard label="Payment Rate" value={`${kpi.paymentCollectionRate}%`} icon={DollarSign} alert={kpi.paymentCollectionRate < 50}
        onClick={() => { onQueueChange("payment_pending"); logOpsEvent("kpi_queue_opened", "", { queue: "payment_pending" }); }} />
      <StatCard label="Rating Avg" value={kpi.ratingAverage ?? "—"} icon={Star} />
      <StatCard label="Escalations" value={kpi.escalationCount} icon={AlertTriangle} alert={kpi.escalationCount > 0}
        onClick={() => { onQueueChange("escalated"); logOpsEvent("kpi_queue_opened", "", { queue: "escalated" }); }} />
    </div>
  );
}

/* ── Filter Bar ── */
function FilterBar({ filters, onChange, activeQueue, onQueueChange }: {
  filters: OpsFilters; onChange: (f: OpsFilters) => void; activeQueue: OpsQueue; onQueueChange: (q: OpsQueue) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Select value={filters.category || ""} onValueChange={v => onChange({ ...filters, category: v || undefined })}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value || "all"} className="text-xs">{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.zone || ""} onValueChange={v => onChange({ ...filters, zone: v || undefined })}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            {ZONES.map(z => <SelectItem key={z.value} value={z.value || "all"} className="text-xs">{z.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.dateRange} onValueChange={v => onChange({ ...filters, dateRange: v as OpsFilters["dateRange"] })}>
          <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today" className="text-xs">Today</SelectItem>
            <SelectItem value="week" className="text-xs">This Week</SelectItem>
            <SelectItem value="month" className="text-xs">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.severity || "all"} onValueChange={v => onChange({ ...filters, severity: v as OpsFilters["severity"] })}>
          <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Severity</SelectItem>
            <SelectItem value="warning" className="text-xs">Warning</SelectItem>
            <SelectItem value="critical" className="text-xs">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Queue tabs — quick-switch between operational views */}
      <ScrollArea className="w-full">
        <div className="flex gap-1 pb-1">
          {(Object.keys(QUEUE_LABELS) as OpsQueue[]).map(q => (
            <Button
              key={q}
              size="sm"
              variant={activeQueue === q ? "default" : "ghost"}
              className="h-6 text-[10px] px-2 shrink-0"
              onClick={() => onQueueChange(q)}
            >
              {QUEUE_LABELS[q]}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ── Main Page ── */
export default function PilotControlPanelPage() {
  const navigate = useNavigate();
  const userRole = useOpsRole();
  const [filters, setFilters] = useState<OpsFilters>({ dateRange: "today" });
  const [activeQueue, setActiveQueue] = useState<OpsQueue>("all");
  const { data: summary, isLoading, refetch } = usePilotDaySummary(filters);
  const [actionBooking, setActionBooking] = useState<{ id: string; status: string; recommended?: StuckBooking["recommended"] } | null>(null);

  // KPI queue routing handler
  const handleQueueChange = useCallback((q: OpsQueue) => {
    setActiveQueue(q);
    logOpsEvent("kpi_queue_opened", "", { queue: q });
  }, []);

  // Filter stuck bookings by active queue
  const filteredStuck = summary?.stuckBookings.filter(b => {
    if (activeQueue === "all" || activeQueue === "stuck") return true;
    if (activeQueue === "unassigned") return !b.partner_id && !["completed", "cancelled"].includes(b.status);
    if (activeQueue === "pending_partner_response") return b.status === "awaiting_partner_confirmation";
    if (activeQueue === "quote_pending") return b.status === "quote_submitted";
    if (activeQueue === "payment_pending") return b.status === "payment_pending";
    if (activeQueue === "in_progress") return ["in_progress", "repair_started", "tech_en_route"].includes(b.status);
    if (activeQueue === "low_rated") return b.recommended.action === "open_quality_recovery";
    if (activeQueue === "escalated") return b.status === "escalated";
    return true;
  }) || [];

  // Determine which day summary counts to highlight based on queue
  const shouldShowStuck = activeQueue === "all" || activeQueue === "stuck" || filteredStuck.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ops")}><ArrowLeft size={16} /></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Shield size={18} className="text-primary" /> Smart Ops Control
          </h1>
          <p className="text-[10px] text-muted-foreground">
            {filters.category || "All Categories"} · {filters.zone || "All Zones"} · {filters.dateRange}
            {activeQueue !== "all" && <> · <span className="text-primary font-medium">Queue: {QUEUE_LABELS[activeQueue]}</span></>}
            {" "}· Role: <span className="font-medium">{userRole}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
          <RefreshCw size={12} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Filters + Queue Tabs */}
      <FilterBar filters={filters} onChange={setFilters} activeQueue={activeQueue} onQueueChange={handleQueueChange} />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={24} /></div>
      ) : summary ? (
        <>
          {/* Day Summary Cards — KPI-to-queue routing */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <StatCard label="Created" value={summary.created} icon={Activity} active={activeQueue === "all"} onClick={() => handleQueueChange("all")} />
            <StatCard label="Unassigned" value={summary.unassigned} icon={Users}
              alert={summary.unassigned > 0} active={activeQueue === "unassigned"}
              onClick={() => handleQueueChange("unassigned")} />
            <StatCard label="Pending Response" value={summary.pendingPartnerResponse} icon={Clock}
              alert={summary.pendingPartnerResponse > 3} active={activeQueue === "pending_partner_response"}
              onClick={() => handleQueueChange("pending_partner_response")} />
            <StatCard label="Quote Pending" value={summary.pendingQuoteApproval} icon={FileText}
              active={activeQueue === "quote_pending"} onClick={() => handleQueueChange("quote_pending")} />
            <StatCard label="In Progress" value={summary.activeInProgress} icon={Wrench}
              active={activeQueue === "in_progress"} onClick={() => handleQueueChange("in_progress")} />
            <StatCard label="Completed" value={summary.completedToday} icon={CheckCircle2}
              active={activeQueue === "completed_today"} onClick={() => handleQueueChange("completed_today")} />
            <StatCard label="Cancelled" value={summary.cancelledToday} icon={XCircle}
              alert={summary.cancelledToday > 2} active={activeQueue === "cancelled_today"}
              onClick={() => handleQueueChange("cancelled_today")} />
            <StatCard label="Payment Pending" value={summary.paymentPending} icon={DollarSign}
              alert={summary.paymentPending > 0} active={activeQueue === "payment_pending"}
              onClick={() => handleQueueChange("payment_pending")} />
            <StatCard label="Low Rated" value={summary.lowRated} icon={Star}
              alert={summary.lowRated > 0} active={activeQueue === "low_rated"}
              onClick={() => handleQueueChange("low_rated")} />
            <StatCard label="Escalations" value={summary.escalations} icon={AlertTriangle}
              alert={summary.escalations > 0} active={activeQueue === "escalated"}
              onClick={() => handleQueueChange("escalated")} />
          </div>

          {/* Stuck/Filtered Bookings with Live Recommended Actions */}
          {shouldShowStuck && filteredStuck.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle size={14} />
                  {activeQueue !== "all" && activeQueue !== "stuck"
                    ? `${QUEUE_LABELS[activeQueue]} (${filteredStuck.length})`
                    : `Stuck Bookings (${filteredStuck.length})`
                  }
                  — Smart Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">ID</TableHead>
                        <TableHead className="text-[10px]">Category</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                        <TableHead className="text-[10px]">Age</TableHead>
                        <TableHead className="text-[10px]">Severity</TableHead>
                        <TableHead className="text-[10px]">Recommended Action</TableHead>
                        <TableHead className="text-[10px]">Act</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStuck.map(b => (
                        <StuckRow
                          key={b.id}
                          b={b}
                          onAction={() => setActionBooking({ id: b.id, status: b.status, recommended: b.recommended })}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {shouldShowStuck && filteredStuck.length === 0 && activeQueue !== "all" && (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No items in {QUEUE_LABELS[activeQueue]} queue</p>
              </CardContent>
            </Card>
          )}

          {/* Weekly KPIs — with queue routing */}
          <Card>
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={14} /> KPIs</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <KPISection filters={{ ...filters, dateRange: "week" }} onQueueChange={handleQueueChange} />
            </CardContent>
          </Card>

          {/* Partner SLA */}
          <Card>
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><Users size={14} /> Partner SLA & Risk</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <PartnerSLATable filters={filters} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Smart Action Dialog — live execution with playbook + role checks */}
      <Dialog open={!!actionBooking} onOpenChange={o => { if (!o) setActionBooking(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Zap size={14} className="text-primary" /> Smart Intervention
            </DialogTitle>
          </DialogHeader>
          {actionBooking && (
            <SmartActionDialog
              bookingId={actionBooking.id}
              status={actionBooking.status}
              recommended={actionBooking.recommended}
              userRole={userRole}
              onDone={(result) => {
                setActionBooking(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
