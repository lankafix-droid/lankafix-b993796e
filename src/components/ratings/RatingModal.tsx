/**
 * RatingModal — Premium post-completion rating and review experience.
 * Trust-first design with guided prompts and clear feedback categories.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, Loader2, Shield, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
const RATING_EMOJI  = ["", "😔", "😐", "🙂", "😊", "🎉"];

const QUICK_TAGS = [
  "Professional", "On time", "Clean work", "Good value",
  "Friendly", "Fast service", "Explained clearly",
];

export default function RatingModal({ open, onClose, bookingId, partnerId, customerId, onSubmitted }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    const fullReview = [
      selectedTags.length > 0 ? selectedTags.join(", ") : "",
      reviewText.trim(),
    ].filter(Boolean).join(" — ");

    const result = await submitRating({
      bookingId,
      partnerId,
      customerId,
      rating,
      reviewText: fullReview || undefined,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(
        result.error.includes("duplicate") || result.error.includes("unique")
          ? "You've already rated this booking"
          : result.error
      );
      return;
    }

    setSubmitted(true);
    toast.success("Thank you for your feedback!");
    onSubmitted?.();
    setTimeout(() => onClose(), 2000);
  };

  const active = hovered || rating;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 px-6"
            >
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-base font-bold text-foreground mb-1">Thank you!</p>
              <p className="text-xs text-muted-foreground mb-4">Your feedback helps improve service quality for everyone.</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-5 h-5 ${s <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"}`} />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <Shield className="w-3 h-3" />
                Reviews are verified and published transparently
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle className="text-center text-base">How was your service?</DialogTitle>
                <DialogDescription className="text-center text-xs">
                  Your honest feedback builds trust for all customers
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 pb-6 space-y-4">
                {/* Stars */}
                <div className="text-center">
                  <div className="flex gap-1.5 justify-center mb-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <motion.button
                        key={s}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(s)}
                        className="p-0.5"
                        aria-label={`Rate ${s} stars`}
                      >
                        <Star className={`w-9 h-9 transition-colors ${
                          s <= active
                            ? "text-amber-500 fill-amber-500"
                            : "text-muted-foreground/20 hover:text-amber-500/40"
                        }`} />
                      </motion.button>
                    ))}
                  </div>
                  {active > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs font-medium text-foreground"
                    >
                      {RATING_LABELS[active]} {RATING_EMOJI[active]}
                    </motion.p>
                  )}
                </div>

                {/* Quick tags (shown after rating) */}
                {rating > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <p className="text-[11px] text-muted-foreground mb-2">What stood out? (optional)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_TAGS.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                            selectedTags.includes(tag)
                              ? "bg-primary/10 border-primary/30 text-primary font-medium"
                              : "bg-card border-border text-muted-foreground hover:border-primary/20"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Text review */}
                {rating > 0 && (
                  <Textarea
                    placeholder="Add more details about your experience (optional)"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="text-sm rounded-xl resize-none min-h-[72px] border-border/60"
                    rows={3}
                  />
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 rounded-xl h-11 text-sm" onClick={onClose}>
                    Skip
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1 rounded-xl h-11 text-sm"
                    onClick={handleSubmit}
                    disabled={rating === 0 || submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ThumbsUp className="w-4 h-4 mr-1.5" />}
                    Submit Review
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
