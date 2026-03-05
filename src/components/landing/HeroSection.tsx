import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, ArrowRight, Stethoscope, LayoutGrid } from "lucide-react";
import heroImage from "@/assets/hero-technician.jpg";
import MascotIcon from "@/components/brand/MascotIcon";
import { ShieldCheck, Eye, Award, KeyRound } from "lucide-react";

const CATEGORY_PILLS = [
  { label: "AC", code: "AC" },
  { label: "CCTV", code: "CCTV" },
  { label: "IT", code: "IT" },
  { label: "Mobile", code: "MOBILE" },
  { label: "Solar", code: "SOLAR" },
  { label: "Electronics", code: "CONSUMER_ELEC" },
  { label: "Copiers", code: "COPIER" },
  { label: "Smart Home", code: "SMART_HOME_OFFICE" },
  { label: "Supplies", code: "PRINT_SUPPLIES" },
] as const;

const TRUST_ITEMS = [
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Verified Tech" },
  { icon: <KeyRound className="w-3.5 h-3.5" />, label: "OTP Protected" },
  { icon: <Award className="w-3.5 h-3.5" />, label: "Warranty" },
  { icon: <Eye className="w-3.5 h-3.5" />, label: "Transparent Pricing" },
];

const HeroSection = () => {
  const [activePill, setActivePill] = useState<string>("AC");

  return (
    <section className="relative overflow-hidden bg-card">
      <div className="container py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        {/* Left column */}
        <div className="space-y-5 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5" />
            Verified & Warranty-Backed
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-foreground tracking-tight">
            Sri Lanka's Smart{" "}
            <span className="text-gradient">Service Ecosystem</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            AC • CCTV • Mobile • IT • Solar • Electronics • Copiers • Smart Home • Supplies
          </p>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_PILLS.map((pill) => (
              <button
                key={pill.code}
                onClick={() => {
                  setActivePill(pill.code);
                  console.log("[analytics] hero_pill_tap", pill.code);
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
                  activePill === pill.code
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* 3-action CTA row */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Button variant="hero" size="lg" asChild>
              <Link to="/diagnose" onClick={() => console.log("[analytics] hero_diagnose_click")}>
                <Stethoscope className="w-4 h-4 mr-1" />
                Diagnose My Problem
              </Link>
            </Button>
            <Button variant="default" size="lg" asChild>
              <Link to="/categories" onClick={() => console.log("[analytics] hero_book_click")}>
                Book a Service
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#categories" onClick={() => console.log("[analytics] hero_view_categories_click")}>
                <LayoutGrid className="w-4 h-4 mr-1" />
                Categories
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Not sure what to choose? <Link to="/diagnose" className="text-primary underline">Diagnose in 30 seconds.</Link>
          </p>

          {/* Compact trust strip */}
          <div className="flex flex-wrap gap-3 pt-1">
            {TRUST_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-success">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — hero image */}
        <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
            <img
              src={heroImage}
              alt="LankaFix verified technician at work in Colombo"
              className="w-full h-72 md:h-[400px] object-cover"
            />
          </div>
          <div className="absolute -top-3 -right-3">
            <MascotIcon state="verified" badge="verified" size="sm" />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-lg p-3 border flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Verified Partner</p>
              <p className="text-xs text-muted-foreground">Background checked</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
