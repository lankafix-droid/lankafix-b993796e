import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Loader2, ArrowRight, AlertTriangle, ShieldCheck, Zap, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";

interface AISearchResult {
  category_code: string;
  category_name: string;
  service_type: string;
  service_name: string;
  urgency: string;
  confidence: number;
  booking_path: string;
  estimated_price_range: string;
  problem_summary: string;
  alternative_services?: { category_code: string; service_type: string; reason: string }[];
  follow_up_questions?: string[];
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-search-query`;

const EXAMPLE_QUERIES = [
  "phone screen cracked",
  "AC leaking water",
  "wifi not working upstairs",
  "CCTV camera not recording",
  "laptop very slow",
  "solar panel not generating",
];

// Strict category → route mapping
const CATEGORY_ROUTE_MAP: Record<string, string> = {
  MOBILE: "/book/mobile-phone-repairs",
  IT: "/book/it-repairs-support",
  AC: "/book/ac-solutions",
  CCTV: "/book/cctv-solutions",
  SOLAR: "/book/solar-solutions",
  ELECTRICAL: "/book/electrical-services",
  PLUMBING: "/book/plumbing-services",
  ELECTRONICS: "/book/consumer-electronics",
  NETWORK: "/book/network-support",
  SMARTHOME: "/book/smart-home-office",
  SECURITY: "/book/security-solutions",
  POWER_BACKUP: "/book/power-backup",
  COPIER: "/book/copier-printer-repair",
  SUPPLIES: "/book/print-supplies",
  APPLIANCE_INSTALL: "/book/appliance-installation",
  INSPECTION_REQUIRED: "/book/inspection",
};

const getBookingRoute = (categoryCode: string): string =>
  CATEGORY_ROUTE_MAP[categoryCode] || "/book/inspection";

function getConfidenceBucket(confidence: number): string {
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

const ABANDON_TIMEOUT_MS = 30_000;

const AISmartSearch = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTakenRef = useRef(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<AISearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Abandon tracking: start timer when result appears, clear on action
  useEffect(() => {
    if (result) {
      actionTakenRef.current = false;
      abandonTimerRef.current = setTimeout(() => {
        if (!actionTakenRef.current) {
          track("ai_abandon_after_result", {
            category: result.category_code,
            confidence: result.confidence,
            confidence_bucket: getConfidenceBucket(result.confidence),
            source_module: "ai_search",
          });
        }
      }, ABANDON_TIMEOUT_MS);
    }
    return () => {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    };
  }, [result]);

  // Also log abandon on unmount if result was shown but no action taken
  useEffect(() => {
    return () => {
      if (result && !actionTakenRef.current) {
        track("ai_abandon_after_result", {
          category: result.category_code,
          confidence: result.confidence,
          confidence_bucket: getConfidenceBucket(result.confidence),
          source_module: "ai_search",
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAction = () => {
    actionTakenRef.current = true;
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 3) return;
    setIsSearching(true);
    setError(null);
    track("ai_search_start", { query: searchQuery });

    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Search failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data: AISearchResult = await resp.json();
      setResult(data);
      track("ai_result_viewed", {
        category: data.category_code,
        confidence: data.confidence,
        confidence_bucket: getConfidenceBucket(data.confidence),
        booking_path: data.booking_path,
        source_module: "ai_search",
      });
    } catch (e: any) {
      setError(e.message || "Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setResult(null);
    performSearch(example);
  };

  const isLowConfidence = result ? result.confidence < 60 : false;
  const isInspectionRequired = result?.category_code === "INSPECTION_REQUIRED";
  const shouldInspect = isInspectionRequired || isLowConfidence || result?.booking_path === "inspection";

  const urgencyBadge = (u: string) => {
    if (u === "high") return "destructive" as const;
    if (u === "medium") return "secondary" as const;
    return "outline" as const;
  };

  const handleBookRecommended = (r: AISearchResult) => {
    markAction();
    track("ai_book_recommended_service", {
      category: r.category_code,
      service: r.service_type,
      confidence: r.confidence,
      confidence_bucket: getConfidenceBucket(r.confidence),
      booking_path: r.booking_path,
      source_module: "ai_search",
    });
    navigate(getBookingRoute(r.category_code));
  };

  const handleBookInspection = (r: AISearchResult) => {
    markAction();
    track("ai_book_inspection", {
      category: r.category_code,
      service: r.service_type,
      confidence: r.confidence,
      confidence_bucket: getConfidenceBucket(r.confidence),
      source_module: "ai_search",
    });
    navigate("/book/inspection");
  };

  const handleChooseAnother = (r: AISearchResult) => {
    markAction();
    track("ai_choose_different_service", {
      original_category: r.category_code,
      confidence: r.confidence,
      confidence_bucket: getConfidenceBucket(r.confidence),
      source_module: "ai_search",
    });
    navigate("/");
  };

  const handleAltClick = (alt: { category_code: string; service_type: string }, originalResult: AISearchResult) => {
    markAction();
    track("ai_choose_different_service", {
      original_category: originalResult.category_code,
      selected_category: alt.category_code,
      selected_service: alt.service_type,
      confidence: originalResult.confidence,
      confidence_bucket: getConfidenceBucket(originalResult.confidence),
      source_module: "ai_search",
    });
    navigate(getBookingRoute(alt.category_code));
  };

  return (
    <section className="py-10 md:py-14">
      <div className="container max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI Service Discovery
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Describe Your Problem
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Tell us what's wrong in your own words — our AI finds the right service, estimates pricing, and gets you booked.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="relative mb-4">
          <motion.div
            className="bg-card rounded-2xl border border-border/40 flex items-center gap-3 px-4"
            style={{ minHeight: "56px", boxShadow: "var(--shadow-xl)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g., phone screen cracked, AC leaking water..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setResult(null); }}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none min-h-[56px] font-medium"
              maxLength={500}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSearching || query.trim().length < 3}
              className="rounded-xl gap-1.5 bg-gradient-brand text-primary-foreground font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Search
            </Button>
          </motion.div>
        </form>

        {/* Example queries */}
        {!result && !isSearching && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 justify-center mb-6">
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex}
                onClick={() => handleExampleClick(ex)}
                className="text-xs font-medium px-3.5 py-2 rounded-full border border-border/50 bg-secondary/50 text-foreground hover:bg-primary/5 hover:border-primary/30 transition-smooth active:scale-95"
              >
                {ex}
              </button>
            ))}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">{error}</p>
              <Button size="sm" variant="outline" className="mt-2 rounded-lg" onClick={() => performSearch(query)}>
                Try Again
              </Button>
            </div>
          </motion.div>
        )}

        {/* AI Result card */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Header tag */}
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Recommendation</span>
                <Badge variant={urgencyBadge(result.urgency)} className="ml-auto text-[10px]">
                  {result.urgency} urgency
                </Badge>
              </div>

              {/* Low confidence / inspection required warning */}
              {(isLowConfidence || isInspectionRequired) && (
                <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {isInspectionRequired
                      ? "We couldn't confidently match your issue to a specific service. We recommend booking a general inspection by a verified technician."
                      : "AI confidence is low. We recommend booking an on-site inspection for an accurate diagnosis by a verified technician."}
                  </p>
                </div>
              )}

              {/* Main result card */}
              <div className="bg-card rounded-2xl border border-primary/20 p-5" style={{ boxShadow: "var(--shadow-lg)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-foreground">{result.service_name}</p>
                    <p className="text-xs text-muted-foreground">{result.category_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{result.estimated_price_range}</p>
                    <p className="text-[10px] text-muted-foreground">est. range</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{result.problem_summary}</p>

                {/* Confidence + booking path */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 mb-4">
                  <div className="relative w-12 h-12">
                    <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none"
                        stroke="hsl(var(--primary))" strokeWidth="3"
                        strokeDasharray={`${result.confidence} ${100 - result.confidence}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                      {result.confidence}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {result.confidence >= 80 ? "High confidence match" :
                       result.confidence >= 50 ? "Likely match" : "Needs inspection"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Booking path: {result.booking_path === "direct" ? "Direct booking" :
                                    result.booking_path === "inspection" ? "Inspection first" : "Quote required"}
                    </p>
                  </div>
                </div>

                {/* Structured action buttons */}
                <div className="space-y-2">
                  {/* Primary CTA */}
                  {shouldInspect ? (
                    <Button
                      className="w-full rounded-xl h-11 bg-gradient-brand text-primary-foreground font-bold gap-2"
                      onClick={() => handleBookInspection(result)}
                    >
                      <ClipboardList className="w-4 h-4" />
                      Book Inspection
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-xl h-11 bg-gradient-brand text-primary-foreground font-bold gap-2"
                      onClick={() => handleBookRecommended(result)}
                    >
                      Book Recommended Service
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Secondary CTAs */}
                  <div className="flex gap-2">
                    {!shouldInspect && (
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl h-10 gap-1.5 text-xs"
                        onClick={() => handleBookInspection(result)}
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Book Inspection
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl h-10 gap-1.5 text-xs"
                      onClick={() => handleChooseAnother(result)}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Choose Another Service
                    </Button>
                  </div>
                </div>
              </div>

              {/* Alternatives */}
              {result.alternative_services && result.alternative_services.length > 0 && (
                <div className="bg-card rounded-2xl border border-border/40 p-5" style={{ boxShadow: "var(--shadow-md)" }}>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Other Possible Services</p>
                  {result.alternative_services.map((alt, i) => (
                    <button
                      key={i}
                      onClick={() => handleAltClick(alt, result)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-smooth text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{alt.service_type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{alt.reason}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust footer */}
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" />
                <span>AI recommendation · Final diagnosis verified by certified technician</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default AISmartSearch;
