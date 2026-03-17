/**
 * AILaunchBlockersPanel — Displays blockers and warnings for AI launch.
 * Advisory only — never modifies marketplace state.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle, Shield } from "lucide-react";

interface Props {
  blockers: string[];
  warnings: string[];
}

const AILaunchBlockersPanel = ({ blockers, warnings }: Props) => {
  if (blockers.length === 0 && warnings.length === 0) {
    return (
      <Card className="border-green-500/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-foreground">No blockers or warnings</p>
            <p className="text-[11px] text-muted-foreground">All AI modules pass readiness checks</p>
          </div>
          <Badge variant="outline" className="text-[9px] ml-auto">Advisory Only</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Launch Blockers & Warnings</h3>
          <Badge variant="outline" className="text-[9px]">Advisory Only</Badge>
        </div>

        {blockers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Blockers</p>
            {blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/15 p-2.5">
                <XCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground">{b}</p>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Warnings</p>
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/15 p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground">{w}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AILaunchBlockersPanel;
