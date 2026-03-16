import { Badge } from "@/components/ui/badge";
import { Activity, Brain, Shield, TrendingUp } from "lucide-react";

interface AIModuleStatus {
  name: string;
  enabled: boolean;
  health?: "healthy" | "degraded" | "offline";
}

interface AIStatusStripProps {
  modules: AIModuleStatus[];
  className?: string;
}

const HEALTH_COLORS = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  offline: "bg-red-500",
} as const;

const AIStatusStrip = ({ modules, className = "" }: AIStatusStripProps) => {
  const active = modules.filter((m) => m.enabled).length;
  const total = modules.length;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-xl border border-border/40 overflow-x-auto ${className}`}>
      <div className="flex items-center gap-1.5 shrink-0">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">AI Modules</span>
        <Badge variant="secondary" className="text-[10px] px-1.5">
          {active}/{total}
        </Badge>
      </div>
      <div className="h-4 w-px bg-border/50 shrink-0" />
      <div className="flex items-center gap-2 overflow-x-auto">
        {modules.map((m) => (
          <div key={m.name} className="flex items-center gap-1 shrink-0">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                !m.enabled
                  ? "bg-muted-foreground/30"
                  : HEALTH_COLORS[m.health || "healthy"]
              }`}
            />
            <span
              className={`text-[10px] ${
                m.enabled ? "text-foreground" : "text-muted-foreground/50"
              }`}
            >
              {m.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIStatusStrip;
