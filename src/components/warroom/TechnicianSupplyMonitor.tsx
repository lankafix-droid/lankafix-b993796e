import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface PartnerSupply {
  available: number;
  busy: number;
  offline: number;
  in_dispatch: number;
}

interface TechnicianSupplyMonitorProps {
  supply: PartnerSupply;
  lockedPartners: { partner_id: string; name: string; current_jobs: number; max_jobs: number; active_job_id: string | null }[];
}

export default function TechnicianSupplyMonitor({ supply, lockedPartners }: TechnicianSupplyMonitorProps) {
  return (
    <Card>
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users size={14} /> Technician Supply
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-emerald-500/10 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{supply.available}</p>
            <p className="text-[10px] text-muted-foreground">Available</p>
          </div>
          <div className="bg-amber-500/10 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-amber-600">{supply.busy}</p>
            <p className="text-[10px] text-muted-foreground">Busy</p>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-muted-foreground">{supply.offline}</p>
            <p className="text-[10px] text-muted-foreground">Offline</p>
          </div>
          <div className="bg-primary/10 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-primary">{supply.in_dispatch}</p>
            <p className="text-[10px] text-muted-foreground">In Dispatch</p>
          </div>
        </div>

        {lockedPartners.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Locked Partners</p>
            <div className="space-y-1">
              {lockedPartners.slice(0, 8).map(p => (
                <div key={p.partner_id} className="flex items-center justify-between text-[11px]">
                  <span className="truncate">{p.name}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {p.current_jobs}/{p.max_jobs} jobs
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
