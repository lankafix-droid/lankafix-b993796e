import { useParams, Link, useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, FileText, Clock } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { QuoteData, QuoteOption } from "@/types/booking";
import MascotIcon from "@/components/brand/MascotIcon";
import LankaFixLogo from "@/components/brand/LankaFixLogo";

function generateMockQuote(): QuoteData {
  const optionA: QuoteOption = {
    id: "A",
    label: "Option A — Genuine Parts",
    laborItems: [
      { description: "Site inspection & assessment", amount: 3000 },
      { description: "Installation / repair labor", amount: 8000 },
      { description: "Configuration & testing", amount: 2000 },
    ],
    partsItems: [
      { description: "Primary component (Genuine)", amount: 15000, partQuality: "genuine" },
      { description: "Wiring & connectors", amount: 2500, partQuality: "genuine" },
    ],
    addOns: [{ description: "Extended warranty (6 months)", amount: 3000 }],
    totals: { labor: 13000, parts: 17500, addOns: 3000, total: 33500 },
    warranty: { labor: "90 days", parts: "Manufacturer warranty (12 months)" },
    partQuality: "genuine",
  };

  const optionB: QuoteOption = {
    id: "B",
    label: "Option B — OEM Grade Parts",
    laborItems: [
      { description: "Site inspection & assessment", amount: 3000 },
      { description: "Installation / repair labor", amount: 8000 },
      { description: "Configuration & testing", amount: 2000 },
    ],
    partsItems: [
      { description: "Primary component (OEM Grade)", amount: 10000, partQuality: "oem_grade" },
      { description: "Wiring & connectors", amount: 2000, partQuality: "oem_grade" },
    ],
    addOns: [{ description: "Extended warranty (3 months)", amount: 1500 }],
    totals: { labor: 13000, parts: 12000, addOns: 1500, total: 26500 },
    warranty: { labor: "90 days", parts: "OEM warranty (6 months)" },
    partQuality: "oem_grade",
  };

  const optionC: QuoteOption = {
    id: "C",
    label: "Option C — Compatible Parts",
    laborItems: [
      { description: "Site inspection & assessment", amount: 3000 },
      { description: "Installation / repair labor", amount: 8000 },
      { description: "Configuration & testing", amount: 2000 },
    ],
    partsItems: [
      { description: "Primary component (Compatible)", amount: 6000, partQuality: "compatible" },
      { description: "Wiring & connectors", amount: 1500, partQuality: "compatible" },
    ],
    addOns: [],
    totals: { labor: 13000, parts: 7500, addOns: 0, total: 20500 },
    warranty: { labor: "90 days", parts: "LankaFix warranty (3 months)" },
    partQuality: "compatible",
  };

  return {
    options: [optionA, optionB, optionC],
    selectedOptionId: null,
    recommendedOptionId: "B",
    scopeIncludes: [
      "Full site inspection and assessment",
      "Component replacement and installation",
      "Post-installation testing and calibration",
      "Clean-up and disposal of old parts",
    ],
    scopeExcludes: [
      "Structural modifications to walls or ceilings",
      "Electrical rewiring beyond connection points",
      "Additional units not listed in quote",
    ],
    notes: "Quote valid for the listed scope only. Any additional work discovered during service will require a revised quote. Parts availability may affect timeline by 1–3 business days.",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    laborItems: optionA.laborItems,
    partsItems: optionA.partsItems,
    addOns: optionA.addOns,
    totals: optionA.totals,
    warranty: optionA.warranty,
  };
}

const QUALITY_BADGES: Record<string, { label: string; color: string }> = {
  genuine: { label: "Genuine", color: "bg-success/10 text-success border-success/20" },
  oem_grade: { label: "OEM Grade", color: "bg-primary/10 text-primary border-primary/20" },
  compatible: { label: "Compatible", color: "bg-warning/10 text-warning border-warning/20" },
};

