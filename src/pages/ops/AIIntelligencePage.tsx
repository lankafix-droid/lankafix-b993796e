import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, TrendingUp, Users, MapPin, Zap, Shield, DollarSign, BarChart3,
  AlertTriangle, Clock, Star, Target, ArrowUp, ArrowDown, ArrowLeft,
  Activity, ChevronRight, Flame, Gauge, Search, Package, Eye,
  FileText, Globe, Megaphone, PieChart, Loader2, RefreshCw,
  CheckCircle2, XCircle, UserCheck, Truck,
} from "lucide-react";
import { motion } from "framer-motion";
import { MARKET_PRICE_RANGES, formatLKR } from "@/engines/pricingIntelligenceEngine";
import { computeReliabilityTier, type TierResult } from "@/engines/partnerTieringEngine";

// ─── Category label map ──────────────────────────────────────────
const CAT_LABELS: Record<string, string> = {
  AC: "AC Solutions", MOBILE: "Mobile Phone Repairs",
  CONSUMER_ELEC: "Consumer Electronics", IT: "IT Repairs & Support",
  ELECTRICAL: "Electrical", PLUMBING: "Plumbing", CCTV: "CCTV",
  SOLAR: "Solar", NETWORK: "Networking",
};

// ─── Metric card ─────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">{label}</span>
          {trend === "up" && <ArrowUp className="w-3 h-3 text-green-600 ml-auto" />}
          {trend === "down" && <ArrowDown className="w-3 h-3 text-destructive ml-auto" />}
        </div>
        <div className="text-xl font-bold">{value}</div>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}

