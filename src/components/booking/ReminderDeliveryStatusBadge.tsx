import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Ban, MinusCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-primary/10 text-primary border-primary/20" },
  sent: { label: "Sent", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Failed", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  suppressed: { label: "Suppressed", icon: Ban, className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", icon: MinusCircle, className: "bg-muted text-muted-foreground border-border" },
};

export default function ReminderDeliveryStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-[9px] gap-1 ${config.className}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </Badge>
  );
}
