/**
 * Reliability Governance Hub — V5 Governance Control Tower
 * Advisory-only. No live marketplace enforcement.
 */
import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Shield, Activity, Target, AlertTriangle, Clock, RefreshCw,
  CheckCircle2, XCircle, MapPin, FileText, Heart, AlertOctagon,
  Archive, Radio, ClipboardList, User, BarChart3, ArrowUpRight,
  Layers, Bell, Zap, TrendingUp, ShieldAlert, ShieldCheck, Plus,
  CalendarPlus, MessageSquarePlus, Camera, Eye,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { toast } from "sonner";
import {
  fetchGovernanceAutomationSummary,
  fetchGovernanceAttentionQueues,
  createGovernanceQuickAction,
  type GovernanceAutomationSummary,
  type GovernanceAttentionQueues,
} from "@/services/reliabilityGovernanceReadModel";
import {
  updateOperatorAction,
  relativeTime,
  ACTION_TYPE_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  type OperatorAction,
  type CreateActionInput,
} from "@/services/operatorActionsService";
import type { GovernanceRecommendation, AutomationCandidate, OperatorLoad, AttentionLevel } from "@/engines/reliabilityGovernanceAutomationEngine";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { fetchPredictiveReliabilitySummary } from "@/services/predictiveReliabilityReadModel";

const ZONE_LABEL: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL[z.id] = z.label; });

const NAV_LINKS = [
  { label: "Operations Board", path: "/ops/reliability-operations-board", icon: ClipboardList },
  { label: "Action Center", path: "/ops/reliability-action-center", icon: Activity },
  { label: "Executive Board", path: "/ops/executive-reliability", icon: Shield },
  { label: "Scope Planner", path: "/ops/reliability-scope-planner", icon: Target },
  { label: "Archive", path: "/ops/reliability-archive", icon: Archive },
  { label: "Incident Playbooks", path: "/ops/incident-playbooks", icon: FileText },
  { label: "Self-Healing", path: "/ops/self-healing", icon: Heart },
  { label: "Chaos Control", path: "/ops/chaos-control", icon: AlertOctagon },
  { label: "Command Center", path: "/ops/command-center", icon: Radio },
  { label: "Predictive Intelligence", path: "/ops/predictive-reliability", icon: TrendingUp },
];

const ATTENTION_COLORS: Record<AttentionLevel, string> = {
  LOW: "text-success",
  MODERATE: "text-warning",
  HIGH: "text-destructive",
  CRITICAL: "text-destructive",
};

const ATTENTION_BG: Record<AttentionLevel, string> = {
  LOW: "bg-success/10 border-success/20",
  MODERATE: "bg-warning/10 border-warning/20",
  HIGH: "bg-destructive/10 border-destructive/20",
  CRITICAL: "bg-destructive/15 border-destructive/30",
};

const SEVERITY_ICON: Record<string, string> = {
  info: "text-muted-foreground",
  warning: "text-warning",
  critical: "text-destructive",
};

const QUICK_ACTIONS: { label: string; icon: React.ElementType; type: CreateActionInput["action_type"]; title: string }[] = [
  { label: "Create Follow-up Task", icon: CalendarPlus, type: "followup_task_created", title: "Follow-up task" },
  { label: "Request Management Review", icon: Eye, type: "blocked_item_escalation", title: "Management review requested" },
  { label: "Request Snapshot Refresh", icon: Camera, type: "snapshot_refresh_requested", title: "Snapshot refresh requested" },
  { label: "Log Governance Note", icon: MessageSquarePlus, type: "reliability_note", title: "Governance note" },
];

export default function ReliabilityGovernanceHubPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<typeof QUICK_ACTIONS[0] | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [quickFollowup, setQuickFollowup] = useState("");

  const { data: govSummary, isLoading: govLoading } = useQuery({
    queryKey: ["governance-automation-summary"],
    queryFn: fetchGovernanceAutomationSummary,
    staleTime: 15_000,
  });

  const { data: queues, isLoading: queuesLoading } = useQuery({
    queryKey: ["governance-attention-queues"],
    queryFn: fetchGovernanceAttentionQueues,
    staleTime: 15_000,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["governance-automation-summary"] });
    qc.invalidateQueries({ queryKey: ["governance-attention-queues"] });
  }, [qc]);

  const updateMut = useMutation({
    mutationFn: (args: { id: string; updates: Parameters<typeof updateOperatorAction>[1] }) =>
      updateOperatorAction(args.id, args.updates),
    onSuccess: () => { invalidate(); toast.success("Action updated"); },
    onError: () => toast.error("Failed to update action"),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateActionInput) => createGovernanceQuickAction(input),
    onSuccess: () => { invalidate(); toast.success("Quick action created"); setQuickActionOpen(false); },
    onError: () => toast.error("Failed to create action"),
  });

  const openQuickAction = (qa: typeof QUICK_ACTIONS[0]) => {
    setQuickActionType(qa);
    setQuickTitle(qa.title);
    setQuickNote("");
    setQuickFollowup("");
    setQuickActionOpen(true);
  };

  const submitQuickAction = () => {
    if (!quickActionType || !quickTitle.trim()) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const metadata: any = {};
    if (quickFollowup) metadata.followup_date = quickFollowup;

    createMut.mutate({
      action_type: quickActionType.type,
      action_title: quickTitle.trim(),
      source_context: "manual",
      note: quickNote.trim() || `Created from Governance Hub`,
      priority: quickActionType.type === "blocked_item_escalation" ? "high" : "medium",
      metadata,
    });
  };

  const isLoading = govLoading || queuesLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl safe-area-top">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={invalidate}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Governance Hub</h1>
          <Badge variant="outline" className="text-[10px]">V5</Badge>
          <Badge variant="outline" className="text-[10px]">Advisory Only</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mb-5">
          Governance control tower — monitors operator discipline, accountability, and shift readiness
        </p>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-12">Loading governance data…</div>
        ) : (
          <div className="space-y-5">

            {/* ═══ SECTION A — Governance Status Hero ═══ */}
            {govSummary && (
              <Card className={`border ${ATTENTION_BG[govSummary.digest.recommendedAttentionLevel]}`}>
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Governance Status</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    <div>
                      <p className={`text-sm font-bold ${ATTENTION_COLORS[govSummary.digest.recommendedAttentionLevel]}`}>
                        {govSummary.digest.recommendedAttentionLevel}
                      </p>
                      <p className="text-[8px] text-muted-foreground">Attention Level</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${govSummary.digest.overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>
                        {govSummary.digest.overdueCount}
                      </p>
                      <p className="text-[8px] text-muted-foreground">Overdue</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${govSummary.digest.dueTodayCount > 0 ? "text-warning" : "text-foreground"}`}>
                        {govSummary.digest.dueTodayCount}
                      </p>
                      <p className="text-[8px] text-muted-foreground">Follow-ups Due</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${govSummary.digest.unownedCriticalCount > 0 ? "text-destructive" : "text-foreground"}`}>
                        {govSummary.digest.unownedCriticalCount}
                      </p>
                      <p className="text-[8px] text-muted-foreground">Unowned Critical</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${govSummary.shiftReadiness.ready ? "text-success" : "text-destructive"}`}>
                        {govSummary.shiftReadiness.ready ? "READY" : "NOT READY"}
                      </p>
                      <p className="text-[8px] text-muted-foreground">Shift Status</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{govSummary.snapshotFreshness}</p>
                      <p className="text-[8px] text-muted-foreground">Snapshot</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══ SECTION B — Governance Digest ═══ */}
            {govSummary && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Governance Digest
                  </h2>
                  {govSummary.digest.digestLines.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">All governance indicators are within normal range</p>
                  ) : (
                    <div className="space-y-1.5">
                      {govSummary.digest.digestLines.map((line, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2">
                          <span className="text-[10px] text-muted-foreground/60 shrink-0">•</span>
                          <p className="text-xs text-foreground">{line}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ═══ SECTION C — Shift Readiness Panel ═══ */}
            {govSummary && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    {govSummary.shiftReadiness.ready ? <ShieldCheck className="w-3 h-3 text-success" /> : <ShieldAlert className="w-3 h-3 text-destructive" />}
                    Shift Readiness
                  </h2>
                  <div className={`rounded-lg p-3 mb-3 ${govSummary.shiftReadiness.ready ? "bg-success/10" : "bg-destructive/10"}`}>
                    <p className={`text-sm font-bold ${govSummary.shiftReadiness.ready ? "text-success" : "text-destructive"}`}>
                      {govSummary.shiftReadiness.ready ? "✓ READY" : "✗ NOT READY"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{govSummary.shiftReadiness.recommendation}</p>
                  </div>
                  {govSummary.shiftReadiness.blockers.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <p className="text-[9px] font-semibold text-destructive uppercase">Blockers</p>
                      {govSummary.shiftReadiness.blockers.map((b, i) => (
                        <p key={i} className="text-[10px] text-destructive bg-destructive/5 rounded px-2 py-1">• {b}</p>
                      ))}
                    </div>
                  )}
                  {govSummary.shiftReadiness.warnings.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-warning uppercase">Warnings</p>
                      {govSummary.shiftReadiness.warnings.map((w, i) => (
                        <p key={i} className="text-[10px] text-warning bg-warning/5 rounded px-2 py-1">• {w}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ═══ SECTION D — Attention Queues ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Bell className="w-3 h-3" /> Attention Queues
                </h2>
                <Tabs defaultValue="overdue" className="w-full">
                  <TabsList className="h-7 mb-3">
                    <TabsTrigger value="overdue" className="text-[10px] h-6 px-2">
                      Overdue {queues?.overdueActions.length ? `(${queues.overdueActions.length})` : ""}
                    </TabsTrigger>
                    <TabsTrigger value="followups" className="text-[10px] h-6 px-2">
                      Follow-ups {queues?.dueFollowUps.length ? `(${queues.dueFollowUps.length})` : ""}
                    </TabsTrigger>
                    <TabsTrigger value="unowned" className="text-[10px] h-6 px-2">
                      Unowned {queues?.unownedCriticalActions.length ? `(${queues.unownedCriticalActions.length})` : ""}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="overdue">
                    {!queues?.overdueActions.length ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No overdue operator actions</p>
                    ) : (
                      <div className="space-y-1.5">{queues.overdueActions.map(a => <AttentionItem key={a.id} action={a} onAssignSelf={(a, name) => updateMut.mutate({ id: a.id, updates: { owner_name: name } })} onMarkInReview={(a) => updateMut.mutate({ id: a.id, updates: { status: "in_review" } })} />)}</div>
                    )}
                  </TabsContent>
                  <TabsContent value="followups">
                    {!queues?.dueFollowUps.length ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No follow-ups due today</p>
                    ) : (
                      <div className="space-y-1.5">{queues.dueFollowUps.map(a => <AttentionItem key={a.id} action={a} onAssignSelf={(a, name) => updateMut.mutate({ id: a.id, updates: { owner_name: name } })} onMarkInReview={(a) => updateMut.mutate({ id: a.id, updates: { status: "in_review" } })} />)}</div>
                    )}
                  </TabsContent>
                  <TabsContent value="unowned">
                    {!queues?.unownedCriticalActions.length ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No unowned critical actions</p>
                    ) : (
                      <div className="space-y-1.5">{queues.unownedCriticalActions.map(a => <AttentionItem key={a.id} action={a} onAssignSelf={(a, name) => updateMut.mutate({ id: a.id, updates: { owner_name: name } })} onMarkInReview={(a) => updateMut.mutate({ id: a.id, updates: { status: "in_review" } })} />)}</div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* ═══ SECTION E — Operator Accountability Leaderboard ═══ */}
            {govSummary && govSummary.operatorLoads.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3" /> Operator Accountability
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/30">
                          <th className="text-left py-1.5 pr-2">Operator</th>
                          <th className="text-center py-1.5 px-1">Active</th>
                          <th className="text-center py-1.5 px-1">Overdue</th>
                          <th className="text-center py-1.5 px-1">Critical</th>
                          <th className="text-center py-1.5 px-1">Follow-ups</th>
                          <th className="text-center py-1.5 px-1">Resolved</th>
                          <th className="text-center py-1.5 px-1">Load</th>
                        </tr>
                      </thead>
                      <tbody>
                        {govSummary.operatorLoads.map(op => (
                          <tr key={op.ownerName} className="border-b border-border/10">
                            <td className="py-1.5 pr-2 font-medium text-foreground">{op.ownerName}</td>
                            <td className="text-center py-1.5 px-1">{op.totalActive}</td>
                            <td className={`text-center py-1.5 px-1 ${op.overdue > 0 ? "text-destructive font-medium" : ""}`}>{op.overdue}</td>
                            <td className={`text-center py-1.5 px-1 ${op.critical > 0 ? "text-destructive font-medium" : ""}`}>{op.critical}</td>
                            <td className={`text-center py-1.5 px-1 ${op.followupsDue > 0 ? "text-warning" : ""}`}>{op.followupsDue}</td>
                            <td className="text-center py-1.5 px-1 text-success">{op.resolvedToday}</td>
                            <td className="text-center py-1.5 px-1">
                              <span className={`font-bold ${op.workloadScore >= 70 ? "text-destructive" : op.workloadScore >= 40 ? "text-warning" : "text-success"}`}>
                                {op.workloadScore}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3" /> Operator Accountability
                  </h2>
                  <p className="text-xs text-muted-foreground py-3 text-center">No operator activity available yet</p>
                </CardContent>
              </Card>
            )}

            {/* ═══ SECTION F — Governance Recommendations ═══ */}
            {govSummary && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Governance Recommendations
                  </h2>
                  {govSummary.recommendations.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">No governance recommendations at this time</p>
                  ) : (
                    <div className="space-y-1.5">
                      {govSummary.recommendations.map(rec => (
                        <div key={rec.id} className="rounded-lg border border-border/50 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${SEVERITY_ICON[rec.severity]}`} />
                            <div>
                              <p className="text-xs font-medium text-foreground">{rec.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{rec.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ═══ SECTION G — Advisory Automation Candidates ═══ */}
            {govSummary && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Advisory Automation Candidates
                  </h2>
                  {govSummary.automationCandidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">No governance automation suggestions at this time</p>
                  ) : (
                    <div className="space-y-1.5">
                      {govSummary.automationCandidates.slice(0, 15).map((c, i) => (
                        <div key={`${c.actionId}-${i}`} className="flex items-start justify-between rounded-lg bg-muted/30 px-3 py-2 gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium text-foreground truncate">{c.actionTitle}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{c.reason}</p>
                            <Badge variant="outline" className="text-[8px] px-1.5 py-0 mt-1">{c.suggestion}</Badge>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[7px] text-muted-foreground/50 italic">suggested only — no automatic action taken</p>
                            <Link to="/ops/reliability-operations-board">
                              <Button variant="ghost" size="sm" className="text-[9px] h-5 px-2 gap-0.5 mt-1">
                                <ArrowUpRight className="w-2.5 h-2.5" /> Open
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ═══ SECTION H — Quick Operator Actions ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> Quick Operator Actions
                </h2>
                <p className="text-[9px] text-muted-foreground mb-3">
                  Create operator action records only — no live marketplace changes
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map(qa => (
                    <Button
                      key={qa.type}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-8 gap-1.5 justify-start"
                      onClick={() => openQuickAction(qa)}
                    >
                      <qa.icon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{qa.label}</span>
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-8 gap-1.5 justify-start"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      createMut.mutate({
                        action_type: "followup_task_created",
                        action_title: "Review tomorrow",
                        source_context: "manual",
                        note: "Marked for review tomorrow from Governance Hub",
                        priority: "medium",
                        metadata: { followup_date: tomorrow.toISOString().split("T")[0] },
                      });
                    }}
                  >
                    <CalendarPlus className="w-3 h-3 shrink-0" />
                    <span className="truncate">Review Tomorrow</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ═══ SECTION I — Quick Navigation ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Navigation</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {NAV_LINKS.map(link => (
                    <Link key={link.path} to={link.path}>
                      <div className="flex items-center gap-2 rounded-lg border border-border/50 p-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                        <link.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground">{link.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ Quick Action Dialog ═══ */}
        <Dialog open={quickActionOpen} onOpenChange={setQuickActionOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">{quickActionType?.label || "Quick Action"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Title</label>
                <Input value={quickTitle} onChange={e => setQuickTitle(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Note (optional)</label>
                <Textarea value={quickNote} onChange={e => setQuickNote(e.target.value)} className="text-xs min-h-[60px]" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Follow-up date (optional)</label>
                <Input type="date" value={quickFollowup} onChange={e => setQuickFollowup(e.target.value)} className="h-8 text-xs" />
              </div>
              <p className="text-[8px] text-muted-foreground/60 italic">Advisory-only — creates operator action record only</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickActionOpen(false)}>Cancel</Button>
              <Button size="sm" className="text-xs" onClick={submitQuickAction} disabled={!quickTitle.trim() || createMut.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}

/* ── Sub-components ── */

function AttentionItem({ action, onAssignSelf, onMarkInReview }: {
  action: OperatorAction;
  onAssignSelf: (a: OperatorAction, name: string) => void;
  onMarkInReview?: (a: OperatorAction) => void;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg bg-muted/20 px-3 py-2 gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-foreground truncate">{action.action_title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <Badge className={`text-[7px] px-1 py-0 ${STATUS_COLORS[action.status]}`}>{action.status.replace("_", " ")}</Badge>
          <Badge className={`text-[7px] px-1 py-0 ${PRIORITY_COLORS[action.priority]}`}>{action.priority}</Badge>
          {action.source_zone_id && <span className="text-[8px] text-muted-foreground">{ZONE_LABEL[action.source_zone_id] || action.source_zone_id}</span>}
          {action.source_category_code && <span className="text-[8px] text-muted-foreground/70">{action.source_category_code}</span>}
          {action.owner_name ? (
            <span className="text-[8px] text-primary">{action.owner_name}</span>
          ) : (
            <span className="text-[8px] text-muted-foreground/60 italic">Unassigned</span>
          )}
        </div>
        <p className="text-[7px] text-muted-foreground/50 mt-0.5">
          {new Date(action.created_at).toLocaleString("en-LK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          {" · "}{relativeTime(action.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
        {!action.owner_name && (
          <Button variant="ghost" size="sm" className="text-[9px] h-5 px-2" onClick={() => {
            const name = localStorage.getItem("lankafix_operator_name") || "Current Operator";
            onAssignSelf(action, name);
          }}>Assign to Me</Button>
        )}
        {action.status === "open" && onMarkInReview && (
          <Button variant="ghost" size="sm" className="text-[9px] h-5 px-2" onClick={() => onMarkInReview(action)}>
            In Review
          </Button>
        )}
        <Link to="/ops/reliability-operations-board">
          <Button variant="ghost" size="sm" className="text-[9px] h-5 px-1.5">
            <ArrowUpRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