const QuoteApproval = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { getBooking, updateBookingStatus, setBookingQuote } = useBookingStore();

  const [decided, setDecided] = useState<"approved" | null>(null);
  const [showRejectOptions, setShowRejectOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("A");

  const booking = getBooking(jobId || "");

  // Seed quote on mount if needed
  useEffect(() => {
    if (booking && !booking.quote) {
      setBookingQuote(booking.jobId, generateMockQuote());
    }
  }, [booking?.jobId, booking?.quote]);

  const quote = booking?.quote || null;

  const expiresIn = useMemo(() => {
    if (!quote) return "";
    const diff = new Date(quote.expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  }, [quote?.expiresAt]);

  if (!booking || !quote) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Booking Not Found</h1>
            <Button asChild variant="outline"><Link to="/track">Track a Job</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const activeOption = quote.options?.find((o) => o.id === selectedOption) || null;

  const handleApprove = () => {
    updateBookingStatus(booking.jobId, "quote_approved");
    setDecided("approved");
  };

  const handleRejectOption = (reason: string) => {
    if (reason === "reschedule") {
      navigate(`/precheck/${booking.categoryCode}/${booking.serviceCode}`);
      return;
    }
    if (reason === "cancel") {
      navigate(`/tracker/${booking.jobId}`);
      return;
    }
    updateBookingStatus(booking.jobId, "quote_rejected");
    navigate(`/tracker/${booking.jobId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to={`/tracker/${booking.jobId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tracker
          </Link>

          {/* Header with mascot */}
          <div className="flex items-center gap-3 mb-2">
            <MascotIcon state="verified" badge="verified" size="sm" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Quote Approval</h1>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-warning" />
                <span className="text-sm text-warning font-medium">Expires in {expiresIn}</span>
              </div>
            </div>
          </div>

          {/* Job Info */}
          <div className="bg-card rounded-xl border p-5 mb-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <LankaFixLogo size="sm" />
              <Badge variant="outline" className="text-xs">Quote #{booking.jobId}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Service</span>
                <p className="font-semibold text-foreground">{booking.serviceName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Technician</span>
                <p className="font-semibold text-foreground">{booking.technician?.name || "—"}</p>
              </div>
            </div>
          </div>

          {/* Option Tabs */}
          {quote.options && quote.options.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {quote.options.map((opt) => {
                const qb = QUALITY_BADGES[opt.partQuality];
                const isRecommended = opt.id === quote.recommendedOptionId;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt.id)}
                    className={`flex-1 min-w-0 rounded-xl border p-3 text-left transition-all relative ${
                      selectedOption === opt.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    {isRecommended && (
                      <Badge className="absolute -top-2 left-2 text-[9px] bg-primary text-primary-foreground px-1.5 py-0">Recommended</Badge>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">Option {opt.id}</span>
                      <Badge variant="outline" className={`text-[10px] ${qb?.color || ""}`}>{qb?.label}</Badge>
                    </div>
                    <p className="text-lg font-bold text-foreground">LKR {opt.totals.total.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Parts: {opt.warranty.parts}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active option detail */}
          {activeOption && (
            <>
              <div className="bg-card rounded-xl border p-5 mb-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">Labor</h3>
                <div className="space-y-2">
                  {activeOption.laborItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.description}</span>
                      <span className="font-medium text-foreground">LKR {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5 mb-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">Parts</h3>
                <div className="space-y-2">
                  {activeOption.partsItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.description}</span>
                      <span className="font-medium text-foreground">LKR {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              {activeOption.addOns.length > 0 && (
                <div className="bg-card rounded-xl border p-5 mb-3">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Add-Ons</h3>
                  <div className="space-y-2">
                    {activeOption.addOns.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span className="font-medium text-foreground">LKR {item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Labor</span><span className="text-foreground">LKR {activeOption.totals.labor.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Parts</span><span className="text-foreground">LKR {activeOption.totals.parts.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Add-Ons</span><span className="text-foreground">LKR {activeOption.totals.addOns.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2"><span className="text-foreground">Total</span><span className="text-primary">LKR {activeOption.totals.total.toLocaleString()}</span></div>
                </div>
              </div>

              {/* Warranty */}
              <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Warranty Terms</p>
                  <p className="text-xs text-muted-foreground mt-1">Labor: {activeOption.warranty.labor}</p>
                  <p className="text-xs text-muted-foreground">Parts: {activeOption.warranty.parts}</p>
                </div>
              </div>
            </>
          )}

          {/* Scope & Assumptions */}
          {quote.scopeIncludes.length > 0 && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Scope & Assumptions</h3>
              <div className="mb-3">
                <p className="text-xs font-medium text-success mb-1.5">✓ Includes</p>
                <ul className="space-y-1">
                  {quote.scopeIncludes.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-success mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              {quote.scopeExcludes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1.5">✗ Excludes</p>
                  <ul className="space-y-1">
                    {quote.scopeExcludes.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-destructive mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Risk Notes */}
          {quote.notes && (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 mb-8 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">⚠ Important Notes</p>
              <p>{quote.notes}</p>
            </div>
          )}



          {/* Actions */}
          {decided === "approved" ? (
            <div className="rounded-xl p-5 text-center bg-success/10 border border-success/20">
              <MascotIcon state="completed" size="sm" className="mx-auto mb-2" />
              <p className="font-semibold text-foreground">✓ Quote Approved (Option {selectedOption})</p>
              <p className="text-xs text-muted-foreground mt-1">Work will begin as scheduled.</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to={`/tracker/${booking.jobId}`}>Back to Tracker</Link>
              </Button>
            </div>
          ) : showRejectOptions ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">What would you like to do?</p>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleRejectOption("cheaper")}>Request cheaper option (Compatible parts)</Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleRejectOption("alternative")}>Ask for alternative parts</Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleRejectOption("reschedule")}>Reschedule inspection</Button>
              <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => handleRejectOption("cancel")}>Cancel booking</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowRejectOptions(false)}>Back</Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="hero" size="xl" className="flex-1" onClick={handleApprove}>
                Approve Option {selectedOption}
              </Button>
              <Button variant="outline" size="xl" className="flex-1" onClick={() => setShowRejectOptions(true)}>
                Not Happy?
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuoteApproval;
