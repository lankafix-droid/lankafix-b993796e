/**
 * ConsentCard — Reusable consent acknowledgement card for booking flows.
 * Covers data safety, backup responsibility, inspection-first, quote variance.
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, AlertTriangle, FileSearch, Receipt } from "lucide-react";

export type ConsentVariant = "data_safety" | "backup_responsibility" | "inspection_first" | "quote_variance" | "custom";

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
};

export default function ConsentCard({ variant, checked, onCheckedChange, customTitle, customDescription }: Props) {
  const config = variant === "custom" 
    ? { title: customTitle || "", description: customDescription || "", icon: Shield }
    : CONSENT_CONFIGS[variant];
  
  const Icon = config.icon;

  return (
    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(!!v)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-sm font-medium text-foreground">{config.title}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{config.description}</p>
      </div>
    </label>
  );
}
