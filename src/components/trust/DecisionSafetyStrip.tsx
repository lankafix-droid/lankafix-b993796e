/**
 * DecisionSafetyStrip — Trust reinforcement near customer decision buttons.
 * Advisory only — does not modify booking state.
 */
import { Shield, Headphones } from "lucide-react";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

interface Props {
  variant?: "default" | "quote" | "completion";
}

const MESSAGES = {
  default: "You stay in control. Nothing proceeds without your approval.",
  quote: "All charges are shown before work starts. Your approval protects you from unexpected charges.",
  completion: "Confirm only when you're satisfied. Report any issues before confirming.",
};

const DecisionSafetyStrip = ({ variant = "default" }: Props) => (
  <div className="bg-muted/30 rounded-xl p-3 space-y-2">
    <div className="flex items-start gap-2">
      <Shield className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {MESSAGES[variant]}
      </p>
    </div>
    <a
      href={whatsappLink(SUPPORT_WHATSAPP, "I need help with a decision on my booking")}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary hover:underline"
    >
      <Headphones className="w-3 h-3" />
      Need help? Contact LankaFix support
    </a>
  </div>
);

export default DecisionSafetyStrip;
