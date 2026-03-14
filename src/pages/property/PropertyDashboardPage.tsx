import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Plus, ChevronRight, Shield, Zap, Thermometer, Eye,
  AlertTriangle, CalendarClock, Wrench, Lightbulb,
} from "lucide-react";
import { usePropertyDigitalTwin } from "@/hooks/usePropertyDigitalTwin";
import { useAuth } from "@/hooks/useAuth";
import PropertyCreateDialog from "@/components/property/PropertyCreateDialog";
import { useState } from "react";

const SCORE_COLORS: Record<string, string> = {
  high: "text-green-600", medium: "text-amber-500", low: "text-destructive",
};
const scoreLevel = (v: number) => (v >= 70 ? "high" : v >= 40 ? "medium" : "low");

export default function PropertyDashboardPage() {
  const { user } = useAuth();
  const { properties, assets, schedules, insights, isLoading, computeHealthScore, getAssetsForProperty, getSchedulesForProperty, getInsightsForProperty, ASSET_CATEGORY_ICONS } = usePropertyDigitalTwin();
  const [showCreate, setShowCreate] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card><CardContent className="p-8 text-center">
            <Home className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Sign in to access your Property Digital Twin</p>
            <Button asChild><Link to="/account">Sign In</Link></Button>
          </CardContent></Card>
        </main>
        <Footer />
      </div>
    );
  }

  const primaryProperty = properties[0];
  const health = primaryProperty ? computeHealthScore(primaryProperty.id) : null;

  const upcomingMaint = primaryProperty ? getSchedulesForProperty(primaryProperty.id).filter((s) => s.status === "upcoming").slice(0, 4) : [];
  const activeInsights = primaryProperty ? getInsightsForProperty(primaryProperty.id).slice(0, 3) : [];
  const propAssets = primaryProperty ? getAssetsForProperty(primaryProperty.id) : [];

  // Group assets by category
  const assetGroups = propAssets.reduce<Record<string, typeof propAssets>>((acc, a) => {
    (acc[a.asset_category] = acc[a.asset_category] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-lg py-6 px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Home className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">My Property</h1>
                <p className="text-xs text-muted-foreground">AI Property Digital Twin</p>
              </div>
            </div>
            {properties.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : !primaryProperty ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="p-8 text-center">
                <Home className="w-12 h-12 text-primary/40 mx-auto mb-3" />
                <h2 className="font-semibold text-foreground mb-1">Create Your Property Profile</h2>
                <p className="text-sm text-muted-foreground mb-4">Start building your Digital Twin to track infrastructure & get smart maintenance reminders.</p>
                <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Create Property</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Health Score */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="mb-5 border-primary/20 bg-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-foreground">{primaryProperty.property_name}</span>
                        <span className="text-xs text-muted-foreground ml-2 capitalize">{primaryProperty.property_type}</span>
                      </div>
                      <Badge variant={health!.overall >= 70 ? "default" : "destructive"}>{health!.overall}%</Badge>
                    </div>
                    <Progress value={health!.overall} className="h-2.5 mb-4" />
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { icon: Thermometer, label: "Cooling", val: health!.cooling },
                        { icon: Zap, label: "Electrical", val: health!.electrical },
                        { icon: Eye, label: "Security", val: health!.security },
                        { icon: Lightbulb, label: "Energy", val: health!.energy },
                      ].map(({ icon: Icon, label, val }) => (
                        <div key={label}>
                          <Icon className={`w-4 h-4 mx-auto mb-1 ${SCORE_COLORS[scoreLevel(val)]}`} />
                          <div className={`text-sm font-bold ${SCORE_COLORS[scoreLevel(val)]}`}>{val}</div>
                          <div className="text-[9px] text-muted-foreground">{label}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Insights / Alerts */}
              {activeInsights.length > 0 && (
                <div className="mb-5">
                  <h2 className="font-semibold text-foreground mb-2 text-sm">💡 Insights</h2>
                  <div className="space-y-2">
                    {activeInsights.map((ins) => (
                      <Card key={ins.id} className={ins.severity === "high" ? "border-destructive/20 bg-destructive/5" : ins.severity === "warning" ? "border-amber-500/20 bg-amber-50" : ""}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            {ins.severity === "high" ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> : <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground">{ins.title}</div>
                              <div className="text-xs text-muted-foreground">{ins.description}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Infrastructure Summary */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-foreground text-sm">Infrastructure</h2>
                  <Link to={`/property/${primaryProperty.id}/assets`} className="text-xs text-primary flex items-center gap-0.5">
                    View All <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {Object.keys(assetGroups).length === 0 ? (
                  <Card><CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">No assets detected yet</p>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/property/${primaryProperty.id}/assets`}><Plus className="w-3 h-3 mr-1" /> Add Asset</Link>
                    </Button>
                  </CardContent></Card>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(assetGroups).map(([cat, items]) => (
                      <Card key={cat} className="hover:border-primary/20 transition-colors">
                        <CardContent className="p-3 flex items-center gap-2">
                          <span className="text-lg">{ASSET_CATEGORY_ICONS[cat] || "🔧"}</span>
                          <div>
                            <div className="text-sm font-medium text-foreground">{cat.replace(/_/g, " ")}</div>
                            <div className="text-xs text-muted-foreground">{items.length} device{items.length > 1 ? "s" : ""}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Maintenance */}
              <div className="mb-5">
                <h2 className="font-semibold text-foreground text-sm mb-2">Upcoming Maintenance</h2>
                {upcomingMaint.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No maintenance scheduled. Add assets to get smart reminders.</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingMaint.map((m) => (
                      <Card key={m.id}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{m.service_category.replace(/_/g, " ")}</div>
                            <div className="text-xs text-muted-foreground">
                              Due: {m.next_service_due ? new Date(m.next_service_due).toLocaleDateString() : "TBD"} · Every {m.interval_months}mo
                            </div>
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/book/${m.service_category}`}>Book</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Wrench, label: "Book Service", to: "/" },
                  { icon: Shield, label: "Care Plans", to: "/care" },
                  { icon: Home, label: "Home Health", to: "/home-health" },
                ].map(({ icon: Icon, label, to }) => (
                  <Link key={label} to={to} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-medium text-center text-foreground">{label}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <PropertyCreateDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
