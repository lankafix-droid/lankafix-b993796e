import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, TrendingUp, DollarSign, Repeat, Building2,
  Crown, ShoppingCart, Package, Sparkles, BarChart3, PieChart,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const KPI = ({ label, value, icon: Icon, trend }: { label: string; value: string; icon: any; trend?: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <div className="text-xl font-bold">{value}</div>
    {trend && <span className="text-xs text-green-600">{trend}</span>}
  </div>
);

const revenueStreams = [
  { name: "Platform Commissions", monthly: "LKR 2.4M", pct: 42, icon: DollarSign, color: "bg-blue-500" },
  { name: "Booking Protection Fees", monthly: "LKR 890K", pct: 15, icon: DollarSign, color: "bg-green-500" },
  { name: "Subscriptions (Care Plans)", monthly: "LKR 650K", pct: 11, icon: Repeat, color: "bg-purple-500" },
  { name: "Corporate Contracts", monthly: "LKR 780K", pct: 14, icon: Building2, color: "bg-orange-500" },
  { name: "Premium Memberships", monthly: "LKR 320K", pct: 6, icon: Crown, color: "bg-yellow-500" },
  { name: "Consumables Sales", monthly: "LKR 450K", pct: 8, icon: ShoppingCart, color: "bg-red-500" },
  { name: "Smart Upsells", monthly: "LKR 280K", pct: 5, icon: Sparkles, color: "bg-cyan-500" },
];

const categoryRevenue = [
  { category: "AC Services", monthly: "LKR 1.1M", jobs: 312, commission: "7%" },
  { category: "Electrical", monthly: "LKR 820K", jobs: 245, commission: "7%" },
  { category: "Plumbing", monthly: "LKR 680K", jobs: 198, commission: "7%" },
  { category: "Mobile Repairs", monthly: "LKR 540K", jobs: 410, commission: "10%" },
  { category: "IT / Laptop", monthly: "LKR 480K", jobs: 156, commission: "10%" },
  { category: "CCTV", monthly: "LKR 420K", jobs: 45, commission: "5%" },
  { category: "Solar", monthly: "LKR 380K", jobs: 22, commission: "5%" },
  { category: "Network", monthly: "LKR 290K", jobs: 134, commission: "10%" },
];

const cityRevenue = [
  { city: "Colombo", revenue: "LKR 2.8M", share: "49%" },
  { city: "Gampaha", revenue: "LKR 890K", share: "15%" },
  { city: "Kandy", revenue: "LKR 520K", share: "9%" },
  { city: "Negombo", revenue: "LKR 410K", share: "7%" },
  { city: "Galle", revenue: "LKR 380K", share: "7%" },
  { city: "Others", revenue: "LKR 770K", share: "13%" },
];

const RevenueEnginePage = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <Link to="/ops/finance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Finance Board
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Revenue Engine</h1>
        <Badge variant="secondary">Live</Badge>
      </div>
      <p className="text-muted-foreground mb-8">All 10 monetization streams in one view.</p>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPI icon={DollarSign} label="Monthly Revenue" value="LKR 5.77M" trend="↑ 18% vs last month" />
        <KPI icon={BarChart3} label="Avg. Job Value" value="LKR 8,200" trend="↑ 5%" />
        <KPI icon={Repeat} label="Recurring Revenue" value="LKR 1.75M" trend="↑ 24%" />
        <KPI icon={PieChart} label="Revenue Streams" value="7 Active" />
      </div>

      <Tabs defaultValue="streams">
        <TabsList className="mb-6">
          <TabsTrigger value="streams">Revenue Streams</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="city">By City</TabsTrigger>
          <TabsTrigger value="growth">Growth Levers</TabsTrigger>
        </TabsList>

        {/* Revenue Streams */}
        <TabsContent value="streams">
          <div className="space-y-3">
            {revenueStreams.map((stream, i) => (
              <motion.div
                key={stream.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
              >
                <stream.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{stream.name}</span>
                    <span className="font-semibold text-sm">{stream.monthly}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${stream.color}`} style={{ width: `${stream.pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{stream.pct}%</span>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* By Category */}
        <TabsContent value="category">
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Jobs</th>
                  <th className="text-right p-3 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {categoryRevenue.map((row) => (
                  <tr key={row.category} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{row.category}</td>
                    <td className="p-3 text-right">{row.monthly}</td>
                    <td className="p-3 text-right text-muted-foreground">{row.jobs}</td>
                    <td className="p-3 text-right"><Badge variant="outline">{row.commission}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* By City */}
        <TabsContent value="city">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cityRevenue.map((city, i) => (
              <motion.div
                key={city.city}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="font-semibold mb-1">{city.city}</div>
                <div className="text-xl font-bold mb-1">{city.revenue}</div>
                <div className="text-xs text-muted-foreground">{city.share} of total revenue</div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Growth Levers */}
        <TabsContent value="growth">
          <div className="space-y-4">
            {[
              { lever: "Increase Corporate Contracts", impact: "High", desc: "Target 50 hotels & factories in Western Province — estimated +LKR 3M/month" },
              { lever: "Launch Consumables in 3 New Categories", impact: "Medium", desc: "Add electrical accessories, plumbing fittings, AC filters — estimated +LKR 600K/month" },
              { lever: "Premium Partner Acquisition Campaign", impact: "Medium", desc: "Convert 100 free partners to Pro/Elite — estimated +LKR 400K/month recurring" },
              { lever: "Smart Upsell Conversion Optimization", impact: "Medium", desc: "Improve post-booking upsell acceptance from 8% to 15% — estimated +LKR 350K/month" },
              { lever: "Expand to Kandy & Galle", impact: "High", desc: "Recruit 50 technicians per city — estimated +LKR 1.2M/month within 6 months" },
            ].map((item, i) => (
              <motion.div
                key={item.lever}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{item.lever}</span>
                  <Badge variant={item.impact === "High" ? "default" : "secondary"}>{item.impact} Impact</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
    <Footer />
  </div>
);

export default RevenueEnginePage;
