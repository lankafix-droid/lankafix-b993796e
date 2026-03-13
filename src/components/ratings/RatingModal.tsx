import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { submitRating } from "@/services/ratingService";
import { toast } from "sonner";

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  partnerId: string;
  customerId: string;
  onSubmitted?: () => void;
}

export default function RatingModal({ open, onClose, bookingId, partnerId, customerId, onSubmitted }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    const result = await submitRating({ bookingId, partnerId, customerId, rating, reviewText: reviewText.trim() || undefined });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error.includes("duplicate") || result.error.includes("unique") ? "You've already rated this booking" : result.error);
      return;
    }
    setSubmitted(true);
    toast.success("Thank you for your feedback!");
    onSubmitted?.();
    setTimeout(() => onClose(), 1500);
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Rate Your Technician</DialogTitle>
          <DialogDescription className="text-center">How was your service experience?</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-3" />
            <p className="text-sm font-semibold text-success">Thank you for your review!</p>
            <div className="flex justify-center gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-6 h-6 ${s <= rating ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                  className="p-1"
                  aria-label={`Rate ${s} stars`}
                >
                  <Star className={`w-10 h-10 transition-colors ${
                    s <= (hovered || rating)
                      ? "text-warning fill-warning"
                      : "text-muted-foreground/30 hover:text-warning/50"
                  }`} />
                </motion.button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-center text-xs text-muted-foreground font-medium">
                {ratingLabels[rating]} {rating >= 4 ? "🎉" : ""}
              </p>
            )}

            <Textarea
              placeholder="Share details about your experience (optional)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="text-sm rounded-xl resize-none min-h-[80px]"
              rows={3}
            />

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 rounded-xl h-11" onClick={onClose}>
                Skip
              </Button>
              <Button
                variant="hero"
                className="flex-1 rounded-xl h-11"
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Review
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
