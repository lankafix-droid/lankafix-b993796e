import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, AlertTriangle, Copy } from "lucide-react";
import { SUPPORT_WHATSAPP, SUPPORT_PHONE, whatsappLink } from "@/config/contact";
import MascotIcon from "@/components/brand/MascotIcon";
import { toast } from "sonner";

interface SosModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  technicianName?: string;
}

const SosModal = ({ open, onClose, jobId, technicianName }: SosModalProps) => {
  if (!open) return null;

  const copyJobDetails = () => {
    navigator.clipboard.writeText(`LankaFix SOS\nJob: ${jobId}\nTechnician: ${technicianName || "N/A"}\nTime: ${new Date().toLocaleString()}`);
    toast.success("Job details copied");
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
            Need urgent help? Contact our support team immediately.
          </p>

          <div className="w-full space-y-2 mb-4">
            <Button variant="hero" className="w-full" asChild>
              <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}>
                <Phone className="w-4 h-4 mr-2" />
                Call Hotline: {SUPPORT_PHONE}
              </a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href={whatsappLink(SUPPORT_WHATSAPP, `SOS - Job ${jobId} - Need immediate help`)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp Support
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={copyJobDetails}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Job Details
            </Button>
          </div>

          <div className="bg-muted rounded-lg p-3 w-full text-left text-xs text-muted-foreground mb-4">
            <p className="font-medium text-foreground mb-1">Job: {jobId}</p>
            {technicianName && <p>Technician: {technicianName}</p>}
            <p>Time: {new Date().toLocaleString()}</p>
          </div>

          <Button variant="ghost" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default SosModal;
