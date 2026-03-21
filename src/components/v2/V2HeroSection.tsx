import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, ShieldCheck, Eye, Wallet, Award, MapPin, CheckCircle2, Clock } from "lucide-react";
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
  { image: heroTechnician, headline: "Verified Tech.\nFixed Fast.", sub: "Background-checked technicians · Transparent pricing · Service warranty" },
  { image: heroMobile, headline: "Phone Broken?\nFixed Today.", sub: "Genuine parts · Same-day screen repair · Data-safe process" },
  { image: heroAC, headline: "AC Not Cooling?\n2-Hour Fix.", sub: "Gas top-up, repair & servicing across Greater Colombo" },
  { image: heroCCTV, headline: "Professional\nCCTV Setup.", sub: "Site inspection included · Residential & commercial" },
  { image: heroIT, headline: "IT Problems?\nSorted Fast.", sub: "Remote & on-site support for homes and businesses" },
];

const TRUST_PILLS = [
  { icon: <ShieldCheck className="w-3 h-3" />, label: "Verified Technicians" },
  { icon: <Eye className="w-3 h-3" />, label: "Upfront Pricing" },
  { icon: <Wallet className="w-3 h-3" />, label: "Pay After Service" },
];

const SEARCH_SUGGESTIONS = [
  "AC not cooling", "phone screen cracked", "laptop slow",
  "WiFi not working", "CCTV not recording", "AC gas top-up",
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
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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
    track("homepage_search_select", { category: result.categoryCode, service: result.serviceTypeId, query: searchQuery });
    setShowResults(false);
    setSearchQuery("");
    setSearchFocused(false);
    navigate(`/book/${result.categoryCode}`);
  };

  const handleSuggestionClick = (term: string) => {
    setSearchQuery(term);
    searchRef.current?.focus();
    track("homepage_search_suggestion", { term });
  };

  return (
    <section className="relative">
      {/* Hero banner — taller for impact, simpler content */}
      <div className="relative h-[380px] sm:h-[440px] md:h-[500px] overflow-hidden">
        {BANNERS.map((b, i) => (
          <motion.img
            key={i}
            src={b.image}
            alt={b.headline}
            className="absolute inset-0 w-full h-full object-cover"
            initial={false}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1.02 : 1 }}
            transition={{ opacity: { duration: 1.2 }, scale: { duration: 10, ease: "linear" } }}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        {/* Premium gradient overlay — deeper at bottom for readability */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, hsl(213 75% 5% / 0.92) 0%, hsl(213 75% 5% / 0.55) 45%, hsl(213 75% 5% / 0.15) 80%, transparent 100%)"
        }} />

        <div className="container relative h-full flex flex-col justify-end pb-16 sm:pb-20">
          {/* Location bar — minimal */}
          <div className="mb-5">
            <LocationBar onSetupLocation={onSetupLocation} />
          </div>

          {/* Headline — bold, clear, Apple-level restraint */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-heading text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-[1.05] mb-2 text-white tracking-tight whitespace-pre-line">
                {banner.headline}
              </h1>
              <p className="text-[13px] sm:text-sm max-w-sm text-white/60 font-medium leading-relaxed">
                {banner.sub}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Trust pills — compact, 3 only */}
          <div className="flex gap-2 mt-4">
            {TRUST_PILLS.map((pill, i) => (
              <motion.span
                key={pill.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-white/70 tracking-wide"
              >
                <span className="text-white/50">{pill.icon}</span>
                {pill.label}
                {i < TRUST_PILLS.length - 1 && <span className="ml-2 text-white/20">·</span>}
              </motion.span>
            ))}
          </div>

          {/* Banner dots — minimal */}
          <div className="flex gap-1.5 mt-4">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Banner ${i + 1}`}
                className={`rounded-full transition-all duration-500 ${i === active ? "w-6 h-1 bg-white/80" : "w-1.5 h-1 bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search bar — floating, prominent */}
      <div className="container -mt-7 relative z-10">
        <div className="relative">
          <div
            className="bg-card rounded-2xl border border-border/50 flex items-center gap-3 px-4"
            style={{ minHeight: "52px", boxShadow: "0 8px 32px -8px hsl(213 75% 8% / 0.15)" }}
          >
            <Search className="w-4.5 h-4.5 text-muted-foreground/50 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Describe your issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setSearchFocused(true);
                track("homepage_search_focus");
                if (searchResults.length > 0) setShowResults(true);
              }}
              onBlur={() => setTimeout(() => { setShowResults(false); setSearchFocused(false); }, 200)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none min-h-[52px] font-medium"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-2 font-medium">
                Clear
              </button>
            )}
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {searchFocused && !searchQuery && !showResults && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl border border-border/40 overflow-hidden z-50 p-4"
                style={{ boxShadow: "0 12px 40px -12px hsl(213 75% 8% / 0.15)" }}
              >
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Common issues</p>
                <div className="flex flex-wrap gap-2">
                  {SEARCH_SUGGESTIONS.map((term) => (
                    <button
                      key={term}
                      onMouseDown={() => handleSuggestionClick(term)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-border/50 bg-secondary/50 text-foreground hover:bg-primary/5 hover:border-primary/20 transition-colors active:scale-95"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl border border-border/40 overflow-hidden z-50"
                style={{ boxShadow: "0 12px 40px -12px hsl(213 75% 8% / 0.15)" }}
              >
                {searchResults.slice(0, 5).map((result, i) => (
                  <button
                    key={`${result.categoryCode}-${result.serviceTypeId}-${i}`}
                    onMouseDown={() => handleSearchSelect(result)}
                    className="w-full text-left px-5 py-3.5 hover:bg-primary/5 transition-colors border-b border-border/15 last:border-0 flex items-center justify-between touch-target active:bg-primary/10"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{result.serviceLabel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{result.categoryName}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Availability indicators — subtle, below search */}
      <div className="container mt-3 mb-1">
        <div className="flex items-center justify-center gap-4 py-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
            <CheckCircle2 className="w-3 h-3 text-success/60" />
            Verified technicians
          </span>
          <span className="text-muted-foreground/20">·</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
            <Clock className="w-3 h-3 text-primary/50" />
            Same-day available
          </span>
          <span className="text-muted-foreground/20">·</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
            <MapPin className="w-3 h-3 text-primary/50" />
            Greater Colombo
          </span>
        </div>
      </div>
    </section>
  );
};

export default V2HeroSection;
