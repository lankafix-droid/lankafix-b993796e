import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, CheckCircle2, UserPlus, Clock, MapPin, User, StickyNote } from "lucide-react";
import { whatsappLink } from "@/config/contact";
import type { DemandRequest } from "@/pages/ops/DemandDashboardPage";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-accent/50 text-accent-foreground border-accent/20",
  contacted: "bg-primary/10 text-primary border-primary/20",
  converted: "bg-success/10 text-success border-success/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const OUTCOME_OPTIONS = ["converted", "not_interested", "no_answer", "duplicate", "invalid"] as const;

type Props = {
  req: DemandRequest;
  catNameMap: Record<string, string>;
  onUpdate: (id: string, updates: Partial<DemandRequest>) => Promise<void>;
  onLogContact: (id: string, type: "call" | "whatsapp") => Promise<void>;
};

export default function DemandRequestCard({ req, catNameMap, onUpdate, onLogContact }: Props) {
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(req.notes || "");
  const [showOutcome, setShowOutcome] = useState(false);

  const now = Date.now();
  const ageMs = now - new Date(req.created_at).getTime();
  const ageMins = Math.floor(ageMs / 60000);
  const ageLabel = ageMins < 60 ? `${ageMins}m ago` : ageMins < 1440 ? `${Math.floor(ageMins / 60)}h ago` : `${Math.floor(ageMins / 1440)}d ago`;

  const isOverdue = req.follow_up_due_at && new Date(req.follow_up_due_at).getTime() < now && req.status === "pending";
  const isDueSoon = req.follow_up_due_at && !isOverdue && new Date(req.follow_up_due_at).getTime() < now + 15 * 60000 && req.status === "pending";
  const isUnassigned = !req.assigned_to && req.status === "pending";

  const borderColor = isOverdue
    ? "border-destructive/50 bg-destructive/5"
    : isDueSoon
    ? "border-warning/50 bg-warning/5"
    : isUnassigned
    ? "border-destructive/30"
    : "";

  const handleAssign = () => {
    onUpdate(req.id, { assigned_to: "ops", assigned_at: new Date().toISOString(), status: "assigned" } as any);
  };

  const handleContact = (type: "call" | "whatsapp") => {
    onLogContact(req.id, type);
    if (req.status === "pending" || req.status === "assigned") {
      onUpdate(req.id, { status: "contacted", contacted_at: new Date().toISOString() } as any);
    }
  };

  const handleSaveNotes = () => {
    onUpdate(req.id, { notes: noteText } as any);
    setShowNotes(false);
  };

  return (
    <Card className={borderColor}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate">{req.name}</span>
              <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[req.status] || ""}`}>{req.status}</Badge>
              {req.priority === "high" && (
                <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive">urgent</Badge>
              )}
              {isOverdue && <Badge variant="outline" className="text-[9px] bg-destructive text-destructive-foreground">OVERDUE</Badge>}
              {isDueSoon && <Badge variant="outline" className="text-[9px] bg-warning text-warning-foreground">DUE SOON</Badge>}
              {isUnassigned && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30">UNASSIGNED</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>{catNameMap[req.category_code] || req.category_code}</span>
              <span>•</span>
              <span>{req.request_type}</span>
              <span>•</span>
              <span>{ageLabel}</span>
              {req.assigned_to && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.assigned_to}</span>
                </>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 font-mono">{req.phone}</span>
        </div>

        {req.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3" /> {req.location}
          </div>
        )}
        {req.description && <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{req.description}</p>}
        {req.preferred_time && (
          <Badge variant="outline" className="text-[9px] mb-2">
            <Clock className="w-3 h-3 mr-1" /> {req.preferred_time}
          </Badge>
        )}
        {req.outcome && (
          <Badge variant="outline" className="text-[9px] mb-2 ml-1">
            Outcome: {req.outcome}
          </Badge>
        )}

        {/* Notes */}
        {req.notes && !showNotes && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mb-2 italic">📝 {req.notes}</p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-2">
          {!req.assigned_to && req.status === "pending" && (
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleAssign}>
              <User className="w-3 h-3 mr-1" /> Assign to Me
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild
            onClick={() => handleContact("call")}>
            <a href={`tel:${req.phone}`}>
              <Phone className="w-3 h-3 mr-1" /> Call
            </a>
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild
            onClick={() => handleContact("whatsapp")}>
            <a href={whatsappLink(req.phone.replace(/[^0-9]/g, ""), `Hi ${req.name}, this is LankaFix regarding your ${catNameMap[req.category_code] || ""} request.`)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
            </a>
          </Button>
          {(req.status === "pending" || req.status === "assigned") && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdate(req.id, { status: "contacted", contacted_at: new Date().toISOString() } as any)}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Contacted
            </Button>
          )}
          {req.status !== "converted" && req.status !== "closed" && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-success" onClick={() => onUpdate(req.id, { status: "converted", outcome: "converted" } as any)}>
              <UserPlus className="w-3 h-3 mr-1" /> Converted
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNotes(!showNotes)}>
            <StickyNote className="w-3 h-3 mr-1" /> Notes
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowOutcome(!showOutcome)}>
            Outcome
          </Button>
        </div>

        {/* Notes input */}
        {showNotes && (
          <div className="mt-2 flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1 px-2 py-1 rounded border bg-card text-foreground text-xs"
              placeholder="Add operator notes..."
            />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSaveNotes}>Save</Button>
          </div>
        )}

        {/* Outcome selector */}
        {showOutcome && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {OUTCOME_OPTIONS.map((o) => (
              <Button key={o} size="sm" variant={req.outcome === o ? "default" : "outline"} className="h-6 text-[10px] px-2"
                onClick={() => {
                  onUpdate(req.id, { outcome: o, status: o === "converted" ? "converted" : "closed" } as any);
                  setShowOutcome(false);
                }}>
                {o.replace("_", " ")}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
