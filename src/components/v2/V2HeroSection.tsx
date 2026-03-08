import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Zap, ArrowRight, ShieldCheck, Eye, Award, Lock } from "lucide-react";
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
      <div className="relative h-[440px] md:h-[500px] overflow-hidden">
        {BANNERS.map((b, i) => (
          <img
            key={i}
            src={b.image}
            alt={b.headline}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.25) 100%)"
        }} />

        <div className="container relative h-full flex flex-col justify-end pb-24 md:pb-28">
          {/* Location + Emergency row */}
          <div className="flex items-center justify-between mb-6">
            <LocationBar onSetupLocation={onSetupLocation} />
            <Link
              to="/diagnose?emergency=true"
              onClick={() => track("v2_emergency_click")}
              className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground rounded-full px-4 py-2 text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Emergency</span>
              <span className="text-[9px] opacity-80 ml-0.5">24/7</span>
            </Link>
          </div>

          {/* Headline with text shadow */}
          <h1
            className="text-2xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-2 transition-all duration-500"
            style={{ color: "#FFFFFF", textShadow: "0px 2px 8px rgba(0,0,0,0.5)" }}
          >
            {banner.headline}
          </h1>
          <p
            className="text-sm md:text-base mb-5 max-w-lg"
            style={{ color: "rgba(255,255,255,0.8)", textShadow: "0px 1px 4px rgba(0,0,0,0.4)" }}
          >
            {banner.sub}
          </p>

          {/* Trust pills with dark backdrop */}
          <div className="flex flex-wrap gap-2 mb-1">
            {TRUST_PILLS.map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5"
                style={{
                  color: "#FFFFFF",
                  background: "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {pill.icon}
                {pill.label}
              </span>
            ))}
          </div>

          {/* Dots */}
          <div className="flex gap-2 mt-4">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-primary" : "w-4 bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search bar — taller, more rounded, elevated */}
      <div className="container -mt-7 relative z-10">
        <div className="relative">
          <div className="bg-card rounded-[28px] shadow-lg border flex items-center gap-3 px-5" style={{ minHeight: "56px" }}>
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Try: phone screen broken, AC not cooling, wifi problem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[56px]"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-2">
                Clear
              </button>
            )}
          </div>

          {/* Search results */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl border shadow-xl overflow-hidden z-50">
              {searchResults.map((result, i) => (
                <button
                  key={`${result.categoryCode}-${result.serviceTypeId}-${i}`}
                  onMouseDown={() => handleSearchSelect(result)}
                  className="w-full text-left px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 flex items-center justify-between min-h-[48px]"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{result.serviceLabel}</p>
                    <p className="text-xs text-muted-foreground">{result.categoryName}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
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
