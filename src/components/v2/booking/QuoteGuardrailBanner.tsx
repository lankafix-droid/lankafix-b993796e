/**
 * QuoteGuardrailBanner — Displays guardrail status for technician quotes.
 * Shows whether a quote passes, warns, or is blocked by cost guardrails.
 */
import { ShieldCheck, AlertTriangle, Lock, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GuardrailResult } from "@/engines/deterministicPricingEngine";

interface Props {
  guardrails: GuardrailResult;
  quoteTotalLKR: number;
  className?: string;
}

export default function QuoteGuardrailBanner({ guardrails, quoteTotalLKR, className = "" }: Props) {
  if (guardrails.level === "pass" && guardrails.messages.length <= 1) {
    return (
      <div className={`rounded-xl bg-success/5 border border-success/20 p-3 flex items-center gap-2.5 ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Fair Price Verified</p>
          <p className="text-[10px] text-muted-foreground">
            LKR {quoteTotalLKR.toLocaleString()} is within the verified market range for this service.
          </p>
        </div>
        <Badge className="ml-auto bg-success/10 text-success border-success/20 text-[9px] shrink-0">
          <ShieldCheck className="w-3 h-3 mr-0.5" /> Passed
        </Badge>
      </div>
    );
  }

  if (guardrails.level === "warning") {
    return (
      <div className={`rounded-xl bg-warning/5 border border-warning/20 p-3 space-y-2 ${className}`}>
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <p className="text-xs font-semibold text-foreground">Price Review Required</p>
          <Badge className="ml-auto bg-warning/10 text-warning border-warning/20 text-[9px] shrink-0">
            Warning
          </Badge>
        </div>
        {guardrails.messages.filter(m => m.level !== "info").map((msg, i) => (
          <div key={i} className="flex items-start gap-2 ml-6">
            <Info className="w-3 h-3 text-warning mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">{msg.message}</p>
          </div>
        ))}
      </div>
    );
  }

  if (guardrails.level === "ceiling_hit" || guardrails.level === "blocked") {
    return (
      <div className={`rounded-xl bg-destructive/5 border border-destructive/20 p-3 space-y-2 ${className}`}>
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs font-semibold text-foreground">
            {guardrails.level === "blocked" ? "Quote Blocked" : "Above Price Ceiling"}
          </p>
          <Badge className="ml-auto bg-destructive/10 text-destructive border-destructive/20 text-[9px] shrink-0">
            {guardrails.level === "blocked" ? "Blocked" : "Ceiling Hit"}
          </Badge>
        </div>
        {guardrails.messages.filter(m => m.level !== "info").map((msg, i) => (
          <div key={i} className="flex items-start gap-2 ml-6">
            <AlertTriangle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">{msg.message}</p>
          </div>
        ))}
        {guardrails.ceilingLKR && (
          <div className="ml-6 text-[10px] text-muted-foreground">
            Maximum allowed: LKR {guardrails.ceilingLKR.toLocaleString()}
          </div>
        )}
      </div>
    );
  }

  return null;
}
