/**
 * PricingExplainabilityPanel — Deterministic pricing transparency card.
 * Shows every fee with rule attribution. AI has zero pricing authority here.
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Info, ChevronDown, ChevronUp, Receipt, MapPin,
  Zap, Shield, Wrench, Eye, Lock, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { DeterministicPriceResult, PriceLineItem, GuardrailLevel } from "@/engines/deterministicPricingEngine";

interface Props {
  pricing: DeterministicPriceResult;
  className?: string;
}

const RULE_SOURCE_LABELS: Record<string, string> = {
  category_config: "Category Rule",
  service_override: "Service Rule",
  market_range: "Market Data",
  zone_travel: "Zone Policy",
  emergency_policy: "Emergency Policy",
  commission_tier: "Commission Tier",
  deposit_policy: "Deposit Policy",
  platform_policy: "Platform Policy",
};

const LINE_ICONS: Record<string, React.ReactNode> = {
  visit_fee: <Eye className="w-3.5 h-3.5" />,
  diagnostic_fee: <Wrench className="w-3.5 h-3.5" />,
  travel_fee: <MapPin className="w-3.5 h-3.5" />,
  emergency_surcharge: <Zap className="w-3.5 h-3.5" />,
  protection_fee: <Shield className="w-3.5 h-3.5" />,
};

const GUARDRAIL_STYLES: Record<GuardrailLevel, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  pass: { bg: "bg-success/5", border: "border-success/20", icon: <CheckCircle2 className="w-4 h-4 text-success" />, label: "Verified Fair Price" },
  warning: { bg: "bg-warning/5", border: "border-warning/20", icon: <AlertTriangle className="w-4 h-4 text-warning" />, label: "Price Review" },
  ceiling_hit: { bg: "bg-destructive/5", border: "border-destructive/20", icon: <AlertTriangle className="w-4 h-4 text-destructive" />, label: "Above Market Range" },
  blocked: { bg: "bg-destructive/5", border: "border-destructive/20", icon: <Lock className="w-4 h-4 text-destructive" />, label: "Requires Admin Review" },
};

function LineItemRow({ item }: { item: PriceLineItem }) {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="flex items-center gap-2 text-left group"
        >
          <span className="text-muted-foreground">{LINE_ICONS[item.id] || <Info className="w-3.5 h-3.5" />}</span>
          <span className="text-sm text-foreground group-hover:text-primary transition-colors">{item.label}</span>
          <Info className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          LKR {item.amount.toLocaleString()}
        </span>
      </div>
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-6 mb-2 p-2.5 rounded-lg bg-muted/40 border border-border/30 space-y-1">
              <p className="text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-background">
                {RULE_SOURCE_LABELS[item.ruleSource] || item.ruleSource}
              </Badge>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingExplainabilityPanel({ pricing, className = "" }: Props) {
  const [expanded, setExpanded] = useState(true);
  const guardrailStyle = GUARDRAIL_STYLES[pricing.guardrails.level];
  const visibleItems = pricing.lineItems.filter(li => li.customerVisible);

  return (
    <div className={`rounded-2xl border border-border/60 bg-card overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left transition-all hover:bg-secondary/20"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
            <Receipt className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Price Transparency</p>
            <p className="text-[10px] text-muted-foreground">
              Every fee explained · Rule-based pricing · {pricing.pricingModel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] bg-primary/5 border-primary/20 text-primary">
            {pricing.ruleVersion}
          </Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Guardrail status */}
              <div className={`rounded-xl p-3 border ${guardrailStyle.bg} ${guardrailStyle.border} flex items-center gap-2.5`}>
                {guardrailStyle.icon}
                <div>
                  <p className="text-xs font-semibold text-foreground">{guardrailStyle.label}</p>
                  {pricing.guardrails.messages.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {pricing.guardrails.messages[0].message}
                    </p>
                  )}
                </div>
              </div>

              {/* Line items */}
              {visibleItems.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Fee Breakdown · Tap any item to learn why
                  </p>
                  {visibleItems.map(item => (
                    <LineItemRow key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* Estimated service range */}
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Estimated Service Cost</p>
                  <p className="text-base font-bold text-primary tabular-nums">
                    LKR {pricing.subtotals.estimatedServiceMin.toLocaleString()}
                    {pricing.subtotals.estimatedServiceMin !== pricing.subtotals.estimatedServiceMax && (
                      <span className="text-muted-foreground font-normal text-xs">
                        {" "}– {pricing.subtotals.estimatedServiceMax.toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                  <p className="text-xs font-semibold text-foreground">Estimated Total</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    LKR {pricing.estimatedTotalMin.toLocaleString()}
                    {pricing.estimatedTotalMin !== pricing.estimatedTotalMax && (
                      <span className="text-muted-foreground font-normal text-sm">
                        {" "}– {pricing.estimatedTotalMax.toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Market range comparison */}
              {pricing.marketRange && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-success shrink-0" />
                  <span>
                    Market range: LKR {pricing.marketRange.minLKR.toLocaleString()} – {pricing.marketRange.maxLKR.toLocaleString()}
                    {pricing.marketRange.includesParts ? " (incl. parts)" : " (labour only)"}
                  </span>
                </div>
              )}

              {/* Deposit info */}
              {pricing.deposit.required && (
                <div className="rounded-lg bg-warning/5 border border-warning/20 p-2.5 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Deposit Required: LKR {pricing.deposit.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{pricing.deposit.explanation}</p>
                  </div>
                </div>
              )}

              {/* Guardrail ceiling indicator */}
              {pricing.guardrails.ceilingLKR && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Shield className="w-3 h-3 shrink-0" />
                  <span>
                    Price ceiling: LKR {pricing.guardrails.ceilingLKR.toLocaleString()} · Quotes above this require admin review
                  </span>
                </div>
              )}

              {/* Trust footer */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3 text-success shrink-0" />
                No work starts without your approval · All prices are rule-verified · AI cannot set prices
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
