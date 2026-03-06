import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, ArrowRight, Stethoscope, Zap, ShieldCheck, Eye, Award, KeyRound } from "lucide-react";
import mascotImg from "@/assets/lankafix-mascot.jpg";
import heroTechnician from "@/assets/hero-technician.jpg";
import { track } from "@/lib/analytics";

const TRUST_ITEMS = [
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Verified Tech" },
  { icon: <KeyRound className="w-3.5 h-3.5" />, label: "OTP Protected" },
  { icon: <Award className="w-3.5 h-3.5" />, label: "Warranty" },
  { icon: <Eye className="w-3.5 h-3.5" />, label: "Transparent Pricing" },
];

const scrollToServices = (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById("popular-services")?.scrollIntoView({ behavior: "smooth" });
};

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-card">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] pointer-events-none" />

      <div className="container relative py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        {/* Left column */}
        <div className="space-y-5 animate-fade-in">
          {/* Mascot welcome */}
          <div className="flex items-center gap-3">
            <img
              src={mascotImg}
              alt="LankaFix mascot"
              className="w-12 h-12 rounded-full object-cover shadow-brand border-2 border-card"
            />
            <div className="bg-primary/8 border border-primary/15 rounded-2xl rounded-bl-sm px-4 py-2">
              <p className="text-sm font-medium text-foreground">Hi! I'm FixBuddy 👋</p>
              <p className="text-xs text-muted-foreground">Let me help you find the right service.</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-gradient-brand text-primary-foreground text-sm font-medium px-3.5 py-1.5 rounded-full shadow-sm">
            <Shield className="w-3.5 h-3.5" />
            Verified & Warranty-Backed
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-foreground tracking-tight">
            Verified Tech Services{" "}
            <span className="text-gradient">Near You</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Book trusted technicians for repairs, installations, and technical support — all verified, warranty-backed, and OTP-protected.
          </p>

          {/* 3-action CTA row */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Button variant="hero" size="lg" className="shadow-brand" asChild>
              <a href="#popular-services" aria-label="Book a service" onClick={(e) => { track("hero_book_click"); scrollToServices(e); }}>
                Book a Service
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
            <Button variant="default" size="lg" asChild>
              <Link to="/diagnose" aria-label="Describe my problem" onClick={() => track("hero_diagnose_click")}>
                <Stethoscope className="w-4 h-4 mr-1" />
                Describe My Problem
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive" asChild>
              <Link to="/diagnose?emergency=true" aria-label="Emergency repair needed" onClick={() => track("hero_emergency_click")}>
                <Zap className="w-4 h-4 mr-1" />
                Emergency Repair
              </Link>
            </Button>
          </div>

          {/* Compact trust strip */}
          <div className="space-y-1.5 pt-1">
            <div className="flex flex-wrap gap-3">
              {TRUST_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-lankafix-green">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/70">
              No surprises — work starts only after your approval.
            </p>
          </div>
        </div>

        {/* Right column — hero image */}
        <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/15 border border-border/50">
            <img
              src={heroTechnician}
              alt="Verified LankaFix technician helping a customer in Colombo"
              className="w-full h-72 md:h-[420px] object-cover"
            />
          </div>
          {/* Trust floating card */}
          <div className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-lg shadow-primary/10 p-3 border flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Verified Partner</p>
              <p className="text-[11px] text-muted-foreground">Background checked & certified</p>
            </div>
          </div>
          {/* Stats floating card */}
          <div className="absolute -top-3 -right-3 bg-card rounded-xl shadow-lg shadow-primary/10 p-3 border">
            <p className="text-xs font-bold text-foreground">4.7★ Rating</p>
            <p className="text-[11px] text-muted-foreground">5,000+ jobs done</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
