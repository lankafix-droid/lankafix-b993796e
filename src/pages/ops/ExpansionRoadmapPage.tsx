import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MapPin, Users, TrendingUp, Target, ArrowUp, Zap, BarChart3,
  Building2, CheckCircle2, AlertTriangle, Clock, DollarSign, Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  generateMockExpansionScores, generateMockRecruitmentTargets,
  generateMockCategoryTrends, generateMockHeatmap,
} from "@/engines/demandIntelligenceEngine";

const expansionScores = generateMockExpansionScores();
const recruitmentTargets = generateMockRecruitmentTargets();
const categoryTrends = generateMockCategoryTrends();
const heatmap = generateMockHeatmap();

const GROWTH_KPIS = [
  { label: "Active Technicians", value: "89", target: "150", progress: 59, icon: Users, trend: "+12 this month" },
  { label: "Monthly Bookings", value: "1,240", target: "3,000", progress: 41, icon: BarChart3, trend: "+18% MoM" },
  { label: "Platform Revenue", value: "LKR 2.8M", target: "LKR 10M", progress: 28, icon: DollarSign, trend: "+22% MoM" },
  { label: "City Coverage", value: "3/10", target: "10 cities", progress: 30, icon: MapPin, trend: "Colombo, Gampaha, Negombo" },
];

const READINESS_COLORS: Record<string, string> = {
  launch_ready: "bg-success/10 text-success border-success/30",
  pilot_ready: "bg-warning/10 text-warning border-warning/30",
  waitlist_only: "bg-muted text-muted-foreground",
};

const ExpansionRoadmapPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Expansion Roadmap</h1>
                <p className="text-xs text-muted-foreground">Market domination tracker</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-success border-success/30 bg-success/10">
                <Activity className="w-3 h-3" /> Live
              </Badge>
              <Link to="/ops/ai-growth" className="text-xs text-muted-foreground hover:text-primary">AI Engine →</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Growth KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {GROWTH_KPIS.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <kpi.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-foreground">{kpi.value}</span>
                  <span className="text-[10px] text-muted-foreground">/ {kpi.target}</span>
                </div>
                <Progress value={kpi.progress} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-2.5 h-2.5 text-success" /> {kpi.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* District Expansion Readiness */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> District Expansion Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expansionScores.map((d) => (
              <div key={d.districtId} className="p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{d.readinessScore}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{d.districtName}</span>
                      <Badge variant="outline" className={`ml-2 text-[10px] ${READINESS_COLORS[d.readiness]}`}>
                        {d.readiness.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3 text-xs text-muted-foreground">
                  <div>
                    <span className="block text-foreground font-medium">{d.diagnosisVolume}</span>
                    Diagnosis volume
                  </div>
                  <div>
                    <span className="block text-foreground font-medium">{d.bookingConversion}%</span>
                    Conversion
                  </div>
                  <div>
                    <span className="block text-foreground font-medium">{d.technicianAvailability}</span>
                    Technicians
                  </div>
                  <div>
                    <span className="block text-foreground font-medium">LKR {d.avgServiceRevenue.toLocaleString()}</span>
                    Avg Revenue
                  </div>
                </div>
                <Progress value={d.readinessScore} className="h-1.5 mt-3" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recruitment Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Recruitment Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recruitmentTargets.map((r) => (
              <div key={`${r.zoneId}-${r.categoryCode}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className={`w-2 h-10 rounded-full shrink-0 ${
                  r.priority === "urgent" ? "bg-destructive" :
                  r.priority === "moderate" ? "bg-warning" : "bg-muted-foreground"
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{r.zoneLabel}</span>
                    <Badge variant="outline" className="text-[10px]">{r.categoryCode}</Badge>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Current: {r.currentTechnicians}</span>
                    <span>Need: {r.requiredTechnicians}</span>
                    <span className="text-destructive font-medium">Gap: {r.deficit}</span>
                  </div>
                </div>
                <Badge variant={r.priority === "urgent" ? "destructive" : "outline"} className="text-[10px]">
                  {r.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expansion Strategies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> AI Expansion Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { priority: "high", title: "Launch Gampaha AC services", desc: "High AC demand detected with 3 verified technicians ready. Projected 45 bookings/month.", action: "Activate zone" },
              { priority: "high", title: "Recruit CCTV installers in Negombo", desc: "CCTV installation demand 3x higher than supply. Partner with 2 local security companies.", action: "Start recruitment" },
              { priority: "medium", title: "Pilot IT services in Kandy", desc: "Strong diagnosis activity but low conversion. Need 5 IT technicians to start.", action: "Launch pilot" },
              { priority: "medium", title: "Expand plumbing to Kalutara", desc: "Waitlist has 120+ requests. Partner with Kalutara Plumbers Association.", action: "Partner outreach" },
              { priority: "low", title: "Solar services for Southern Province", desc: "Growing demand in Galle/Matara. Requires 3 certified solar installers.", action: "Monitor demand" },
            ].map((s, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                s.priority === "high" ? "bg-primary/5 border-primary/20" :
                s.priority === "medium" ? "bg-warning/5 border-warning/20" :
                "bg-muted/30"
              }`}>
                <div className="flex items-center gap-2">
                  <Badge variant={s.priority === "high" ? "default" : "outline"} className="text-[10px]">
                    {s.priority}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{s.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                <Badge variant="outline" className="text-[10px] mt-2 text-primary border-primary/30">{s.action}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Network Effects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Marketplace Network Effects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <TrendingUp className="w-6 h-6 text-primary mx-auto" />
                <p className="text-xl font-bold text-foreground mt-2">2.4x</p>
                <p className="text-[10px] text-muted-foreground">Supply/Demand Multiplier</p>
              </div>
              <div className="p-4 rounded-xl bg-success/5 border border-success/10">
                <Users className="w-6 h-6 text-success mx-auto" />
                <p className="text-xl font-bold text-foreground mt-2">32%</p>
                <p className="text-[10px] text-muted-foreground">Repeat Customer Rate</p>
              </div>
              <div className="p-4 rounded-xl bg-warning/5 border border-warning/10">
                <Clock className="w-6 h-6 text-warning mx-auto" />
                <p className="text-xl font-bold text-foreground mt-2">28min</p>
                <p className="text-[10px] text-muted-foreground">Avg Dispatch Time</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border">
                <Building2 className="w-6 h-6 text-muted-foreground mx-auto" />
                <p className="text-xl font-bold text-foreground mt-2">70%</p>
                <p className="text-[10px] text-muted-foreground">Referral Conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpansionRoadmapPage;
