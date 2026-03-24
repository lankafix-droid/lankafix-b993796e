/**
 * FlowFamilyBanner — Shows the user what kind of outcome to expect.
 */
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { type FlowFamily, FLOW_FAMILY_LABELS } from "@/data/categoryFlowEngine";

interface FlowFamilyBannerProps {
  flowFamily: FlowFamily;
  className?: string;
}

export default function FlowFamilyBanner({ flowFamily, className = "" }: FlowFamilyBannerProps) {
  const meta = FLOW_FAMILY_LABELS[flowFamily];
  if (!meta) return null;

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border/40 ${className}`}>
      <span className="text-base mt-0.5">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{meta.label}</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{meta.nextStep}</p>
      </div>
    </div>
  );
}
