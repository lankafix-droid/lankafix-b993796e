/**
 * Smart Ops Intervention Panel — LankaFix
 *
 * Scalable pilot/category/zone control panel with:
 * - Category-aware stuck detection
 * - Recommended actions per stuck booking
 * - Guided recovery playbooks
 * - Status-aware action dialogs
 * - KPI-to-action linking
 * - Low-rating recovery queue
 * - Escalation visibility
 * - Daily shift summary
 */
import { useState, useCallback } from "react";
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
import {
  opsReassignPartner, opsEscalateBooking, opsCancelBooking,
  opsVerifyPayment, opsResendAssignment, opsAddNote,
  opsOpenQualityRecovery, opsRemindCustomer,
} from "@/hooks/useOpsActions";
import {
  getContextActions, RECOVERY_PLAYBOOKS,
  type RecommendedAction, type RecoveryPlaybook,
} from "@/engines/interventionEngine";

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

/* ── Stat Card (clickable KPI-to-action) ── */
function StatCard({ label, value, icon: Icon, alert, onClick }: {
  label: string; value: number | string; icon: React.ElementType; alert?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      className={`${alert ? "border-destructive/50 bg-destructive/5" : ""} ${onClick ? "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" : ""}`}
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

/* ── Recovery Playbook Panel ── */
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

/* ── Stuck Booking Row with Recommended Action ── */
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
          <div className="flex items-center gap-1">
            <Zap size={10} className="text-primary shrink-0" />
            <span className="text-[10px] font-medium text-primary">{b.recommended.label}</span>
            <UrgencyBadge urgency={b.recommended.urgency} />
          </div>
          <p className="text-[9px] text-muted-foreground leading-tight">{b.recommended.explanation}</p>
          <PlaybookPanel playbookKey={b.recommended.playbookKey} />
        </div>
      </TableCell>
      <TableCell>
        <Button size="sm" variant="default" className="h-6 text-[10px]" onClick={onAction}>
          <Wrench size={10} className="mr-1" /> Act
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ── Status-Aware Booking Action Dialog ── */
function SmartActionDialog({ bookingId, status, onDone }: {
  bookingId: string; status: string; onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const contextActions = getContextActions(status, false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); onDone(); } catch { /* toast handled */ }
    setLoading(false);
  };

  const actionHandlers: Record<string, () => Promise<void>> = {
    assign: () => opsReassignPartner(bookingId, partnerId),
    reassign: () => opsReassignPartner(bookingId, partnerId),
    resend: () => opsResendAssignment(bookingId),
    escalate: () => opsEscalateBooking(bookingId, reason || "Ops escalation"),
    cancel: () => opsCancelBooking(bookingId, reason || "Ops cancellation"),
    verify_payment: () => opsVerifyPayment(bookingId, "cash_collected"),
    note: () => opsAddNote(bookingId, note),
    remind_customer: () => opsRemindCustomer(bookingId, reason || "Quote/payment reminder"),
    quality_recovery: () => opsOpenQualityRecovery(bookingId, 0),
  };

  const needsPartnerId = (key: string) => key === "assign" || key === "reassign";
  const needsReason = (key: string) => ["escalate", "cancel", "remind_customer"].includes(key);
  const needsNote = (key: string) => key === "note";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-mono text-muted-foreground">Booking: {bookingId.slice(0, 12)}…</p>
        <Badge variant="outline" className="text-[10px]">{status}</Badge>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Available actions for <strong>{status}</strong> state:
      </p>

      {/* Partner ID input for assign/reassign actions */}
      {contextActions.some(a => needsPartnerId(a.key)) && (
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Partner ID</label>
          <Input placeholder="Partner UUID" value={partnerId} onChange={e => setPartnerId(e.target.value)} className="text-xs h-8" />
        </div>
      )}

      {/* Reason input */}
      {contextActions.some(a => needsReason(a.key)) && (
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reason</label>
          <Input placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} className="text-xs h-8" />
        </div>
      )}

      {/* Note input */}
      {contextActions.some(a => needsNote(a.key)) && (
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ops Note</label>
          <Textarea placeholder="Internal note…" value={note} onChange={e => setNote(e.target.value)} className="text-xs min-h-[50px]" />
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-1 gap-1.5">
        {contextActions.map(ca => {
          const disabled = loading
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
              onClick={() => {
                const handler = actionHandlers[ca.key];
                if (handler) run(handler);
              }}
            >
              {ca.isPrimary && <Zap size={10} className="mr-1" />}
              {ca.label}
              {ca.isPrimary && <span className="ml-auto text-[9px] opacity-60">Recommended</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Partner SLA Table (expanded) ── */
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

/* ── KPI Cards with click-to-filter ── */
function KPISection({ filters, onFilterChange }: { filters: OpsFilters; onFilterChange: (update: Partial<OpsFilters>) => void }) {
  const { data: kpi, isLoading } = usePilotKPIs(filters);
  if (isLoading || !kpi) return <Loader2 className="animate-spin mx-auto my-4" size={16} />;
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard label="Bookings/Day" value={kpi.bookingsPerDay} icon={TrendingUp} />
      <StatCard label="Assign Rate" value={`${kpi.assignmentSuccessRate}%`} icon={Users} alert={kpi.assignmentSuccessRate < 50} />
      <StatCard label="Avg Response" value={kpi.avgResponseTimeSec != null ? `${kpi.avgResponseTimeSec}s` : "—"} icon={Clock} />
      <StatCard label="Quote Approval" value={`${kpi.quoteApprovalRate}%`} icon={FileText} />
      <StatCard label="Completion" value={`${kpi.completionRate}%`} icon={CheckCircle2} />
      <StatCard label="Avg Time" value={kpi.avgCompletionTimeHrs != null ? `${kpi.avgCompletionTimeHrs}h` : "—"} icon={Clock} />
      <StatCard label="Payment Rate" value={`${kpi.paymentCollectionRate}%`} icon={DollarSign} alert={kpi.paymentCollectionRate < 50} />
      <StatCard label="Rating Avg" value={kpi.ratingAverage ?? "—"} icon={Star} />
      <StatCard label="Escalations" value={kpi.escalationCount} icon={AlertTriangle} alert={kpi.escalationCount > 0} />
    </div>
  );
}

/* ── Filter Bar ── */
function FilterBar({ filters, onChange }: { filters: OpsFilters; onChange: (f: OpsFilters) => void }) {
  return (
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
  );
}

/* ── Main Page ── */
export default function PilotControlPanelPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<OpsFilters>({ dateRange: "today" });
  const { data: summary, isLoading, refetch } = usePilotDaySummary(filters);
  const [actionBooking, setActionBooking] = useState<{ id: string; status: string } | null>(null);

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
            Intervention Engine — {filters.category || "All Categories"} · {filters.zone || "All Zones"} · {filters.dateRange}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
          <RefreshCw size={12} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={24} /></div>
      ) : summary ? (
        <>
          {/* Day Summary Cards — clickable KPI-to-action */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <StatCard label="Created" value={summary.created} icon={Activity} />
            <StatCard label="Unassigned" value={summary.unassigned} icon={Users}
              alert={summary.unassigned > 0}
              onClick={summary.unassigned > 0 ? () => setFilters(f => ({ ...f, severity: "all" })) : undefined} />
            <StatCard label="Pending Response" value={summary.pendingPartnerResponse} icon={Clock} alert={summary.pendingPartnerResponse > 3} />
            <StatCard label="Quote Pending" value={summary.pendingQuoteApproval} icon={FileText} />
            <StatCard label="In Progress" value={summary.activeInProgress} icon={Wrench} />
            <StatCard label="Completed" value={summary.completedToday} icon={CheckCircle2} />
            <StatCard label="Cancelled" value={summary.cancelledToday} icon={XCircle} alert={summary.cancelledToday > 2} />
            <StatCard label="Payment Pending" value={summary.paymentPending} icon={DollarSign} alert={summary.paymentPending > 0} />
            <StatCard label="Low Rated" value={summary.lowRated} icon={Star} alert={summary.lowRated > 0} />
            <StatCard label="Escalations" value={summary.escalations} icon={AlertTriangle} alert={summary.escalations > 0} />
          </div>

          {/* Stuck Bookings with Recommended Actions */}
          {summary.stuckBookings.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle size={14} /> Stuck Bookings ({summary.stuckBookings.length}) — Smart Recommendations
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
                      {summary.stuckBookings.map(b => (
                        <StuckRow key={b.id} b={b} onAction={() => setActionBooking({ id: b.id, status: b.status })} />
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Weekly KPIs */}
          <Card>
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={14} /> KPIs</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <KPISection filters={{ ...filters, dateRange: "week" }} onFilterChange={() => {}} />
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

      {/* Smart Action Dialog */}
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
              onDone={() => { setActionBooking(null); refetch(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
