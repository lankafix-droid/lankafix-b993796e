import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { streamAI, parseSuggestions, stripStructuredBlocks } from "@/lib/aiStream";
import { track } from "@/lib/analytics";

interface Suggestion {
  id: string;
  title: string;
  reason: string;
  price: string;
  type: "addon" | "upgrade" | "care_plan";
}

interface Props {
  categoryCode: string;
  serviceType?: string;
  deviceAge?: string;
  onAddSuggestion?: (suggestion: Suggestion) => void;
}

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  addon: { label: "Add-on", className: "bg-primary/10 text-primary border-primary/20" },
  upgrade: { label: "Upgrade", className: "bg-warning/10 text-warning border-warning/20" },
  care_plan: { label: "Care Plan", className: "bg-success/10 text-success border-success/20" },
};

export default function AISmartUpsell({ categoryCode, serviceType, deviceAge, onAddSuggestion }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const loadSuggestions = () => {
    if (hasLoaded || isLoading) return;
    setIsLoading(true);

    const prompt = `Service category: ${categoryCode}, Service type: ${serviceType || "general"}.
${deviceAge ? `Device age: ${deviceAge}` : ""}
Location: Sri Lanka. Suggest relevant add-ons, upgrades, or care plans.`;

    let text = "";
    streamAI({
      messages: [{ role: "user", content: prompt }],
      mode: "upsell",
      onDelta: (chunk) => { text += chunk; },
      onDone: () => {
        const parsed = parseSuggestions(text);
        if (parsed) setSuggestions(parsed);
        setIsLoading(false);
        setHasLoaded(true);
        track("ai_upsell_loaded", { categoryCode, count: parsed?.length || 0 });
      },
      onError: () => { setIsLoading(false); setHasLoaded(true); },
    });
  };

  const handleAdd = (s: Suggestion) => {
    setAddedIds(prev => new Set(prev).add(s.id));
    onAddSuggestion?.(s);
    track("ai_upsell_accepted", { id: s.id, type: s.type, category: categoryCode });
  };

  if (!hasLoaded && !isLoading) {
    return (
      <button
        onClick={loadSuggestions}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-primary/20 bg-primary/3 hover:bg-primary/5 transition-smooth group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-spring">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Smart Suggestions</p>
          <p className="text-[11px] text-muted-foreground">AI-recommended add-ons for your service</p>
        </div>
        <ArrowRight className="w-4 h-4 text-primary ml-auto" />
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Finding smart recommendations...
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Recommended for You</span>
      </div>
      <AnimatePresence>
        {suggestions.map((s, i) => {
          const style = TYPE_STYLES[s.type] || TYPE_STYLES.addon;
          const isAdded = addedIds.has(s.id);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl border border-border/50 bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{s.title}</span>
                    <Badge variant="outline" className={`text-[9px] ${style.className}`}>
                      {style.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-foreground">{s.price}</span>
                <Button
                  size="sm"
                  variant={isAdded ? "outline" : "default"}
                  onClick={() => handleAdd(s)}
                  disabled={isAdded}
                  className="h-8 text-xs rounded-lg gap-1"
                >
                  {isAdded ? (
                    <><ShieldCheck className="w-3 h-3" /> Added</>
                  ) : (
                    <><Plus className="w-3 h-3" /> Add</>
                  )}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
