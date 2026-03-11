import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, ArrowLeft, Loader2, RefreshCw, Users, Heart, AlertTriangle,
  BarChart3, Bell, Target, CheckCircle2, TrendingUp, TrendingDown,
  Clock, Zap, UserX, UserCheck, Repeat, FileText,
} from "lucide-react";

interface DashboardSummary {
  total_customers: number;
  repeat_customers: number;
  repeat_rate: number;
  high_churn_risk: number;
  medium_churn_risk: number;
  low_churn_risk: number;
  quotes_expiring_soon: number;
  reminders_due_today: number;
  total_reminders: number;
}

interface ReminderPerformance {
  total: number;
  viewed: number;
  clicked: number;
  completed: number;
  view_rate: number;
  click_rate: number;
  conversion_rate: number;
}

interface CategoryInsight {
  category_code: string;
  category_name: string;
  total_customers: number;
  repeat_customers: number;
  retention_rate: number;
  churning_customers: number;
  has_maintenance_schedule: boolean;
}

interface RetentionDashboardData {
  summary: DashboardSummary;
  reminder_performance: ReminderPerformance;
  category_insights: CategoryInsight[];
  churn_segments: { high: number; medium: number; low: number };
  generated_at: string;
}

function KPICard({ label, value, sub, icon: Icon, variant }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; variant?: "success" | "warning" | "destructive";
}) {
  const colorMap = { success: "text-success", warning: "text-warning", destructive: "text-destructive" };
  const bgMap = { success: "bg-success/10", warning: "bg-warning/10", destructive: "bg-destructive/10" };
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${variant ? bgMap[variant] : "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${variant ? colorMap[variant] : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RetentionDashboardPage() {
  const [data, setData] = useState<RetentionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("retention-engine", {
        body: { mode: "dashboard" },
      });
      if (err) throw new Error(err.message);
      setData(res as RetentionDashboardData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load retention data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing retention data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error || "No data"}</p>
            <Button onClick={fetchData} variant="outline" size="sm"><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = data.summary;
  const perf = data.reminder_performance;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ops/ai-growth"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <Heart className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Retention Intelligence</h1>
              <p className="text-[10px] text-muted-foreground">Updated {new Date(data.generated_at).toLocaleTimeString("en-LK")}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 gap-1 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview" className="text-[11px]">Overview</TabsTrigger>
            <TabsTrigger value="categories" className="text-[11px]">Categories</TabsTrigger>
            <TabsTrigger value="reminders" className="text-[11px]">Reminders</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW ═══ */}
          <TabsContent value="overview" className="space-y-5 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Total Customers" value={s.total_customers} icon={Users} />
              <KPICard label="Repeat Customers" value={s.repeat_customers} sub={`${s.repeat_rate}% repeat rate`} icon={Repeat} variant="success" />
              <KPICard label="Reminders Due Today" value={s.reminders_due_today} icon={Bell} />
              <KPICard label="Quotes Expiring" value={s.quotes_expiring_soon} sub="Within 3 days" icon={FileText} variant="warning" />
            </div>

            {/* Churn segments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserX className="w-4 h-4 text-destructive" /> Churn Risk Segments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/15 text-center">
                    <p className="text-2xl font-bold text-destructive">{data.churn_segments.high}</p>
                    <p className="text-[10px] text-muted-foreground">High Risk</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/5 border border-warning/15 text-center">
                    <p className="text-2xl font-bold text-warning">{data.churn_segments.medium}</p>
                    <p className="text-[10px] text-muted-foreground">Medium Risk</p>
                  </div>
                  <div className="p-3 rounded-lg bg-success/5 border border-success/15 text-center">
                    <p className="text-2xl font-bold text-success">{data.churn_segments.low}</p>
                    <p className="text-[10px] text-muted-foreground">Low Risk</p>
                  </div>
                </div>
                {s.total_customers > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={100 - Math.round((data.churn_segments.high / s.total_customers) * 100)} className="h-2 flex-1" />
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(((s.total_customers - data.churn_segments.high) / s.total_customers) * 100)}% healthy
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick action cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {s.quotes_expiring_soon > 0 && (
                <Card className="border-warning/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-foreground">{s.quotes_expiring_soon} Quotes Expiring Soon</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Send follow-up reminders to recover these quotes before they expire.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {data.churn_segments.high > 0 && (
                <Card className="border-destructive/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Zap className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-foreground">{data.churn_segments.high} High-Churn Customers</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">These customers haven't booked in over 6 months or had negative experiences.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ═══ CATEGORIES ═══ */}
          <TabsContent value="categories" className="space-y-5 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Category Retention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.category_insights.map(ci => (
                  <div key={ci.category_code} className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{ci.category_name}</span>
                        {ci.has_maintenance_schedule && (
                          <Badge variant="outline" className="text-[8px] bg-primary/5 text-primary border-primary/20">Scheduled</Badge>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${ci.retention_rate >= 30 ? "text-success" : ci.retention_rate >= 15 ? "text-warning" : "text-destructive"}`}>
                        {ci.retention_rate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={ci.retention_rate} className="h-1.5 flex-1" />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
                      <span>{ci.total_customers} customers</span>
                      <span className="text-success">{ci.repeat_customers} repeat</span>
                      {ci.churning_customers > 0 && <span className="text-destructive">{ci.churning_customers} churning</span>}
                    </div>
                  </div>
                ))}
                {data.category_insights.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No customer data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ REMINDERS ═══ */}
          <TabsContent value="reminders" className="space-y-5 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Total Reminders" value={perf.total} icon={Bell} />
              <KPICard label="View Rate" value={`${perf.view_rate}%`} sub={`${perf.viewed} viewed`} icon={Target} />
              <KPICard label="Click Rate" value={`${perf.click_rate}%`} sub={`${perf.clicked} clicked`} icon={TrendingUp} />
              <KPICard label="Conversion" value={`${perf.conversion_rate}%`} sub={`${perf.completed} converted`} icon={CheckCircle2} variant="success" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reminder Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Sent", value: perf.total, pct: 100, color: "bg-primary" },
                  { label: "Viewed", value: perf.viewed, pct: perf.view_rate, color: "bg-primary/70" },
                  { label: "Clicked", value: perf.clicked, pct: perf.click_rate, color: "bg-success/70" },
                  { label: "Converted", value: perf.completed, pct: perf.conversion_rate, color: "bg-success" },
                ].map((step, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-foreground font-medium">{step.label}</span>
                      <span className="text-muted-foreground">{step.value} ({step.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${step.color} transition-all`} style={{ width: `${step.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
