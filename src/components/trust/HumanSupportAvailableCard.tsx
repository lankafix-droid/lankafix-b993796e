/**
 * HumanSupportAvailableCard — Reassurance that human help is available.
 * Advisory only — does not modify booking state.
 */
import { Headphones, MessageCircle } from "lucide-react";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

const HumanSupportAvailableCard = () => (
  <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)]">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Headphones className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Need help?</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Our support team is available to assist you.</p>
      </div>
      <a
        href={whatsappLink(SUPPORT_WHATSAPP, "I need help with my booking")}
        target="_blank"
        rel="noopener noreferrer"
        className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0"
      >
        <MessageCircle className="w-4 h-4 text-success" />
      </a>
    </div>
  </div>
);

export default HumanSupportAvailableCard;
