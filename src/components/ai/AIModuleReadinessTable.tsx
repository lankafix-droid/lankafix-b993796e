/**
 * AIModuleReadinessTable — Per-module rollout readiness view.
 * Advisory only — never modifies marketplace state.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModuleRolloutReadiness } from "@/services/aiRolloutReadiness";

interface Props {
  modules: ModuleRolloutReadiness[];
}

const VERDICT_STYLE = {
  READY: { bg: "bg-green-500/10", text: "text-green-700", label: "Ready" },
  LIMITED: { bg: "bg-amber-500/10", text: "text-amber-700", label: "Limited" },
  NOT_READY: { bg: "bg-red-500/10", text: "text-red-700", label: "Not Ready" },
};

const AIModuleReadinessTable = ({ modules }: Props) => {
  const grouped = ["Consumer", "Internal", "Growth", "Infrastructure", "Future"] as const;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Module Readiness</h3>
          <Badge variant="outline" className="text-[9px]">Advisory Only</Badge>
        </div>

        {grouped.map((cat) => {
          const catModules = modules.filter((m) => m.category === cat);
          if (catModules.length === 0) return null;
          return (
            <div key={cat} className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</p>
              <div className="space-y-1.5">
                {catModules.map((m) => {
                  const style = VERDICT_STYLE[m.verdict];
                  return (
                    <div key={m.module} className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m.rolloutRecommendation}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-foreground">{m.readinessScore}</span>
                        <Badge className={`${style.bg} ${style.text} border-0 text-[9px]`}>{style.label}</Badge>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {m.blockers.length > 0 && (
                          <span className="text-[9px] text-red-600 font-medium">{m.blockers.length}B</span>
                        )}
                        {m.warnings.length > 0 && (
                          <span className="text-[9px] text-amber-600 font-medium">{m.warnings.length}W</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AIModuleReadinessTable;
