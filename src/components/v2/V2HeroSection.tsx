import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Zap, ArrowRight, ShieldCheck, Eye, Award, FileText, MapPin, CheckCircle2, Clock, Snowflake, Smartphone, Monitor, Camera } from "lucide-react";
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
  { image: heroTechnician, headline: "Sri Lanka's Trusted\nService Platform", sub: "Verified technicians · Transparent pricing · Warranty-backed repairs" },
  { image: heroMobile, headline: "Broken Phone?\nFixed Today", sub: "Genuine parts · Same-day repair · Data-safe process" },
  { image: heroAC, headline: "Expert AC Repair\nin 2 Hours", sub: "Same-day service across Greater Colombo" },
  { image: heroCCTV, headline: "Professional CCTV\nInstallation", sub: "Site inspection included · Residential & commercial" },
  { image: heroIT, headline: "IT Problems?\nExpert Help Fast", sub: "Remote & on-site support for homes and businesses" },
];

const TRUST_PILLS = [
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Verified Technicians" },
  { icon: <Eye className="w-3.5 h-3.5" />, label: "Transparent Pricing" },
  { icon: <Award className="w-3.5 h-3.5" />, label: "Warranty-Backed" },
  { icon: <FileText className="w-3.5 h-3.5" />, label: "Digital Invoice" },
];

const CATEGORY_SHORTCUTS = [
  { icon: <Snowflake className="w-4 h-4" />, label: "AC", link: "/book/AC" },
  { icon: <Smartphone className="w-4 h-4" />, label: "Mobile", link: "/book/MOBILE" },
  { icon: <Monitor className="w-4 h-4" />, label: "IT", link: "/book/IT" },
  { icon: <Camera className="w-4 h-4" />, label: "CCTV", link: "/book/CCTV" },
];

const SEARCH_SUGGESTIONS = [
  "AC not cooling", "AC leaking water", "AC gas top-up",
  "phone screen cracked", "laptop slow", "WiFi not working",
  "CCTV not recording", "solar panel cleaning",
];

const AVAILABILITY_MESSAGES = [
  { icon: <MapPin className="w-3.5 h-3.5 text-primary" />, text: "Greater Colombo coverage" },
  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-success" />, text: "Verified technicians" },
  { icon: <Clock className="w-3.5 h-3.5 text-warning" />, text: "Same-day available" },
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
      {/* Hero banner */}
      <div className="relative h-[420px] sm:h-[480px] md:h-[540px] overflow-hidden">
        {BANNERS.map((b, i) => (
          <motion.img
            key={i}
            src={b.image}
            alt={b.headline}
            className="absolute inset-0 w-full h-full object-cover"
            initial={false}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1.03 : 1 }}
            transition={{ opacity: { duration: 1 }, scale: { duration: 8, ease: "linear" } }}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, hsl(213 75% 8% / 0.95) 0%, hsl(213 75% 8% / 0.65) 40%, hsl(213 75% 8% / 0.25) 70%, hsl(213 75% 8% / 0.15) 100%)"
        }} />

        <div className="container relative h-full flex flex-col justify-end pb-20 sm:pb-24 md:pb-28">
          {/* Location + Emergency */}
          <div className="flex items-center justify-between mb-6">
            <LocationBar onSetupLocation={onSetupLocation} />
            <Link
              to="/diagnose?emergency=true"
              onClick={() => track("homepage_emergency_click")}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-lg active:scale-95 transition-spring bg-destructive text-destructive-foreground"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground" />
              </span>
              Emergency
            </Link>
          </div>

          {/* Headline */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-heading text-[26px] sm:text-4xl md:text-5xl font-extrabold leading-[1.08] mb-2.5 text-white drop-shadow-lg whitespace-pre-line tracking-tight">
                {banner.headline}
              </h1>
              <p className="text-[13px] sm:text-sm mb-5 max-w-sm text-white/70 font-medium leading-relaxed">
                {banner.sub}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Category shortcuts */}
          <div className="flex gap-2.5 mb-5">
            {CATEGORY_SHORTCUTS.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
              >
                <Link
                  to={cat.link}
                  onClick={() => track("homepage_hero_category", { category: cat.label })}
                  className="flex flex-col items-center gap-1.5 w-16 py-2 rounded-xl active:scale-95 transition-spring"
                  style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
                >
                  <span className="text-white/90">{cat.icon}</span>
                  <span className="text-[10px] font-semibold text-white/80">{cat.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TRUST_PILLS.map((pill, i) => (
              <motion.span
                key={pill.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.06, duration: 0.3 }}
                className="inline-flex items-center gap-1 text-[9px] font-semibold rounded-full px-2.5 py-1 text-white/85 border border-white/10"
                style={{ background: "rgba(14,76,146,0.3)", backdropFilter: "blur(16px)" }}
              >
                {pill.icon}
                {pill.label}
              </motion.span>
            ))}
          </div>

          {/* Dots */}
          <div className="flex gap-1.5 mt-2">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Banner ${i + 1}`}
                className={`rounded-full transition-all duration-500 ${i === active ? "w-7 h-1.5 bg-gradient-brand" : "w-2.5 h-1.5 bg-white/20 hover:bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="container -mt-7 relative z-10">
        <div className="relative">
          <div
            className="bg-card rounded-2xl border border-border/40 flex items-center gap-3 px-4"
            style={{ minHeight: "54px", boxShadow: "0 8px 32px -8px hsl(213 75% 8% / 0.12)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
              <Search className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="What do you need fixed?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setSearchFocused(true);
                track("homepage_search_focus");
                if (searchResults.length > 0) setShowResults(true);
              }}
              onBlur={() => setTimeout(() => { setShowResults(false); setSearchFocused(false); }, 200)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[54px] font-medium"
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
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Try searching</p>
                <div className="flex flex-wrap gap-2">
                  {SEARCH_SUGGESTIONS.map((term) => (
                    <button
                      key={term}
                      onMouseDown={() => handleSuggestionClick(term)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-border/50 bg-secondary/50 text-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-95"
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

      {/* Availability strip */}
      <div className="container mt-4 mb-1">
        <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide py-2 px-1">
          {AVAILABILITY_MESSAGES.map((item) => (
            <span key={item.text} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap shrink-0">
              {item.icon}
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2HeroSection;
