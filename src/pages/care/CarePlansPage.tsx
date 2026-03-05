import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Star, Zap, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { CARE_PLANS, BUNDLE_PLANS, getPlansForCategory } from "@/data/carePlans";
import { DEVICE_CATEGORY_LABELS, PLAN_TIER_LABELS, PLAN_TIER_COLORS } from "@/types/subscription";
import type { DeviceCategoryCode, PlanTier } from "@/types/subscription";
import { track } from "@/lib/analytics";

const CATEGORY_ICONS: Partial<Record<string, string>> = {
  AC: "❄️", CCTV: "📹", COPIER: "🖨️", IT: "💻", SOLAR: "☀️",
  ROUTER: "📶", MOBILE: "📱", CONSUMER_ELEC: "📺", SMART_HOME_OFFICE: "🏠",
};

const TIER_ICONS: Record<PlanTier, typeof Shield> = {
  basic: Shield, standard: Star, premium: Zap,
};

const CarePlansPage = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("AC");

  const categoryKeys = [...new Set(CARE_PLANS.map((p) => p.category))];
  const plans = getPlansForCategory(selectedCategory);

  const handleSelectPlan = (planId: string) => {
    track("care_plan_viewed", { planId });
    navigate(`/care/subscribe/${planId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" /> LankaFix Care
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Protect Your Devices with LankaFix Care
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Prevent breakdowns. Extend device life. Powered by verified LankaFix technicians.
            </p>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              {categoryKeys.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-xs px-3 py-1.5">
                  {CATEGORY_ICONS[cat] || "🔧"} {DEVICE_CATEGORY_LABELS[cat as DeviceCategoryCode]?.split("/")[0]?.trim() || cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const TierIcon = TIER_ICONS[plan.tier];
                  return (
                    <Card key={plan.id} className={`relative overflow-hidden transition-shadow hover:shadow-lg ${plan.tier === "premium" ? "border-warning/40 ring-1 ring-warning/20" : plan.tier === "standard" ? "border-primary/30" : ""}`}>
                      {plan.tier === "premium" && (
                        <div className="absolute top-0 right-0 bg-warning text-warning-foreground text-[10px] font-bold px-3 py-0.5 rounded-bl-lg">BEST VALUE</div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={PLAN_TIER_COLORS[plan.tier]}>{PLAN_TIER_LABELS[plan.tier]}</Badge>
                        </div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <CardDescription>
                          <span className="text-2xl font-bold text-foreground">LKR {plan.annualPrice.toLocaleString()}</span>
                          <span className="text-muted-foreground"> / year</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {plan.visitsPerYear} visit{plan.visitsPerYear > 1 ? "s" : ""} • {plan.serviceCredits} credit{plan.serviceCredits > 1 ? "s" : ""}
                          {plan.priorityDispatch && " • Priority dispatch"}
                        </div>
                        <ul className="space-y-1.5">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full mt-2" variant={plan.tier === "premium" ? "hero" : "default"} onClick={() => handleSelectPlan(plan.id)}>
                          Get {PLAN_TIER_LABELS[plan.tier]} <ArrowRight className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Bundles */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Multi-Device Bundles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BUNDLE_PLANS.map((bundle) => (
                <Card key={bundle.id} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{bundle.name}</CardTitle>
                    <CardDescription>{bundle.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold text-foreground">
                      LKR {bundle.annualPrice.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ year</span>
                    </div>
                    <ul className="space-y-1.5">
                      {bundle.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" variant="hero" onClick={() => { track("bundle_viewed", { bundleId: bundle.id }); navigate(`/care/dashboard`); }}>
                      Get Started <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Trust message */}
          <div className="bg-success/5 border border-success/20 rounded-xl p-5 text-center">
            <p className="text-success font-medium text-sm">
              <Shield className="w-4 h-4 inline mr-1.5" />
              Prevent breakdowns. Extend device life. Powered by verified LankaFix technicians.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CarePlansPage;
