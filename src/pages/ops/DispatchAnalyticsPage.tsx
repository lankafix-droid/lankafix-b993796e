import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Zap, MapPin, Users, Clock, TrendingUp, AlertTriangle, Thermometer, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { DISPATCH_DEFAULTS, CATEGORY_DAILY_CAPACITY } from "@/lib/locationUtils";
import { COLOMBO_ZONES_DATA } from "@/data/colomboZones";

// Mock analytics
const mockDispatchAnalytics = {
  avgAssignmentSeconds: 18,
  medianAssignmentSeconds: 14,
  slaComplianceRate: 91,
  avgDispatchScore: 74,
  totalDispatches: 8_420,
  successRate: 94,
  failedDispatches: 505,
  manualQueueCount: 42,
  avgEtaMinutes: 28,
  surgeActive: true,
  surgeMultiplier: 1.1,
  surgeReason: "Peak hour demand",
  weatherCondition: "hot" as const,
  weatherDemandMultiplier: 1.3,
  technicianUtilization: [
    { id: "T001", name: "Kasun P.", jobsToday: 3, capacity: 4, score: 87, zone: "Colombo 7" },
    { id: "T002", name: "Nadeesha S.", jobsToday: 1, capacity: 3, score: 92, zone: "Rajagiriya" },
    { id: "T003", name: "Ruwan F.", jobsToday: 4, capacity: 8, score: 78, zone: "Nugegoda" },
    { id: "T005", name: "Chaminda B.", jobsToday: 1, capacity: 2, score: 90, zone: "Battaramulla" },
    { id: "T006", name: "Saman K.", jobsToday: 0, capacity: 4, score: 65, zone: "Maharagama" },
    { id: "T007", name: "Priyantha S.", jobsToday: 2, capacity: 5, score: 85, zone: "Colombo 3" },
  ],
  offerAcceptance: { accepted: 7_910, rejected: 420, timeout: 580, avgResponseMs: 6_200 },
  zoneHeatmap: [
    { zone: "Colombo 7", demand: 85, techs: 4 },
    { zone: "Rajagiriya", demand: 65, techs: 3 },
    { zone: "Nugegoda", demand: 72, techs: 2 },
    { zone: "Dehiwala", demand: 58, techs: 2 },
    { zone: "Maharagama", demand: 45, techs: 1 },
    { zone: "Battaramulla", demand: 40, techs: 2 },
    { zone: "Wattala", demand: 35, techs: 1 },
    { zone: "Mount Lavinia", demand: 30, techs: 1 },
  ],
  categoryDemand: [
    { category: "AC", demand: 340, percent: 32 },
    { category: "IT", demand: 210, percent: 20 },
    { category: "CCTV", demand: 180, percent: 17 },
    { category: "MOBILE", demand: 150, percent: 14 },
    { category: "COPIER", demand: 90, percent: 8 },
    { category: "SOLAR", demand: 50, percent: 5 },
    { category: "Other", demand: 40, percent: 4 },
  ],
};

const DispatchAnalyticsPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 bg-background">
      <div className="container py-8 max-w-5xl">
        <Link to="/ops/dispatch" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Ops Board
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Smart Dispatch Analytics</h1>
            <p className="text-sm text-muted-foreground">V2 dispatch performance, SLA compliance, and geo intelligence</p>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg Assignment Time</p>
              <p className="text-2xl font-bold text-foreground">{mockDispatchAnalytics.avgAssignmentSeconds}s</p>
              <p className="text-[10px] text-muted-foreground">Target: &lt;30s</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">SLA Compliance</p>
              <p className="text-2xl font-bold text-success">{mockDispatchAnalytics.slaComplianceRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Dispatch Success</p>
              <p className="text-2xl font-bold text-primary">{mockDispatchAnalytics.successRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg ETA</p>
              <p className="text-2xl font-bold text-foreground">{mockDispatchAnalytics.avgEtaMinutes} min</p>
            </CardContent>
          </Card>
        </div>

        {/* Surge & Weather */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className={mockDispatchAnalytics.surgeActive ? "border-warning/40" : ""}>
            <CardContent className="p-4 flex items-center gap-4">
              <Zap className={`w-8 h-8 ${mockDispatchAnalytics.surgeActive ? "text-warning" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {mockDispatchAnalytics.surgeActive ? "Surge Pricing Active" : "No Surge"}
                </p>
                {mockDispatchAnalytics.surgeActive && (
                  <>
                    <p className="text-xs text-muted-foreground">{mockDispatchAnalytics.surgeReason}</p>
                    <Badge variant="outline" className="mt-1 text-xs">+{Math.round((mockDispatchAnalytics.surgeMultiplier - 1) * 100)}% surcharge</Badge>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <Thermometer className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-foreground">Weather: {mockDispatchAnalytics.weatherCondition.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">AC demand multiplier: {mockDispatchAnalytics.weatherDemandMultiplier}x</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Technician Utilization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Technician Utilization & Fairness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockDispatchAnalytics.technicianUtilization.map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{t.name}</span>
                      <Badge variant="outline" className="text-[10px]">{t.zone}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">Score: {t.score}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={(t.jobsToday / t.capacity) * 100} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">{t.jobsToday}/{t.capacity}</span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 text-xs text-muted-foreground">
                <p>Accept window: {DISPATCH_DEFAULTS.acceptWindow}s · Max attempts: {DISPATCH_DEFAULTS.maxDispatchAttempts}</p>
              </div>
            </CardContent>
          </Card>

          {/* Zone Demand Heatmap */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Zone Demand Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockDispatchAnalytics.zoneHeatmap.map((z) => (
                <div key={z.zone} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{z.zone}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{z.techs} techs</Badge>
                      <span className="text-xs font-medium text-muted-foreground">{z.demand}%</span>
                    </div>
                  </div>
                  <Progress
                    value={z.demand}
                    className={`h-1.5 ${z.demand > 70 ? "[&>div]:bg-destructive" : z.demand > 50 ? "[&>div]:bg-warning" : ""}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Offer Acceptance Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Offer Acceptance Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Accepted</p>
                  <p className="text-lg font-bold text-success">{mockDispatchAnalytics.offerAcceptance.accepted.toLocaleString()}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                  <p className="text-lg font-bold text-foreground">{(mockDispatchAnalytics.offerAcceptance.avgResponseMs / 1000).toFixed(1)}s</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-lg font-bold text-warning">{mockDispatchAnalytics.offerAcceptance.rejected}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Timed Out</p>
                  <p className="text-lg font-bold text-destructive">{mockDispatchAnalytics.offerAcceptance.timeout}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Manual queue: {mockDispatchAnalytics.manualQueueCount} jobs pending manual assignment</span>
              </div>
            </CardContent>
          </Card>

          {/* Category Demand */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Category Demand Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockDispatchAnalytics.categoryDemand.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{c.category}</span>
                    <span className="text-xs font-medium text-muted-foreground">{c.demand} jobs ({c.percent}%)</span>
                  </div>
                  <Progress value={c.percent} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* V2 Score Breakdown Info */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              V2 Dispatch Score Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Skill Match", weight: "30%", color: "bg-primary" },
                { label: "Distance", weight: "25%", color: "bg-primary/80" },
                { label: "Rating", weight: "15%", color: "bg-primary/60" },
                { label: "Availability", weight: "10%", color: "bg-primary/40" },
                { label: "Workload", weight: "10%", color: "bg-primary/30" },
                { label: "SLA Reliability", weight: "5%", color: "bg-primary/20" },
                { label: "Idle Time", weight: "5%", color: "bg-primary/10" },
              ].map((w) => (
                <div key={w.label} className="bg-muted/50 rounded-xl p-3">
                  <div className={`w-3 h-3 rounded-full ${w.color} mb-2`} />
                  <p className="text-xs font-medium text-foreground">{w.label}</p>
                  <p className="text-lg font-bold text-primary">{w.weight}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <p>+ Tier bonus (Verified/Pro/Elite/Enterprise)</p>
              <p>+ Emergency proximity bonus (+15 for available tech within 5km)</p>
              <p>+ Repeat customer match (+{DISPATCH_DEFAULTS.repeatCustomerBoost})</p>
              <p>+ AMC subscriber priority (+{DISPATCH_DEFAULTS.subscriberBoost})</p>
              <p>+ Fairness: idle boost (+{DISPATCH_DEFAULTS.idleBoostPoints}) / overwork penalty (-{DISPATCH_DEFAULTS.recentJobPenaltyPoints})</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
    <Footer />
  </div>
);

export default DispatchAnalyticsPage;
