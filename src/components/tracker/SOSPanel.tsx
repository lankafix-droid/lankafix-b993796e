import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { SOS_REASONS, type SosReason } from "@/types/booking";
import { SOS_SEVERITY_CONFIG, type SosSeverity } from "@/brand/trustSystem";
import { useBookingStore } from "@/store/bookingStore";
import { toast } from "sonner";

interface SOSPanelProps {
  jobId: string;
  technicianName?: string;
  isActive?: boolean;
  onClose?: () => void;
}

const SOSPanel = ({ jobId, technicianName, isActive = false, onClose }: SOSPanelProps) => {
  const [reason, setReason] = useState<SosReason | null>(null);
  const [severity, setSeverity] = useState<SosSeverity>("medium");
  const [submitted, setSubmitted] = useState(false);
  const { addTimelineEvent } = useBookingStore();

  const handleRaise = () => {
    if (!reason) return;
    addTimelineEvent(jobId, {
      timestamp: new Date().toISOString(),
      title: "SOS Triggered",
      description: `Reason: ${SOS_REASONS.find((r) => r.value === reason)?.label} — Severity: ${SOS_SEVERITY_CONFIG[severity].label}`,
      actor: "customer",
    });
    setSubmitted(true);
    toast.success("SOS raised — our team will respond shortly");
  };

  const handleResolve = () => {
    addTimelineEvent(jobId, {
      timestamp: new Date().toISOString(),
      title: "SOS Resolved",
      description: "Issue resolved by customer",
      actor: "customer",
    });
    toast.success("SOS resolved");
    onClose?.();
  };

  if (submitted || isActive) {
    return (
      <div className="bg-warning/5 border border-warning/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">SOS Active</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Our team has been notified. You can resolve this when the issue is addressed.
        </p>
        <Button variant="outline" size="sm" onClick={handleResolve} className="w-full">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Resolve SOS
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <h3 className="text-sm font-semibold text-foreground">Raise SOS</h3>
      </div>

      {/* Severity */}
      <div className="flex gap-2 mb-3">
        {(Object.keys(SOS_SEVERITY_CONFIG) as SosSeverity[]).map((s) => (
          <button
            key={s}
            onClick={() => setSeverity(s)}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-medium ${
              severity === s
                ? SOS_SEVERITY_CONFIG[s].color + " border-current"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            {SOS_SEVERITY_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Reasons */}
      <div className="space-y-1.5 mb-4">
        {SOS_REASONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setReason(r.value)}
            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
              reason === r.value
                ? "bg-warning/10 border-warning/30 font-medium text-foreground"
                : "bg-card text-foreground hover:border-warning/20"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        disabled={!reason}
        onClick={handleRaise}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Raise SOS
      </Button>
    </div>
  );
};

export default SOSPanel;