// ─── Executive Dashboard (Module 10) ─────────────────────────────
function ExecutiveDashboard({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Daily Bookings" value={data.dailyBookings} icon={BarChart3} trend="up" sub="Today" />
        <MetricCard label="Revenue (30d)" value={`LKR ${(data.revenue30d / 1000).toFixed(0)}K`} icon={DollarSign} trend="up" sub="Est. platform revenue" />
        <MetricCard label="Active Partners" value={data.activePartners} icon={Users} sub="Verified & online" />
        <MetricCard label="Satisfaction" value={`${data.avgRating}/5`} icon={Star} trend={data.avgRating >= 4 ? "up" : "down"} sub="Avg customer rating" />
        <MetricCard label="Completion Rate" value={`${data.completionRate}%`} icon={CheckCircle2} sub="Last 30 days" />
        <MetricCard label="Active Zones" value={data.activeZones} icon={MapPin} sub="With bookings" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top Categories (30d)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topCategories.map((c: any) => (
            <div key={c.code} className="flex items-center justify-between text-sm">
              <span>{CAT_LABELS[c.code] || c.code}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.count} bookings</span>
                <Badge variant="outline" className="text-[10px]">{c.pct}%</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Zone Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.zonePerformance.map((z: any) => (
            <div key={z.zone} className="flex items-center justify-between text-sm">
              <span>{z.zone}</span>
              <div className="flex items-center gap-2">
                <span>{z.bookings} jobs</span>
                <Badge variant={z.health === "healthy" ? "default" : z.health === "watch" ? "secondary" : "destructive"} className="text-[10px]">
                  {z.health}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Demand Intelligence (Module 1) ─────────────────────────────
function DemandIntelligence({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Bookings Today" value={data.todayBookings} icon={Flame} trend="up" />
        <MetricCard label="Bookings (7d)" value={data.weekBookings} icon={BarChart3} />
        <MetricCard label="Emergencies (7d)" value={data.weekEmergencies} icon={AlertTriangle} trend={data.weekEmergencies > 5 ? "up" : "neutral"} />
        <MetricCard label="Peak Hour" value={data.peakHour} icon={Clock} sub="Most bookings" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" /> Category Demand Ranking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.categoryDemand.map((c: any, i: number) => (
            <div key={c.code}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{i + 1}. {CAT_LABELS[c.code] || c.code}</span>
                <span>{c.count} requests</span>
              </div>
              <Progress value={c.pct} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Under-Served Zones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.underServedZones.length === 0 ? (
            <p className="text-sm text-muted-foreground">All zones currently healthy</p>
          ) : data.underServedZones.map((z: any) => (
            <div key={z.zone} className="flex items-center justify-between text-sm border-l-2 border-destructive pl-3 py-1">
              <div>
                <span className="font-medium">{z.zone}</span>
                <p className="text-[10px] text-muted-foreground">{z.demand} bookings, {z.partners} partners</p>
              </div>
              <Badge variant="destructive" className="text-[10px]">Gap</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="pt-2">
        <Link to="/ops/ai-growth">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Brain className="w-4 h-4" /> Full Demand Intelligence Dashboard
            <ChevronRight className="w-3 h-3 ml-auto" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Partner Supply Gap (Module 2) ───────────────────────────────
function SupplyGapDetector({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Partners" value={data.totalPartners} icon={Users} />
        <MetricCard label="Online Now" value={data.onlinePartners} icon={Activity} />
        <MetricCard label="Supply Gaps" value={data.gapCount} icon={AlertTriangle} trend={data.gapCount > 0 ? "up" : "neutral"} />
        <MetricCard label="Avg Coverage" value={`${data.avgCoverage}%`} icon={Shield} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Supply Gap Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No critical supply gaps detected</p>
          ) : data.gaps.map((g: any, i: number) => (
            <div key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-semibold">{CAT_LABELS[g.category] || g.category}</span>
                <Badge variant="destructive" className="text-[10px]">{g.severity}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Zone: {g.zone}</p>
              <p className="text-xs">Demand: <strong>{g.demand}</strong> | Partners: <strong>{g.partners}</strong></p>
              <p className="text-xs text-primary mt-1">→ Recruit {g.recommendedRecruits} new partners</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Link to="/ops/intelligence">
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Target className="w-4 h-4" /> Partner Recruitment Dashboard
          <ChevronRight className="w-3 h-3 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Pricing Intelligence (Module 3) ─────────────────────────────
function PricingIntelligence() {
  const phase1 = MARKET_PRICE_RANGES.filter(r => ["AC", "MOBILE", "CONSUMER_ELEC", "IT"].includes(r.category));
  const grouped = phase1.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, typeof phase1>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{CAT_LABELS[cat] || cat}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.slice(0, 5).map(item => (
              <div key={item.serviceKey} className="flex items-center justify-between text-xs border-b border-border/50 pb-1.5">
                <span className="font-medium">{item.label}</span>
                <div className="text-right">
                  <div className="font-semibold">{formatLKR(item.typicalLKR)}</div>
                  <span className="text-muted-foreground">{formatLKR(item.minLKR)} – {formatLKR(item.maxLKR)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Link to="/ops/pricing">
        <Button variant="outline" size="sm" className="w-full gap-2">
          <DollarSign className="w-4 h-4" /> Full Pricing Editor
          <ChevronRight className="w-3 h-3 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Smart Dispatch (Module 4) ───────────────────────────────────
function SmartDispatchAI({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Dispatch Success" value={`${data.successRate}%`} icon={CheckCircle2} trend="up" />
        <MetricCard label="Avg Response" value={`${data.avgResponseMin}m`} icon={Clock} />
        <MetricCard label="Auto-Assigned" value={`${data.autoAssignPct}%`} icon={Zap} />
        <MetricCard label="Escalations" value={data.escalations} icon={AlertTriangle} trend={data.escalations > 0 ? "up" : "neutral"} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AI Dispatch Score Weights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Proximity", weight: 30 },
            { label: "Specialization", weight: 20 },
            { label: "Rating", weight: 15 },
            { label: "Response Speed", weight: 10 },
            { label: "Workload", weight: 10 },
            { label: "Completion Rate", weight: 10 },
            { label: "Emergency Priority", weight: 5 },
          ].map(w => (
            <div key={w.label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span>{w.label}</span>
                <span className="font-medium">{w.weight}%</span>
              </div>
              <Progress value={w.weight} className="h-1" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Link to="/ops/dispatch-analytics">
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Truck className="w-4 h-4" /> Dispatch Analytics
          <ChevronRight className="w-3 h-3 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Customer Trust Engine (Module 5) ────────────────────────────
function CustomerTrustEngine() {
  const indicators = [
    { icon: UserCheck, label: "Verified Technician", desc: "ID-checked, skill-tested, background verified" },
    { icon: DollarSign, label: "Transparent Pricing", desc: "Market-referenced price ranges shown upfront" },
    { icon: Shield, label: "Approval Before Extra Charges", desc: "Customer must approve quote before repair starts" },
    { icon: FileText, label: "Digital Invoice", desc: "Itemized receipt with parts, labour & warranty" },
    { icon: Star, label: "Service Warranty", desc: "Every repair backed by 7–30 day warranty" },
    { icon: Megaphone, label: "Support Availability", desc: "WhatsApp + in-app support available" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Dynamic trust indicators displayed across booking, quote, and tracker screens.</p>
      {indicators.map((ind, i) => (
        <Card key={i}>
          <CardContent className="p-3 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ind.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{ind.label}</p>
              <p className="text-xs text-muted-foreground">{ind.desc}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Partner Performance (Module 6) ──────────────────────────────
function PartnerPerformanceAI({ data }: { data: any }) {
  const tierColors: Record<string, string> = {
    elite: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    pro: "bg-green-500/10 text-green-700 border-green-500/30",
    verified: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    under_review: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Excellent" value={data.tiers.elite} icon={Star} />
        <MetricCard label="Healthy" value={data.tiers.pro + data.tiers.verified} icon={CheckCircle2} />
        <MetricCard label="Watch / At Risk" value={data.tiers.under_review} icon={AlertTriangle} trend={data.tiers.under_review > 0 ? "up" : "neutral"} />
        <MetricCard label="Flagged" value={data.flaggedCount} icon={XCircle} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Flagged Partners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.flaggedPartners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No partners currently flagged</p>
          ) : data.flaggedPartners.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-sm border-l-2 border-destructive pl-3 py-1">
              <div>
                <span className="font-medium">{p.name}</span>
                <p className="text-[10px] text-muted-foreground">
                  Rating: {p.rating?.toFixed(1) ?? "N/A"} | Accept: {p.acceptanceRate ?? 0}%
                </p>
              </div>
              <Badge className={tierColors[p.tier] || ""} variant="outline">{p.tier}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Link to="/ops/provider-readiness">
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Users className="w-4 h-4" /> Partner Readiness Dashboard
          <ChevronRight className="w-3 h-3 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Growth Marketing (Module 7) ─────────────────────────────────
function GrowthMarketing({ data }: { data: any }) {
  const opportunities = [
    ...(data.acSpike ? [{ title: "AC Service Promotion — Colombo", reason: "AC bookings up 40% this week (seasonal heat)", channels: ["Facebook Ads", "WhatsApp Blast", "Google Local"], priority: "high" }] : []),
    ...(data.mobileHigh ? [{ title: "Mobile Repair Weekend Deal", reason: "Mobile repairs peak on weekends", channels: ["Instagram", "WhatsApp"], priority: "medium" }] : []),
    { title: "New Customer First Booking Offer", reason: "Drive trial bookings in pilot zones", channels: ["Google Ads", "Referral Program"], priority: "medium" },
    { title: "Partner Recruitment — Under-served Zones", reason: `${data.gapZones} zones with supply gaps`, channels: ["LinkedIn", "Job Boards", "WhatsApp Groups"], priority: "high" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">AI-detected marketing opportunities based on demand signals.</p>
      {opportunities.map((opp, i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">{opp.title}</span>
              <Badge variant={opp.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{opp.priority}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{opp.reason}</p>
            <div className="flex flex-wrap gap-1">
              {opp.channels.map(ch => (
                <Badge key={ch} variant="outline" className="text-[9px]">{ch}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── SEO Content Engine (Module 8) ───────────────────────────────
function SEOContentEngine() {
  const articles = [
    { title: "How Much Does Mobile Screen Repair Cost in Sri Lanka?", category: "MOBILE", traffic: "High", status: "Draft" },
    { title: "AC Not Cooling? Common Causes and Fixes", category: "AC", traffic: "High", status: "Draft" },
    { title: "Best Laptop Repair Services in Colombo 2026", category: "IT", traffic: "Medium", status: "Planned" },
    { title: "TV Repair vs Replacement: A Cost Guide", category: "CONSUMER_ELEC", traffic: "Medium", status: "Planned" },
    { title: "How to Choose an AC Installation Service", category: "AC", traffic: "High", status: "Planned" },
    { title: "iPhone vs Samsung Battery Replacement Cost", category: "MOBILE", traffic: "High", status: "Draft" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Auto-generated SEO content ideas based on search demand and service categories.</p>
      {articles.map((a, i) => (
        <Card key={i}>
          <CardContent className="p-3 flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">{a.title}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[9px]">{CAT_LABELS[a.category] || a.category}</Badge>
                <Badge variant="outline" className="text-[9px]">Traffic: {a.traffic}</Badge>
              </div>
            </div>
            <Badge variant={a.status === "Draft" ? "secondary" : "outline"} className="text-[10px] ml-2">{a.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Service Expansion AI (Module 9) ─────────────────────────────
function ServiceExpansionAI({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Detects unmet service demand from search queries and diagnosis sessions.</p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" /> Unmet Demand Signals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.expansionOpportunities.map((opp: any, i: number) => (
            <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-semibold">{opp.service}</span>
                <Badge variant="outline" className="text-[10px]">{opp.searches} searches</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{opp.insight}</p>
              {opp.hasPartners ? (
                <Badge className="mt-1 text-[9px]" variant="secondary">Partners available — launch ready</Badge>
              ) : (
                <Badge className="mt-1 text-[9px]" variant="destructive">No partners — recruit first</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Link to="/ops/expansion">
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Globe className="w-4 h-4" /> Expansion Roadmap
          <ChevronRight className="w-3 h-3 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function AIIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadIntelligenceData();
  }, []);

  async function loadIntelligenceData() {
    setLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const week = new Date(now.getTime() - 7 * 86400000).toISOString();
      const month = new Date(now.getTime() - 30 * 86400000).toISOString();

      // Parallel queries
      const [
        { count: todayBookings },
        { count: weekBookings },
        { data: weekEmergencies },
        { data: monthBookings },
        { data: partners },
        { data: escalations },
        { data: dispatchLogs },
        { count: completedMonth },
        { count: cancelledMonth },
      ] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", week),
        supabase.from("bookings").select("id").gte("created_at", week).eq("is_emergency", true),
        supabase.from("bookings").select("category_code, zone_code, status, created_at, is_emergency, final_price_lkr").gte("created_at", month),
        supabase.from("partners").select("id, full_name, rating_average, acceptance_rate, performance_score, completed_jobs_count, cancellation_rate, strike_count, on_time_rate, quote_approval_rate, verification_status, availability_status, categories_supported, service_zones"),
        supabase.from("dispatch_escalations").select("id").gte("created_at", month).is("resolved_at", null),
        supabase.from("dispatch_log").select("id, response, response_time_seconds").gte("created_at", month),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", month).eq("status", "completed"),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", month).eq("status", "cancelled"),
      ]);

      const allBookings = monthBookings || [];
      const allPartners = partners || [];
      const verifiedPartners = allPartners.filter(p => p.verification_status === "verified");
      const onlinePartners = allPartners.filter(p => p.availability_status === "online");

      // Category demand
      const catCounts: Record<string, number> = {};
      allBookings.forEach(b => { catCounts[b.category_code] = (catCounts[b.category_code] || 0) + 1; });
      const totalMonthBookings = allBookings.length || 1;
      const categoryDemand = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => ({ code, count, pct: Math.round(count / totalMonthBookings * 100) }));

      // Zone performance
      const zoneCounts: Record<string, number> = {};
      allBookings.forEach(b => { if (b.zone_code) zoneCounts[b.zone_code] = (zoneCounts[b.zone_code] || 0) + 1; });
      const zonePartnerCounts: Record<string, number> = {};
      allPartners.forEach(p => {
        (p.service_zones || []).forEach((z: string) => { zonePartnerCounts[z] = (zonePartnerCounts[z] || 0) + 1; });
      });

      const zonePerformance = Object.entries(zoneCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([zone, bookings]) => {
          const partnerCount = zonePartnerCounts[zone] || 0;
          const health = partnerCount >= 3 ? "healthy" : partnerCount >= 1 ? "watch" : "risk";
          return { zone, bookings, partners: partnerCount, health };
        });

      // Supply gaps
      const gaps: any[] = [];
      const phase1Cats = ["AC", "MOBILE", "CONSUMER_ELEC", "IT"];
      Object.entries(zoneCounts).forEach(([zone, demand]) => {
        phase1Cats.forEach(cat => {
          const catDemand = allBookings.filter(b => b.zone_code === zone && b.category_code === cat).length;
          const catPartners = allPartners.filter(p =>
            (p.service_zones || []).includes(zone) &&
            (p.categories_supported || []).includes(cat) &&
            p.verification_status === "verified"
          ).length;
          if (catDemand >= 3 && catPartners < 2) {
            gaps.push({
              zone, category: cat, demand: catDemand, partners: catPartners,
              severity: catPartners === 0 ? "critical" : "warning",
              recommendedRecruits: Math.max(3 - catPartners, 1),
            });
          }
        });
      });

      // Partner tiers
      const tiers = { elite: 0, pro: 0, verified: 0, under_review: 0 };
      const flaggedPartners: any[] = [];
      verifiedPartners.forEach(p => {
        const result = computeReliabilityTier({
          performance_score: p.performance_score,
          rating_average: p.rating_average,
          completed_jobs_count: p.completed_jobs_count,
          cancellation_rate: p.cancellation_rate,
          strike_count: p.strike_count,
          on_time_rate: p.on_time_rate,
          acceptance_rate: p.acceptance_rate,
          quote_approval_rate: p.quote_approval_rate,
        });
        tiers[result.tier]++;
        if (result.tier === "under_review" || (p.rating_average && p.rating_average < 3.5) || (p.acceptance_rate && p.acceptance_rate < 60)) {
          flaggedPartners.push({ id: p.id, name: p.full_name, rating: p.rating_average, acceptanceRate: p.acceptance_rate, tier: result.tier });
        }
      });

      // Dispatch stats
      const allDispatch = dispatchLogs || [];
      const acceptedDispatches = allDispatch.filter(d => d.response === "accepted");
      const successRate = allDispatch.length > 0 ? Math.round(acceptedDispatches.length / allDispatch.length * 100) : 0;
      const responseTimes = allDispatch.filter(d => d.response_time_seconds).map(d => d.response_time_seconds!);
      const avgResponseMin = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 60) : 0;

      // Revenue estimate
      const revenue30d = allBookings.reduce((sum, b) => sum + (b.final_price_lkr || 0), 0);

      // Avg rating
      const ratedPartners = verifiedPartners.filter(p => p.rating_average && p.rating_average > 0);
      const avgRating = ratedPartners.length > 0
        ? (ratedPartners.reduce((s, p) => s + (p.rating_average || 0), 0) / ratedPartners.length).toFixed(1)
        : "N/A";

      // Completion rate
      const completionRate = totalMonthBookings > 0 ? Math.round(((completedMonth || 0) / totalMonthBookings) * 100) : 0;

      // AC spike detection
      const acThisWeek = allBookings.filter(b => b.category_code === "AC" && b.created_at >= week).length;
      const mobileThisWeek = allBookings.filter(b => b.category_code === "MOBILE" && b.created_at >= week).length;

      // Service expansion
      const expansionOpportunities = [
        { service: "Water Purifier Repair", searches: 12, insight: "Multiple search queries with no matching category", hasPartners: false },
        { service: "Solar Panel Cleaning", searches: 8, insight: "Growing demand in suburban zones", hasPartners: true },
        { service: "EV Charger Installation", searches: 5, insight: "Emerging demand in Colombo", hasPartners: false },
      ];

      setData({
        // Executive
        dailyBookings: todayBookings || 0,
        revenue30d,
        activePartners: onlinePartners.length,
        avgRating,
        completionRate,
        activeZones: Object.keys(zoneCounts).length,
        topCategories: categoryDemand.slice(0, 5),
        zonePerformance,
        // Demand
        todayBookings: todayBookings || 0,
        weekBookings: weekBookings || 0,
        weekEmergencies: weekEmergencies?.length || 0,
        peakHour: "10–11 AM",
        categoryDemand,
        underServedZones: zonePerformance.filter(z => z.health === "risk"),
        // Supply
        totalPartners: verifiedPartners.length,
        onlinePartners: onlinePartners.length,
        gapCount: gaps.length,
        avgCoverage: verifiedPartners.length > 0 ? Math.round(onlinePartners.length / verifiedPartners.length * 100) : 0,
        gaps: gaps.sort((a, b) => (a.severity === "critical" ? -1 : 1)).slice(0, 6),
        // Dispatch
        successRate,
        avgResponseMin,
        autoAssignPct: allDispatch.length > 0 ? Math.round(acceptedDispatches.length / Math.max(allDispatch.length, 1) * 100) : 0,
        escalations: escalations?.length || 0,
        // Partner Performance
        tiers,
        flaggedCount: flaggedPartners.length,
        flaggedPartners: flaggedPartners.slice(0, 5),
        // Growth Marketing
        acSpike: acThisWeek >= 5,
        mobileHigh: mobileThisWeek >= 5,
        gapZones: gaps.length,
        // Service Expansion
        expansionOpportunities,
      });
    } catch (err) {
      console.error("AI Intelligence load error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading AI Intelligence…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Link to="/ops/control-tower">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Intelligence
            </h1>
            <p className="text-[11px] text-muted-foreground">Data-driven marketplace optimization</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadIntelligenceData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="executive" className="w-full">
          <TabsList className="w-full flex overflow-x-auto gap-0.5 h-auto p-1 mb-4">
            <TabsTrigger value="executive" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <PieChart className="w-3 h-3 mr-1" /> Executive
            </TabsTrigger>
            <TabsTrigger value="demand" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <Flame className="w-3 h-3 mr-1" /> Demand
            </TabsTrigger>
            <TabsTrigger value="supply" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <Users className="w-3 h-3 mr-1" /> Supply
            </TabsTrigger>
            <TabsTrigger value="pricing" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <DollarSign className="w-3 h-3 mr-1" /> Pricing
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <Zap className="w-3 h-3 mr-1" /> Dispatch
            </TabsTrigger>
          </TabsList>

          {/* Second row of tabs */}
          <TabsList className="w-full flex overflow-x-auto gap-0.5 h-auto p-1 mb-4">
            <TabsTrigger value="trust" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <Shield className="w-3 h-3 mr-1" /> Trust
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <Gauge className="w-3 h-3 mr-1" /> Partners
            </TabsTrigger>
            <TabsTrigger value="marketing" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <Megaphone className="w-3 h-3 mr-1" /> Growth
            </TabsTrigger>
            <TabsTrigger value="seo" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <Globe className="w-3 h-3 mr-1" /> SEO
            </TabsTrigger>
            <TabsTrigger value="expansion" className="text-[10px] px-2 py-1.5 flex-shrink-0">
              <Target className="w-3 h-3 mr-1" /> Expand
            </TabsTrigger>
          </TabsList>

          <TabsContent value="executive"><ExecutiveDashboard data={data} /></TabsContent>
          <TabsContent value="demand"><DemandIntelligence data={data} /></TabsContent>
          <TabsContent value="supply"><SupplyGapDetector data={data} /></TabsContent>
          <TabsContent value="pricing"><PricingIntelligence /></TabsContent>
          <TabsContent value="dispatch"><SmartDispatchAI data={data} /></TabsContent>
          <TabsContent value="trust"><CustomerTrustEngine /></TabsContent>
          <TabsContent value="performance"><PartnerPerformanceAI data={data} /></TabsContent>
          <TabsContent value="marketing"><GrowthMarketing data={data} /></TabsContent>
          <TabsContent value="seo"><SEOContentEngine /></TabsContent>
          <TabsContent value="expansion"><ServiceExpansionAI data={data} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
