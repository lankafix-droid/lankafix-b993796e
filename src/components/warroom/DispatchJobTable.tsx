import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { catLabel, zoneLabel } from "@/lib/opsLabels";
import { AlertTriangle } from "lucide-react";

export interface DispatchJob {
  id: string;
  category_code: string;
  zone_code: string | null;
  dispatch_mode: string | null;
  dispatch_round: number | null;
  dispatch_status: string | null;
  status: string;
  is_emergency: boolean | null;
  created_at: string;
  partner_id: string | null;
  pending_offers: number;
  accepted_offers: number;
  total_offers: number;
  top_score: number | null;
}

const statusBadge = (ds: string | null) => {
  const map: Record<string, { label: string; cls: string }> = {
    dispatching: { label: "Dispatching", cls: "bg-primary/10 text-primary" },
    pending_acceptance: { label: "Awaiting Accept", cls: "bg-amber-500/10 text-amber-600" },
    accepted: { label: "Accepted", cls: "bg-emerald-500/10 text-emerald-600" },
    ops_confirmed: { label: "Ops Confirmed", cls: "bg-emerald-500/10 text-emerald-600" },
    team_assigned: { label: "Team Assigned", cls: "bg-emerald-500/10 text-emerald-600" },
    escalated: { label: "Escalated", cls: "bg-destructive/10 text-destructive" },
    no_provider_found: { label: "No Provider", cls: "bg-destructive/10 text-destructive" },
  };
  const entry = map[ds || ""] || { label: ds || "—", cls: "bg-muted text-muted-foreground" };
  return <Badge className={`${entry.cls} text-[10px]`}>{entry.label}</Badge>;
};

const rowColor = (ds: string | null) => {
  if (ds === "accepted" || ds === "ops_confirmed" || ds === "team_assigned") return "bg-emerald-500/[0.03]";
  if (ds === "pending_acceptance") return "bg-amber-500/[0.03]";
  if (ds === "escalated" || ds === "no_provider_found") return "bg-destructive/[0.05]";
  return "";
};

interface DispatchJobTableProps {
  jobs: DispatchJob[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function DispatchJobTable({ jobs, selectedId, onSelect }: DispatchJobTableProps) {
  return (
    <Card>
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm">Live Dispatch Pipeline ({jobs.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[480px]">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] uppercase">
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-center">Round</TableHead>
                <TableHead className="text-center">Offers</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8 text-sm">
                    No active dispatch jobs
                  </TableCell>
                </TableRow>
              )}
              {jobs.map(j => {
                const ageMin = Math.round((Date.now() - new Date(j.created_at).getTime()) / 60000);
                return (
                  <TableRow
                    key={j.id}
                    onClick={() => onSelect(j.id)}
                    className={`cursor-pointer text-xs hover:bg-accent/50 transition-colors ${rowColor(j.dispatch_status)} ${selectedId === j.id ? "ring-1 ring-primary/40" : ""}`}
                  >
                    <TableCell className="font-mono text-[10px]">
                      <div className="flex items-center gap-1">
                        {j.is_emergency && <AlertTriangle size={12} className="text-destructive shrink-0" />}
                        {j.id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{catLabel(j.category_code)}</TableCell>
                    <TableCell className="text-muted-foreground">{zoneLabel(j.zone_code)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] px-1">
                        {j.dispatch_mode || "seq"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{j.dispatch_round || 1}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-emerald-600">{j.accepted_offers}</span>
                      <span className="text-muted-foreground">/{j.pending_offers}</span>
                      <span className="text-muted-foreground text-[9px]">/{j.total_offers}</span>
                    </TableCell>
                    <TableCell className="text-center font-mono">{j.top_score?.toFixed(0) ?? "—"}</TableCell>
                    <TableCell>{statusBadge(j.dispatch_status)}</TableCell>
                    <TableCell className={`text-center ${ageMin > 5 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      {ageMin}m
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
