import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { catLabel, zoneLabel } from "@/lib/opsLabels";

interface EmergencyBooking {
  id: string;
  category_code: string;
  zone_code: string | null;
  dispatch_status: string | null;
  dispatch_round: number | null;
  created_at: string;
}

interface EmergencyQueuePanelProps {
  bookings: EmergencyBooking[];
  onSelect: (id: string) => void;
}

export default function EmergencyQueuePanel({ bookings, onSelect }: EmergencyQueuePanelProps) {
  if (bookings.length === 0) return null;

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertTriangle size={16} />
          🚨 Emergency Queue ({bookings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 flex flex-wrap gap-2">
        {bookings.map(b => {
          const ageMin = Math.round((Date.now() - new Date(b.created_at).getTime()) / 60000);
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-1.5 text-xs hover:bg-destructive/20 transition-colors"
            >
              <span className="font-semibold text-destructive">{catLabel(b.category_code)}</span>
              <span className="text-muted-foreground">{zoneLabel(b.zone_code)}</span>
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                R{b.dispatch_round || 1} · {ageMin}m
              </Badge>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
