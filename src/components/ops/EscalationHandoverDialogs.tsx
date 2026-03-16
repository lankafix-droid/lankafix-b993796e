/**
 * Escalation & Handover dialogs for operator actions.
 * Advisory-only — no marketplace mutation.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OperatorAction, OperatorActionPriority } from "@/services/operatorActionsService";
import { PRIORITY_COLORS } from "@/services/operatorActionsService";
import { bumpPriority } from "@/utils/operatorAgingUtils";

const ESCALATION_TARGETS = [
  "Escalated to Ops Lead",
  "Escalated to Reliability Review",
  "Escalated to Management",
  "Escalated to Partner Ops",
];

export function EscalationDialog({ action, onClose, onEscalate }: {
  action: OperatorAction | null;
  onClose: () => void;
  onEscalate: (id: string, updates: {
    priority: OperatorActionPriority;
    note: string;
    status?: string;
    metadata?: any;
  }) => void;
}) {
  const [note, setNote] = useState("");
  const [target, setTarget] = useState("");
  const [setInReview, setSetInReview] = useState(false);

  if (!action) return null;

  const newPriority = bumpPriority(action.priority) as OperatorActionPriority;

  const handleEscalate = () => {
    const ts = new Date().toLocaleString("en-LK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const escalationNote = target ? `${target}${note ? `: ${note}` : ""}` : note || "Escalated";
    const appended = action.note
      ? `${action.note}\n[${ts}] ⚡ ${escalationNote}`
      : `[${ts}] ⚡ ${escalationNote}`;

    onEscalate(action.id, {
      priority: newPriority,
      note: appended,
      ...(setInReview ? { status: "in_review" } : {}),
      metadata: {
        ...(action.metadata || {}),
        escalated_to: target || undefined,
        escalated_at: new Date().toISOString(),
      },
    });
    setNote("");
    setTarget("");
    setSetInReview(false);
    onClose();
  };

  return (
    <Dialog open={!!action} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Escalate Action</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{action.action_title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Priority:</span>
            <Badge className={`text-[8px] px-1.5 py-0 ${PRIORITY_COLORS[action.priority]}`}>{action.priority}</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge className={`text-[8px] px-1.5 py-0 ${PRIORITY_COLORS[newPriority]}`}>{newPriority}</Badge>
          </div>
          <div className="flex flex-wrap gap-1">
            {ESCALATION_TARGETS.map(t => (
              <Button
                key={t}
                variant={target === t ? "default" : "outline"}
                size="sm"
                className="text-[9px] h-5 px-2"
                onClick={() => setTarget(target === t ? "" : t)}
              >{t.replace("Escalated to ", "")}</Button>
            ))}
          </div>
          <Textarea
            placeholder="Escalation note (optional)…"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="text-xs min-h-[50px]"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={setInReview}
              onChange={e => setSetInReview(e.target.checked)}
              className="rounded border-input"
            />
            Set status to In Review
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleEscalate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HandoverDialog({ action, onClose, onHandover }: {
  action: OperatorAction | null;
  onClose: () => void;
  onHandover: (id: string, updates: {
    owner_name: string;
    note: string;
    metadata?: any;
  }) => void;
}) {
  const [toName, setToName] = useState("");
  const [handoverNote, setHandoverNote] = useState("");

  if (!action) return null;

  const handleHandover = () => {
    if (!toName.trim()) return;
    const ts = new Date().toLocaleString("en-LK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const entry = `Handed over to ${toName}${handoverNote ? ` — ${handoverNote}` : ""}`;
    const appended = action.note
      ? `${action.note}\n[${ts}] 🔄 ${entry}`
      : `[${ts}] 🔄 ${entry}`;

    onHandover(action.id, {
      owner_name: toName,
      note: appended,
      metadata: {
        ...(action.metadata || {}),
        handover_to: toName,
        handover_at: new Date().toISOString(),
        handover_note: handoverNote || undefined,
      },
    });
    setToName("");
    setHandoverNote("");
    onClose();
  };

  return (
    <Dialog open={!!action} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Handover Action</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{action.action_title}</span>
            {action.owner_name && (
              <span className="ml-2">Current owner: <span className="text-primary">{action.owner_name}</span></span>
            )}
          </div>
          <Input
            placeholder="Handover to (operator name) *"
            value={toName}
            onChange={e => setToName(e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder="Handover note (optional)…"
            value={handoverNote}
            onChange={e => setHandoverNote(e.target.value)}
            className="text-xs min-h-[50px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleHandover} disabled={!toName.trim()}>
            Handover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Decision quality tags for display */
export const DECISION_TAGS: Record<string, string> = {
  accepted_risk: "Risk Accepted",
  deferred: "Deferred",
  snapshot_pending: "Snapshot Pending",
  needs_management_review: "Needs Mgmt Review",
  ready_for_rollout_review: "Ready for Rollout",
};

export const DECISION_TAG_COLORS: Record<string, string> = {
  accepted_risk: "bg-warning/10 text-warning",
  deferred: "bg-muted text-muted-foreground",
  snapshot_pending: "bg-accent/20 text-accent-foreground",
  needs_management_review: "bg-destructive/10 text-destructive",
  ready_for_rollout_review: "bg-success/10 text-success",
};
