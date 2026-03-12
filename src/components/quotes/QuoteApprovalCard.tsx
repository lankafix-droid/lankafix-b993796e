import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileText, Loader2, Shield } from "lucide-react";
import { notifyQuoteApproved } from "@/services/notificationService";

interface QuoteApprovalCardProps {
  quote: {
    id: string;
    booking_id: string;
    labour_lkr: number | null;
    parts_cost_lkr?: number | null;
    additional_cost_lkr?: number | null;
    discount_lkr?: number | null;
    total_lkr: number | null;
    technician_note?: string | null;
    notes: string | null;
    part_grade: string | null;
    warranty_days: number | null;
    status: string;
  };
  onAction: () => void;
}

export default function QuoteApprovalCard({ quote, onAction }: QuoteApprovalCardProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const handleApprove = async () => {
    setLoading("approve");
    try {
      const now = new Date().toISOString();

      await Promise.all([
        supabase.from("quotes").update({
          status: "approved" as any,
          approved_at: now,
        }).eq("id", quote.id),

        supabase.from("bookings").update({
          status: "quote_approved" as any,
        }).eq("id", quote.booking_id),

        supabase.from("job_timeline").insert({
          booking_id: quote.booking_id,
          status: "quote_approved",
          actor: "customer",
          note: `Quote approved: LKR ${(quote.total_lkr || 0).toLocaleString()}`,
          metadata: { quote_id: quote.id, total_lkr: quote.total_lkr },
        }),
      ]);

      track("quote_approved", { bookingId: quote.booking_id, quoteId: quote.id, total: quote.total_lkr });
      toast.success("Quote approved! Repair will begin shortly.");
      onAction();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve quote");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    try {
      const now = new Date().toISOString();

      await Promise.all([
        supabase.from("quotes").update({
          status: "rejected" as any,
          rejected_at: now,
          customer_note: rejectReason || "No reason provided",
        }).eq("id", quote.id),

        supabase.from("bookings").update({
          status: "quote_rejected" as any,
        }).eq("id", quote.booking_id),

        supabase.from("job_timeline").insert({
          booking_id: quote.booking_id,
          status: "quote_rejected",
          actor: "customer",
          note: rejectReason || "Quote rejected by customer",
          metadata: { quote_id: quote.id },
        }),
      ]);

      track("quote_rejected", { bookingId: quote.booking_id, quoteId: quote.id });
      toast.info("Quote rejected. The technician may submit a revised quote.");
      setShowReject(false);
      onAction();
    } catch (e: any) {
      toast.error(e.message || "Failed to reject quote");
    } finally {
      setLoading(null);
    }
  };

  const techNote = quote.technician_note || quote.notes;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Repair Quote Ready</p>
            <p className="text-xs text-muted-foreground">Review and approve before work begins</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
            Awaiting Approval
          </Badge>
        </div>

        {/* Price breakdown */}
        <div className="bg-card rounded-lg p-3 space-y-1.5 border border-border/40">
          {(quote.labour_lkr ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Labor</span>
              <span className="text-foreground">LKR {(quote.labour_lkr || 0).toLocaleString()}</span>
            </div>
          )}
          {(quote.parts_cost_lkr ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parts</span>
              <span className="text-foreground">LKR {(quote.parts_cost_lkr || 0).toLocaleString()}</span>
            </div>
          )}
          {(quote.additional_cost_lkr ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Additional</span>
              <span className="text-foreground">LKR {(quote.additional_cost_lkr || 0).toLocaleString()}</span>
            </div>
          )}
          {(quote.discount_lkr ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-success">-LKR {(quote.discount_lkr || 0).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-border/30 pt-1.5">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">LKR {(quote.total_lkr || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Part grade & warranty */}
        <div className="flex gap-3 text-xs">
          {quote.part_grade && (
            <span className="text-muted-foreground">Parts: <span className="text-foreground font-medium">{quote.part_grade}</span></span>
          )}
          {quote.warranty_days && (
            <span className="text-muted-foreground">Warranty: <span className="text-foreground font-medium">{quote.warranty_days} days</span></span>
          )}
        </div>

        {/* Technician notes */}
        {techNote && (
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground font-medium mb-1">Technician's Findings</p>
            <p className="text-xs text-foreground">{techNote}</p>
          </div>
        )}

        {/* Actions */}
        {!showReject ? (
          <div className="flex gap-3">
            <Button className="flex-1 h-11 rounded-xl" onClick={handleApprove} disabled={!!loading}>
              {loading === "approve" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Approve Quote
            </Button>
            <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setShowReject(true)} disabled={!!loading}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)" rows={2} className="text-sm" />
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1 h-9 rounded-xl text-xs" onClick={handleReject} disabled={!!loading}>
                {loading === "reject" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Confirm Reject
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowReject(false)} className="text-xs">Cancel</Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3 text-success" />
          No work starts without your approval. Price is locked after approval.
        </div>
      </CardContent>
    </Card>
  );
}
