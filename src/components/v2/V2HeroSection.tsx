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
      <div className="relative h-[420px] md:h-[480px] overflow-hidden">
        {BANNERS.map((b, i) => (
          <img
            key={i}
            src={b.image}
            alt={b.headline}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(215,50%,7%)] via-[hsl(215,50%,7%)/0.65] to-[hsl(215,50%,7%)/0.25]" />

        <div className="container relative h-full flex flex-col justify-end pb-24 md:pb-28">
          {/* Location + Emergency row */}
          <div className="flex items-center justify-between mb-6">
            <LocationBar onSetupLocation={onSetupLocation} />
            <Button variant="destructive" size="sm" className="shadow-lg text-xs h-8" asChild>
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

          {/* Trust pills */}
          <div className="flex flex-wrap gap-2 mb-1">
            {TRUST_PILLS.map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary-foreground/90 bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10 rounded-full px-3 py-1.5"
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
                className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-primary" : "w-4 bg-primary-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="container -mt-7 relative z-10">
        <div className="relative">
          <div className="bg-card rounded-2xl shadow-lg border p-3 md:p-4 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Try: phone screen broken, ac not cooling, wifi issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[44px]"
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
