import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings, UserPlus, RefreshCw, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OpsControlPanelProps {
  bookingId: string | null;
  currentRound: number;
}

export default function OpsControlPanel({ bookingId, currentRound }: OpsControlPanelProps) {
  const [overridePartnerId, setOverridePartnerId] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const invoke = async (action: string, body: Record<string, any>) => {
    if (!bookingId) return;
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-accept", {
        body: { booking_id: bookingId, ...body },
      });
      if (error) throw error;
      toast({ title: `${action} successful`, description: JSON.stringify(data) });
    } catch (e: any) {
      toast({ title: `${action} failed`, description: e.message, variant: "destructive" });
    }
    setLoading(null);
  };

  const retryDispatch = async () => {
    if (!bookingId) return;
    setLoading("retry");
    try {
      const { error } = await supabase.functions.invoke("dispatch-orchestrator", {
        body: { booking_id: bookingId, force_round: currentRound + 1 },
      });
      if (error) throw error;
      toast({ title: "Dispatch retried", description: `Round ${currentRound + 1} triggered` });
    } catch (e: any) {
      toast({ title: "Retry failed", description: e.message, variant: "destructive" });
    }
    setLoading(null);
  };

  const cancelJob = async () => {
    if (!bookingId) return;
    setLoading("cancel");
    try {
      await Promise.all([
        supabase.from("bookings").update({ status: "cancelled", dispatch_status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", bookingId),
        supabase.from("dispatch_offers").update({ status: "expired_by_accept", responded_at: new Date().toISOString() }).eq("booking_id", bookingId).eq("status", "pending"),
        supabase.from("job_timeline").insert({ booking_id: bookingId, status: "cancelled", actor: "ops", note: "Cancelled from War Room" }),
      ]);
      toast({ title: "Job cancelled" });
    } catch (e: any) {
      toast({ title: "Cancel failed", description: e.message, variant: "destructive" });
    }
    setLoading(null);
  };

  const escalate = async () => {
    if (!bookingId) return;
    setLoading("escalate");
    try {
      await Promise.all([
        supabase.from("bookings").update({ dispatch_status: "escalated" }).eq("id", bookingId),
        supabase.from("dispatch_escalations").insert({ booking_id: bookingId, reason: "ops_manual_escalation", dispatch_rounds_attempted: currentRound }),
        supabase.from("job_timeline").insert({ booking_id: bookingId, status: "dispatch_escalated", actor: "ops", note: "Manually escalated from War Room" }),
      ]);
      toast({ title: "Job escalated" });
    } catch (e: any) {
      toast({ title: "Escalate failed", description: e.message, variant: "destructive" });
    }
    setLoading(null);
  };

  if (!bookingId) return null;

  return (
    <Card>
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings size={14} /> Ops Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Manual assign */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Manual Assign</label>
          <div className="flex gap-1.5">
            <Input
              placeholder="Partner ID"
              value={overridePartnerId}
              onChange={e => setOverridePartnerId(e.target.value)}
              className="text-xs h-8"
            />
            <Button
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={!overridePartnerId || loading === "assign"}
              onClick={() => invoke("OPS ASSIGN", { partner_id: overridePartnerId, action: "ops_override", override_partner_id: overridePartnerId })}
            >
              <UserPlus size={12} className="mr-1" /> Assign
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={loading === "retry"}
            onClick={retryDispatch}
          >
            <RefreshCw size={12} className="mr-1" /> Retry R{currentRound + 1}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={loading === "cancel"}
            onClick={cancelJob}
          >
            <XCircle size={12} className="mr-1" /> Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs col-span-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
            disabled={loading === "escalate"}
            onClick={escalate}
          >
            <AlertTriangle size={12} className="mr-1" /> Escalate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
