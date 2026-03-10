import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, ChevronDown, ChevronUp, ShieldCheck, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { streamAI, stripStructuredBlocks } from "@/lib/aiStream";
import type { CategoryCode } from "@/types/booking";

interface Props {
  categoryCode: CategoryCode;
  serviceType?: string;
  estimatedPrice?: number;
  isEmergency?: boolean;
}

export default function AIPricingExplanation({ categoryCode, serviceType, estimatedPrice, isEmergency }: Props) {
  const [explanation, setExplanation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadExplanation = () => {
    if (hasLoaded || isLoading) return;
    setIsLoading(true);
    setExpanded(true);

    const prompt = `Explain the pricing for a ${categoryCode} ${serviceType || "service"} in Sri Lanka.
${estimatedPrice ? `Estimated price: LKR ${estimatedPrice.toLocaleString()}` : ""}
${isEmergency ? "This is an emergency booking with surcharge." : ""}
Keep it under 100 words. Be specific about what's included and what might vary.`;

    let text = "";
    streamAI({
      messages: [{ role: "user", content: prompt }],
      mode: "pricing",
      onDelta: (chunk) => {
        text += chunk;
        setExplanation(stripStructuredBlocks(text));
      },
      onDone: () => { setIsLoading(false); setHasLoaded(true); },
      onError: () => {
        setExplanation("Pricing details are based on Sri Lankan market rates. Final price confirmed after technician inspection.");
        setIsLoading(false);
        setHasLoaded(true);
      },
    });
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <button
        onClick={() => {
          if (!hasLoaded) loadExplanation();
          else setExpanded(!expanded);
        }}
        className="w-full flex items-center justify-between p-4 text-left transition-smooth hover:bg-secondary/30"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">AI Price Breakdown</span>
            <p className="text-[10px] text-muted-foreground">Understand what you're paying for</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
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
            <div className="px-4 pb-4 space-y-3">
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {explanation || (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Analyzing pricing...
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                <ShieldCheck className="w-3 h-3 text-success" />
                No work starts without your approval · Fair pricing guaranteed
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
