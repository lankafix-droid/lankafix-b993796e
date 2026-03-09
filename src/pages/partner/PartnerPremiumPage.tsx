import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, BarChart3, Star, Eye, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const tiers = [
  {
    id: "free",
    name: "Standard",
    price: "Free",
    description: "Basic access to jobs and earnings",
    features: [
      "Receive job offers",
      "Standard dispatch priority",
      "Basic earnings view",
      "Customer ratings visible",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    id: "pro",
    name: "Pro Partner",
    price: "LKR 3,000/mo",
    description: "More jobs, better visibility",
    badge: "Popular",
    features: [
      "Everything in Standard",
      "+15% dispatch priority boost",
      "Featured in category listings",
      "Advanced job analytics",
      "Priority customer support",
      "Profile badge: Pro Partner",
    ],
    cta: "Upgrade to Pro",
    disabled: false,
  },
  {
    id: "elite",
    name: "Elite Partner",
    price: "LKR 5,000/mo",
    description: "Maximum visibility & top-tier access",
    badge: "Best Value",
    features: [
      "Everything in Pro",
      "+30% dispatch priority boost",
      "Featured on homepage carousel",
      "Revenue & demand analytics",
      "Dedicated account manager",
      "Marketing exposure on social",
      "Profile badge: Elite Partner",
      "Early access to new categories",
    ],
    cta: "Upgrade to Elite",
    disabled: false,
  },
];

const PartnerPremiumPage = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="max-w-5xl mx-auto px-4 py-8 pb-24">
      <Link to="/partner" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Partner Dashboard
      </Link>

      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-3">
          <Crown className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Partner Premium Membership</h1>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Get more jobs, higher visibility, and advanced tools to grow your business on LankaFix.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-2xl border p-6 flex flex-col ${
              tier.badge === "Best Value"
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-lg">{tier.name}</h3>
              {tier.badge && (
                <Badge variant="secondary" className="text-xs">{tier.badge}</Badge>
              )}
            </div>
            <p className="text-2xl font-bold mb-1">{tier.price}</p>
            <p className="text-sm text-muted-foreground mb-5">{tier.description}</p>

            <ul className="space-y-2.5 flex-1 mb-6">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              variant={tier.disabled ? "outline" : "default"}
              disabled={tier.disabled}
            >
              {tier.cta}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Value props */}
      <div className="grid sm:grid-cols-3 gap-6 mt-12">
        {[
          { icon: Zap, title: "More Jobs", desc: "Premium partners receive up to 3× more job offers" },
          { icon: Eye, title: "Higher Visibility", desc: "Featured placement in search results and homepage" },
          { icon: BarChart3, title: "Smart Analytics", desc: "Demand forecasts, revenue trends, and zone insights" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="text-center p-4">
            <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <h4 className="font-semibold mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </main>
    <Footer />
  </div>
);

export default PartnerPremiumPage;
