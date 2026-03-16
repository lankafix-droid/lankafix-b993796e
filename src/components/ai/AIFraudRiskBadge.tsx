import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, ShieldQuestion, ShieldCheck, ShieldX } from "lucide-react";
import type { FraudRiskLevel } from "@/services/aiFraudDetection";

interface AIFraudRiskBadgeProps {
  riskLevel: FraudRiskLevel;
  className?: string;
  showIcon?: boolean;
}

const RISK_CONFIG: Record<
  FraudRiskLevel,
  { label: string; style: string; Icon: typeof Shield }
> = {
  safe: {
    label: "Clear",
    style: "bg-green-500/10 text-green-700 border-green-500/20",
    Icon: ShieldCheck,
  },
  unknown: {
    label: "Scan Unavailable",
    style: "bg-muted text-muted-foreground border-border",
    Icon: ShieldQuestion,
  },
  low: {
    label: "Low Risk",
    style: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    Icon: Shield,
  },
  medium: {
    label: "Medium Risk",
    style: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    Icon: ShieldAlert,
  },
  high: {
    label: "High Risk",
    style: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    Icon: ShieldAlert,
  },
  critical: {
    label: "Critical Risk",
    style: "bg-red-500/10 text-red-700 border-red-500/20",
    Icon: ShieldX,
  },
};

const AIFraudRiskBadge = ({
  riskLevel,
  className = "",
  showIcon = true,
}: AIFraudRiskBadgeProps) => {
  const config = RISK_CONFIG[riskLevel];
  const { Icon } = config;

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium gap-1 ${config.style} ${className}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
};

export default AIFraudRiskBadge;

/** Get fraud risk color class for inline use */
export function getFraudRiskColor(riskLevel: FraudRiskLevel): string {
  const colors: Record<FraudRiskLevel, string> = {
    safe: "text-green-700",
    unknown: "text-muted-foreground",
    low: "text-blue-700",
    medium: "text-amber-700",
    high: "text-orange-700",
    critical: "text-red-700",
  };
  return colors[riskLevel];
}

/** Get fraud risk label for inline use */
export function getFraudRiskLabel(riskLevel: FraudRiskLevel): string {
  return RISK_CONFIG[riskLevel].label;
}
