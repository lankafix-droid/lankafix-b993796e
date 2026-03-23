/**
 * FlowTrustSignals — Compact trust signal strip for service flow.
 */
import { Shield, Clock, Star, Check, Lock, Camera } from "lucide-react";
import type { TrustSignal } from "@/data/categoryFlowEngine";

const ICON_MAP: Record<string, React.ElementType> = {
  shield: Shield,
  clock: Clock,
  star: Star,
  check: Check,
  lock: Lock,
  camera: Camera,
  warranty: Shield,
};

interface FlowTrustSignalsProps {
  signals: TrustSignal[];
  compact?: boolean;
}

export default function FlowTrustSignals({ signals, compact = false }: FlowTrustSignalsProps) {
  if (!signals.length) return null;

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {signals.map((s) => {
          const Icon = ICON_MAP[s.icon] || Shield;
          return (
            <div key={s.key} className="shrink-0 flex items-center gap-1.5 text-[10px] font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">
              <Icon className="w-3 h-3" />
              {s.label}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signals.map((s) => {
        const Icon = ICON_MAP[s.icon] || Shield;
        return (
          <div key={s.key} className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{s.label}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{s.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
