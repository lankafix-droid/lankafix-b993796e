/**
 * SLABreachBoard — Displays bookings exceeding SLA windows.
 * Advisory-only, no auto-actions.
 */

import { AlertTriangle, Clock, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { fetchSLABreaches, type SLABreachItem } from "@/services/slaBreachReadModel";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export default function SLABreachBoard() {
  const { data: breaches = [] } = useQuery({
    queryKey: ["sla-breaches"],
    queryFn: fetchSLABreaches,
    refetchInterval: 15_000,
  });

  if (!breaches.length) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-success" />
          <span className="text-sm font-bold text-foreground">SLA Status</span>
        </div>
        <p className="text-[10px] text-success font-medium">All bookings within SLA windows ✓</p>
      </div>
    );
  }

  const critical = breaches.filter(b => b.severity === "critical");
  const high = breaches.filter(b => b.severity === "high");

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm font-bold text-foreground">SLA Breaches</span>
        <Badge variant="outline" className="text-[9px] ml-auto text-destructive">{breaches.length} breaches</Badge>
      </div>

      {critical.length > 0 && (
        <div className="text-[10px] text-destructive font-medium">{critical.length} critical breach{critical.length > 1 ? "es" : ""}</div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {breaches.slice(0, 15).map((b) => (
          <div key={b.bookingId} className={`p-2.5 rounded-lg border text-xs ${SEVERITY_STYLES[b.severity]}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{b.bookingId.slice(0, 8).toUpperCase()}</span>
              <Badge variant="outline" className={`text-[8px] ${SEVERITY_STYLES[b.severity]}`}>{b.severity}</Badge>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px]">
              <Clock className="w-3 h-3" />
              <span>{b.elapsedMinutes}min elapsed (SLA: {b.expectedSlaMinutes}min)</span>
            </div>
            <p className="text-[10px] mt-1 font-medium">{b.recommendedAction}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
