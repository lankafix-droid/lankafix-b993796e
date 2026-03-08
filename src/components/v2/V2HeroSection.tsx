import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Zap, ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroSolar from "@/assets/hero-solar-service.jpg";

const BANNERS = [
  { image: heroAC, headline: "AC Repair in 2 Hours", sub: "Same-day service across Greater Colombo", cta: "Book AC Service", link: "/category/AC" },
  { image: heroMobile, headline: "Broken Phone Screen? Fixed Today", sub: "Genuine & OEM parts with warranty", cta: "Fix My Phone", link: "/category/MOBILE" },
  { image: heroCCTV, headline: "CCTV Installation Packages", sub: "Professional setup from Rs 15,000", cta: "Get a Quote", link: "/category/CCTV" },
  { image: heroSolar, headline: "Go Solar — Save Every Month", sub: "Full installation with CEB net-metering", cta: "Explore Solar", link: "/category/SOLAR" },
  { image: heroIT, headline: "IT Problems? We Come to You", sub: "Remote & on-site support available", cta: "Get IT Help", link: "/category/IT" },
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
      {/* Hero banner with image */}
      <div className="relative h-[420px] md:h-[480px] overflow-hidden">
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
          {/* Location + Emergency row */}
          <div className="flex items-center justify-between mb-6">
            <button className="flex items-center gap-1.5 text-sm text-primary-foreground/80 hover:text-primary-foreground bg-primary-foreground/10 backdrop-blur-sm px-3 py-1.5 rounded-full transition-colors">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium">Greater Colombo</span>
            </button>
            <Button variant="destructive" size="sm" className="shadow-lg" asChild>
              <Link to="/diagnose?emergency=true" onClick={() => track("v2_emergency_click")}>
                <Zap className="w-3.5 h-3.5 mr-1" />
                Emergency
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

          {/* Banner dots */}
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

      {/* Search bar — floating */}
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
