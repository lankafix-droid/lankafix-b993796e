import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle, Phone, TrendingUp, UserX } from "lucide-react";
import type { DemandRequest } from "@/pages/ops/DemandDashboardPage";

export default function DemandStatsStrip({ requests }: { requests: DemandRequest[] }) {
  const now = Date.now();
  const pending = requests.filter((r) => r.status === "pending").length;
  const unassigned = requests.filter((r) => !r.assigned_to && r.status === "pending").length;
  const overdue = requests.filter((r) => r.follow_up_due_at && new Date(r.follow_up_due_at).getTime() < now && r.status === "pending").length;
  const contacted = requests.filter((r) => r.status === "contacted").length;
  const converted = requests.filter((r) => r.status === "converted").length;

  const stats = [
    { label: "Pending", value: pending, icon: Clock, color: "bg-warning/10 text-warning" },
    { label: "Unassigned", value: unassigned, icon: UserX, color: "bg-destructive/10 text-destructive" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
    { label: "Contacted", value: contacted, icon: Phone, color: "bg-primary/10 text-primary" },
    { label: "Converted", value: converted, icon: TrendingUp, color: "bg-success/10 text-success" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color.split(" ")[0]}`}>
              <s.icon className={`w-4 h-4 ${s.color.split(" ")[1]}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
