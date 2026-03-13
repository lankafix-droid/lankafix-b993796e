import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

/**
 * Global pilot mode indicator banner.
 * Reads from localStorage: lankafix_pilot_mode = "true"
 */
export default function PilotModeBanner() {
  if (typeof window === "undefined") return null;
  const pilotMode = localStorage.getItem("lankafix_pilot_mode") === "true";
  if (!pilotMode) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center justify-center gap-2">
      <Zap className="w-3.5 h-3.5 text-primary" />
      <span className="text-[11px] font-semibold text-primary">Pilot Mode Active</span>
      <Badge variant="outline" className="text-[9px] border-primary/30 text-primary px-1.5 py-0">BETA</Badge>
    </div>
  );
}
