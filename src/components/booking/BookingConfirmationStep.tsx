import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CONSUMER_CATEGORIES } from "@/data/consumerBookingCategories";
import { getIssuesForCategory } from "@/data/consumerBookingCategories";
import { motion } from "framer-motion";

interface Props {
  bookingId: string;
  categoryCode: string;
  issueType: string;
  status: string;
}

const BookingConfirmationStep = ({ bookingId, categoryCode, issueType, status }: Props) => {
  const navigate = useNavigate();
  const category = CONSUMER_CATEGORIES.find((c) => c.code === categoryCode);
  const issue = getIssuesForCategory(categoryCode).find((i) => i.id === issueType);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 text-center"
    >
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">Booking Confirmed!</h2>
        <p className="text-sm text-muted-foreground mt-1">We'll match you with a verified technician shortly.</p>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3 text-left">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Booking ID</span>
          <span className="text-xs font-mono font-semibold text-foreground">{bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Service</span>
          <span className="text-xs font-medium text-foreground">{category?.label || categoryCode}</span>
        </div>
        {issue && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Issue</span>
            <span className="text-xs font-medium text-foreground">{issue.label}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Status</span>
          <span className="text-xs font-semibold text-primary capitalize">{status.replace(/_/g, " ")}</span>
        </div>
        <div className="border-t border-border/30 pt-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Next step:</strong> A technician will be assigned and you'll receive a confirmation notification.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={() => navigate(`/tracker/${bookingId}`)} className="w-full">
          Track Booking <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
        <Button variant="outline" onClick={() => navigate("/")} className="w-full">
          Back to Home
        </Button>
      </div>
    </motion.div>
  );
};

export default BookingConfirmationStep;
