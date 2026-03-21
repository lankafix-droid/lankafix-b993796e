/**
 * Premium Booking Detail Card
 * Rich summary view for a single booking — service info, lifecycle, pricing, technician, and next actions.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock, MapPin, Shield, CreditCard, Wrench, Phone,
  MessageCircle, ChevronRight, Calendar, Star, AlertTriangle,
} from "lucide-react";
import { LIFECYCLE_STAGES, mapBookingStatusToStage } from "@/lib/bookingLifecycleModel";
import { CONSUMER_CATEGORIES } from "@/data/consumerBookingCategories";
import { SUPPORT_WHATSAPP } from "@/config/contact";
import { track } from "@/lib/analytics";

interface BookingDetailCardProps {
  booking: {
    id: string;
    category_code: string;
    status: string;
    dispatch_status?: string | null;
    created_at: string;
    scheduled_at?: string | null;
    estimated_price_lkr?: number | null;
    final_price_lkr?: number | null;
    payment_status?: string | null;
    zone_code?: string | null;
    is_emergency?: boolean | null;
    partner_id?: string | null;
    customer_rating?: number | null;
    notes?: string | null;
    service_type?: string | null;
  };
  partnerName?: string;
  onTrack?: () => void;
  onRate?: () => void;
}

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Payment Due", color: "text-warning" },
  deposit_paid: { label: "Deposit Paid", color: "text-primary" },
  paid: { label: "Paid", color: "text-success" },
  cash_collected: { label: "Cash Collected", color: "text-success" },
  payment_verified: { label: "Verified", color: "text-success" },
  failed: { label: "Failed", color: "text-destructive" },
  refunded: { label: "Refunded", color: "text-muted-foreground" },
};

export default function BookingDetailCard({ booking, partnerName, onTrack, onRate }: BookingDetailCardProps) {
  const stage = mapBookingStatusToStage(booking.status, booking.dispatch_status);
  const stageInfo = LIFECYCLE_STAGES[stage];
  const category = CONSUMER_CATEGORIES.find((c) => c.code === booking.category_code);
  const price = booking.final_price_lkr ?? booking.estimated_price_lkr;
  const paymentInfo = booking.payment_status ? PAYMENT_LABELS[booking.payment_status] : null;

  const isActive = !["completed", "cancelled"].includes(stage);
  const isCompleted = stage === "completed";

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-[var(--shadow-card)] overflow-hidden">
      {/* Status hero */}
      <div className={`px-5 py-3 flex items-center justify-between ${stageInfo.badgeBg}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">{stageInfo.label}</span>
        </div>
        <span className="text-[10px] font-medium opacity-80">
          Next: {stageInfo.actorLabel}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Service summary */}
        <div className="flex items-start gap-3">
          <span className="text-2xl">{category?.icon ?? "🔧"}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight">
              {category?.label ?? booking.category_code}
            </h3>
            {booking.service_type && (
              <p className="text-xs text-muted-foreground mt-0.5">{booking.service_type}</p>
            )}
            {booking.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{booking.notes}</p>
            )}
          </div>
          {booking.is_emergency && (
            <Badge variant="destructive" className="text-[9px] shrink-0">
              <AlertTriangle className="w-3 h-3 mr-0.5" /> Emergency
            </Badge>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {booking.scheduled_at
              ? new Date(booking.scheduled_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
              : new Date(booking.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short" })}
          </span>
          {booking.zone_code && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {booking.zone_code}
            </span>
          )}
          {price != null && price > 0 && (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <CreditCard className="w-3 h-3" /> LKR {price.toLocaleString()}
            </span>
          )}
          {paymentInfo && (
            <span className={`flex items-center gap-1 font-medium ${paymentInfo.color}`}>
              {paymentInfo.label}
            </span>
          )}
        </div>

        {/* Technician */}
        {partnerName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl">
            <Wrench className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">{partnerName}</span>
            <Shield className="w-3 h-3 text-success ml-auto" />
            <span className="text-[10px] text-success font-medium">Verified</span>
          </div>
        )}

        {/* Trust note */}
        <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-primary/20 pl-3">
          {stageInfo.trustNote}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          {isActive && onTrack && (
            <Button
              size="sm"
              className="flex-1 h-9 text-xs font-semibold"
              onClick={() => {
                track("booking_detail_track_click", { bookingId: booking.id, stage });
                onTrack();
              }}
            >
              Track Progress <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
          {isCompleted && !booking.customer_rating && onRate && (
            <Button
              size="sm"
              className="flex-1 h-9 text-xs font-semibold"
              onClick={() => {
                track("booking_detail_rate_click", { bookingId: booking.id });
                onRate();
              }}
            >
              <Star className="w-3.5 h-3.5 mr-1" /> Rate Experience
            </Button>
          )}
          {isCompleted && booking.customer_rating && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-success/10 rounded-lg">
              <Star className="w-3.5 h-3.5 text-success fill-success" />
              <span className="text-xs font-bold text-success">{booking.customer_rating}/5</span>
            </div>
          )}
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I need help with booking ${booking.id.slice(0, 8)}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => track("booking_detail_support_click", { bookingId: booking.id })}
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
