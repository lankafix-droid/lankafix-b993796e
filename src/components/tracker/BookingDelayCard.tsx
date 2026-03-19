/**
 * Phase 3 — Customer Communication: Delay + Status Messaging
 * Shows contextual trust messaging when booking is in a waiting state.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MessageCircle, AlertTriangle, CheckCircle2, Phone, Loader2 } from "lucide-react";
import { getSLAExpectation, isLikelyDelayed } from "@/lib/bookingSLAExpectations";
import { LIFECYCLE_STAGES, type BookingLifecycleStage, mapBookingStatusToStage } from "@/lib/bookingLifecycleModel";

interface Props {
  bookingStatus: string;
  stageEnteredAt?: string | null;
  onContactSupport?: () => void;
}

const STATUS_MESSAGES: Record<string, { title: string; message: string; icon: React.ElementType }> = {
  requested: {
    title: "Booking Received",
    message: "Your request is being reviewed by our team. We'll find the best technician for your repair.",
    icon: Clock,
  },
  matching: {
    title: "Finding a Technician",
    message: "We're matching your job with verified mobile repair specialists in your area.",
    icon: Loader2,
  },
  awaiting_partner_confirmation: {
    title: "Technician Reviewing",
    message: "A qualified technician is reviewing your request. They'll confirm shortly.",
    icon: Clock,
  },
  assigned: {
    title: "Technician Assigned",
    message: "A verified technician has been assigned and will prepare a quote for your repair.",
    icon: CheckCircle2,
  },
  quote_submitted: {
    title: "Quote Ready for Review",
    message: "Your technician has submitted a repair quote. Please review and approve to proceed.",
    icon: MessageCircle,
  },
  in_progress: {
    title: "Repair in Progress",
    message: "Your technician is working on the repair. You'll be notified when it's complete.",
    icon: Loader2,
  },
  completed: {
    title: "Repair Complete",
    message: "Your mobile phone repair has been completed. Please confirm and rate the service.",
    icon: CheckCircle2,
  },
};

const DELAY_MESSAGES: Record<string, string> = {
  requested: "Review is taking longer than usual. Our team is prioritizing your request.",
  matching: "Finding the right specialist is taking a bit longer. We're expanding the search area.",
  awaiting_partner_confirmation: "The technician hasn't responded yet. We're following up and may assign another professional.",
  quote_submitted: "Waiting for your approval. Please review the quote to proceed with the repair.",
  in_progress: "The repair is taking longer than expected. Your technician will update you when ready.",
};

export default function BookingDelayCard({ bookingStatus, stageEnteredAt, onContactSupport }: Props) {
  const stage = mapBookingStatusToStage(bookingStatus) as BookingLifecycleStage;
  const sla = getSLAExpectation(stage);
  const delayed = sla ? isLikelyDelayed(stage, stageEnteredAt) : false;

  const msg = STATUS_MESSAGES[bookingStatus] || STATUS_MESSAGES["requested"];
  const delayMsg = delayed ? DELAY_MESSAGES[bookingStatus] : null;
  const Icon = msg.icon;

  return (
    <Card className={delayed ? "border-amber-500/50 bg-amber-500/5" : "border-primary/20"}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${delayed ? "bg-amber-500/10" : "bg-primary/10"}`}>
            <Icon size={18} className={`${delayed ? "text-amber-600" : "text-primary"} ${Icon === Loader2 ? "animate-spin" : ""}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{msg.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{msg.message}</p>
          </div>
        </div>

        {/* SLA expectation */}
        {sla && !delayed && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock size={10} /> Expected: {sla.expectedWindow}
          </p>
        )}

        {/* Delay warning */}
        {delayMsg && (
          <div className="flex items-start gap-2 bg-amber-500/10 rounded-lg p-2.5">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{delayMsg}</p>
          </div>
        )}

        {/* Help CTA when delayed */}
        {delayed && onContactSupport && (
          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={onContactSupport}>
            <Phone size={12} className="mr-1" /> Contact LankaFix Support
          </Button>
        )}

        {/* Payment status messaging for completed */}
        {bookingStatus === "completed" && (
          <p className="text-[10px] text-muted-foreground">
            💳 If payment is pending, your technician will confirm once collected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
