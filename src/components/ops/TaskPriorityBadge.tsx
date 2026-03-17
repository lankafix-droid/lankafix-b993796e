import { Badge } from "@/components/ui/badge";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-primary/10 text-primary" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive font-bold" },
};

export default function TaskPriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return (
    <Badge variant="outline" className={`text-[9px] ${config.className}`}>
      {config.label}
    </Badge>
  );
}
