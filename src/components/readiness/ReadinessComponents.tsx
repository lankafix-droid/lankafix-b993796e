/**
 * Reusable Readiness Components — DataTruthBadge, ReadinessScoreCard,
 * LaunchVerdictBanner, LaunchModeBadge, BlockerCard, etc.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getTruthBadgeConfig, type DataSource } from "@/services/readiness/dataTruthService";
import { VERDICT_CONFIG, type LaunchVerdict, type VerdictResult } from "@/services/readiness/launchVerdictEngine";
import type { ReadinessScorecard, LaunchBlocker, TransactionProof } from "@/services/readiness/readinessReadModel";
import { Rocket, XCircle, AlertTriangle, CheckCircle2, Info, Shield, Activity } from "lucide-react";

// ── DataTruthBadge ──
export function DataTruthBadge({ source, className = "" }: { source: DataSource; className?: string }) {
  const cfg = getTruthBadgeConfig(source);
  return <Badge variant="outline" className={`text-[9px] ${cfg.colorClass} ${cfg.borderClass} ${className}`}>{cfg.label}</Badge>;
}

// ── LaunchModeBadge ──
const MODE_STYLES: Record<string, { color: string; label: string }> = {
  DISABLED: { color: "text-muted-foreground", label: "Disabled" },
  INTERNAL_ONLY: { color: "text-muted-foreground", label: "Internal Only" },
  INTERNAL_TEST_ONLY: { color: "text-muted-foreground", label: "Internal Test" },
  PILOT_ONLY: { color: "text-primary", label: "Pilot Only" },
  PILOT_LIVE: { color: "text-primary", label: "Pilot Live" },
  PUBLIC_LIVE: { color: "text-success", label: "Public Live" },
  NOT_READY: { color: "text-destructive", label: "Not Ready" },
  LAUNCH_READY: { color: "text-success", label: "Launch Ready" },
  STUB_ONLY: { color: "text-warning", label: "Stub Only" },
  SANDBOX_READY: { color: "text-primary", label: "Sandbox Ready" },
  PRODUCTION_READY: { color: "text-success", label: "Production Ready" },
  NOT_BUILT: { color: "text-muted-foreground", label: "Not Built" },
  READY: { color: "text-success", label: "Ready" },
  ONBOARDING_REQUIRED: { color: "text-warning", label: "Onboarding Required" },
  HOLD: { color: "text-destructive", label: "Hold" },
  STRONG: { color: "text-success", label: "Strong" },
  ACCEPTABLE: { color: "text-primary", label: "Acceptable" },
  NEEDS_IMPROVEMENT: { color: "text-warning", label: "Needs Improvement" },
};

export function LaunchModeBadge({ status }: { status: string }) {
  const s = MODE_STYLES[status] || { color: "text-muted-foreground", label: status.replace(/_/g, " ") };
  return <Badge variant="outline" className={`text-[9px] ${s.color}`}>{s.label}</Badge>;
}

// ── LaunchVerdictBanner ──
export function LaunchVerdictBanner({ verdict, proof }: { verdict: VerdictResult; proof?: TransactionProof }) {
  const vc = VERDICT_CONFIG[verdict.verdict];
  return (
    <Card className={`border-2 ${vc.bg} ${vc.border}`}>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${vc.bg}`}>
              <Rocket className={`w-7 h-7 ${vc.color}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Launch Command Center V2</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString("en-LK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>
          <div className="text-right">
            <Badge className={`text-sm px-4 py-2 font-bold ${vc.bg} ${vc.color} border-none`}>{vc.label}</Badge>
          </div>
        </div>
        {verdict.reasons.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">{verdict.reasons[0]}</p>
        )}
        <Separator className="my-3" />
        <p className="text-[10px] text-destructive font-medium">⚠ Human Decision Required — AI verdict is advisory only</p>
      </CardContent>
    </Card>
  );
}

// ── ReadinessScoreCard ──
export function ReadinessScoreCard({ sc }: { sc: ReadinessScorecard }) {
  const isGood = sc.score >= 70;
  const isWarn = sc.score >= 40 && sc.score < 70;
  const colorCls = isGood ? "text-success" : isWarn ? "text-warning" : "text-destructive";
  const borderCls = isGood ? "border-success/15" : isWarn ? "border-warning/15" : "border-destructive/15";

  return (
    <Card className={`${borderCls} border`}>
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-foreground">{sc.label}</span>
          <span className={`text-sm font-bold ${colorCls}`}>{sc.score}%</span>
        </div>
        <Progress value={sc.score} className="h-1.5 mb-2.5" />
        <div className="flex flex-wrap gap-1">
          {[
            { label: "Built", pass: sc.built },
            { label: "Integrated", pass: sc.integrated },
            { label: "Validated", pass: sc.validated },
            { label: "Launch", pass: sc.launchEligible },
          ].map(c => (
            <Badge key={c.label} variant="outline" className={`text-[8px] ${c.pass ? "text-success border-success/30" : "text-muted-foreground"}`}>
              {c.pass ? "✓" : "○"} {c.label}
            </Badge>
          ))}
          {sc.warningCount > 0 && <Badge variant="outline" className="text-[8px] text-warning border-warning/30">{sc.warningCount}w</Badge>}
          {sc.criticalBlockers > 0 && <Badge variant="outline" className="text-[8px] text-destructive border-destructive/30">{sc.criticalBlockers}c</Badge>}
        </div>
        <div className="mt-1.5">
          <DataTruthBadge source={sc.sourceTruthLevel} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── RealTransactionProofPanel ──
export function RealTransactionProofPanel({ proof }: { proof: TransactionProof }) {
  const items = [
    { label: "Live Bookings", value: proof.liveBookings },
    { label: "Completed", value: proof.completedBookings },
    { label: "Quotes", value: proof.liveQuotes },
    { label: "Acceptances", value: proof.partnerAcceptances },
    { label: "Payments", value: proof.payments },
    { label: "Disputes", value: proof.disputes },
    { label: "Callbacks", value: proof.callbackTasks },
  ];
  const allZero = items.every(i => i.value === 0);
  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-primary" /> Real Transaction Proof
      </h3>
      {allZero && (
        <p className="text-[10px] text-destructive font-medium mb-2">⚠ All transaction counts are zero — no real lifecycle proof exists</p>
      )}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {items.map(i => (
          <div key={i.label} className={`text-center rounded-lg border p-2 ${i.value === 0 ? "bg-destructive/5 border-destructive/10" : "bg-success/5 border-success/10"}`}>
            <p className={`text-sm font-bold ${i.value === 0 ? "text-destructive" : "text-success"}`}>{i.value}</p>
            <p className="text-[8px] text-muted-foreground leading-tight">{i.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BlockerCard ──
const SEV_ICONS = { CRITICAL: XCircle, HIGH: AlertTriangle, MEDIUM: Info };
const SEV_COLORS = {
  CRITICAL: { text: "text-destructive", bg: "bg-destructive/5 border-destructive/20" },
  HIGH: { text: "text-warning", bg: "bg-warning/5 border-warning/20" },
  MEDIUM: { text: "text-muted-foreground", bg: "bg-muted/50 border-border" },
};

export function BlockerCard({ b }: { b: LaunchBlocker }) {
  const Icon = SEV_ICONS[b.severity];
  const sc = SEV_COLORS[b.severity];
  return (
    <Card className={`border ${sc.bg}`}>
      <CardContent className="p-3 flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${sc.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{b.title}</span>
            <Badge variant="outline" className={`text-[8px] ${sc.text}`}>{b.severity}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{b.notes}</p>
          <div className="flex flex-wrap gap-1.5 mt-1 text-[9px] text-muted-foreground">
            <span>{b.module}</span>·<span>{b.owner}</span>·<span>{b.dueDate}</span>
            <Badge variant="outline" className="text-[8px]">{b.status}</Badge>
          </div>
          {b.launchImpact && <p className="text-[9px] text-destructive mt-1">Impact: {b.launchImpact}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── LaunchRiskPanel ──
export function LaunchRiskPanel({ risks }: { risks: { label: string; value: number; warn: number }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {risks.map(r => {
        const isRisk = r.value >= r.warn;
        return (
          <div key={r.label} className={`rounded-lg border p-2.5 text-center ${isRisk ? "bg-destructive/5 border-destructive/15" : "bg-success/5 border-success/15"}`}>
            <p className={`text-lg font-bold ${isRisk ? "text-destructive" : "text-success"}`}>{r.value}</p>
            <p className="text-[8px] text-muted-foreground">{r.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── CheckRow helper ──
export function CheckRow({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      {pass ? <CheckCircle2 className="w-3 h-3 text-success" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}
      <span className={pass ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
