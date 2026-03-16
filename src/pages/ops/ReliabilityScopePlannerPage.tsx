/**
 * Reliability Guardrails Scope Planner — Simulation-only planning surface.
 * Does NOT affect live dispatch, bookings, or marketplace behavior.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Shield, Target, AlertOctagon, AlertTriangle, CheckCircle2, MapPin, Layers,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import {
  fetchReliabilityScopePlannerContext,
  verdictColor, rolloutReadinessColor, recommendedModeColor,
  type ReliabilityRolloutSummary, type ZoneReliabilitySummary,
} from "@/services/reliabilityReadModel";
import { computeScopePlan, type ScopePlannerInput, type PartnerTier, type TimeWindow } from "@/engines/reliabilityScopePlannerEngine";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";
import { categories } from "@/data/categories";

const PILOT_ZONE_IDS = [
  "col_01","col_02","col_03","col_04","col_05","col_06","col_07",
  "col_08","col_09","col_10","col_11","col_12","col_13","col_14","col_15",
  "rajagiriya","battaramulla","nawala","nugegoda","dehiwala","mt_lavinia",
  "thalawathugoda","negombo","wattala","moratuwa",
];

const ZONE_LABEL_MAP: Record<string, string> = {};
COLOMBO_ZONES_DATA.forEach(z => { ZONE_LABEL_MAP[z.id] = z.label; });

const CATEGORY_CODES = categories.map(c => c.code);

const STATUS_COLORS: Record<string, string> = {
  BLOCKED: "text-destructive",
  OBSERVE_ONLY: "text-muted-foreground",
  CONTROLLED_PILOT: "text-warning",
  PILOT_READY: "text-primary",
  BROAD_READY: "text-success",
};

const SAFETY_COLORS: Record<string, string> = {
  SAFE: "text-success",
  GUARDED: "text-warning",
  RESTRICTED: "text-muted-foreground",
  BLOCKED: "text-destructive",
};

export default function ReliabilityScopePlannerPage() {
  const navigate = useNavigate();
  const { data: ctx, isLoading } = useQuery({
    queryKey: ["scope-planner-context"],
    queryFn: fetchReliabilityScopePlannerContext,
    staleTime: 60_000,
  });
  const rollout = ctx?.rolloutSummary;
  const zoneReliability = ctx?.zoneReliability || [];

  // ── Local scope builder state ──
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [partnerTier, setPartnerTier] = useState<PartnerTier>("all");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("all_day");
  const [requestedPercent, setRequestedPercent] = useState(10);

  // ── Compute scope plan ──
  const scopePlan = useMemo(() => {
    if (!rollout) return null;
    const input: ScopePlannerInput = {
      reliabilityScore: rollout.reliabilityScore,
      dispatchRiskLevel: rollout.dispatchRiskLevel as any,
      rolloutReadiness: rollout.rolloutReadiness,
      recommendedMode: rollout.recommendedMode,
      recommendedRolloutPercent: rollout.recommendedRolloutPercent,
      emergencyKillSwitch: rollout.flags.emergencyKillSwitch,
      availableZones: PILOT_ZONE_IDS,
      availableCategories: CATEGORY_CODES,
      activePartnerCount: 0,
      selectedZones,
      selectedCategories,
      selectedPartnerTier: partnerTier,
      selectedTimeWindow: timeWindow,
      requestedRolloutPercent: requestedPercent,
    };
    return computeScopePlan(input);
  }, [rollout, selectedZones, selectedCategories, partnerTier, timeWindow, requestedPercent]);

  const toggleZone = (id: string) => setSelectedZones(prev => prev.includes(id) ? prev.filter(z => z !== id) : [...prev, id]);
  const toggleCategory = (code: string) => setSelectedCategories(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl safe-area-top">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Reliability Scope Planner</h1>
          <Badge variant="outline" className="text-[10px]">Simulation Only</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mb-6">
          Plan guardrail rollout scope without affecting live dispatch
        </p>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-12">Loading governance data…</div>
        ) : !rollout ? (
          <div className="text-center text-muted-foreground text-sm py-12">Unable to load rollout summary.</div>
        ) : (
          <div className="space-y-5">

            {/* ── Section 1: Current Governance Posture ── */}
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Current Governance Posture
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className={`text-xl font-bold ${verdictColor(rollout.verdict)}`}>{rollout.reliabilityScore}</p>
                    <p className="text-[9px] text-muted-foreground">Score</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${verdictColor(rollout.verdict)}`}>{rollout.verdict}</p>
                    <p className="text-[9px] text-muted-foreground">Verdict</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${rolloutReadinessColor(rollout.rolloutReadiness)}`}>
                      {rollout.rolloutReadiness.replace(/_/g, " ")}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Readiness</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${recommendedModeColor(rollout.recommendedMode)}`}>
                      {rollout.recommendedMode.replace(/_/g, " ")}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Rec. Mode</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-foreground">{rollout.recommendedRolloutPercent}%</p>
                    <p className="text-[9px] text-muted-foreground">Rec. %</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${rollout.flags.guardrailsEnabled ? "text-success" : "text-muted-foreground"}`}>
                      {rollout.flags.guardrailsEnabled ? "ON" : "OFF"}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Guardrails</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${rollout.flags.emergencyKillSwitch ? "text-destructive" : "text-muted-foreground"}`}>
                      {rollout.flags.emergencyKillSwitch ? "ACTIVE" : "INACTIVE"}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Kill Switch</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kill switch banner */}
            {rollout.flags.emergencyKillSwitch && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">
                  Emergency kill switch blocks any rollout planning progression
                </p>
              </div>
            )}

            {/* ── Section 2: Scope Builder ── */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Scope Builder
                </h2>

                {/* Zones */}
                <div>
                  <p className="text-[10px] font-medium text-foreground mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Zones
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PILOT_ZONE_IDS.map(id => (
                      <label key={id} className="flex items-center gap-1 text-[10px] cursor-pointer">
                        <Checkbox
                          checked={selectedZones.includes(id)}
                          onCheckedChange={() => toggleZone(id)}
                          className="w-3 h-3"
                        />
                        <span className="text-muted-foreground">{ZONE_LABEL_MAP[id] || id}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <p className="text-[10px] font-medium text-foreground mb-1.5">Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_CODES.map(code => (
                      <label key={code} className="flex items-center gap-1 text-[10px] cursor-pointer">
                        <Checkbox
                          checked={selectedCategories.includes(code)}
                          onCheckedChange={() => toggleCategory(code)}
                          className="w-3 h-3"
                        />
                        <span className="text-muted-foreground">{code}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Partner tier + time window */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-foreground mb-1">Partner Tier</p>
                    <Select value={partnerTier} onValueChange={v => setPartnerTier(v as PartnerTier)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="top_rated">Top Rated</SelectItem>
                        <SelectItem value="elite">Elite / Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-foreground mb-1">Time Window</p>
                    <Select value={timeWindow} onValueChange={v => setTimeWindow(v as TimeWindow)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_day">All Day</SelectItem>
                        <SelectItem value="peak_hours">Peak Hours</SelectItem>
                        <SelectItem value="off_peak">Off-Peak</SelectItem>
                        <SelectItem value="emergency_only">Emergency Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rollout percent slider */}
                <div>
                  <p className="text-[10px] font-medium text-foreground mb-1">
                    Requested Rollout: <span className="font-bold">{requestedPercent}%</span>
                  </p>
                  <Slider
                    value={[requestedPercent]}
                    onValueChange={v => setRequestedPercent(v[0])}
                    min={0} max={50} step={5}
                    className="w-full"
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5">Max 50% — governance cap</p>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 3: Scope Evaluation ── */}
            {scopePlan && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Scope Evaluation
                  </h2>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className={`text-sm font-bold ${STATUS_COLORS[scopePlan.plannerStatus] || "text-foreground"}`}>
                        {scopePlan.plannerStatus.replace(/_/g, " ")}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Status</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{scopePlan.effectiveRolloutPercent}%</p>
                      <p className="text-[9px] text-muted-foreground">Effective %</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${SAFETY_COLORS[scopePlan.scopeSafetyLevel] || "text-foreground"}`}>
                        {scopePlan.scopeSafetyLevel}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Safety Level</p>
                    </div>
                  </div>

                  {/* Warnings */}
                  {scopePlan.rolloutWarnings.length > 0 && (
                    <div className="space-y-1">
                      {scopePlan.rolloutWarnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-warning">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-foreground">{scopePlan.plannerRecommendation}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section 4: Zone Eligibility Matrix ── */}
            {scopePlan && scopePlan.zoneEligibilityMap.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Zone Eligibility
                  </h2>
                  <div className="space-y-1">
                    {scopePlan.zoneEligibilityMap.map(z => (
                      <div key={z.zoneId} className="flex items-center justify-between text-[10px] py-1 border-b border-border/50 last:border-0">
                        <span className="text-foreground">{ZONE_LABEL_MAP[z.zoneId] || z.zoneId}</span>
                        <div className="flex items-center gap-1.5">
                          {z.eligible ? (
                            <CheckCircle2 className="w-3 h-3 text-success" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                          )}
                          <span className={z.eligible ? "text-success" : "text-muted-foreground"}>
                            {z.reason}
                            {(() => {
                              const zr = zoneReliability.find(zri => zri.zoneId === z.zoneId);
                              return zr && zr.riskLevel !== "LOW" ? ` (zone risk: ${zr.riskLevel})` : "";
                            })()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section 5: Category Eligibility Matrix ── */}
            {scopePlan && scopePlan.categoryEligibilityMap.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Category Eligibility
                  </h2>
                  <div className="space-y-1">
                    {scopePlan.categoryEligibilityMap.map(c => (
                      <div key={c.category} className="flex items-center justify-between text-[10px] py-1 border-b border-border/50 last:border-0">
                        <span className="text-foreground">{c.category}</span>
                        <div className="flex items-center gap-1.5">
                          {c.eligible ? (
                            <CheckCircle2 className="w-3 h-3 text-success" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                          )}
                          <span className={c.eligible ? "text-success" : "text-muted-foreground"}>{c.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Rollback Triggers + Success Criteria ── */}
            {scopePlan && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Rollback Triggers</h3>
                    {scopePlan.rollbackTriggers.map((t, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                        <AlertOctagon className="w-2.5 h-2.5 mt-0.5 text-destructive shrink-0" /> {t}
                      </p>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-[10px] font-semibold text-success uppercase tracking-wider">Success Criteria</h3>
                    {scopePlan.successCriteria.map((c, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 mt-0.5 text-success shrink-0" /> {c}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Section 6: Governance Notice ── */}
            <p className="text-[9px] text-muted-foreground text-center italic pb-4">
              Simulation only — no live enforcement active
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
