import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";
import {
  CheckCircle2,
  X,
  HelpCircle,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface QuoteLineItem {
  description: string;
  amount: number;
  type?: "labor" | "parts" | "transport" | "addon" | "fee";
}

export interface CustomerQuoteData {
  quoteId: string;
  bookingId: string;
  categoryCode: string;
  serviceType?: string;
  lineItems: QuoteLineItem[];
  laborTotal: number;
  partsTotal: number;
  transportFee: number;
  addOnsTotal: number;
  grandTotal: number;
  warrantyText: string;
  technicianNote?: string;
  expiresAt: string;
  quoteStatus: "awaiting_approval" | "approved" | "rejected" | "revision_requested";
  isHighValue?: boolean;
  isOutlier?: boolean;
  outlierMessage?: string;
}

interface AIQuoteReviewCardProps {
  quote: CustomerQuoteData;
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string, reason?: string) => void;
  onClarify: (quoteId: string, question: string) => void;
}

export default function AIQuoteReviewCard({
  quote,
  onApprove,
  onReject,
  onClarify,
}: AIQuoteReviewCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showClarify, setShowClarify] = useState(false);
  const [clarifyText, setClarifyText] = useState("");
  const [status, setStatus] = useState(quote.quoteStatus);

  useEffect(() => {
    track("quote_review_viewed", {
      booking_id: quote.bookingId,
      category_code: quote.categoryCode,
      grand_total: quote.grandTotal,
    });
  }, [quote.bookingId, quote.categoryCode, quote.grandTotal]);

  const expiresDate = new Date(quote.expiresAt);
  const hoursLeft = Math.max(0, Math.round((expiresDate.getTime() - Date.now()) / 3600000));
  const isExpiring = hoursLeft <= 4;

  const handleApprove = () => {
    setStatus("approved");
    track("quote_approved", {
      booking_id: quote.bookingId,
      category_code: quote.categoryCode,
      estimated_total: quote.grandTotal,
    });
    onApprove(quote.quoteId);
  };

  const handleReject = () => {
    setStatus("rejected");
    track("quote_rejected", {
      booking_id: quote.bookingId,
      category_code: quote.categoryCode,
      estimated_total: quote.grandTotal,
    });
    onReject(quote.quoteId);
  };

  const handleClarify = () => {
    if (!clarifyText.trim()) return;
    track("quote_clarification_requested", {
      booking_id: quote.bookingId,
      category_code: quote.categoryCode,
    });
    onClarify(quote.quoteId, clarifyText);
    setShowClarify(false);
    setClarifyText("");
  };

  if (status === "approved") {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h3 className="font-bold text-foreground">Quote Approved</h3>
          <p className="text-sm text-muted-foreground">
            Total: LKR {quote.grandTotal.toLocaleString()} · {quote.warrantyText}
          </p>
          <p className="text-xs text-muted-foreground">
            Work will begin shortly. No additional charges without your approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "rejected") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-6 text-center space-y-3">
          <p className="font-medium text-foreground">Quote Rejected</p>
          <p className="text-sm text-muted-foreground">
            LankaFix support will follow up with alternatives.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">Quote Review</CardTitle>
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${isExpiring ? "text-warning" : "text-muted-foreground"}`} />
            <span className={`text-xs font-medium ${isExpiring ? "text-warning" : "text-muted-foreground"}`}>
              {hoursLeft > 0 ? `${hoursLeft}h left` : "Expiring"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Outlier warning */}
        {quote.isOutlier && (
          <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-warning">Price Notice</p>
              <p className="text-[10px] text-warning/80 mt-0.5">
                {quote.outlierMessage || "This quote is outside the typical market range. Consider requesting clarification."}
              </p>
            </div>
          </div>
        )}

        {/* Itemized breakdown */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-sm font-semibold text-foreground mb-2"
          >
            Itemized Breakdown
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="space-y-1.5">
              {quote.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.description}</span>
                  <span className="font-medium text-foreground font-mono">
                    LKR {item.amount.toLocaleString()}
                  </span>
                </div>
              ))}

              <Separator className="my-2" />

              {quote.laborTotal > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Labor subtotal</span>
                  <span>LKR {quote.laborTotal.toLocaleString()}</span>
                </div>
              )}
              {quote.partsTotal > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Parts subtotal</span>
                  <span>LKR {quote.partsTotal.toLocaleString()}</span>
                </div>
              )}
              {quote.transportFee > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Transport / Visit fee</span>
                  <span>LKR {quote.transportFee.toLocaleString()}</span>
                </div>
              )}
              {quote.addOnsTotal > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Add-ons</span>
                  <span>LKR {quote.addOnsTotal.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-2 mt-2">
                <span className="text-foreground">Total</span>
                <span className="text-primary font-mono">LKR {quote.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Warranty & Note */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-success/5 border border-success/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span className="text-xs font-medium text-foreground">Warranty</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{quote.warrantyText}</p>
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Valid Until</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {expiresDate.toLocaleDateString("en-LK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {quote.technicianNote && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs font-medium text-foreground mb-1">Technician Note</p>
            <p className="text-[10px] text-muted-foreground">{quote.technicianNote}</p>
          </div>
        )}

        {/* Trust guarantee */}
        <div className="bg-success/5 border border-success/20 rounded-lg p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">LankaFix Guarantee:</span> No work starts without your approval. Payment only after successful completion.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-2">
          <Button onClick={handleApprove} className="w-full gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Approve Quote — LKR {quote.grandTotal.toLocaleString()}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleReject} className="gap-1.5 text-xs">
              <X className="w-3.5 h-3.5" /> Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowClarify(!showClarify)}
              className="gap-1.5 text-xs"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Request Clarification
            </Button>
          </div>
        </div>

        {/* Clarification input */}
        {showClarify && (
          <div className="space-y-2 bg-muted/30 rounded-lg p-3">
            <label className="text-xs font-medium text-foreground">What would you like clarified?</label>
            <Textarea
              value={clarifyText}
              onChange={(e) => setClarifyText(e.target.value)}
              placeholder="e.g. Why is the parts cost higher than expected?"
              rows={3}
              className="text-sm"
            />
            {clarifyText.trim() && (
              <Button size="sm" variant="secondary" onClick={handleClarify} className="text-xs gap-1">
                Send Question
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
