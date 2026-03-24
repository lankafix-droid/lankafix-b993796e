/**
 * DiagnosticBuilder — Interface 3 step component.
 * Renders category-specific diagnostic fields with conditional visibility,
 * risk disclaimers, commercial expectations, photo upload, and flow-family reroute indicator.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, Camera, CheckCircle2, Info, Upload, X,
} from "lucide-react";
import type {
  DiagnosticField, RiskDisclaimer, CommercialInfo, TrustSignal, FlowFamily,
} from "@/data/categoryFlowEngine";
import { getVisibleDiagnosticFields, getActiveDisclaimers, resolveFlowFamily, FLOW_FAMILY_LABELS } from "@/data/categoryFlowEngine";
import FlowTrustSignals from "./FlowTrustSignals";

interface DiagnosticBuilderProps {
  categoryCode: string;
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
  commercial: CommercialInfo;
  trustSignals: TrustSignal[];
  photoUploadEnabled: boolean;
  /** Current service selection for flow resolution */
  serviceId?: string;
  /** Default flow family before any diagnostic overrides */
  defaultFlowFamily?: FlowFamily;
}

export default function DiagnosticBuilder({
  categoryCode, answers, onAnswer, commercial, trustSignals, photoUploadEnabled,
  serviceId, defaultFlowFamily,
}: DiagnosticBuilderProps) {
  const fields = getVisibleDiagnosticFields(categoryCode, answers);
  const disclaimers = getActiveDisclaimers(categoryCode, answers);

  // Detect if diagnostic answers have rerouted the flow family
  const resolvedFamily = useMemo(
    () => resolveFlowFamily(categoryCode, serviceId, answers),
    [categoryCode, serviceId, answers]
  );
  const wasRerouted = defaultFlowFamily && resolvedFamily !== defaultFlowFamily;
  const rerouteMeta = wasRerouted ? FLOW_FAMILY_LABELS[resolvedFamily] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Tell us more
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This helps us prepare the right technician and parts
        </p>
      </div>

      {/* Flow-family reroute indicator */}
      <AnimatePresence>
        {wasRerouted && rerouteMeta && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/5 border border-primary/15"
          >
            <span className="text-base mt-0.5">{rerouteMeta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-primary">{rerouteMeta.label}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{rerouteMeta.nextStep}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diagnostic Fields */}
      <div className="space-y-5">
        {fields.map((field) => (
          <DiagnosticFieldRenderer
            key={field.key}
            field={field}
            value={answers[field.key] || ""}
            onChange={(v) => onAnswer(field.key, v)}
          />
        ))}
      </div>

      {/* Additional description */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">
          Additional Details <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          placeholder="Anything else we should know..."
          value={answers._description || ""}
          onChange={(e) => onAnswer("_description", e.target.value)}
          className="rounded-xl min-h-[72px] text-sm resize-none"
        />
      </div>

      {/* Risk Disclaimers */}
      <AnimatePresence>
        {disclaimers.map((d) => (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-start gap-2.5 p-3 rounded-xl border ${
              d.severity === "critical"
                ? "bg-destructive/5 border-destructive/20"
                : d.severity === "warning"
                ? "bg-amber-500/5 border-amber-500/20"
                : "bg-primary/5 border-primary/10"
            }`}
          >
            {d.severity === "critical" ? (
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            ) : d.severity === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">{d.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Commercial Expectations */}
      <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/40">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Pricing Expectation
        </p>
        <p className="text-xs text-foreground font-medium">{commercial.expectationLabel}</p>
        {commercial.inspectionFeeRange && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Inspection fee: {commercial.inspectionFeeRange}
          </p>
        )}
        {commercial.diagnosticFeeRange && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Diagnostic fee: {commercial.diagnosticFeeRange}
          </p>
        )}
        {commercial.warrantyHint && (
          <p className="text-[11px] text-primary mt-1 font-medium">
            ✓ {commercial.warrantyHint}
          </p>
        )}
      </div>

      {/* Trust Signals */}
      <FlowTrustSignals signals={trustSignals} />
    </div>
  );
}
function DiagnosticFieldRenderer({
  field, value, onChange,
}: {
  field: DiagnosticField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "photo") {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">{field.label}</label>
        {field.hint && <p className="text-[10px] text-muted-foreground">{field.hint}</p>}
        <button className="w-full p-4 rounded-xl border border-dashed border-border/60 bg-card/50 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/30 transition-colors active:scale-[0.98]">
          <Camera className="w-6 h-6" />
          <span className="text-xs font-medium">Tap to upload photo</span>
        </button>
      </div>
    );
  }

  if (field.type === "text" || field.type === "search_select") {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">{field.label}</label>
        {field.hint && <p className="text-[10px] text-muted-foreground">{field.hint}</p>}
        <Input
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    const cols = field.columns || 2;
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">{field.label}</label>
        {field.hint && <p className="text-[10px] text-muted-foreground">{field.hint}</p>}
        <div className={`grid gap-2 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {field.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
                value === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border/40 bg-card hover:border-primary/20"
              }`}
            >
              {opt.icon && <span className="text-sm mb-0.5 block">{opt.icon}</span>}
              <p className={`font-medium text-foreground leading-tight ${cols === 3 ? "text-[11px]" : "text-xs"}`}>
                {opt.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <button
        onClick={() => onChange(value === "true" ? "false" : "true")}
        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
          value === "true"
            ? "border-primary bg-primary/5"
            : "border-border/40 bg-card"
        }`}
      >
        <CheckCircle2 className={`w-5 h-5 shrink-0 ${value === "true" ? "text-primary" : "text-muted-foreground/30"}`} />
        <span className="text-xs font-medium text-foreground">{field.label}</span>
      </button>
    );
  }

  return null;
}
