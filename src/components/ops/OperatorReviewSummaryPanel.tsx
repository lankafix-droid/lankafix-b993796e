/**
 * OperatorReviewSummaryPanel — Clean booking summary for operator review.
 * Advisory only — does not auto-decide anything.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, MapPin, Tag, FileText, Brain, Shield, ArrowRight } from "lucide-react";

interface Props {
  booking: {
    id: string;
    category_code: string;
    service_type?: string | null;
    zone_code?: string | null;
    notes?: string | null;
    estimated_price_lkr?: number | null;
    is_emergency?: boolean | null;
    dispatch_status?: string | null;
  };
  aiTriageSummary?: string | null;
  aiPriceRange?: string | null;
  fraudIndicator?: string | null;
  recommendedAction?: string;
}

const OperatorReviewSummaryPanel = ({
  booking,
  aiTriageSummary,
  aiPriceRange,
  fraudIndicator,
  recommendedAction = "Review and assign technician",
}: Props) => (
  <Card>
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Booking Review</h3>
        </div>
        <Badge variant="outline" className="text-[9px]">Human Decision Required</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-0.5">
          <span className="text-muted-foreground">Category</span>
          <p className="font-semibold text-foreground">{booking.category_code}</p>
        </div>
        {booking.service_type && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground">Service</span>
            <p className="font-semibold text-foreground">{booking.service_type}</p>
          </div>
        )}
        {booking.zone_code && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Zone</span>
            <p className="font-semibold text-foreground">{booking.zone_code}</p>
          </div>
        )}
        {booking.estimated_price_lkr && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground">Est. Price</span>
            <p className="font-semibold text-foreground">LKR {booking.estimated_price_lkr.toLocaleString()}</p>
          </div>
        )}
      </div>

      {booking.is_emergency && (
        <Badge className="bg-amber-500/10 text-amber-700 border-0 text-[10px]">⚡ Emergency</Badge>
      )}

      {booking.notes && (
        <div className="bg-muted/40 rounded-lg p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Customer Notes</p>
          <p className="text-xs text-foreground">{booking.notes}</p>
        </div>
      )}

      {/* AI advisory inputs — clearly labeled */}
      {(aiTriageSummary || aiPriceRange || fraudIndicator) && (
        <div className="border-t border-border/30 pt-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI Advisory (informational only)</span>
          </div>
          {aiTriageSummary && (
            <div className="text-[11px] text-foreground bg-primary/5 rounded-lg p-2">
              <strong>Issue Analysis:</strong> {aiTriageSummary}
            </div>
          )}
          {aiPriceRange && (
            <div className="text-[11px] text-foreground bg-primary/5 rounded-lg p-2">
              <strong>Price Range:</strong> {aiPriceRange}
            </div>
          )}
          {fraudIndicator && (
            <div className="text-[11px] text-foreground bg-amber-500/5 rounded-lg p-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-amber-600" />
              <span>{fraudIndicator}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-primary/5 rounded-lg p-3 flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
        <div>
          <p className="text-[10px] text-muted-foreground">Recommended Next Action</p>
          <p className="text-xs font-semibold text-foreground">{recommendedAction}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default OperatorReviewSummaryPanel;
