import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Zap, ArrowRight, ShieldCheck, Eye, Award, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/analytics";
import { searchServices, type SearchResult } from "@/data/v2CategoryFlows";
import LocationBar from "@/components/v2/location/LocationBar";

import heroAC from "@/assets/hero-ac-service.jpg";
import heroCCTV from "@/assets/hero-cctv-service.jpg";
import heroMobile from "@/assets/hero-mobile-repair.jpg";
import heroIT from "@/assets/hero-it-repair.jpg";
import heroTechnician from "@/assets/hero-technician.jpg";

const BANNERS = [
  { image: heroTechnician, headline: "Find Trusted Technicians Near You", sub: "Repairs · Installations · Technical Services" },
  { image: heroMobile, headline: "Broken Phone? Fixed Today", sub: "Genuine parts · Same-day repair · Data-safe process" },
  { image: heroAC, headline: "AC Repair in 2 Hours", sub: "Same-day service across Greater Colombo" },
  { image: heroCCTV, headline: "Professional CCTV Installation", sub: "Site inspection included · Residential & commercial" },
  { image: heroIT, headline: "IT Problems? Expert Help Fast", sub: "Remote & on-site support for homes and businesses" },
];

const TRUST_PILLS = [
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Verified Technicians" },
  { icon: <Eye className="w-3.5 h-3.5" />, label: "Transparent Pricing" },
  { icon: <Award className="w-3.5 h-3.5" />, label: "Service Warranty" },
  { icon: <Lock className="w-3.5 h-3.5" />, label: "Secure Booking" },
];

interface Props {
  onSetupLocation?: () => void;
}

const V2HeroSection = ({ onSetupLocation }: Props) => {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % BANNERS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const results = searchServices(searchQuery);
    setSearchResults(results);
    setShowResults(results.length > 0 && searchQuery.length >= 2);
  }, [searchQuery]);

  const banner = BANNERS[active];

  const handleSearchSelect = (result: SearchResult) => {
    track("v2_search_select", { category: result.categoryCode, service: result.serviceTypeId, query: searchQuery });
    setShowResults(false);
    setSearchQuery("");
    navigate(`/book/${result.categoryCode}`);
  };

  return (
    <section className="relative">
      {/* Hero banner */}
      <div className="relative h-[460px] md:h-[520px] overflow-hidden">
        {BANNERS.map((b, i) => (
          <img
            key={i}
            src={b.image}
            alt={b.headline}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        {/* Strong dark gradient for text readability */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(8,27,51,0.85) 0%, rgba(8,27,51,0.55) 45%, rgba(8,27,51,0.30) 100%)"
        }} />

        <div className="container relative h-full flex flex-col justify-end pb-24 md:pb-28">
          {/* Location + Emergency row */}
          <div className="flex items-center justify-between mb-6">
            <LocationBar onSetupLocation={onSetupLocation} />
            <Link
              to="/diagnose?emergency=true"
              onClick={() => track("v2_emergency_click")}
              className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground rounded-full px-4 py-2 text-xs font-bold shadow-lg hover:opacity-90 transition-opacity active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Emergency</span>
              <span className="text-[9px] opacity-80 ml-0.5">24/7</span>
            </Link>
          </div>

          {/* Headline */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-2 text-white drop-shadow-lg">
                {banner.headline}
              </h1>
              <p className="text-sm md:text-base mb-5 max-w-lg text-white/85 drop-shadow-md font-medium">
                {banner.sub}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Trust pills */}
          <div className="flex flex-wrap gap-2 mb-1">
            {TRUST_PILLS.map((pill, i) => (
              <motion.span
                key={pill.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4, ease: "easeOut" }}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 text-white border border-white/15"
                style={{
                  background: "rgba(14,76,146,0.55)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {pill.icon}
                {pill.label}
              </motion.span>
            ))}
          </div>

          {/* Dots */}
          <div className="flex gap-2 mt-4">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-white" : "w-4 bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="container -mt-7 relative z-10">
        <div className="relative">
          <div className="bg-card rounded-2xl shadow-lg border border-border/60 flex items-center gap-3 px-5" style={{ minHeight: "56px" }}>
            <Search className="w-5 h-5 text-primary shrink-0" />
            <input
              type="text"
              placeholder="Try: phone screen broken, AC not cooling, wifi problem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[56px] font-medium"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-2 font-medium">
                Clear
              </button>
            )}
          </div>

          {/* Search results */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl border border-border shadow-xl overflow-hidden z-50">
              {searchResults.map((result, i) => (
                <button
                  key={`${result.categoryCode}-${result.serviceTypeId}-${i}`}
                  onMouseDown={() => handleSearchSelect(result)}
                  className="w-full text-left px-4 py-3.5 hover:bg-primary/5 transition-colors border-b border-border/30 last:border-0 flex items-center justify-between min-h-[48px]"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{result.serviceLabel}</p>
                    <p className="text-xs text-muted-foreground">{result.categoryName}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default V2HeroSection;
