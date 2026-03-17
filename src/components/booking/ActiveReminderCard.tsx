/**
 * ActiveReminderCard — Shows the current active reminder for a booking.
 * Premium, calm UI. Does not trigger actions.
 */

import { Bell, Headphones, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

interface ActiveReminderCardProps {
  title: string;
  message: string;
  overdue?: boolean;
  followUpActive?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}

export default function ActiveReminderCard({
  title,
  message,
  overdue = false,
  followUpActive = false,
  onAction,
  actionLabel,
}: ActiveReminderCardProps) {
  return (
    <div className={`bg-card rounded-2xl border p-4 shadow-[var(--shadow-card)] space-y-2.5 ${
      overdue ? "border-amber-500/30" : "border-border/60"
    }`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          overdue ? "bg-amber-500/10" : "bg-primary/10"
        }`}>
          <Bell className={`w-4 h-4 ${overdue ? "text-amber-600" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">{title}</p>
          {overdue && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] mt-0.5">
              Action recommended
            </Badge>
          )}
        </div>
        {followUpActive && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-success" />
            <span className="text-[9px] text-success font-medium">Team following up</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>

      <div className="flex gap-2">
        {onAction && actionLabel && (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs rounded-xl"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs rounded-xl gap-1"
          asChild
        >
          <a
            href={whatsappLink(SUPPORT_WHATSAPP, "I need help with my booking")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Headphones className="w-3 h-3" />
            Need Help
          </a>
        </Button>
      </div>
    </div>
  );
}
