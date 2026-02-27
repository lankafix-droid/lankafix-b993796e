import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, AlertTriangle, Copy, ChevronRight } from "lucide-react";
import { SUPPORT_WHATSAPP, SUPPORT_PHONE, whatsappLink } from "@/config/contact";
import MascotIcon from "@/components/brand/MascotIcon";
import { toast } from "sonner";
import { SOS_REASONS, type SosReason } from "@/types/booking";
import { useState } from "react";

interface SosModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  technicianName?: string;
}

const SosModal = ({ open, onClose, jobId, technicianName }: SosModalProps) => {
  const [selectedReason, setSelectedReason] = useState<SosReason | null>(null);
  const [escalated, setEscalated] = useState(false);

  if (!open) return null;

  const snapshot = `LankaFix SOS\nJob: ${jobId}\nTechnician: ${technicianName || "N/A"}\nReason: ${selectedReason || "Not specified"}\nTime: ${new Date().toLocaleString()}`;

  const copyJobDetails = () => {
    navigator.clipboard.writeText(snapshot);
    toast.success("Job snapshot copied");
  };

  const handleEscalate = () => {
    // API contract: POST /api/sos/escalate { jobId, reason, snapshot }
    setEscalated(true);
    toast.success("Escalation submitted — our team will contact you shortly");
  };

  const handleClose = () => {
    setSelectedReason(null);
    setEscalated(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border shadow-2xl p-6 w-full max-w-sm mx-4 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <MascotIcon state="emergency" badge="emergency" size="lg" />
          <h2 className="text-lg font-bold text-foreground mt-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Emergency Support
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {escalated ? "Escalation submitted successfully." : "Select a reason and contact our support team."}
          </p>

          {/* Reason selector */}
          {!escalated && (
            <div className="w-full space-y-1.5 mb-4">
              {SOS_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelectedReason(r.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm flex items-center justify-between transition-all ${
                    selectedReason === r.value
                      ? "bg-warning/10 border-warning/30 text-foreground font-medium"
                      : "bg-card text-foreground hover:border-warning/20"
                  }`}
                >
                  {r.label}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          <div className="w-full space-y-2 mb-4">
            <Button variant="hero" className="w-full" asChild>
              <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}>
                <Phone className="w-4 h-4 mr-2" />
                Call Hotline: {SUPPORT_PHONE}
              </a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href={whatsappLink(SUPPORT_WHATSAPP, `SOS - Job ${jobId} - ${selectedReason || "Need immediate help"}`)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp Support
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={copyJobDetails}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Job Snapshot
            </Button>
            {!escalated && selectedReason && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleEscalate}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Confirm Escalation
              </Button>
            )}
          </div>

          <div className="bg-muted rounded-lg p-3 w-full text-left text-xs text-muted-foreground mb-4">
            <p className="font-medium text-foreground mb-1">Job: {jobId}</p>
            {technicianName && <p>Technician: {technicianName}</p>}
            {selectedReason && <p>Reason: {SOS_REASONS.find(r => r.value === selectedReason)?.label}</p>}
            <p>Time: {new Date().toLocaleString()}</p>
          </div>

          <Button variant="ghost" className="w-full" onClick={handleClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default SosModal;
