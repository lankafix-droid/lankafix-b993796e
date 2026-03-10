import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Zap, ArrowRight, ShieldCheck, Eye, Award, Lock, MapPin, CheckCircle2, Clock, Wifi, Snowflake, Droplets } from "lucide-react";
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
  { image: heroTechnician, headline: "Sri Lanka's Smart\nService Platform", sub: "Book trusted technicians instantly across Greater Colombo" },
  { image: heroMobile, headline: "Broken Phone?\nFixed Today", sub: "Genuine parts · Same-day repair · Data-safe process" },
  { image: heroAC, headline: "Expert AC Repair\nin 2 Hours", sub: "Same-day service with verified technicians" },
  { image: heroCCTV, headline: "Professional CCTV\nInstallation", sub: "Site inspection included · Residential & commercial" },
  { image: heroIT, headline: "IT Problems?\nExpert Help Fast", sub: "Remote & on-site support for homes and businesses" },
];

const TRUST_PILLS = [
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Verified" },
  { icon: <Eye className="w-3.5 h-3.5" />, label: "Transparent" },
  { icon: <Award className="w-3.5 h-3.5" />, label: "Warranty" },
  { icon: <Lock className="w-3.5 h-3.5" />, label: "Secure" },
];

const SEARCH_CATEGORIES = [
  { label: "AC Issues", icon: <Snowflake className="w-3 h-3 text-primary" />, terms: ["AC not cooling", "AC leaking water", "AC gas top-up"] },
  { label: "IT & Laptops", icon: <Wifi className="w-3 h-3 text-primary" />, terms: ["laptop screen broken", "laptop overheating"] },
  { label: "Home", icon: <Droplets className="w-3 h-3 text-primary" />, terms: ["power trip", "water leak", "water pressure low"] },
];

const AVAILABILITY_MESSAGES = [
  { icon: <MapPin className="w-3.5 h-3.5 text-primary" />, text: "Active across Greater Colombo" },
  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-success" />, text: "Verified technicians near you" },
  { icon: <Clock className="w-3.5 h-3.5 text-warning" />, text: "Same-day in selected zones" },
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
    track("v2_search_select", { category: result.categoryCode, service: result.serviceTypeId, query: searchQuery });
    setShowResults(false);
    setSearchQuery("");
    setSearchFocused(false);
    navigate(`/book/${result.categoryCode}`);
  };

  const handleSuggestionClick = (term: string) => {
    setSearchQuery(term);
    searchRef.current?.focus();
    track("v2_search_suggestion_click", { term });
  };

  return (
    <section className="relative">
      {/* Hero banner — optimized for 320-430px */}
      <div className="relative h-[420px] sm:h-[480px] md:h-[560px] overflow-hidden">
        {BANNERS.map((b, i) => (
          <motion.img
            key={i}
            src={b.image}
            alt={b.headline}
            className="absolute inset-0 w-full h-full object-cover"
            initial={false}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1.02 : 1 }}
            transition={{ opacity: { duration: 0.8 }, scale: { duration: 6, ease: "linear" } }}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(8,27,51,0.92) 0%, rgba(8,27,51,0.55) 45%, rgba(8,27,51,0.15) 100%)"
        }} />

        <div className="container relative h-full flex flex-col justify-end pb-24 md:pb-28">
          {/* Location + Emergency */}
          <div className="flex items-center justify-between mb-6">
            <LocationBar onSetupLocation={onSetupLocation} />
            <Link
              to="/diagnose?emergency=true"
              onClick={() => track("v2_emergency_click")}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold shadow-lg active:scale-95 transition-spring bg-destructive text-destructive-foreground"
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-heading text-3xl md:text-5xl font-extrabold leading-[1.08] mb-2.5 text-primary-foreground drop-shadow-lg whitespace-pre-line tracking-tight">
                {banner.headline}
              </h1>
              <p className="text-sm mb-5 max-w-md text-primary-foreground/75 font-medium leading-relaxed">
                {banner.sub}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* CTA */}
          <div className="flex gap-3 mb-5">
            <Button
              size="lg"
              className="bg-gradient-brand text-primary-foreground shadow-brand font-bold text-sm px-6 rounded-xl active:scale-95 transition-spring h-12"
              onClick={() => {
                track("v2_hero_book_click");
                document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Book Service
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/15 text-primary-foreground bg-primary-foreground/8 backdrop-blur-md rounded-xl font-semibold text-sm active:scale-95 transition-spring h-12"
              onClick={() => {
                track("v2_hero_diagnose_click");
                document.getElementById("diagnose")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Diagnose Problem
            </Button>
          </div>

          {/* Trust pills */}
          <div className="flex gap-2 mb-2">
            {TRUST_PILLS.map((pill, i) => (
              <motion.span
                key={pill.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-3 py-1.5 text-primary-foreground/85"
                style={{
                  background: "rgba(14,76,146,0.35)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
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
                className={`h-1 rounded-full transition-all duration-500 ${i === active ? "w-8 bg-gradient-brand" : "w-3 bg-primary-foreground/20"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="container -mt-7 relative z-10">
        <div className="relative">
          <motion.div
            className="bg-card rounded-2xl border border-border/50 flex items-center gap-3 px-4"
            style={{ minHeight: "56px", boxShadow: "var(--shadow-xl)" }}
            whileTap={{ scale: 0.995 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="What do you need fixed?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setSearchFocused(true);
                if (searchResults.length > 0) setShowResults(true);
              }}
              onBlur={() => setTimeout(() => { setShowResults(false); setSearchFocused(false); }, 200)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[56px] font-medium"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-2 font-medium transition-smooth">
                Clear
              </button>
            )}
          </motion.div>

          {/* Suggestions */}
          <AnimatePresence>
            {searchFocused && !searchQuery && !showResults && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl border border-border/50 overflow-hidden z-50 p-4 space-y-3"
                style={{ boxShadow: "var(--shadow-xl)" }}
              >
                {SEARCH_CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      {cat.icon}
                      {cat.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.terms.map((term) => (
                        <button
                          key={term}
                          onMouseDown={() => handleSuggestionClick(term)}
                          className="text-xs font-medium px-3 py-1.5 rounded-full border border-border/50 bg-secondary/60 text-foreground hover:bg-primary/5 hover:border-primary/30 transition-smooth active:scale-95"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
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
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl border border-border/50 overflow-hidden z-50"
                style={{ boxShadow: "var(--shadow-xl)" }}
              >
                {searchResults.map((result, i) => (
                  <button
                    key={`${result.categoryCode}-${result.serviceTypeId}-${i}`}
                    onMouseDown={() => handleSearchSelect(result)}
                    className="w-full text-left px-5 py-3.5 hover:bg-primary/5 transition-smooth border-b border-border/20 last:border-0 flex items-center justify-between touch-target active:bg-primary/10"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{result.serviceLabel}</p>
                      <p className="text-xs text-muted-foreground">{result.categoryName}</p>
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
      <div className="container mt-4">
        <motion.div
          className="flex items-center gap-5 overflow-x-auto scrollbar-hide py-2 px-1"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {AVAILABILITY_MESSAGES.map((item) => (
            <span key={item.text} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap shrink-0">
              {item.icon}
              {item.text}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default V2HeroSection;
