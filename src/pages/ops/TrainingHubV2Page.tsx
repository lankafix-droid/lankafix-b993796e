/**
 * Enhanced Training Hub V2 — /ops/training-hub (upgraded with role readiness)
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, CheckCircle2, XCircle, Users } from "lucide-react";
import { fetchTrainingModules, fetchRoleReadiness } from "@/services/readiness/readinessReadModel";

const TRAINING_CONTENT: Record<string, string[]> = {
  lifecycle: [
    "1. Customer creates booking → status: requested",
    "2. System dispatches to partners → matching",
    "3. Partner accepts → awaiting_partner_confirmation",
    "4. Partner submits quote → quote_submitted",
    "5. Customer approves → quote_approved → repair_started",
    "6. Service completed → completion OTP verified",
    "7. Issue reported → escalation created",
  ],
  dispatch: [
    "No provider accepted: Retry up to 5 rounds → escalation → operator assigns manually",
    "Delayed quote: 30min reminder → callback task created",
    "Technician cancellation: Returns to dispatch pool → new round auto-initiated",
    "SLA risk: Bookings >30min in early state flagged → visible in War Room",
  ],
  disputes: [
    "Disputes escalate: report_issue → under_mediation → operator review → human resolution",
    "Refunds are NEVER automatic — every refund requires operator approval",
    "Auto-cancellation disabled — operators approve all cancellations",
  ],
  "ai-policy": [
    "AI confidence >80%: high confidence, 50-80%: moderate, <50%: suggestions only",
    "AI estimates are ROUGH — final price depends on on-site diagnosis",
    "When AI conflicts with operator judgment → operator ALWAYS wins",
    "AI fraud flags are alerts, not verdicts — human investigation required",
  ],
};

const LAUNCH_CHECKLIST = [
  "Operators logged in to dashboard",
  "Communication channels verified",
  "Callback queue empty or triaged",
  "Partners online and availability confirmed",
  "Support coverage scheduled",
  "Payment method confirmed",
  "Emergency contact list distributed",
  "War Room accessible",
];

export default function TrainingHubV2Page() {
  const modules = fetchTrainingModules();
  const roles = fetchRoleReadiness();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["lifecycle"]));
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 bg-background"><div className="container py-6 max-w-4xl">
      <Link to="/ops/launch-command-center-v2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Command Center V2</Link>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-lg font-bold text-foreground">Operator Training Hub</h1>
          <p className="text-xs text-muted-foreground">{modules.length} modules · {roles.length} roles</p></div>
      </div>

      {/* Role Readiness */}
      <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> Role-Based Readiness</h2>
      <div className="grid grid-cols-2 gap-2 mb-6">{roles.map(r => (
        <Card key={r.role} className="border"><CardContent className="p-3">
          <span className="text-[11px] font-semibold text-foreground">{r.role}</span>
          <Progress value={r.readinessPercent} className="h-1.5 mt-1.5 mb-1" />
          <p className="text-[9px] text-muted-foreground">{r.completedModules}/{r.requiredModules} modules · {r.readinessPercent}%</p>
        </CardContent></Card>
      ))}</div>

      {/* Training Modules */}
      <h2 className="text-xs font-semibold text-foreground mb-2">Training Modules</h2>
      <div className="space-y-2 mb-6">{modules.map(m => {
        const isOpen = expanded.has(m.id);
        const content = TRAINING_CONTENT[m.id];
        return (
          <Card key={m.id}><CardContent className="p-0">
            <button className="w-full flex items-center justify-between p-3.5 text-left" onClick={() => toggle(m.id)}>
              <div>
                <span className="text-xs font-semibold text-foreground">{m.title}</span>
                <p className="text-[10px] text-muted-foreground">{m.description}</p>
                <div className="flex gap-1.5 mt-1">
                  {m.requiredForRoles.map(r => <Badge key={r} variant="outline" className="text-[8px]">{r}</Badge>)}
                  <span className="text-[9px] text-muted-foreground">Owner: {m.owner}</span>
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>
            {isOpen && content && (
              <div className="px-3.5 pb-3.5 space-y-1.5 border-t border-border/50 pt-2.5">
                {content.map((item, i) => <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">{item}</p>)}
              </div>
            )}
          </CardContent></Card>
        );
      })}</div>

      {/* Launch Day Checklist */}
      <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Launch-Day Checklist ({checked.size}/{LAUNCH_CHECKLIST.length})</h2>
      <Card><CardContent className="p-3.5 space-y-2">{LAUNCH_CHECKLIST.map((item, i) => (
        <button key={i} className="w-full flex items-center gap-2.5 text-left" onClick={() => setChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
          {checked.has(i) ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className={`text-xs ${checked.has(i) ? "text-muted-foreground line-through" : "text-foreground"}`}>{item}</span>
        </button>
      ))}</CardContent></Card>
    </div></main><Footer /></div>
  );
}
