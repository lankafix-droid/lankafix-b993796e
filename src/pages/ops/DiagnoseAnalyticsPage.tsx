import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, Target, TrendingUp, AlertTriangle, Users, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { POPULAR_ISSUES, CANCELLATION_REASONS } from "@/engines/diagnoseEngine";

// Mock analytics data
const mockAnalytics = {
  totalDiagnoses: 4_280,
  completedDiagnoses: 3_540,
  completionRate: 83,
  conversionToBooking: 2_124,
  conversionRate: 60,
  accuracyRate: 78,
  abandonment: { total: 740, recovered: 185, recoveryRate: 25 },
  topProblems: [
    { problem: "AC not cooling", category: "AC" as const, count: 890 },
    { problem: "Printer paper jam", category: "COPIER" as const, count: 520 },
    { problem: "Router slow internet", category: "IT" as const, count: 480 },
    { problem: "Mobile screen broken", category: "MOBILE" as const, count: 410 },
    { problem: "AC water leakage", category: "AC" as const, count: 350 },
    { problem: "Battery draining fast", category: "MOBILE" as const, count: 290 },
    { problem: "CCTV camera not showing", category: "CCTV" as const, count: 260 },
    { problem: "Solar low output", category: "SOLAR" as const, count: 180 },
  ],
  cancellationBreakdown: [
    { reason: "Price too high", count: 120, percent: 32 },
    { reason: "Issue resolved", count: 85, percent: 23 },
    { reason: "Booked elsewhere", count: 68, percent: 18 },
    { reason: "Technician delay", count: 45, percent: 12 },
    { reason: "Wrong diagnosis", count: 30, percent: 8 },
    { reason: "Changed mind", count: 26, percent: 7 },
  ],
  aiLearning: {
    totalFeedbacks: 1_820,
    matchedPredictions: 1_420,
    accuracyTrend: [72, 74, 75, 76, 78, 78],
  },
  intentScoreDistribution: [
    { range: "0-20 (Browse)", count: 1_200 },
    { range: "21-50 (Interest)", count: 1_580 },
    { range: "51-80 (Intent)", count: 980 },
    { range: "81+ (Ready to book)", count: 520 },
  ],
};

const DiagnoseAnalyticsPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 bg-background">
      <div className="container py-8 max-w-5xl">
        <Link to="/ops/dispatch" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Ops Board
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Diagnosis Analytics</h1>
            <p className="text-sm text-muted-foreground">AI diagnosis performance, conversion & customer intelligence</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Diagnoses</p>
              <p className="text-2xl font-bold text-foreground">{mockAnalytics.totalDiagnoses.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-success">{mockAnalytics.completionRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Booking Conversion</p>
              <p className="text-2xl font-bold text-primary">{mockAnalytics.conversionRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">AI Accuracy</p>
              <p className="text-2xl font-bold text-foreground">{mockAnalytics.accuracyRate}%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Diagnosed Problems */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Most Diagnosed Problems
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAnalytics.topProblems.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{p.problem}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                      <span className="text-xs font-medium text-muted-foreground">{p.count}</span>
                    </div>
                  </div>
                  <Progress value={(p.count / mockAnalytics.topProblems[0].count) * 100} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Cancellation Intelligence */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Cancellation Reasons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAnalytics.cancellationBreakdown.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{c.reason}</span>
                    <span className="text-xs font-medium text-muted-foreground">{c.percent}%</span>
                  </div>
                  <Progress value={c.percent} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Learning */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-success" />
                AI Prediction Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Feedbacks</p>
                  <p className="text-lg font-bold text-foreground">{mockAnalytics.aiLearning.totalFeedbacks.toLocaleString()}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Matched Predictions</p>
                  <p className="text-lg font-bold text-success">{mockAnalytics.aiLearning.matchedPredictions.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Accuracy Trend (Last 6 Months)</p>
                <div className="flex items-end gap-1 h-16">
                  {mockAnalytics.aiLearning.accuracyTrend.map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/20 rounded-t"
                        style={{ height: `${val * 0.8}%` }}
                      >
                        <div
                          className="w-full bg-primary rounded-t"
                          style={{ height: `${val}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{val}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Intent */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Customer Intent Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAnalytics.intentScoreDistribution.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{d.range}</span>
                    <span className="text-xs font-medium text-muted-foreground">{d.count.toLocaleString()}</span>
                  </div>
                  <Progress value={(d.count / 1580) * 100} className="h-1.5" />
                </div>
              ))}

              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-2">Abandoned Booking Recovery</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Abandoned</p>
                    <p className="text-sm font-bold text-foreground">{mockAnalytics.abandonment.total}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Recovered</p>
                    <p className="text-sm font-bold text-success">{mockAnalytics.abandonment.recovered}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Rate</p>
                    <p className="text-sm font-bold text-primary">{mockAnalytics.abandonment.recoveryRate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default DiagnoseAnalyticsPage;
