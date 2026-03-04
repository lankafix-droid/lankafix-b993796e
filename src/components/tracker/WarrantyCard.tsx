import { Shield, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import MascotIcon from "@/components/brand/MascotIcon";
import type { BookingState } from "@/types/booking";

interface WarrantyCardProps {
  booking: BookingState;
}

const WarrantyCard = ({ booking }: WarrantyCardProps) => {
  const completedAt = booking.completionOtpVerifiedAt || booking.createdAt;
  const completionDate = new Date(completedAt);

  // Use quote warranty days if available, fallback to 30
  const selectedOption = booking.quote?.options?.find(
    (o) => o.id === (booking.quote?.selectedOptionId || booking.quote?.recommendedOptionId)
  );
  const laborDays = selectedOption?.warranty?.laborDays ?? 30;

  const warrantyEnd = new Date(completionDate.getTime() + laborDays * 24 * 60 * 60 * 1000);
  const isActive = warrantyEnd.getTime() > Date.now();
  const daysLeft = Math.max(0, Math.ceil((warrantyEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className={`rounded-xl border p-5 animate-fade-in ${isActive ? "bg-success/5 border-success/20" : "bg-muted border-border"}`}>
      <div className="flex items-center gap-3 mb-3">
        <MascotIcon state="completed" badge="warranty" size="sm" />
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-success" />
            {isActive ? "Warranty Active" : "Warranty Expired"}
          </h3>
          <p className="text-xs text-muted-foreground">{booking.jobId}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Valid Until:</span>
        </div>
        <span className="font-medium text-foreground">{warrantyEnd.toLocaleDateString()}</span>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Days Left:</span>
        </div>
        <span className={`font-medium ${isActive ? "text-success" : "text-destructive"}`}>{daysLeft} days</span>
      </div>
      {/* API contract: POST /api/warranty/claim { jobId, reason, description } */}
      <Button variant="outline" size="sm" className="w-full" disabled={!isActive}>
        <FileText className="w-4 h-4 mr-2" />
        {isActive ? "File Warranty Claim" : "Warranty Expired"}
      </Button>
    </div>
  );
};

export default WarrantyCard;
