import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-technician.jpg";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import MascotIcon from "@/components/brand/MascotIcon";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-card">
      <div className="container py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5" />
            Verified & Warranty-Backed
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground tracking-tight">
            Sri Lanka's Smart{" "}
            <span className="text-gradient">Service Ecosystem</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Verified technicians • Transparent pricing • Digital job tracking • Warranty-backed repairs
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="hero" size="xl" asChild>
              <Link to="/categories">
                Book a Service
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <a href="#categories">View Categories</a>
            </Button>
          </div>
        </div>

        <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
            <img
              src={heroImage}
              alt="LankaFix verified technician working on AC unit in Colombo"
              className="w-full h-80 md:h-[420px] object-cover"
            />
          </div>
          {/* Floating mascot badge */}
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
