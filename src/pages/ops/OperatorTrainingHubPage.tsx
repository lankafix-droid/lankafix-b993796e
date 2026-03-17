/**
 * Operator Training Hub — /ops/training-hub
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, CheckCircle2, XCircle, Zap, Shield, MessageSquare, Brain } from "lucide-react";

interface TrainingSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: string[];
}

const SECTIONS: TrainingSection[] = [
  {
    id: "lifecycle", title: "Booking Lifecycle Walkthrough", icon: Zap,
    items: [
      "1. Customer creates a booking → status: requested",
      "2. System dispatches to partners → status: dispatching",
      "3. Partner accepts offer → status: pending_acceptance",
      "4. Partner submits quote → status: quote_pending → quote_sent",
      "5. Customer approves quote → status: approved",
      "6. Service in progress → started_at recorded, OTP verified",
      "7. Service completed → completion_otp verified",
      "8. Customer confirms satisfaction → status: completed",
      "9. Issue reported → under_mediation: true, escalation created",
    ],
  },
  {
    id: "dispatch", title: "Dispatch Board Operations", icon: Shield,
    items: [
      "No provider accepted: System retries up to 5 rounds, then creates escalation → operator must manually assign or contact standby partners",
      "Delayed quote: After 30 min, reminder job triggers → if no response, callback task created for operator follow-up",
      "Technician cancellation: Booking returns to dispatch pool → new round initiated automatically, operator alerted",
      "SLA risk: Bookings stuck in early states >30 min flagged as stale → visible in War Room, operator must investigate",
    ],
  },
  {
    id: "support", title: "Support & Dispute Handling", icon: MessageSquare,
    items: [
      "Operator intervention required when: customer reports issue, dispute opened, escalation unresolved >1 hour",
      "Disputes escalate through: report_issue → under_mediation → operator review → resolution (human decision only)",
      "Refunds are NEVER automatic — every refund requires manual operator approval",
      "Auto-cancellation is disabled — operators must approve all cancellations",
      "Auto-completion is disabled — completion requires OTP + customer confirmation",
    ],
  },
  {
    id: "reminders", title: "Reminder Engine Interpretation", icon: BookOpen,
    items: [
      "scheduled: Reminder job created, waiting for processing window",
      "sent: Successfully delivered via configured channel (in-app, push, etc.)",
      "suppressed: Blocked by safety rules (duplicate, cooldown, terminal state, dispute active)",
      "failed: Delivery attempted but provider returned error → retry scheduled",
      "callback_created: Digital channels failed → manual operator task generated",
      "Channel priority: in-app → push → WhatsApp → operator callback",
    ],
  },
  {
    id: "ai", title: "AI Advisory Interpretation", icon: Brain,
    items: [
      "AI confidence scores: >80% high confidence, 50-80% moderate, <50% low — treat low scores as suggestions only",
      "AI estimates are ROUGH — always explain to customers that final price depends on on-site diagnosis",
      "AI partner ranking is advisory — operator can override dispatch priority at any time",
      "When AI suggestion conflicts with operator judgment → operator judgment ALWAYS wins",
      "AI fraud flags are alerts, not verdicts — human investigation required before any action",
    ],
  },
];

const LAUNCH_CHECKLIST = [
  { label: "Operators logged in to dashboard", key: "logged_in" },
  { label: "Communication channels verified (in-app working)", key: "comms" },
  { label: "Callback queue empty or triaged", key: "queue" },
  { label: "Partners online and availability confirmed", key: "partners" },
  { label: "Support coverage scheduled", key: "support" },
  { label: "Payment collection method confirmed (cash/digital)", key: "payment" },
  { label: "Emergency contact list distributed", key: "emergency" },
  { label: "War Room bookmarked and accessible", key: "warroom" },
];

export default function OperatorTrainingHubPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["lifecycle"]));
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleCheck = (key: string) => {
    setChecked(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-6 max-w-4xl">
          <Link to="/ops/launch-command-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Launch Command Center
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Operator Training Hub</h1>
              <p className="text-xs text-muted-foreground">Internal training reference for LankaFix operations team</p>
            </div>
          </div>

          {/* Training Sections */}
          <div className="space-y-3 mb-8">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const isOpen = expanded.has(section.id);
              return (
                <Card key={section.id}>
                  <CardContent className="p-0">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left"
                      onClick={() => toggle(section.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">{section.title}</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
                        {section.items.map((item, i) => (
                          <p key={i} className="text-xs text-muted-foreground leading-relaxed">{item}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Launch Day Checklist */}
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Launch-Day Operator Checklist ({checked.size}/{LAUNCH_CHECKLIST.length})
          </h2>
          <Card className="mb-6">
            <CardContent className="p-4 space-y-2">
              {LAUNCH_CHECKLIST.map(item => (
                <button
                  key={item.key}
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => toggleCheck(item.key)}
                >
                  {checked.has(item.key)
                    ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={`text-xs ${checked.has(item.key) ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
