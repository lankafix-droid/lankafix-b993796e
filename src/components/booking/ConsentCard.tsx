/**
 * ConsentCard — Reusable consent acknowledgement card for booking flows.
 * Covers data safety, backup responsibility, inspection-first, quote variance,
 * PIN/passcode acknowledgement, and data-risk acknowledgement.
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, AlertTriangle, FileSearch, Receipt, Lock, Database } from "lucide-react";

export type ConsentVariant = "data_safety" | "backup_responsibility" | "inspection_first" | "quote_variance" | "pin_passcode" | "data_risk" | "custom";

interface Props {
  variant: ConsentVariant;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  customTitle?: string;
  customDescription?: string;
}

const CONSENT_CONFIGS: Record<Exclude<ConsentVariant, "custom">, { title: string; description: string; icon: typeof Shield }> = {
  data_safety: {
    title: "Data Safety Disclaimer",
    description: "Your personal data and device information are handled securely. LankaFix partners sign data-handling agreements.",
    icon: Shield,
  },
  backup_responsibility: {
    title: "Customer Backup Responsibility",
    description: "Please ensure all important data is backed up before service. LankaFix is not liable for data loss during repairs.",
    icon: AlertTriangle,
  },
  inspection_first: {
    title: "Inspection-First Service",
    description: "This service requires a technician inspection before final pricing. The initial quote is indicative only.",
    icon: FileSearch,
  },
  quote_variance: {
    title: "Quote May Vary After Diagnosis",
    description: "Final pricing may differ from the initial estimate based on actual findings during diagnosis.",
    icon: Receipt,
  },
  pin_passcode: {
    title: "PIN / Passcode Acknowledgement",
    description: "If your device requires a PIN, pattern, or passcode for access, you may need to share it with the technician. LankaFix partners are bound by data-handling agreements.",
    icon: Lock,
  },
  data_risk: {
    title: "Data Risk Acknowledgement",
    description: "Repair or diagnostic procedures may carry a risk of data loss. LankaFix is not responsible for data that has not been backed up prior to service.",
    icon: Database,
  },
};

export default function ConsentCard({ variant, checked, onCheckedChange, customTitle, customDescription }: Props) {
  const config = variant === "custom" 
    ? { title: customTitle || "", description: customDescription || "", icon: Shield }
    : CONSENT_CONFIGS[variant];
  
  const Icon = config.icon;

  return (
    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(!!v)}
        className="shrink-0"
      />
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-snug">{config.title}</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{config.description}</p>
      </div>
    </label>
  );
}
