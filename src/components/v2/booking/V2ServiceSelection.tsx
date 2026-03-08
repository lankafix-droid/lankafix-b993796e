import type { V2FlowOption } from "@/data/v2CategoryFlows";
import { CheckCircle2, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

interface Props {
  options: V2FlowOption[];
  selected: string;
  onSelect: (id: string) => void;
  title: string;
}

const V2ServiceSelection = ({ options, selected, onSelect, title }: Props) => {
  // Group options by their group field
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
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>

      {grouped.map((group) => (
        <div key={group.name || "__ungrouped"} className="space-y-2">
          {hasGroups && group.name && (
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">
              {group.name}
            </h3>
          )}
          <div className="space-y-2">
            {group.items.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelect(opt.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm">{opt.label}</h3>
                        {opt.tag && (
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 py-0 px-1.5">
                            {opt.tag}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{opt.description}</p>
                      {(opt.priceLabel || opt.estimatedTime) && (
                        <div className="flex items-center gap-3 mt-2">
                          {opt.priceLabel && (
                            <span className="text-xs font-medium text-primary flex items-center gap-1">
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
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default V2ServiceSelection;
