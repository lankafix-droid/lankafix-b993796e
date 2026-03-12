import type { V2FlowOption } from "@/data/v2CategoryFlows";
import { CheckCircle2, Clock, Tag, ShieldCheck, Flame, Star, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { serviceBadges } from "@/config/serviceBadges";
import { servicePriceRanges } from "@/config/servicePriceRanges";

interface Props {
  options: V2FlowOption[];
  selected: string;
  onSelect: (id: string) => void;
  title: string;
}

const V2ServiceSelection = ({ options, selected, onSelect, title }: Props) => {
  const grouped = useMemo(() => {
    const groups: { name: string | null; items: V2FlowOption[] }[] = [];
    const groupMap = new Map<string | null, V2FlowOption[]>();

    for (const opt of options) {
      const g = opt.group || null;
      if (!groupMap.has(g)) {
        groupMap.set(g, []);
        groups.push({ name: g, items: groupMap.get(g)! });
      }
      groupMap.get(g)!.push(opt);
    }
    return groups;
  }, [options]);

  const hasGroups = grouped.some(g => g.name !== null);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-1">Select the service that best matches your needs</p>
      </div>

      {grouped.map((group) => (
        <div key={group.name || "__ungrouped"} className="space-y-2.5">
          {hasGroups && group.name && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
              {group.name}
            </h3>
          )}
          <div className="space-y-2.5">
            {group.items.map((opt, i) => {
              const isSelected = selected === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  onClick={() => onSelect(opt.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
                  className={`w-full text-left rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border/60 bg-card hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground text-sm">{opt.label}</h3>
                        {opt.tag && (
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 py-0 px-1.5">
                            {opt.tag}
                          </Badge>
                        )}
                        {serviceBadges[opt.id] && (
                          <Badge variant="secondary" className="text-[10px] bg-accent/60 text-accent-foreground py-0 px-1.5 gap-0.5">
                            <Flame className="w-2.5 h-2.5" />
                            {serviceBadges[opt.id]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{opt.description}</p>
                      {(opt.priceLabel || opt.estimatedTime) && (
                        <div className="flex items-center gap-3 mt-2.5">
                          {opt.priceLabel && (
                            <span className="text-xs font-bold text-primary flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {opt.priceLabel}
                            </span>
                          )}
                          {opt.estimatedTime && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {opt.estimatedTime}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Radio-style indicator */}
                    <div className={`w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-primary" : "border-2 border-muted-foreground/20"
                    }`}>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-primary-foreground" />}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Reassurance */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-xl px-3.5 py-2.5">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Don't worry if you're unsure — our technician will confirm the exact issue on-site.</span>
      </div>
    </div>
  );
};

export default V2ServiceSelection;
