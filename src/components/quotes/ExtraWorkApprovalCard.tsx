/**
 * ExtraWorkApprovalCard — Approval checkpoint for revised quotes / additional work.
 * Human-controlled — does not auto-approve anything.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Shield, Loader2 } from "lucide-react";

interface Props {
  originalTotal: number;
  revisedTotal: number;
  changeReason?: string;
  technicianNote?: string;
  onApprove?: () => void;
  onDecline?: () => void;
  loading?: boolean;
}

export default function ExtraWorkApprovalCard({
  originalTotal,
  revisedTotal,
  changeReason,
  technicianNote,
  onApprove,
  onDecline,
  loading = false,
}: Props) {
  const difference = revisedTotal - originalTotal;
  const isIncrease = difference > 0;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Additional Work Approval</p>
            <p className="text-xs text-muted-foreground">Review changes before work continues</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
            Your Approval Needed
          </Badge>
        </div>

        {/* Price comparison */}
        <div className="bg-card rounded-lg p-3 space-y-2 border border-border/40">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Original Quote</span>
            <span className="text-foreground">LKR {originalTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Revised Quote</span>
            <span className="font-bold text-foreground">LKR {revisedTotal.toLocaleString()}</span>
          </div>
          {isIncrease && (
            <div className="flex justify-between text-sm border-t border-border/30 pt-1.5">
              <span className="text-muted-foreground">Difference</span>
              <span className="font-bold text-amber-600">+LKR {difference.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Reason for change */}
        {changeReason && (
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground font-medium mb-1">Why This Changed</p>
            <p className="text-xs text-foreground">{changeReason}</p>
          </div>
        )}

        {/* Technician note */}
        {technicianNote && (
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground font-medium mb-1">Technician's Note</p>
            <p className="text-xs text-foreground">{technicianNote}</p>
          </div>
        )}

        {/* Action buttons */}
        {(onApprove || onDecline) && (
          <div className="flex gap-3">
            {onApprove && (
              <Button className="flex-1 h-11 rounded-xl" onClick={onApprove} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Approve Changes
              </Button>
            )}
            {onDecline && (
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={onDecline} disabled={loading}>
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
            )}
          </div>
        )}

        {/* Trust strip */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3 text-success" />
          No additional work proceeds without your permission.
        </div>
      </CardContent>
    </Card>
  );
}
