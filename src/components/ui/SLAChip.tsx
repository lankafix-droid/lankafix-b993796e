import { Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SLAChipProps {
  normalMinutes?: number;
  emergencyMinutes?: number;
  typicalDurationMinutes?: number;
  compact?: boolean;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const SLAChip = ({ normalMinutes, emergencyMinutes, typicalDurationMinutes, compact = false }: SLAChipProps) => {
  if (!normalMinutes && !emergencyMinutes && !typicalDurationMinutes) return null;

  if (compact) {
    return (
      <Badge variant="outline" className="text-[10px] border-primary/20 text-primary gap-0.5">
        <Clock className="w-2.5 h-2.5" />
        {normalMinutes ? formatMinutes(normalMinutes) : typicalDurationMinutes ? `~${formatMinutes(typicalDurationMinutes)}` : ""}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {normalMinutes && (
        <Badge variant="outline" className="text-[10px] border-primary/20 text-primary gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {formatMinutes(normalMinutes)} SLA
        </Badge>
      )}
      {emergencyMinutes && (
        <Badge variant="outline" className="text-[10px] border-warning/20 text-warning gap-0.5">
          <Zap className="w-2.5 h-2.5" />
          {formatMinutes(emergencyMinutes)} Emergency
        </Badge>
      )}
      {typicalDurationMinutes && (
        <Badge variant="outline" className="text-[10px] border-muted-foreground/20 text-muted-foreground gap-0.5">
          ~{formatMinutes(typicalDurationMinutes)}
        </Badge>
      )}
    </div>
  );
};

export default SLAChip;
