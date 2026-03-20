import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Loader2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCopilotNotes, useGenerateCopilotNote } from "@/hooks/useSPSIntelligence";

interface Props {
  entityType: "contract" | "asset" | "customer" | "billing_cycle";
  entityId: string;
  entityLabel?: string;
}

export default function AdminCopilotPanel({ entityType, entityId, entityLabel }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data: notes = [], isLoading } = useCopilotNotes(entityType, entityId);
  const generate = useGenerateCopilotNote();

  const latestNote = notes[0];

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1">
              Admin Copilot
              <Sparkles className="w-3 h-3 text-primary" />
            </p>
            <p className="text-[10px] text-muted-foreground">
              AI-assisted {entityType} insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {latestNote && <Badge variant="outline" className="text-[10px]">Latest</Badge>}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-3">
              {/* Generate button */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full"
                onClick={() => generate.mutate({ entityType, entityId })}
                disabled={generate.isPending}
              >
                {generate.isPending ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><RefreshCw className="w-3 h-3 mr-1" /> Generate New Insight</>
                )}
              </Button>

              {isLoading && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                  Loading notes...
                </div>
              )}

              {!isLoading && !latestNote && !generate.isPending && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No copilot notes yet. Click above to generate.
                </p>
              )}

              {/* Latest note */}
              {latestNote && (
                <div className="space-y-2.5">
                  {latestNote.summary && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
                      <p className="text-xs text-foreground leading-relaxed">{latestNote.summary}</p>
                    </div>
                  )}
                  {latestNote.watchouts && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-warning uppercase tracking-wider">Watch-outs</p>
                      <p className="text-xs text-foreground leading-relaxed">{latestNote.watchouts}</p>
                    </div>
                  )}
                  {latestNote.recommended_action && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Recommended Action</p>
                      <p className="text-xs text-foreground leading-relaxed">{latestNote.recommended_action}</p>
                    </div>
                  )}
                  {latestNote.why_it_matters && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Why It Matters</p>
                      <p className="text-xs text-foreground leading-relaxed">{latestNote.why_it_matters}</p>
                    </div>
                  )}
                  {latestNote.advisor_note_draft && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Draft Note</p>
                      <p className="text-xs text-foreground italic leading-relaxed">{latestNote.advisor_note_draft}</p>
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground text-right">
                    Generated {new Date(latestNote.generated_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Show generation result inline */}
              {generate.isSuccess && generate.data && !generate.data.fallback && (
                <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                  <p className="text-[10px] font-semibold text-success mb-1">New insight generated</p>
                  <p className="text-xs text-foreground">{generate.data.summary}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
