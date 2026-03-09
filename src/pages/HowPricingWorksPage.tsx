import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { ShieldCheck, Eye, CheckCircle2, ArrowRight, Banknote, CreditCard, Landmark, FileText, Lock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const PRICING_MODELS = [
  {
    type: "Fixed Price",
    badge: "bg-success text-success-foreground",
    desc: "You see the exact price before booking. No surprises.",
    examples: ["AC Gas Top-Up — LKR 3,500", "Battery Replacement — From LKR 2,000", "AC Full Service — LKR 4,500"],
    icon: <CheckCircle2 className="w-6 h-6" />,
    how: "Price shown upfront → Book → Technician arrives → Pay after service",
  },
  {
    type: "Diagnostic First",
    badge: "bg-warning text-warning-foreground",
    desc: "A small diagnostic fee covers the technician's assessment. If you proceed, it's deducted from the final bill.",
    examples: ["AC Repair Diagnosis — LKR 2,500", "Mobile General Repair — From LKR 2,000", "Laptop Diagnosis — LKR 1,500"],
    icon: <Eye className="w-6 h-6" />,
    how: "Pay diagnostic fee → Technician inspects → Quote submitted → You approve → Work begins → Pay balance",
  },
  {
    type: "Quote Required",
    badge: "bg-primary text-primary-foreground",
    desc: "For installations and complex projects, a site inspection determines the exact scope and cost.",
    examples: ["CCTV Installation — Site survey LKR 2,000", "Solar Installation — Survey LKR 5,000", "Smart Home Setup — Inspection LKR 3,000"],
    icon: <FileText className="w-6 h-6" />,
    how: "Pay inspection fee → Site survey → Detailed quote → You approve → Milestone payments → Project completed",
  },
];

const PAYMENT_METHODS = [
  { icon: <Banknote className="w-5 h-5" />, label: "Cash After Service", desc: "Pay the technician in cash after the job is done. Most popular in Sri Lanka.", popular: true },
  { icon: <CreditCard className="w-5 h-5" />, label: "Online Payment", desc: "Pay through the LankaFix app using your debit/credit card.", popular: false },
  { icon: <Landmark className="w-5 h-5" />, label: "Bank Transfer", desc: "For large projects, pay via bank transfer at each milestone.", popular: false },
];

const PROTECTIONS = [
  "No work starts without your approval in the app",
  "Extra work requires a revised quote — you must approve",
  "Diagnostic/inspection fees are deducted if you proceed",
  "Milestone payments for large projects protect your investment",
  "Digital invoice with full breakdown after every job",
  "Service warranty included with every booking",
];

const HowPricingWorksPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-navy py-14 md:py-20">
          <div className="container max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Eye className="w-10 h-10 mx-auto mb-4" style={{ color: "hsl(211, 80%, 60%)" }} />
              <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-white mb-3">
                How Pricing Works
              </h1>
              <p className="text-sm md:text-base text-white/50 max-w-xl mx-auto">
                Transparent pricing is our promise. Here's exactly how we price services — no hidden fees, no surprises.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Key Promise */}
        <section className="-mt-6 relative z-10">
          <div className="container max-w-3xl">
            <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground mb-1">The LankaFix Price Promise</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The price you approve is the price you pay. Period. If additional work is needed, the technician must submit a revised quote through the app — and you must approve it before any extra work begins.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Models */}
        <section className="py-14 md:py-16">
          <div className="container max-w-4xl">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground text-center mb-2">Three Pricing Models</h2>
            <p className="text-sm text-muted-foreground text-center mb-10">Different services use different models — all equally transparent</p>

            <div className="grid md:grid-cols-3 gap-6">
              {PRICING_MODELS.map((model, i) => (
                <motion.div
                  key={model.type}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="bg-card rounded-2xl border border-border/60 p-6 hover:shadow-card-hover transition-shadow"
                >
                  <Badge className={`${model.badge} mb-4`}>{model.type}</Badge>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {model.icon}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{model.desc}</p>
                  <div className="space-y-2 mb-4">
                    {model.examples.map((ex) => (
                      <p key={ex} className="text-xs text-foreground font-medium">• {ex}</p>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">How it works</p>
                    <p className="text-xs text-foreground leading-relaxed">{model.how}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section className="py-14 bg-secondary/50">
          <div className="container max-w-3xl">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground text-center mb-2">Payment Methods</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">Pay the way that's comfortable for you</p>
            <div className="grid gap-4">
              {PAYMENT_METHODS.map((method, i) => (
                <motion.div
                  key={method.label}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  className="bg-card rounded-xl border border-border/60 p-5 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading font-bold text-sm text-foreground">{method.label}</p>
                      {method.popular && (
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30 font-semibold">
                          Most Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{method.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Your Protections */}
        <section className="py-14">
          <div className="container max-w-3xl">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground text-center mb-2">Your Protections</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">Every booking includes these safeguards</p>
            <div className="bg-card rounded-2xl border border-border/60 p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {PROTECTIONS.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{p}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Important Note */}
        <section className="pb-14">
          <div className="container max-w-3xl">
            <div className="bg-warning/5 border border-warning/20 rounded-2xl p-6 flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-heading font-bold text-sm text-foreground mb-1">Important Note</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Service warranty is only valid for jobs booked and completed through LankaFix. If you settle directly with a technician outside the platform, warranty and mediation support will not apply. This protects both you and the technician.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 bg-navy">
          <div className="container max-w-2xl text-center">
            <h2 className="font-heading text-xl font-bold text-white mb-3">Ready to Book?</h2>
            <p className="text-sm text-white/50 mb-6">Experience transparent pricing — see it for yourself</p>
            <Button asChild size="lg" className="rounded-full font-heading font-bold">
              <Link to="/">Browse Services <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowPricingWorksPage;
