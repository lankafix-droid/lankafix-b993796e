import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { createSupportCase, CUSTOMER_ISSUE_TYPES, PARTNER_ISSUE_TYPES } from "@/services/supportService";

interface ReportIssueModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  userId: string;
  role: "customer" | "partner";
}

export default function ReportIssueModal({ open, onClose, bookingId, userId, role }: ReportIssueModalProps) {
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const issueTypes = role === "partner" ? PARTNER_ISSUE_TYPES : CUSTOMER_ISSUE_TYPES;

  const handleSubmit = async () => {
    if (!issueType) { toast.error("Please select an issue type"); return; }
    if (!description.trim()) { toast.error("Please describe the issue"); return; }

    setSubmitting(true);
    const result = await createSupportCase({
      bookingId,
      userId,
      issueType,
      description: description.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      toast.success("Issue reported. Our team will review it shortly.");
      setIssueType("");
      setDescription("");
      onClose();
    } else {
      toast.error(result.error || "Failed to submit. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Report an Issue
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Issue Type</label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{description.length}/1000</p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={handleSubmit} disabled={submitting || !issueType}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Submit Report
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">Our team will review your case and respond as soon as possible.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
