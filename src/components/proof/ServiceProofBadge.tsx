import { Shield, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ServiceProofBadgeProps {
  verified: boolean;
  size?: "sm" | "md";
}

const ServiceProofBadge = ({ verified, size = "sm" }: ServiceProofBadgeProps) => {
  if (!verified) return null;

  return (
    <Badge
      className={`gap-1 ${
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
      } bg-success/10 text-success border-success/20 hover:bg-success/15`}
    >
      <Shield className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      LankaFix Verified
    </Badge>
  );
};

export default ServiceProofBadge;
