import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Printer, Shield, TrendingUp, Headphones, RefreshCw, ArrowRight, Check, Phone, MessageCircle, ChevronRight, Sparkles, BadgeCheck, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SPS_SEGMENTS } from "@/types/sps";
import { getGroupedPlans } from "@/data/spsPlans";
import SPSChatAdvisor from "@/components/sps/SPSChatAdvisor";

const benefits = [
  { icon: TrendingUp, label: "Low Upfront Cost", desc: "Start printing without heavy capital investment" },
  { icon: BadgeCheck, label: "SmartFix Certified", desc: "Professionally checked & refurbished printers" },
  { icon: Headphones, label: "Support Included", desc: "Technical support & maintenance covered" },
  { icon: FileText, label: "Transparent Billing", desc: "Clear monthly charges, no hidden fees" },
  { icon: RefreshCw, label: "Upgrade Anytime", desc: "Grow your plan as your needs change" },
];

const howItWorks = [
  { step: 1, title: "Find Your Plan", desc: "Answer a few questions about your printing needs" },
  { step: 2, title: "Submit Request", desc: "Choose your plan and apply for a subscription" },
  { step: 3, title: "LankaFix Review", desc: "Our team reviews and approves your application" },
  { step: 4, title: "Get Printing", desc: "Printer delivered, set up, and ready to go" },
];

const comparisonRows = [
  { label: "Upfront Investment", buy: "Rs. 35,000–120,000+", sps: "From Rs. 5,000 deposit" },
  { label: "Monthly Predictability", buy: "Unpredictable costs", sps: "Fixed monthly fee" },
  { label: "Support Included", buy: "Find your own technician", sps: "✓ Included in plan" },
  { label: "Upgrade Flexibility", buy: "Sell & buy new", sps: "Request plan upgrade" },
  { label: "Repair Burden", buy: "100% on you", sps: "Covered by LankaFix" },
  { label: "Consumables Planning", buy: "Buy when empty", sps: "Managed & delivered" },
  { label: "Cashflow Impact", buy: "Large one-time hit", sps: "Spread over months" },
];

export default function SPSLandingPage() {
  const navigate = useNavigate();
  const groupedPlans = getGroupedPlans();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 pt-12 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Printer className="w-3.5 h-3.5" />
            LankaFix Smart Print Subscription
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
            Print Smarter Without<br />Heavy Upfront Investment
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-lg mx-auto">
            Monthly printer plans backed by SmartFix Certified devices. Service supported, transparent billing, built for Sri Lankan homes and businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 text-base" onClick={() => navigate("/sps/find-plan")}>
              <Sparkles className="w-4 h-4" />
              Find My Plan
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate("/sps/plans")}>
              Browse Plans
            </Button>
          </div>
        </div>
      </section>

      {/* Benefit Strip */}
      <section className="px-4 py-10 bg-card border-y border-border/50">
        <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {benefits.map((b) => (
            <div key={b.label} className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">{b.label}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{b.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Segments */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-xl font-bold text-center mb-2">Who Is SPS For?</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Choose your segment to see recommended plans</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {SPS_SEGMENTS.map((seg) => (
              <Card
                key={seg.code}
                className="cursor-pointer hover:border-primary/40 transition-all group"
                onClick={() => navigate(`/sps/plans?segment=${seg.code}`)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{seg.icon}</div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{seg.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{seg.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-12 bg-muted/30">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-heading text-xl font-bold text-center mb-8">How SPS Works</h2>
          <div className="space-y-4">
            {howItWorks.map((step, i) => (
              <div key={step.step} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {step.step}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Plans */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-xl font-bold text-center mb-2">Popular Plans</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Starting from Rs. 1,790/month</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[groupedPlans["Home & Student"][0], groupedPlans["Tuition & Small Business"][0], groupedPlans["SME & Office"][0]].filter(Boolean).map((plan) => (
              <Card key={plan.id} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="text-xs font-medium text-primary mb-1">{plan.best_for?.split("–")[0]}</div>
                  <div className="text-lg font-bold text-foreground mb-1">{plan.plan_name}</div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    Rs. {plan.monthly_fee.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">{plan.included_pages.toLocaleString()} pages included</div>
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                        <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" size="sm" onClick={() => navigate(`/sps/plans/${plan.id}`)}>
                    View Plan <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => navigate("/sps/plans")}>
              View All Plans <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* SPS vs Buying Comparison */}
      <section className="px-4 py-12 bg-muted/30">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-heading text-xl font-bold text-center mb-2">SPS vs Buying Outright</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">See why a subscription makes more sense</p>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 font-semibold text-muted-foreground"></th>
                    <th className="text-center p-3 font-semibold text-muted-foreground">Buy Outright</th>
                    <th className="text-center p-3 font-semibold text-primary bg-primary/5">LankaFix SPS</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-border/30 last:border-0">
                      <td className="p-3 font-medium text-foreground">{row.label}</td>
                      <td className="p-3 text-center text-muted-foreground">{row.buy}</td>
                      <td className="p-3 text-center text-primary font-medium bg-primary/5">{row.sps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-3xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { icon: BadgeCheck, label: "SmartFix Certified" },
            { icon: Shield, label: "Professionally Checked" },
            { icon: FileText, label: "Transparent Billing" },
            { icon: Headphones, label: "Service Supported" },
            { icon: Zap, label: "LankaFix Reviewed" },
          ].map((b) => (
            <div key={b.label} className="flex flex-col items-center text-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <b.icon className="w-4 h-4 text-accent" />
              </div>
              <span className="text-[11px] font-semibold text-foreground">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Block */}
      <section className="px-4 py-12 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="mx-auto max-w-lg text-center space-y-4">
          <h2 className="font-heading text-xl font-bold">Ready to Start Printing Smarter?</h2>
          <p className="text-sm text-muted-foreground">Get a personalized plan recommendation in under 2 minutes</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2" onClick={() => navigate("/sps/find-plan")}>
              <Sparkles className="w-4 h-4" /> Find My Plan
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Phone className="w-4 h-4" /> Request Callback
            </Button>
          </div>
          <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> Talk to LankaFix Advisor via WhatsApp
          </button>
        </div>
      </section>
    </div>
  );
}
