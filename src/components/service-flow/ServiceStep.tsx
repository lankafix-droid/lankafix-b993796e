/**
 * ServiceStep — Step 1: Select the service type from category offerings.
 */
import { CheckCircle2, Wrench } from "lucide-react";
import type { ServiceOption } from "@/data/categoryLandingConfig";
import type { FlowFamily } from "@/data/categoryFlowEngine";
import FlowFamilyBanner from "./FlowFamilyBanner";

interface ServiceStepProps {
  services: ServiceOption[];
  selected: string;
  onSelect: (svc: ServiceOption) => void;
  flowFamily: FlowFamily;
}

export default function ServiceStep({ services, selected, onSelect, flowFamily }: ServiceStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">What do you need?</h2>
        <p className="text-sm text-muted-foreground mt-1">Select the service that best matches your need</p>
      </div>
      <div className="space-y-2.5">
        {services.map((svc) => (
          <button
            key={svc.id}
            onClick={() => onSelect(svc)}
            className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left active:scale-[0.98] ${
              selected === svc.id ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 bg-card hover:border-primary/20"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected === svc.id ? "bg-primary/15" : "bg-secondary"}`}>
              <Wrench className={`w-4.5 h-4.5 ${selected === svc.id ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{svc.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{svc.description}</p>
              {svc.outcome && svc.outcome !== "booking" && (
                <span className="text-[9px] font-medium text-primary/80 mt-1 inline-block">
                  {svc.outcome === "inspection" ? "🔍 Inspection first" :
                   svc.outcome === "diagnosis" ? "🩺 Diagnosis required" :
                   svc.outcome === "consultation" ? "📋 Site assessment" : ""}
                </span>
              )}
            </div>
            {selected === svc.id && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
          </button>
        ))}
      </div>
      {selected && <FlowFamilyBanner flowFamily={flowFamily} />}
    </div>
  );
}
