/**
 * CompletionConfirmationCard — Customer confirms service completion.
 * Human-controlled — does not auto-complete anything.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Headphones, Shield, Award } from "lucide-react";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

interface Props {
  technicianName?: string;
  completedAt?: string;
  serviceSummary?: string;
  finalAmount?: number;
  categoryCode?: string;
  onConfirm?: () => void;
  onReportIssue?: () => void;
  onContactSupport?: () => void;
}

export default function CompletionConfirmationCard({
  technicianName,
  completedAt,
  serviceSummary,
  finalAmount,
  categoryCode,
  onConfirm,
  onReportIssue,
  onContactSupport,
}: Props) {
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Confirm Service Completion</p>
            <p className="text-xs text-muted-foreground">Please review before confirming</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
            Your Confirmation
          </Badge>
        </div>

        {/* Service summary */}
        <div className="bg-card rounded-lg p-3 space-y-2 border border-border/40">
          {technicianName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Technician</span>
              <span className="font-medium text-foreground">{technicianName}</span>
            </div>
          )}
          {completedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium text-foreground">{new Date(completedAt).toLocaleString()}</span>
            </div>
          )}
          {serviceSummary && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Work Done</span>
              <span className="font-medium text-foreground">{serviceSummary}</span>
            </div>
          )}
          {finalAmount != null && finalAmount > 0 && (
            <div className="flex justify-between text-sm border-t border-border/30 pt-1.5">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-foreground">LKR {finalAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Warranty note */}
        <div className="flex items-start gap-2 bg-success/5 border border-success/20 rounded-lg p-2.5">
          <Award className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
          <p className="text-[10px] text-foreground leading-relaxed">
            Your warranty is activated upon confirmation. Keep your Job ID for future claims.
          </p>
        </div>

        {/* Trust guidance */}
        <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-2.5">
          <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Confirm only if the service was completed satisfactorily. If something is wrong, report it before confirming.
            Your confirmation protects your warranty rights.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {onConfirm && (
            <Button className="w-full h-12 rounded-xl text-sm font-semibold" onClick={onConfirm}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm — Service Completed
            </Button>
          )}
          <div className="flex gap-2">
            {onReportIssue && (
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-xl text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
                onClick={onReportIssue}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Report Issue
              </Button>
            )}
            {onContactSupport ? (
              <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs" onClick={onContactSupport}>
                <Headphones className="w-3.5 h-3.5 mr-1.5" />
                Need Help
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs" asChild>
                <a href={whatsappLink(SUPPORT_WHATSAPP, "I need help with my completed booking")} target="_blank" rel="noopener noreferrer">
                  <Headphones className="w-3.5 h-3.5 mr-1.5" />
                  Need Help
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
