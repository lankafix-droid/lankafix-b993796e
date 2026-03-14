import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Escalation {
  id: string;
  booking_id: string;
  reason: string;
  dispatch_rounds_attempted: number | null;
  created_at: string;
  resolved_at: string | null;
}

const reasonLabel = (r: string) => {
  const map: Record<string, string> = {
    no_partners_found: "No technicians nearby",
    all_declined: "All technicians declined",
    sequential_all_expired: "All offers expired (sequential)",
    parallel_all_expired: "All offers expired (parallel)",
    multi_tech_team_incomplete: "Multi-tech team incomplete",
    max_rounds_exceeded: "Max dispatch rounds exceeded",
    ops_manual_escalation: "Ops manual escalation",
  };
  return map[r] || r.replace(/_/g, " ");
};

interface DispatchFailurePanelProps {
  escalations: Escalation[];
}

export default function DispatchFailurePanel({ escalations }: DispatchFailurePanelProps) {
  const open = escalations.filter(e => !e.resolved_at);

  if (open.length === 0) return null;

  return (
    <Card className="border-destructive/30">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertTriangle size={14} /> Dispatch Failures ({open.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {open.slice(0, 10).map(e => (
          <div key={e.id} className="flex items-center justify-between text-xs bg-destructive/5 rounded-lg px-3 py-2">
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">{e.booking_id.slice(0, 8)}</span>
              <p className="text-destructive font-medium">{reasonLabel(e.reason)}</p>
            </div>
            <Badge variant="outline" className="text-[9px]">
              R{e.dispatch_rounds_attempted || "?"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
