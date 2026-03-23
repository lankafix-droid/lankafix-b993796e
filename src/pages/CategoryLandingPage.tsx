/**
 * CategoryLandingPage — Reusable, premium category showcase page.
 * Educates the user about LankaFix services before entering a booking flow.
 * Driven by categoryLandingConfig.ts — works for all categories.
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCategoryLandingConfig } from "@/data/categoryLandingConfig";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Shield, CheckCircle2, Phone, Wrench,
  Clock, Star, ChevronRight, Sparkles,
} from "lucide-react";

// Hero images already imported in V2CategoryGrid — reuse the mapping
import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";
import heroElectronics from "@/assets/hero-electronics-service.jpg";
import heroSmartHome from "@/assets/hero-smarthome-service.jpg";
import heroCopier from "@/assets/hero-copier-service.jpg";
import heroNetwork from "@/assets/hero-network-service.jpg";

const heroImages: Record<string, string> = {
  AC: heroAC, CCTV: heroCCTV, IT: heroIT, MOBILE: heroMobile,
  SOLAR: heroSolar, CONSUMER_ELEC: heroElectronics, SMART_HOME_OFFICE: heroSmartHome,
  COPIER: heroCopier, NETWORK: heroNetwork,
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
};

export default function CategoryLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const config = code ? getCategoryLandingConfig(code.toUpperCase()) : null;

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Category not found</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const heroImg = heroImages[config.code];

  const handleQuickAction = (action: string) => {
    if (action === "start_flow" || action === "inspection" || action === "diagnosis" || action === "remote") {
      navigate(`/service-flow/${config.code.toLowerCase()}`);
    } else if (action === "callback") {
      navigate(`/request/${config.code}`);
    }
  };

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* ─── Hero Section ─── */}
        <section className="relative overflow-hidden">
          <div className="relative h-48 sm:h-56">
            {heroImg ? (
              <img
                src={heroImg}
                alt={config.heroTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
            )}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 40%, transparent 100%)",
              }}
            />
            <div className="absolute top-4 left-4">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="container -mt-16 relative z-10 pb-6">
            <motion.div {...fadeUp} className="space-y-2">
              <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">
                {config.heroTitle}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                {config.heroSubtitle}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ─── Trust Strip ─── */}
        <motion.section
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.05 }}
          className="container pb-6"
        >
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {config.trustPoints.map((tp, i) => (
              <Badge
                key={i}
                variant="outline"
                className="shrink-0 text-[10px] font-semibold bg-primary/5 text-primary border-primary/15 px-3 py-1.5 rounded-full gap-1.5"
              >
                <Shield className="w-3 h-3" />
                {tp.label}
              </Badge>
            ))}
          </div>
        </motion.section>

        {/* ─── Services We Offer ─── */}
        <motion.section
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="container pb-8"
        >
          <h2 className="font-heading text-lg font-bold text-foreground mb-4">
            What We Offer
          </h2>
          <div className="space-y-2.5">
            {config.services.map((svc, i) => (
              <motion.button
                key={svc.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.03 }}
                onClick={() =>
                  navigate(`/service-flow/${config.code.toLowerCase()}?service=${svc.id}`)
                }
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all text-left active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <Wrench className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{svc.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {svc.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* ─── Common Issues ─── */}
        <motion.section
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.15 }}
          className="container pb-8"
        >
          <h2 className="font-heading text-lg font-bold text-foreground mb-4">
            Common Issues
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {config.commonIssues.map((issue) => (
              <button
                key={issue.id}
                onClick={() =>
                  navigate(`/service-flow/${config.code.toLowerCase()}?issue=${issue.id}`)
                }
                className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all text-left active:scale-[0.97]"
              >
                <span className="text-lg">{issue.emoji}</span>
                <span className="text-xs font-medium text-foreground leading-tight">
                  {issue.label}
                </span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Why LankaFix ─── */}
        <motion.section
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.2 }}
          className="container pb-8"
        >
          <h2 className="font-heading text-lg font-bold text-foreground mb-4">
            Why LankaFix
          </h2>
          <div className="space-y-3">
            {config.whyLankaFix.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ─── Quick Actions (Sticky Bottom) ─── */}
        <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-md border-t border-border/40 px-4 py-3 safe-area-bottom">
          <div className="container flex gap-2.5 max-w-md mx-auto">
            {config.quickActions.map((qa) => (
              <Button
                key={qa.action}
                variant={qa.primary ? "default" : "outline"}
                className={`flex-1 h-11 rounded-xl font-semibold text-sm gap-2 ${
                  qa.primary ? "" : ""
                }`}
                onClick={() => handleQuickAction(qa.action)}
              >
                {qa.primary && <Sparkles className="w-4 h-4" />}
                {!qa.primary && qa.action === "callback" && <Phone className="w-4 h-4" />}
                {qa.label}
              </Button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
