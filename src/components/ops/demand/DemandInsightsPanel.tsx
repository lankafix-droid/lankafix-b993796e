import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MapPin, Clock } from "lucide-react";
import type { DemandRequest } from "@/pages/ops/DemandDashboardPage";

type Props = {
  requests: DemandRequest[];
  catNameMap: Record<string, string>;
};

export default function DemandInsightsPanel({ requests, catNameMap }: Props) {
  // Top categories
  const catCounts: Record<string, number> = {};
  requests.forEach((r) => { catCounts[r.category_code] = (catCounts[r.category_code] || 0) + 1; });
  const topCategories = Object.entries(catCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  // Top locations
  const locCounts: Record<string, number> = {};
  requests.forEach((r) => {
    if (r.location) locCounts[r.location] = (locCounts[r.location] || 0) + 1;
  });
  const topLocations = Object.entries(locCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  // Avg response time (pending → contacted)
  const contactedReqs = requests.filter((r) => r.contacted_at && r.created_at);
  const avgResponseMin = contactedReqs.length > 0
    ? Math.round(contactedReqs.reduce((s, r) => s + (new Date(r.contacted_at!).getTime() - new Date(r.created_at).getTime()) / 60000, 0) / contactedReqs.length)
    : null;

  // Callback vs WhatsApp
  const callbacks = requests.filter((r) => r.request_type === "callback").length;
  const chats = requests.filter((r) => r.request_type === "chat" || r.request_type === "submit").length;

  // Missed opportunities (high priority, not converted)
  const missed = requests.filter((r) => r.priority === "high" && r.status === "closed" && r.outcome !== "converted").length;

  if (requests.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Top Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {topCategories.map(([code, count]) => (
            <Badge key={code} variant="outline" className="text-[10px]">
              {catNameMap[code] || code}: <strong className="ml-1">{count}</strong>
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Top Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {topLocations.length > 0 ? topLocations.map(([loc, count]) => (
            <Badge key={loc} variant="outline" className="text-[10px]">
              {loc}: <strong className="ml-1">{count}</strong>
            </Badge>
          )) : <span className="text-[10px] text-muted-foreground">No location data</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-[10px] text-muted-foreground">
          <div>Avg Response: <strong className="text-foreground">{avgResponseMin !== null ? `${avgResponseMin}m` : "N/A"}</strong></div>
          <div>Callbacks: <strong className="text-foreground">{callbacks}</strong> | Chats/Submits: <strong className="text-foreground">{chats}</strong></div>
          {missed > 0 && <div className="text-destructive">Missed Opportunities: <strong>{missed}</strong></div>}
        </CardContent>
      </Card>
    </div>
  );
}
