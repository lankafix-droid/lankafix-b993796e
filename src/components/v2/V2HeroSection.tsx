import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Zap, ArrowRight, User, Phone } from "lucide-react";
import { track } from "@/lib/analytics";
import { SUPPORT_PHONE } from "@/config/contact";

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroTechnician from "@/assets/hero-technician.jpg";

const BANNERS = [
  { image: heroTechnician, headline: "Sri Lanka's Trusted Service Marketplace", sub: "Verified technicians · Transparent pricing · Service warranty", cta: "Book a Service", link: "/v2#categories" },
  { image: heroMobile, headline: "Broken Phone? Fixed Today", sub: "Genuine & OEM parts · Same-day repair · Data-safe process", cta: "Fix My Phone", link: "/v2/book/MOBILE" },
  { image: heroAC, headline: "AC Repair in 2 Hours", sub: "Same-day service across Greater Colombo", cta: "Book AC Service", link: "/v2/book/AC" },
  { image: heroCCTV, headline: "CCTV Installation Packages", sub: "Professional setup from Rs 15,000 · Site inspection included", cta: "Get a Quote", link: "/v2/book/CCTV" },
  { image: heroIT, headline: "IT Problems? Expert Help Fast", sub: "Remote & on-site support for homes and businesses", cta: "Get IT Help", link: "/v2/book/IT" },
];

const V2HeroSection = () => {
  const [active, setActive] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % BANNERS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[active];

  return (
    <section className="relative">
      {/* Top utility bar */}
      <div className="bg-card border-b">
        <div className="container flex items-center justify-between py-2">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">Greater Colombo</span>
          </button>
          <div className="flex items-center gap-3">
            <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> Support
            </a>
            <button className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div className="relative h-[380px] md:h-[440px] overflow-hidden">
        {BANNERS.map((b, i) => (
          <img
            key={i}
            src={b.image}
            alt={b.headline}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-navy/20" />

        <div className="container relative h-full flex flex-col justify-end pb-8 md:pb-12">
          {/* Emergency */}
          <div className="flex items-center justify-between mb-5">
            <div />
            <Button variant="destructive" size="sm" className="shadow-lg" asChild>
              <Link to="/diagnose?emergency=true" onClick={() => track("v2_emergency_click")}>
                <Zap className="w-3.5 h-3.5 mr-1" />
                Emergency Repair
              </Link>
            </Button>
          </div>

          {/* Headline */}
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground leading-tight mb-2 transition-all duration-500">
            {banner.headline}
          </h1>
          <p className="text-sm md:text-base text-primary-foreground/70 mb-5 max-w-lg">
            {banner.sub}
          </p>

          {/* CTA */}
          <Button variant="hero" size="lg" className="w-fit shadow-brand" asChild>
            <Link to={banner.link} onClick={() => track("v2_hero_cta", { banner: banner.headline })}>
              {banner.cta}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>

          {/* Dots */}
          <div className="flex gap-2 mt-5">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-primary" : "w-4 bg-primary-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="container -mt-6 relative z-10">
        <div className="bg-card rounded-2xl shadow-lg border p-3 flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-1" />
          <input
            type="text"
            placeholder="Search services... e.g. AC repair, screen fix, CCTV"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <Button size="sm" className="bg-gradient-brand hover:opacity-90 shrink-0" asChild>
            <Link to={searchQuery ? `/categories?q=${encodeURIComponent(searchQuery)}` : "/categories"}>
              Search
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default V2HeroSection;
