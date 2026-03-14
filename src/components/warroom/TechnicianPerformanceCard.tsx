import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Clock, CheckCircle2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TechPerf {
  full_name: string;
  rating_average: number | null;
  completed_jobs_count: number | null;
  acceptance_rate: number | null;
  average_response_time_minutes: number | null;
  vehicle_type: string | null;
  availability_status: string;
  current_job_count: number | null;
}

interface TechnicianPerformanceCardProps {
  partnerId: string | null;
}

export default function TechnicianPerformanceCard({ partnerId }: TechnicianPerformanceCardProps) {
  const [tech, setTech] = useState<TechPerf | null>(null);

  useEffect(() => {
    if (!partnerId) { setTech(null); return; }
    supabase.from("partners")
      .select("full_name, rating_average, completed_jobs_count, acceptance_rate, average_response_time_minutes, vehicle_type, availability_status, current_job_count")
      .eq("id", partnerId)
      .single()
      .then(({ data }) => setTech(data as TechPerf | null));
  }, [partnerId]);

  if (!tech) return null;

  return (
    <Card>
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm">{tech.full_name}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Star size={12} className="text-amber-500" />
            <span>{tech.rating_average?.toFixed(1) || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span>{tech.completed_jobs_count || 0} jobs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-primary" />
            <span>Accept: {tech.acceptance_rate || 0}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-muted-foreground" />
            <span>Resp: {tech.average_response_time_minutes || 0}m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck size={12} />
            <span className="capitalize">{tech.vehicle_type || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${tech.availability_status === "online" ? "bg-emerald-500" : tech.availability_status === "busy" ? "bg-amber-500" : "bg-muted-foreground"}`} />
            <span className="capitalize">{tech.availability_status}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
