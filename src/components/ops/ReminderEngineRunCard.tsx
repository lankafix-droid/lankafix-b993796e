/**
 * ReminderEngineRunCard — Manual ops trigger for reminder processing.
 * Operator/admin only. Advisory-only, human-controlled.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Eye, Shield, Loader2 } from "lucide-react";
import { processPendingReminderJobs, dryRunReminderProcessing, type ProcessingSummary } from "@/services/reminderProcessorService";

export default function ReminderEngineRunCard() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"idle" | "dry" | "live">("idle");
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);

  const handleDryRun = async () => {
    setLoading(true);
    setMode("dry");
    try {
      const result = await dryRunReminderProcessing(20);
      setSummary(result);
    } finally {
      setLoading(false);
    }
  };

  const handleLiveRun = async () => {
    setLoading(true);
    setMode("live");
    try {
      const result = await processPendingReminderJobs(20);
      setSummary(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-foreground">Reminder Engine</span>
        <Badge variant="outline" className="text-[9px] ml-auto">Manual Only</Badge>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleDryRun} disabled={loading} className="text-xs gap-1.5">
          {loading && mode === "dry" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
          Dry Run
        </Button>
        <Button size="sm" variant="default" onClick={handleLiveRun} disabled={loading} className="text-xs gap-1.5">
          {loading && mode === "live" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Process Pending
        </Button>
      </div>

      {summary && (
        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-[10px]">
          <p className="font-bold text-foreground text-xs">{mode === "dry" ? "Dry Run" : "Live Run"} Results</p>
          <div className="grid grid-cols-3 gap-2">
            <div><span className="text-muted-foreground">Processed:</span> <span className="font-medium">{summary.processed}</span></div>
            <div><span className="text-success">Sent:</span> <span className="font-medium">{summary.sent}</span></div>
            <div><span className="text-destructive">Failed:</span> <span className="font-medium">{summary.failed}</span></div>
            <div><span className="text-muted-foreground">Suppressed:</span> <span className="font-medium">{summary.suppressed}</span></div>
            <div><span className="text-warning">Escalated:</span> <span className="font-medium">{summary.escalated}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
