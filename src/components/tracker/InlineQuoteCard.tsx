import { Link } from "react-router-dom";
import { FileText, CheckCircle2, Clock, ChevronRight, Shield, Wrench, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuoteData } from "@/types/booking";
import { motion } from "framer-motion";

interface InlineQuoteCardProps {
  quote: QuoteData;
  jobId: string;
  status: string;
}

const InlineQuoteCard = ({ quote, jobId, status }: InlineQuoteCardProps) => {
  const isApproved = status === "quote_approved" || status === "repair_started" || status === "completed" || status === "rated";
  const isPending = status === "quote_submitted" || status === "quote_revised";
  const selectedOption = quote.options?.find(o => o.id === (quote.selectedOptionId || quote.recommendedOptionId));
  const totals = selectedOption?.totals || quote.totals;
  const warranty = selectedOption?.warranty || quote.warranty;

  const formatLKR = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${
        isPending ? "border-warning/30 bg-warning/5" : isApproved ? "border-success/30 bg-success/5" : "border-border/60 bg-card"
      }`}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isPending ? "bg-warning/10" : isApproved ? "bg-success/10" : "bg-primary/10"
          }`}>
            <FileText className={`w-4.5 h-4.5 ${isPending ? "text-warning" : isApproved ? "text-success" : "text-primary"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isPending ? "Quote Awaiting Approval" : isApproved ? "Quote Approved" : "Quote Details"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {quote.options?.length || 1} option{(quote.options?.length || 1) > 1 ? "s" : ""} available
            </p>
          </div>
        </div>
        {isPending && (
          <Badge className="bg-warning/10 text-warning text-[10px] px-2.5">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        )}
        {isApproved && (
          <Badge className="bg-success/10 text-success text-[10px] px-2.5">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        )}
      </div>

      {/* Cost breakdown */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-background/80 rounded-xl p-3 text-center">
            <Wrench className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Labor</p>
            <p className="text-sm font-bold text-foreground">{formatLKR(totals.labor)}</p>
          </div>
          <div className="bg-background/80 rounded-xl p-3 text-center">
            <Package className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Parts</p>
            <p className="text-sm font-bold text-foreground">{formatLKR(totals.parts)}</p>
          </div>
          <div className="bg-background/80 rounded-xl p-3 text-center">
            <Shield className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Warranty</p>
            <p className="text-sm font-bold text-foreground">{warranty?.laborDays || 30}d</p>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between py-3 border-t border-border/50">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-bold text-primary">{formatLKR(totals.total)}</span>
        </div>

        {/* Inspection findings */}
        {quote.inspectionFindings?.length > 0 && (
          <div className="text-[11px] text-muted-foreground bg-background/80 rounded-xl p-3 mb-3">
            <p className="font-medium text-foreground text-xs mb-1.5">Inspection Findings</p>
            <ul className="space-y-1">
              {quote.inspectionFindings.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <Button
          variant={isPending ? "hero" : "outline"}
          className="w-full rounded-xl h-12"
          asChild
        >
          <Link to={`/quote/${jobId}`}>
            <span className="flex items-center gap-2">
              {isPending ? "Review & Approve Quote" : "View Quote Details"}
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default InlineQuoteCard;
