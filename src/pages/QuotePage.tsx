import { useParams, Link, useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, RotateCcw, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import type { QuoteOption } from "@/types/booking";
import MascotIcon from "@/components/brand/MascotIcon";
import MascotGuide from "@/components/mascot/MascotGuide";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import { QUALITY_BADGES, TRUST_ICONS, canTransition } from "@/brand/trustSystem";
import { generateDemoQuote } from "@/engines/quoteEngine";
import { toast } from "sonner";

const QuotePage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { getBooking, setBookingQuote, approveQuote, updateBookingStatus } = useBookingStore();

  const [selectedTab, setSelectedTab] = useState<string>("A");
  const [showRejectOptions, setShowRejectOptions] = useState(false);

  const booking = getBooking(jobId || "");

  // Generate demo quote if needed
  const handleGenerateQuote = () => {
    if (!booking) return;
    const quote = generateDemoQuote(booking.categoryCode, booking.serviceCode, booking.pricing.estimatedMin);
    setBookingQuote(booking.jobId, quote);
    toast.success("Demo quote generated");
  };

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MascotIcon state="default" size="lg" className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Booking Not Found</h1>
            <p className="text-sm text-muted-foreground mb-4">No booking found for &quot;{jobId}&quot;</p>
            <Button asChild variant="outline"><Link to="/track">Track a Job</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const quote = booking.quote;
  const isApproved = !!quote?.approvedAt;

  const expiresIn = useMemo(() => {
    if (!quote) return "";
    const diff = new Date(quote.expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  }, [quote?.expiresAt]);

  if (!quote) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background">
          <div className="container py-8 max-w-2xl">
            <Link to={`/tracker/${booking.jobId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Tracker
            </Link>
            <MascotGuide messageKey="quote_ready" className="mb-4" />
            <div className="bg-card rounded-xl border p-6 text-center">
              <TRUST_ICONS.ReceiptText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-bold text-foreground mb-1">Quote Not Ready Yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                The technician is inspecting and preparing a detailed quote.
              </p>
              <Button variant="outline" onClick={handleGenerateQuote}>
                Generate Demo Quote (Testing)
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const activeOption: QuoteOption | undefined = quote.options?.find((o) => o.id === selectedTab);

  const handleApprove = () => {
    approveQuote(booking.jobId, selectedTab);
    toast.success(`Option ${selectedTab} approved`);
    setTimeout(() => navigate(`/tracker/${booking.jobId}`), 600);
  };

  const handleRevise = () => {
    if (canTransition(booking.status, "quote_revised")) {
      updateBookingStatus(booking.jobId, "quote_revised");
      toast.info("Revision requested — technician will update the quote");
    }
  };

  const handleReject = () => {
    if (canTransition(booking.status, "quote_rejected")) {
      updateBookingStatus(booking.jobId, "quote_rejected");
      toast.info("Quote rejected");
      navigate(`/tracker/${booking.jobId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to={`/tracker/${booking.jobId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tracker
          </Link>

          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <MascotIcon state="verified" badge="verified" size="sm" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Quote Ready</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">{booking.jobId}</Badge>
                  <span className="text-xs text-muted-foreground">{booking.categoryName} • {booking.serviceName}</span>
                </div>
              </div>
            </div>
            {!isApproved && (
              <div className="flex items-center gap-1 text-warning">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{expiresIn}</span>
              </div>
            )}
          </div>

          {/* Technician */}
          {booking.technician && (
            <div className="bg-card rounded-xl border p-4 mt-4 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TRUST_ICONS.ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{booking.technician.name}</p>
                <p className="text-xs text-muted-foreground">{booking.technician.partnerName} • ★{booking.technician.rating} • {booking.technician.jobsCompleted} jobs</p>
              </div>
              <Badge variant="outline" className="text-[10px]">Verified since {new Date(booking.technician.verifiedSince).getFullYear()}</Badge>
            </div>
          )}

          {/* Inspection Findings */}
          {quote.inspectionFindings && quote.inspectionFindings.length > 0 && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TRUST_ICONS.ListChecks className="w-4 h-4 text-primary" />
                Inspection Findings
              </h3>
              <ul className="space-y-1.5">
                {quote.inspectionFindings.map((finding, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span> {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Option Tabs */}
          {quote.options && quote.options.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {quote.options.map((opt) => {
                const qb = QUALITY_BADGES[opt.partQuality];
                const isRecommended = opt.id === quote.recommendedOptionId;
                const isSelected = opt.id === quote.selectedOptionId;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedTab(opt.id)}
                    className={`flex-1 min-w-0 rounded-xl border p-3 text-left transition-all relative ${
                      selectedTab === opt.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    {isRecommended && (
                      <Badge className="absolute -top-2 left-2 text-[9px] bg-primary text-primary-foreground px-1.5 py-0">Recommended</Badge>
                    )}
                    {isSelected && (
                      <Badge className="absolute -top-2 right-2 text-[9px] bg-success text-success-foreground px-1.5 py-0">Approved</Badge>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">Option {opt.id}</span>
                      <Badge variant="outline" className={`text-[10px] ${qb.color}`}>{qb.label}</Badge>
                    </div>
                    <p className="text-lg font-bold text-foreground">LKR {opt.totals.total.toLocaleString("en-LK")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Parts: {opt.warranty.parts}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Recommended Reason */}
          {quote.recommendedReason && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4 text-xs">
              <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                <TRUST_ICONS.BadgeCheck className="w-3.5 h-3.5 text-primary" />
                Why we recommend Option {quote.recommendedOptionId}
              </p>
              <p className="text-muted-foreground">{quote.recommendedReason}</p>
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
                      <span className="font-medium text-foreground">LKR {item.amount.toLocaleString("en-LK")}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5 mb-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">Parts</h3>
                <div className="space-y-2">
                  {activeOption.partsItems.map((item, i) => {
                    const pq = item.partQuality ? QUALITY_BADGES[item.partQuality] : null;
                    return (
                      <div key={i} className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          {item.description}
                          {pq && <Badge variant="outline" className={`text-[9px] ${pq.color}`}>{pq.label}</Badge>}
                        </span>
                        <span className="font-medium text-foreground">LKR {item.amount.toLocaleString("en-LK")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {activeOption.addOns.length > 0 && (
                <div className="bg-card rounded-xl border p-5 mb-3">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Add-Ons</h3>
                  <div className="space-y-2">
                    {activeOption.addOns.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span className="font-medium text-foreground">LKR {item.amount.toLocaleString("en-LK")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Labor</span><span className="text-foreground">LKR {activeOption.totals.labor.toLocaleString("en-LK")}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Parts</span><span className="text-foreground">LKR {activeOption.totals.parts.toLocaleString("en-LK")}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Add-Ons</span><span className="text-foreground">LKR {activeOption.totals.addOns.toLocaleString("en-LK")}</span></div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2"><span className="text-foreground">Total</span><span className="text-primary">LKR {activeOption.totals.total.toLocaleString("en-LK")}</span></div>
                </div>
              </div>

              {/* Warranty */}
              <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-4 flex items-start gap-3">
                <TRUST_ICONS.ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Warranty Terms</p>
                  <p className="text-xs text-muted-foreground mt-1">Labor: {activeOption.warranty.labor} ({activeOption.warranty.laborDays} days)</p>
                  <p className="text-xs text-muted-foreground">Parts: {activeOption.warranty.parts} ({activeOption.warranty.partsDays} days)</p>
                </div>
              </div>
            </>
          )}

          {/* Scope */}
          {(quote.scopeIncludes.length > 0 || quote.scopeExcludes.length > 0) && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Scope & Assumptions</h3>
              {quote.scopeIncludes.length > 0 && (
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
              )}
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

          {/* Notes */}
          {quote.notes && (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 mb-6 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">⚠ Important Notes</p>
              <p>{quote.notes}</p>
            </div>
          )}

          {/* Actions */}
          {isApproved ? (
            <div className="rounded-xl p-5 text-center bg-success/10 border border-success/20 mb-6">
              <MascotIcon state="completed" size="sm" className="mx-auto mb-2" />
              <p className="font-semibold text-foreground">✓ Quote Approved (Option {quote.selectedOptionId})</p>
              <p className="text-xs text-muted-foreground mt-1">Work will begin as scheduled.</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to={`/tracker/${booking.jobId}`}>Back to Tracker</Link>
              </Button>
            </div>
          ) : showRejectOptions ? (
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-foreground">What would you like to do?</p>
              <Button variant="outline" className="w-full justify-start" onClick={handleRevise}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Request Revision
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive" onClick={handleReject}>
                <XCircle className="w-4 h-4 mr-2" />
                Reject Quote
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowRejectOptions(false)}>Back</Button>
            </div>
          ) : (
            <div className="flex gap-3 mb-6">
              <Button variant="hero" size="xl" className="flex-1" onClick={handleApprove}>
                Approve Option {selectedTab}
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

export default QuotePage;
