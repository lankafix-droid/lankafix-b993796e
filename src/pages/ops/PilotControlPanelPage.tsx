/**
 * Phase 3 — Pilot Ops Control Panel
 * Focused Colombo Mobile Repairs operational dashboard.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, RefreshCw, AlertTriangle, Clock, CheckCircle2, XCircle,
  Users, Activity, DollarSign, Star, Loader2, Wrench, MessageSquare,
  UserPlus, Ban, Send, FileText, TrendingUp,
} from "lucide-react";
import { usePilotDaySummary, usePartnerSLA, usePilotKPIs, type StuckBooking } from "@/hooks/usePilotOps";
import {
  opsReassignPartner, opsEscalateBooking, opsCancelBooking,
  opsVerifyPayment, opsResendAssignment, opsAddNote,
} from "@/hooks/useOpsActions";

/* ── Stat Card ── */
function StatCard({ label, value, icon: Icon, alert }: { label: string; value: number | string; icon: React.ElementType; alert?: boolean }) {
  return (
    <Card className={alert ? "border-destructive/50 bg-destructive/5" : ""}>
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

/* ── Stuck Booking Row ── */
function StuckRow({ b, onAction }: { b: StuckBooking; onAction: () => void }) {
  return (
    <TableRow className={b.severity === "critical" ? "bg-destructive/5" : "bg-amber-500/5"}>
      <TableCell className="text-xs font-mono">{b.id.slice(0, 8)}</TableCell>
      <TableCell><Badge variant="outline" className="text-[10px]">{b.status}</Badge></TableCell>
      <TableCell className="text-xs">{b.minutes_stuck}m</TableCell>
      <TableCell>
        <Badge variant={b.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">
          {b.severity}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{b.stuck_reason}</TableCell>
      <TableCell>
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onAction}>
          <Wrench size={10} className="mr-1" /> Act
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ── Booking Action Dialog ── */
function BookingActionDialog({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); onDone(); } catch (e: any) {
      // toast already handled
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-mono text-muted-foreground">Booking: {bookingId.slice(0, 12)}…</p>

      {/* Reassign */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reassign Partner</label>
        <div className="flex gap-1.5">
          <Input placeholder="Partner UUID" value={partnerId} onChange={e => setPartnerId(e.target.value)} className="text-xs h-8" />
          <Button size="sm" className="h-8 text-xs shrink-0" disabled={!partnerId || loading}
            onClick={() => run(() => opsReassignPartner(bookingId, partnerId))}>
            <UserPlus size={12} className="mr-1" /> Reassign
          </Button>
        </div>
      </div>

      {/* Escalate */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Escalate</label>
        <div className="flex gap-1.5">
          <Input placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} className="text-xs h-8" />
          <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 text-amber-600 border-amber-500/30"
            disabled={!reason || loading} onClick={() => run(() => opsEscalateBooking(bookingId, reason))}>
            <AlertTriangle size={12} className="mr-1" /> Escalate
          </Button>
        </div>
      </div>

      {/* Cancel */}
      <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30 w-full"
        disabled={loading} onClick={() => run(() => opsCancelBooking(bookingId, reason || "Ops cancellation"))}>
        <XCircle size={12} className="mr-1" /> Cancel Booking
      </Button>

      {/* Verify Payment */}
      <Button size="sm" variant="outline" className="h-8 text-xs w-full"
        disabled={loading} onClick={() => run(() => opsVerifyPayment(bookingId, "cash_collected"))}>
        <DollarSign size={12} className="mr-1" /> Verify Payment (Cash)
      </Button>

      {/* Resend Assignment */}
      <Button size="sm" variant="outline" className="h-8 text-xs w-full"
        disabled={loading} onClick={() => run(() => opsResendAssignment(bookingId))}>
        <Send size={12} className="mr-1" /> Resend Assignment
      </Button>

      {/* Add Note */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ops Note</label>
        <Textarea placeholder="Internal note…" value={note} onChange={e => setNote(e.target.value)} className="text-xs min-h-[60px]" />
        <Button size="sm" variant="outline" className="h-8 text-xs w-full" disabled={!note || loading}
          onClick={() => run(() => opsAddNote(bookingId, note))}>
          <MessageSquare size={12} className="mr-1" /> Add Note
        </Button>
      </div>
    </div>
  );
}

/* ── Partner SLA Table ── */
function PartnerSLATable() {
  const { data, isLoading } = usePartnerSLA();
  if (isLoading) return <Loader2 className="animate-spin mx-auto my-4" size={16} />;
  if (!data?.length) return <p className="text-xs text-muted-foreground text-center py-4">No partner offer data this week</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-[10px]">Partner</TableHead>
          <TableHead className="text-[10px]">Offers</TableHead>
          <TableHead className="text-[10px]">Accepted</TableHead>
          <TableHead className="text-[10px]">Rate</TableHead>
          <TableHead className="text-[10px]">Avg Response</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(p => (
          <TableRow key={p.partner_id}>
            <TableCell className="text-xs">{p.partner_name}</TableCell>
            <TableCell className="text-xs">{p.offers_received}</TableCell>
            <TableCell className="text-xs">{p.offers_accepted}</TableCell>
            <TableCell>
              <Badge variant={p.acceptance_rate < 40 ? "destructive" : "secondary"} className="text-[10px]">
                {p.acceptance_rate}%
              </Badge>
            </TableCell>
            <TableCell className="text-xs">{p.avg_response_time_sec != null ? `${p.avg_response_time_sec}s` : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── KPI Cards ── */
function KPISection() {
  const { data: kpi, isLoading } = usePilotKPIs();
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

/* ── Main Page ── */
export default function PilotControlPanelPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading, refetch } = usePilotDaySummary();
  const [actionBooking, setActionBooking] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-4 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ops")}><ArrowLeft size={16} /></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Pilot Control Panel</h1>
          <p className="text-[10px] text-muted-foreground">Colombo Mobile Repairs — Live Operations</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
          <RefreshCw size={12} className="mr-1" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={24} /></div>
      ) : summary ? (
        <>
          {/* Day Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <StatCard label="Created Today" value={summary.created} icon={Activity} />
            <StatCard label="Unassigned" value={summary.unassigned} icon={Users} alert={summary.unassigned > 0} />
            <StatCard label="Pending Response" value={summary.pendingPartnerResponse} icon={Clock} alert={summary.pendingPartnerResponse > 3} />
            <StatCard label="Quote Pending" value={summary.pendingQuoteApproval} icon={FileText} />
            <StatCard label="In Progress" value={summary.activeInProgress} icon={Wrench} />
            <StatCard label="Completed" value={summary.completedToday} icon={CheckCircle2} />
            <StatCard label="Cancelled" value={summary.cancelledToday} icon={XCircle} alert={summary.cancelledToday > 2} />
            <StatCard label="Payment Pending" value={summary.paymentPending} icon={DollarSign} alert={summary.paymentPending > 0} />
            <StatCard label="Low Rated" value={summary.lowRated} icon={Star} alert={summary.lowRated > 0} />
            <StatCard label="Escalations" value={summary.escalations} icon={AlertTriangle} alert={summary.escalations > 0} />
          </div>

          {/* Stuck Bookings */}
          {summary.stuckBookings.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle size={14} /> Stuck Bookings ({summary.stuckBookings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <ScrollArea className="max-h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">ID</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                        <TableHead className="text-[10px]">Age</TableHead>
                        <TableHead className="text-[10px]">Severity</TableHead>
                        <TableHead className="text-[10px]">Reason</TableHead>
                        <TableHead className="text-[10px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.stuckBookings.map(b => (
                        <StuckRow key={b.id} b={b} onAction={() => setActionBooking(b.id)} />
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
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={14} /> Weekly Pilot KPIs</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <KPISection />
            </CardContent>
          </Card>

          {/* Partner SLA */}
          <Card>
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><Users size={14} /> Partner Response SLA (7d)</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <PartnerSLATable />
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Action Dialog */}
      <Dialog open={!!actionBooking} onOpenChange={o => { if (!o) setActionBooking(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Ops Intervention</DialogTitle>
          </DialogHeader>
          {actionBooking && (
            <BookingActionDialog bookingId={actionBooking} onDone={() => { setActionBooking(null); refetch(); }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
