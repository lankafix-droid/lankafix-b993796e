/**
 * PriorityServiceSelector — Compact "Choose Service Speed" block.
 * Shown in booking flow for priority-enabled services.
 */
import type { PriorityServiceEntry } from "@/data/priorityServiceConfig";
import { Badge } from "@/components/ui/badge";
import { Info, Zap, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ServiceSpeed = "standard" | "priority";

interface Props {
  config: PriorityServiceEntry;
  selected: ServiceSpeed;
  onSelect: (speed: ServiceSpeed) => void;
}

function formatLKR(n: number): string {
  return `Rs ${n.toLocaleString("en-LK")}`;
}

const PriorityServiceSelector = ({ config, selected, onSelect }: Props) => {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-foreground">Choose Service Speed</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select how urgently you need a technician
        </p>
      </div>

      <div className="grid gap-2.5">
        {/* Standard option */}
        <motion.button
          type="button"
          className={cn(
            "w-full text-left rounded-xl border-2 p-4 transition-all",
            selected === "standard"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          )}
          onClick={() => onSelect("standard")}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">Standard Service</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                {config.standard_eta_text}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 bg-muted/50">
              Included
            </Badge>
          </div>
        </motion.button>

        {/* Priority option */}
        <motion.button
          type="button"
          className={cn(
            "w-full text-left rounded-xl border-2 p-4 transition-all",
            selected === "priority"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
              : "border-border hover:border-primary/40"
          )}
          onClick={() => onSelect("priority")}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground">Priority Service</span>
                <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                  Faster
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                {config.priority_eta_text}
              </p>
              <p className="text-xs font-medium text-primary mt-1 ml-6">
                +{formatLKR(config.priority_fee_lkr)} priority fee
              </p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-muted/30 rounded-xl px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {config.customer_disclaimer}
        </p>
      </div>
    </div>
  );
};

export default PriorityServiceSelector;
