/**
 * TrackerContactOptions — Protected communication options for assigned bookings.
 * Shows call and message options only after technician assignment.
 * Phone numbers are masked; uses existing BookingChatPanel.
 */
import { useState } from "react";
import { Phone, MessageCircle, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingChatPanel from "@/components/chat/BookingChatPanel";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";
import { motion } from "framer-motion";

interface TrackerContactOptionsProps {
  bookingId: string;
  bookingStatus: string;
  contactUnlocked?: boolean;
  technicianName?: string;
}

const CONTACT_STATUSES = ["assigned", "tech_en_route", "arrived", "inspection_started", "repair_started", "in_progress", "quote_submitted", "quote_approved"];

export default function TrackerContactOptions({
  bookingId,
  bookingStatus,
  contactUnlocked = false,
  technicianName = "Technician",
}: TrackerContactOptionsProps) {
  const [showChat, setShowChat] = useState(false);

  if (!CONTACT_STATUSES.includes(bookingStatus)) return null;

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Contact {technicianName}</span>
        </div>
        <Badge variant="outline" className="text-[9px] gap-1">
          <Lock className="w-2.5 h-2.5" /> Protected
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground">
        All communication is monitored and protected by LankaFix. Contact details are masked for your security.
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl h-10 text-xs gap-1.5"
          asChild
        >
          <a
            href={whatsappLink(SUPPORT_WHATSAPP, `Hi, I need to contact my technician for booking ${bookingId.slice(0, 8).toUpperCase()}`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Phone className="w-3.5 h-3.5" />
            Call via LankaFix
          </a>
        </Button>
        <Button
          variant={showChat ? "default" : "outline"}
          size="sm"
          className="flex-1 rounded-xl h-10 text-xs gap-1.5"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {showChat ? "Hide Chat" : "Message"}
        </Button>
      </div>

      {showChat && (
        <BookingChatPanel
          bookingId={bookingId}
          senderRole="customer"
          contactUnlocked={contactUnlocked}
          className="h-64"
        />
      )}
    </motion.div>
  );
}
