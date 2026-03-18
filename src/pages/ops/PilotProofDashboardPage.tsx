/**
 * Pilot Proof Dashboard — Shows real transaction proof for all 10 proof categories
 * and tracks the first 10 real bookings through lifecycle.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchPilotProofReport, fetchFirst10Bookings } from "@/services/pilotProofService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ProofRow = ({ label, target, current, achieved }: { label: string; target: number; current: number; achieved: boolean }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
    <div className="flex items-center gap-2">
      {achieved ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
      <span className="text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {current}/{target}
      </span>
      <Badge variant={achieved ? "default" : "destructive"} className="text-[10px]">
        {achieved ? "PROVEN" : "MISSING"}
      </Badge>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    completed: "bg-success/10 text-success border-success/30",
    cancelled: "bg-destructive/10 text-destructive border-destructive/30",
    requested: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[status] || "bg-primary/10 text-primary border-primary/30"}`}>
      {status}
    </Badge>
  );
};

export default function PilotProofDashboardPage() {
  const navigate = useNavigate();
  const { data: proof, isLoading: proofLoading } = useQuery({
    queryKey: ["pilot-proof"],
    queryFn: fetchPilotProofReport,
    staleTime: 15_000,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["pilot-first-10"],
    queryFn: fetchFirst10Bookings,
    staleTime: 15_000,
  });

  return (
    <div className="min-h-screen bg-background safe-area-top">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/launch-command-center-v2")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-heading">Pilot Proof Dashboard</h1>
            <p className="text-xs text-muted-foreground">Real transaction proof — no seeded data</p>
          </div>
        </div>

        {/* Overall Score */}
        {proof && (
          <Card className={proof.pilotReady ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">Pilot Readiness</span>
                <Badge variant={proof.pilotReady ? "default" : "destructive"}>
                  {proof.pilotReady ? "PILOT READY" : "NOT READY"}
                </Badge>
              </div>
              <Progress value={proof.overallScore} className="h-2.5" />
              <span className="text-xs text-muted-foreground mt-1 block">{proof.overallScore}% proof achieved</span>
            </CardContent>
          </Card>
        )}

        {/* 10 Proof Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaction Proof Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {proofLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading proof data…</p>
            ) : proof ? (
              <div>
                <ProofRow {...proof.adminAccounts} />
                <ProofRow {...proof.operatorAccounts} />
                <ProofRow {...proof.realPartners} />
                <ProofRow {...proof.realBookings} />
                <ProofRow {...proof.acceptedDispatches} />
                <ProofRow {...proof.approvedQuotes} />
                <ProofRow {...proof.completedJobs} />
                <ProofRow {...proof.recordedPayments} />
                <ProofRow {...proof.submittedRatings} />
                <ProofRow {...proof.supportCases} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* First 10 Bookings Tracker */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">First 10 Bookings Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading bookings…</p>
            ) : !bookings?.length ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No bookings yet. Create the first real booking to begin pilot validation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b, i) => (
                  <div key={b.id} className="border border-border/60 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">#{i + 1} — {b.category_code}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                      <span>Zone: {b.zone_code || "—"}</span>
                      <span>Partner: {b.partner_name || "—"}</span>
                      <span>Dispatch: {b.has_dispatch_accepted ? "✓" : "—"}</span>
                      <span>Quote: {b.has_quote ? "✓" : "—"}</span>
                      <span>Completed: {b.is_completed ? "✓" : "—"}</span>
                      <span>Paid: {b.is_paid ? "✓" : "—"}</span>
                      <span>Rating: {b.customer_rating ? `${b.customer_rating}★` : "—"}</span>
                      <span>Payment: {b.payment_status || "—"}</span>
                    </div>
                    {b.current_blocker && (
                      <div className="flex items-center gap-1.5 text-[11px] text-warning">
                        <AlertTriangle className="w-3 h-3" />
                        {b.current_blocker}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
