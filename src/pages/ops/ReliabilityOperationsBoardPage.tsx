/**
 * Reliability Operations Board — Operator execution workflow.
 * Advisory-only. No live marketplace mutation.
 */
import { useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Shield, Activity, Target, AlertTriangle, Clock, RefreshCw,
  CheckCircle2, XCircle, MapPin, FileText, Heart, AlertOctagon,
  Archive, Radio, Plus, User, ClipboardList, Filter, History,
  MessageSquare, BookOpen,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { toast } from "sonner";
import {
  fetchLiveEnterpriseSummary,
  fetchReliabilityRolloutSummary,
  fetchWorstCategoriesByZone,
  fetch30DaySnapshots,
  computeSnapshotFreshness,
  FRESHNESS_COLORS,
  verdictColor,
  dispatchRiskColor,
  rolloutReadinessColor,
} from "@/services/reliabilityReadModel";
import { computeActionCenter } from "@/engines/reliabilityActionCenterEngine";
import {
  fetchOperatorActions,
  createOperatorAction,
  updateOperatorAction,
  fetchDailySummary,
  fetchResolvedHistory,
  fetchDecisionLog,
  severityToPriority,
  relativeTime,
  ACTION_TYPE_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  SOURCE_CONTEXT_LABELS,
  type OperatorAction,
  type OperatorActionStatus,
  type OperatorActionPriority,
  type OperatorActionType,
  type CreateActionInput,
} from "@/services/operatorActionsService";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import type { CategoryReliabilitySummary } from "@/engines/categoryReliabilityEngine";

const ZONE_LABEL: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL[z.id] = z.label; });

const NAV_LINKS = [
  { label: "Action Center", path: "/ops/reliability-action-center", icon: Activity },
  { label: "Executive Board", path: "/ops/executive-reliability", icon: Shield },
  { label: "Scope Planner", path: "/ops/reliability-scope-planner", icon: Target },
  { label: "Archive", path: "/ops/reliability-archive", icon: Archive },
  { label: "Incident Playbooks", path: "/ops/incident-playbooks", icon: FileText },
  { label: "Self-Healing", path: "/ops/self-healing", icon: Heart },
  { label: "Chaos Control", path: "/ops/chaos-control", icon: AlertOctagon },
  { label: "Command Center", path: "/ops/command-center", icon: Radio },
];

const PHASE1_CATEGORIES = [
  "AC", "MOBILE", "CONSUMER_ELEC", "IT", "COPIER", "ELECTRICAL",
  "PLUMBING", "CCTV", "SOLAR", "NETWORK", "SMART_HOME_OFFICE",
  "HOME_SECURITY", "POWER_BACKUP", "APPLIANCE_INSTALL", "PRINT_SUPPLIES",
];

export default function ReliabilityOperationsBoardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState<OperatorAction | null>(null);
  const [showOwnerDialog, setShowOwnerDialog] = useState<OperatorAction | null>(null);

  // ── Intelligence data ──
  const { data: intel, isLoading: intelLoading } = useQuery({
    queryKey: ["ops-board-intel"],
    queryFn: async () => {
      const [enterprise, rollout, worstCats, snapshots] = await Promise.all([
        fetchLiveEnterpriseSummary(),
        fetchReliabilityRolloutSummary(),
        fetchWorstCategoriesByZone(15),
        fetch30DaySnapshots(),
      ]);
      const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      const freshness = computeSnapshotFreshness(latest?.created_at || null);
      const ac = computeActionCenter({
        reliabilityScore: enterprise.score,
        verdict: enterprise.verdict,
        slaTier: enterprise.slaTier,
        breachRisk: enterprise.breachRisk,
        dispatchRiskLevel: enterprise.riskLevel,
        rolloutReadiness: rollout.rolloutReadiness,
        emergencyKillSwitch: rollout.flags.emergencyKillSwitch,
        snapshotFreshness: freshness.freshness,
        snapshotAgeHours: freshness.ageHours,
        allCategorySummaries: worstCats,
        zoneReliability: [],
      });
      return { enterprise, rollout, freshness, ac, worstCats };
    },
    staleTime: 30_000,
  });

  // ── Operator actions (filtered) ──
  const statusArr = useMemo(() =>
    statusFilter === "active"
      ? ["open", "acknowledged", "in_review", "waiting"] as OperatorActionStatus[]
      : statusFilter === "resolved"
        ? ["resolved", "dismissed"] as OperatorActionStatus[]
        : undefined,
    [statusFilter]);
  const priorityArr = useMemo(() =>
    priorityFilter !== "all" ? [priorityFilter as OperatorActionPriority] : undefined,
    [priorityFilter]);
  const typeArr = useMemo(() =>
    typeFilter !== "all" ? [typeFilter as OperatorActionType] : undefined,
    [typeFilter]);

  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ["operator-actions", statusFilter, priorityFilter, typeFilter, zoneFilter, categoryFilter, sortBy],
    queryFn: () => fetchOperatorActions({
      status: statusArr,
      priority: priorityArr,
      action_type: typeArr,
      zone: zoneFilter !== "all" ? zoneFilter : undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      sortBy: sortBy as any,
    }),
    staleTime: 10_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["operator-daily-summary"],
    queryFn: fetchDailySummary,
    staleTime: 15_000,
  });

  const { data: resolvedHistory } = useQuery({
    queryKey: ["operator-resolved-history"],
    queryFn: () => fetchResolvedHistory(15),
    staleTime: 20_000,
  });

  const { data: decisionLog } = useQuery({
    queryKey: ["operator-decision-log"],
    queryFn: () => fetchDecisionLog(10),
    staleTime: 20_000,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["operator-actions"] });
    qc.invalidateQueries({ queryKey: ["operator-daily-summary"] });
    qc.invalidateQueries({ queryKey: ["operator-resolved-history"] });
    qc.invalidateQueries({ queryKey: ["operator-decision-log"] });
  }, [qc]);

  const createMut = useMutation({
    mutationFn: createOperatorAction,
    onSuccess: () => { invalidate(); toast.success("Action created"); },
    onError: () => toast.error("Failed to create action"),
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: string; updates: Parameters<typeof updateOperatorAction>[1] }) =>
      updateOperatorAction(args.id, args.updates),
    onSuccess: () => { invalidate(); toast.success("Action updated"); },
    onError: () => toast.error("Failed to update action"),
  });

  const handleQuickStatus = (action: OperatorAction, newStatus: OperatorActionStatus) => {
    updateMut.mutate({ id: action.id, updates: { status: newStatus } });
  };

  const handleCreateFromHotspot = (item: CategoryReliabilitySummary, type: OperatorActionType) => {
    const zoneLabel = ZONE_LABEL[item.zoneId] || item.zoneId;
    const titleMap: Record<string, string> = {
      hotspot_acknowledged: `Review hotspot: ${item.categoryCode} in ${zoneLabel}`,
      rollout_candidate_review: `Review rollout candidate: ${item.categoryCode} in ${zoneLabel}`,
      blocked_item_escalation: `Escalate blocked item: ${item.categoryCode} in ${zoneLabel}`,
    };
    createMut.mutate({
      action_type: type,
      action_title: titleMap[type] || `${type}: ${item.categoryCode} in ${item.zoneId}`,
      source_context: type.includes("hotspot") ? "hotspot" : type.includes("rollout") ? "rollout_candidate" : "blocked_item",
      source_zone_id: item.zoneId,
      source_category_code: item.categoryCode,
      source_severity: item.riskLevel,
      priority: severityToPriority(item.riskLevel),
    });
  };

  const handleQuickNote = (action: OperatorAction, quickNote: string) => {
    const ts = new Date().toLocaleString("en-LK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const appended = action.note ? `${action.note}\n[${ts}] ${quickNote}` : `[${ts}] ${quickNote}`;
    updateMut.mutate({ id: action.id, updates: { note: appended } });
  };

  const isLoading = intelLoading || actionsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl safe-area-top">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-3 h-3" /> New Action
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={invalidate}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Operations Board</h1>
          <Badge variant="outline" className="text-[10px]">Advisory Only</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mb-5">
          Operator execution workflow — records decisions, does not change live marketplace behavior
        </p>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-12">Loading…</div>
        ) : (
          <div className="space-y-5">

            {/* ═══ SECTION A — Executive Status Strip ═══ */}
            {intel && (
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Executive Status</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    <MiniKpi label="Score" value={String(intel.enterprise.score)} color={verdictColor(intel.enterprise.verdict)} />
                    <MiniKpi label="Verdict" value={intel.enterprise.verdict} color={verdictColor(intel.enterprise.verdict)} />
                    <MiniKpi label="Rollout" value={intel.rollout.rolloutReadiness} color={rolloutReadinessColor(intel.rollout.rolloutReadiness)} />
                    <MiniKpi label="Dispatch" value={intel.enterprise.riskLevel} color={dispatchRiskColor(intel.enterprise.riskLevel)} />
                    <MiniKpi label="Kill Switch" value={intel.rollout.flags.emergencyKillSwitch ? "ON" : "OFF"} color={intel.rollout.flags.emergencyKillSwitch ? "text-destructive" : "text-success"} />
                    <MiniKpi label="Snapshot" value={intel.freshness.label} color={FRESHNESS_COLORS[intel.freshness.freshness]} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══ SECTION B — Daily Execution Summary ═══ */}
            {summary && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Daily Execution Summary</h2>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <SummaryCell label="Open" value={summary.open} accent={summary.open > 0} />
                    <SummaryCell label="Critical" value={summary.critical} critical={summary.critical > 0} />
                    <SummaryCell label="In Review" value={summary.inReview} />
                    <SummaryCell label="Resolved Today" value={summary.resolvedToday} />
                    <SummaryCell label="Decisions Today" value={summary.decisionsToday} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══ SECTION C — Hotspots Requiring Action ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Hotspots Requiring Action
                </h2>
                {!intel?.ac.topHotspots.length ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No category-level hotspots detected in the last 24h</p>
                ) : (
                  <div className="space-y-1.5">
                    {intel.ac.topHotspots.map((h, i) => (
                      <IntelRow key={i} item={h} actionLabel="Track" onAction={() => handleCreateFromHotspot(h, "hotspot_acknowledged")} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION D — Rollout Candidate Review ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-success" /> Rollout Candidate Review
                </h2>
                {!intel?.ac.rolloutCandidates.length ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No category combinations currently meet controlled rollout criteria</p>
                ) : (
                  <div className="space-y-1.5">
                    {intel.ac.rolloutCandidates.map((c, i) => (
                      <IntelRow key={i} item={c} variant="success" actionLabel="Review" onAction={() => handleCreateFromHotspot(c, "rollout_candidate_review")} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION E — Blocked / Unsafe Queue ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <XCircle className="w-3 h-3 text-destructive" /> Blocked / Unsafe Queue
                </h2>
                {!intel?.ac.blockedItems.length ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No blocked items detected</p>
                ) : (
                  <div className="space-y-1.5">
                    {intel.ac.blockedItems.slice(0, 6).map((b, i) => (
                      <IntelRow key={i} item={b} variant="destructive" actionLabel="Escalate" onAction={() => handleCreateFromHotspot(b, "blocked_item_escalation")} />
                    ))}
                    {intel.ac.blockedItems.length > 6 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{intel.ac.blockedItems.length - 6} more blocked items</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION F — Filters ═══ */}
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(ACTION_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="unresolved">Unresolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* ═══ SECTION G — Active Operator Queue ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ClipboardList className="w-3 h-3" /> Operator Queue
                  <Badge variant="outline" className="text-[9px]">{actions?.length || 0}</Badge>
                </h2>
                {!actions?.length ? (
                  <div className="py-6 text-center">
                    <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No items match current filters</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Create an action or track a hotspot to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actions.map(action => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        onStatusChange={handleQuickStatus}
                        onAddNote={() => setShowNoteDialog(action)}
                        onAssignOwner={() => setShowOwnerDialog(action)}
                        onQuickNote={handleQuickNote}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION I — Resolved History ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-3 h-3" /> Resolved History
                </h2>
                {!resolvedHistory?.length ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No resolved items yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {resolvedHistory.map(a => (
                      <div key={a.id} className="flex items-start justify-between rounded-lg bg-muted/20 px-3 py-2 gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-foreground truncate">{a.action_title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge className={`text-[7px] px-1 py-0 ${STATUS_COLORS[a.status]}`}>{a.status}</Badge>
                            <Badge className={`text-[7px] px-1 py-0 ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</Badge>
                            {a.owner_name && <span className="text-[8px] text-primary">{a.owner_name}</span>}
                          </div>
                          {a.decision_summary && (
                            <p className="text-[9px] text-muted-foreground mt-0.5 italic line-clamp-1">Decision: {a.decision_summary}</p>
                          )}
                        </div>
                        <span className="text-[8px] text-muted-foreground whitespace-nowrap shrink-0">
                          {a.resolved_at ? relativeTime(a.resolved_at) : relativeTime(a.updated_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION J — Notes & Decisions ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" /> Notes & Decisions
                </h2>
                {!decisionLog?.length ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No decisions logged yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {decisionLog.map(d => (
                      <div key={d.id} className="rounded-lg border border-primary/10 bg-primary/5 px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium text-foreground truncate">{d.action_title}</p>
                            <Badge variant="outline" className="text-[7px] px-1 py-0 mt-0.5">{ACTION_TYPE_LABELS[d.action_type]}</Badge>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[8px] text-muted-foreground">{relativeTime(d.created_at)}</span>
                            {d.owner_name && <p className="text-[8px] text-primary">{d.owner_name}</p>}
                          </div>
                        </div>
                        {d.decision_summary && (
                          <p className="text-[9px] text-foreground mt-1 italic">{d.decision_summary}</p>
                        )}
                        {d.note && (
                          <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{d.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SECTION H — Quick Navigation ═══ */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Navigation</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {NAV_LINKS.map(link => (
                    <Link key={link.path} to={link.path}>
                      <div className="flex items-center gap-2 rounded-lg border border-border/50 p-2.5 hover:bg-muted/50 transition-colors">
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

        {/* ═══ Dialogs ═══ */}
        <CreateActionDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreate={(input) => { createMut.mutate(input); setShowCreateDialog(false); }}
        />
        <NoteDialog
          action={showNoteDialog}
          onClose={() => setShowNoteDialog(null)}
          onSave={(id, note, decision) => {
            updateMut.mutate({ id, updates: { note, ...(decision ? { decision_summary: decision } : {}) } });
            setShowNoteDialog(null);
          }}
        />
        <OwnerDialog
          action={showOwnerDialog}
          onClose={() => setShowOwnerDialog(null)}
          onSave={(id, name, role) => {
            updateMut.mutate({ id, updates: { owner_name: name, owner_role: role } });
            setShowOwnerDialog(null);
          }}
        />
      </main>
      <Footer />
    </div>
  );
}

/* ── Sub-components ── */

function MiniKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[8px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SummaryCell({ label, value, accent, critical }: { label: string; value: number; accent?: boolean; critical?: boolean }) {
  return (
    <div>
      <p className={`text-lg font-bold ${critical ? "text-destructive" : accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      <p className="text-[8px] text-muted-foreground">{label}</p>
    </div>
  );
}

function IntelRow({ item, variant, actionLabel, onAction }: {
  item: CategoryReliabilitySummary;
  variant?: "success" | "destructive";
  actionLabel: string;
  onAction: () => void;
}) {
  const bg = variant === "success" ? "bg-success/5 border border-success/10"
    : variant === "destructive" ? "bg-destructive/5 border border-destructive/10"
    : "bg-muted/30";
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-muted-foreground">{ZONE_LABEL[item.zoneId] || item.zoneId}</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{item.categoryCode}</Badge>
        <span className={`text-xs font-bold ${verdictColor(item.verdict)}`}>{item.reliabilityScore}</span>
      </div>
      <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={onAction}>
        <Plus className="w-3 h-3 mr-1" /> {actionLabel}
      </Button>
    </div>
  );
}

function ActionCard({
  action,
  onStatusChange,
  onAddNote,
  onAssignOwner,
  onQuickNote,
}: {
  action: OperatorAction;
  onStatusChange: (a: OperatorAction, s: OperatorActionStatus) => void;
  onAddNote: () => void;
  onAssignOwner: () => void;
  onQuickNote: (a: OperatorAction, note: string) => void;
}) {
  const isActive = !["resolved", "dismissed"].includes(action.status);

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {action.action_title || ACTION_TYPE_LABELS[action.action_type] || action.action_type}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge className={`text-[8px] px-1.5 py-0 ${STATUS_COLORS[action.status] || ""}`}>{action.status.replace("_", " ")}</Badge>
            <Badge className={`text-[8px] px-1.5 py-0 ${PRIORITY_COLORS[action.priority] || ""}`}>{action.priority}</Badge>
            <Badge variant="outline" className="text-[8px] px-1.5 py-0">{ACTION_TYPE_LABELS[action.action_type] || action.action_type}</Badge>
            {action.source_context && action.source_context !== "manual" && (
              <Badge variant="outline" className="text-[7px] px-1 py-0 bg-primary/5 border-primary/15">
                {SOURCE_CONTEXT_LABELS[action.source_context] || action.source_context}
              </Badge>
            )}
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{relativeTime(action.created_at)}</span>
      </div>

      {/* Context metadata */}
      <div className="flex items-center gap-2 flex-wrap">
        {action.source_zone_id && (
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5" /> {ZONE_LABEL[action.source_zone_id] || action.source_zone_id}
          </span>
        )}
        {action.source_category_code && (
          <Badge variant="outline" className="text-[8px] px-1 py-0">{action.source_category_code}</Badge>
        )}
        {action.owner_name && (
          <span className="text-[9px] text-primary flex items-center gap-0.5">
            <User className="w-2.5 h-2.5" /> {action.owner_name}{action.owner_role ? ` · ${action.owner_role}` : ""}
          </span>
        )}
      </div>

      {/* Note trail */}
      {action.note && (
        <div className="text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5 max-h-16 overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {action.note}
        </div>
      )}
      {action.decision_summary && (
        <p className="text-[10px] text-foreground bg-primary/5 rounded px-2 py-1 italic line-clamp-2">
          <span className="font-medium not-italic">Decision:</span> {action.decision_summary}
        </p>
      )}

      {/* Timestamps */}
      {action.resolved_at && (
        <p className="text-[8px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" /> Resolved {relativeTime(action.resolved_at)}
        </p>
      )}

      {/* Quick actions */}
      {isActive && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5 border-t border-border/30">
          {action.status === "open" && (
            <MicroBtn label="Acknowledge" onClick={() => onStatusChange(action, "acknowledged")} />
          )}
          {["open", "acknowledged"].includes(action.status) && (
            <MicroBtn label="In Review" onClick={() => onStatusChange(action, "in_review")} />
          )}
          {["open", "acknowledged", "in_review"].includes(action.status) && (
            <MicroBtn label="Waiting" onClick={() => onStatusChange(action, "waiting")} />
          )}
          <MicroBtn label="Add Note" onClick={onAddNote} />
          <MicroBtn label="Assign" onClick={onAssignOwner} />
          <MicroBtn label="Needs Data" onClick={() => onQuickNote(action, "Needs more data before proceeding")} muted />
          <MicroBtn label="Review Later" onClick={() => onQuickNote(action, "Marked for follow-up review")} muted />
          <MicroBtn label="Resolve" onClick={() => onStatusChange(action, "resolved")} />
          <MicroBtn label="Dismiss" onClick={() => onStatusChange(action, "dismissed")} muted />
        </div>
      )}
    </div>
  );
}

function MicroBtn({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <Button variant="ghost" size="sm" className={`text-[9px] h-5 px-2 ${muted ? "text-muted-foreground" : ""}`} onClick={onClick}>
      {label}
    </Button>
  );
}

/* ── Dialogs ── */

function CreateActionDialog({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateActionInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<OperatorActionType>("reliability_note");
  const [priority, setPriority] = useState<OperatorActionPriority>("medium");
  const [note, setNote] = useState("");
  const [decisionType, setDecisionType] = useState("");
  const [decisionSummary, setDecisionSummary] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [zone, setZone] = useState("");
  const [category, setCategory] = useState("");

  const isDecisionType = ["rollout_decision_logged", "risk_acceptance_logged", "deferment_logged"].includes(type);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({
      action_type: type,
      action_title: title,
      priority,
      note,
      source_zone_id: zone || null,
      source_category_code: category || null,
      owner_name: ownerName || null,
      owner_role: ownerRole || null,
      decision_summary: decisionSummary || null,
      metadata: decisionType ? { decision_type: decisionType } : {},
    });
    setTitle(""); setNote(""); setDecisionSummary(""); setOwnerName(""); setOwnerRole(""); setZone(""); setCategory("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Operator Action</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Action title *" value={title} onChange={e => setTitle(e.target.value)} className="text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={type} onValueChange={v => setType(v as OperatorActionType)}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={v => setPriority(v as OperatorActionPriority)}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Zone (optional)" value={zone} onChange={e => setZone(e.target.value)} className="text-xs h-8" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Category (opt)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {PHASE1_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Owner name" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="text-xs h-8" />
            <Select value={ownerRole} onValueChange={setOwnerRole}>
              <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="Ops Lead">Ops Lead</SelectItem>
                <SelectItem value="Dispatch Lead">Dispatch Lead</SelectItem>
                <SelectItem value="Reliability Reviewer">Reliability Reviewer</SelectItem>
                <SelectItem value="Launch Manager">Launch Manager</SelectItem>
                <SelectItem value="Category Lead">Category Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Note…" value={note} onChange={e => setNote(e.target.value)} className="text-xs min-h-[60px]" />
          {isDecisionType && (
            <>
              <Select value={decisionType} onValueChange={setDecisionType}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Decision type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proceed_to_review">Proceed to Review</SelectItem>
                  <SelectItem value="defer">Defer</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="escalate">Escalate</SelectItem>
                  <SelectItem value="accept_risk">Accept Risk</SelectItem>
                  <SelectItem value="request_more_data">Request More Data</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Decision summary…" value={decisionSummary} onChange={e => setDecisionSummary(e.target.value)} className="text-xs min-h-[40px]" />
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({ action, onClose, onSave }: {
  action: OperatorAction | null;
  onClose: () => void;
  onSave: (id: string, note: string, decision?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("");

  const handleSave = () => {
    if (!action || !note.trim()) return;
    const ts = new Date().toLocaleString("en-LK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const appended = action.note ? `${action.note}\n[${ts}] ${note}` : `[${ts}] ${note}`;
    onSave(action.id, appended, decision || undefined);
    setNote(""); setDecision("");
  };

  return (
    <Dialog open={!!action} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Note</DialogTitle>
        </DialogHeader>
        {action?.note && (
          <div className="text-[10px] text-muted-foreground bg-muted/40 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">{action.note}</div>
        )}
        <Textarea placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} className="text-xs min-h-[60px]" />
        <Textarea placeholder="Decision summary (optional)…" value={decision} onChange={e => setDecision(e.target.value)} className="text-xs min-h-[40px]" />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!note.trim()}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OwnerDialog({ action, onClose, onSave }: {
  action: OperatorAction | null;
  onClose: () => void;
  onSave: (id: string, name: string, role: string) => void;
}) {
  const [name, setName] = useState(action?.owner_name || "");
  const [role, setRole] = useState(action?.owner_role || "");

  return (
    <Dialog open={!!action} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Assign Owner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Owner name" value={name} onChange={e => setName(e.target.value)} className="text-sm" />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Ops Lead">Ops Lead</SelectItem>
              <SelectItem value="Dispatch Lead">Dispatch Lead</SelectItem>
              <SelectItem value="Reliability Reviewer">Reliability Reviewer</SelectItem>
              <SelectItem value="Launch Manager">Launch Manager</SelectItem>
              <SelectItem value="Category Lead">Category Lead</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { if (action) onSave(action.id, name, role); }} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
