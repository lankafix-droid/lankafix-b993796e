import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { notifyQuoteSubmitted } from "@/services/notificationService";

interface QuoteFormProps {
  bookingId: string;
  partnerId: string;
  onSubmitted: () => void;
}

export default function QuoteForm({ bookingId, partnerId, onSubmitted }: QuoteFormProps) {
  const [laborCost, setLaborCost] = useState<number>(0);
  const [partsCost, setPartsCost] = useState<number>(0);
  const [additionalCost, setAdditionalCost] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [technicianNote, setTechnicianNote] = useState("");
  const [partGrade, setPartGrade] = useState("OEM");
  const [warrantyDays, setWarrantyDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const total = laborCost + partsCost + additionalCost - discount;

  const handleSubmit = async () => {
    if (total <= 0) {
      toast.error("Total must be greater than zero");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      // Insert quote
      const { error: quoteErr } = await supabase.from("quotes").insert({
        booking_id: bookingId,
        partner_id: partnerId,
        labour_lkr: laborCost,
        service_charge_lkr: 0,
        parts_cost_lkr: partsCost,
        additional_cost_lkr: additionalCost,
        discount_lkr: discount,
        total_lkr: total,
        technician_note: technicianNote,
        part_grade: partGrade,
        warranty_days: warrantyDays,
        status: "submitted" as any,
        submitted_at: now,
        notes: technicianNote,
      });

      if (quoteErr) throw quoteErr;

      // Update booking status
      await supabase.from("bookings").update({
        status: "quote_submitted" as any,
      }).eq("id", bookingId);

      // Timeline event
      await supabase.from("job_timeline").insert({
        booking_id: bookingId,
        status: "quote_submitted",
        actor: "partner",
        note: `Quote submitted: LKR ${total.toLocaleString()}`,
        metadata: { partner_id: partnerId, total_lkr: total },
      });

      track("quote_submitted", { bookingId, total, partnerId });
      toast.success("Quote submitted successfully!");
      onSubmitted();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit quote");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Inspection & Quote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Labor Cost (LKR)</label>
            <Input type="number" value={laborCost || ""} onChange={(e) => setLaborCost(Number(e.target.value) || 0)} placeholder="0" className="text-sm h-9 mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Parts Cost (LKR)</label>
            <Input type="number" value={partsCost || ""} onChange={(e) => setPartsCost(Number(e.target.value) || 0)} placeholder="0" className="text-sm h-9 mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Additional Cost (LKR)</label>
            <Input type="number" value={additionalCost || ""} onChange={(e) => setAdditionalCost(Number(e.target.value) || 0)} placeholder="0" className="text-sm h-9 mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Discount (LKR)</label>
            <Input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} placeholder="0" className="text-sm h-9 mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Part Grade</label>
            <select value={partGrade} onChange={(e) => setPartGrade(e.target.value)} className="w-full text-sm border rounded px-2 py-1.5 mt-1 bg-background">
              <option value="genuine">Genuine</option>
              <option value="OEM">OEM Grade</option>
              <option value="compatible">Compatible</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Warranty (days)</label>
            <Input type="number" value={warrantyDays} onChange={(e) => setWarrantyDays(Number(e.target.value) || 30)} className="text-sm h-9 mt-1" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Technician Notes</label>
          <Textarea value={technicianNote} onChange={(e) => setTechnicianNote(e.target.value)} placeholder="Describe findings and recommended repairs..." rows={3} className="text-sm mt-1" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">LKR {total.toLocaleString()}</span>
        </div>

        <Button className="w-full h-11 rounded-xl" onClick={handleSubmit} disabled={submitting || total <= 0}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Submit Quote
        </Button>
      </CardContent>
    </Card>
  );
}
