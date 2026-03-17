/**
 * CustomerCommunicationTimeline — Premium communication milestone feed.
 * Advisory display only — does not modify booking state.
 */
import { CheckCircle2, Circle, Clock, Headphones, UserCheck, FileText, Wrench, AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface CommunicationMilestone {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  status: "completed" | "current" | "pending";
  actor: "You" | "Technician" | "LankaFix Team" | "Senior Operator";
}

interface Props {
  milestones: CommunicationMilestone[];
}

const ACTOR_COLORS: Record<string, string> = {
  "You": "bg-primary/10 text-primary",
  "Technician": "bg-accent/10 text-accent",
  "LankaFix Team": "bg-green-500/10 text-green-700",
  "Senior Operator": "bg-amber-500/10 text-amber-700",
};

const CustomerCommunicationTimeline = ({ milestones }: Props) => {
  if (!milestones.length) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)] space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Communication Updates</h3>
      </div>

      <div className="space-y-0">
        {milestones.map((m, i) => (
          <div key={m.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                m.status === "completed" ? "bg-green-500" :
                m.status === "current" ? "bg-primary" : "bg-muted"
              }`}>
                {m.status === "completed" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : m.status === "current" ? (
                  <Circle className="w-2.5 h-2.5 text-primary-foreground fill-primary-foreground" />
                ) : (
                  <Circle className="w-2.5 h-2.5 text-muted-foreground" />
                )}
              </div>
              {i < milestones.length - 1 && (
                <div className={`w-0.5 h-8 ${m.status === "completed" ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>

            <div className={`pb-4 flex-1 ${m.status === "pending" ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-xs font-semibold ${
                  m.status === "current" ? "text-primary" : "text-foreground"
                }`}>
                  {m.title}
                </p>
                <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 ${ACTOR_COLORS[m.actor] || ""}`}>
                  {m.actor}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{m.description}</p>
              {m.timestamp && (
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                  {new Date(m.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerCommunicationTimeline;
