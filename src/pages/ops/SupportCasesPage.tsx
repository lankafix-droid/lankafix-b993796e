import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, Loader2, UserCheck, Filter } from "lucide-react";
import { getSupportCases, resolveSupportCase, type SupportCase } from "@/services/supportService";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  resolved: "bg-success/15 text-success border-success/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  normal: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SupportCasesPage() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    const data = await getSupportCases(statusFilter !== "all" ? { status: statusFilter } : undefined);
    setCases(data);
    setLoading(false);
  };

  useEffect(() => { fetchCases(); }, [statusFilter]);

  const handleResolve = async (id: string) => {
    setResolving(id);
    const result = await resolveSupportCase(id);
    setResolving(null);
    if (result.success) {
      toast.success("Case resolved");
      fetchCases();
    } else {
      toast.error("Failed to resolve case");
    }
  };

  const openCount = cases.filter((c) => c.status === "open").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/ops/control-tower" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-smooth">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-heading font-bold text-foreground">Support Cases</h1>
            <p className="text-xs text-muted-foreground">{cases.length} total · {openCount} open</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && cases.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-10 h-10 mx-auto text-success/40 mb-3" />
            <p className="text-sm text-muted-foreground">No support cases found.</p>
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="space-y-3">
            {cases.map((c) => (
              <Card key={c.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge variant="outline" className={STATUS_BADGE[c.status] || ""}>
                          {c.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_BADGE[c.priority] || ""}`}>
                          {c.priority}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{c.issue_type.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{c.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(c.created_at)}
                        </span>
                        {c.booking_id && (
                          <Link to={`/tracker/${c.booking_id}`} className="text-primary hover:underline">
                            Booking {c.booking_id.slice(0, 8)}…
                          </Link>
                        )}
                        <span>User {c.user_id.slice(0, 8)}…</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {c.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => handleResolve(c.id)}
                          disabled={resolving === c.id}
                        >
                          {resolving === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                          Resolve
                        </Button>
                      )}
                      {c.status === "resolved" && (
                        <span className="text-[10px] text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
