import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, RefreshCw, Loader2, AlertTriangle, CheckCircle2, XCircle,
  Clock, Eye, Filter, BarChart3,
} from "lucide-react";
import { CATEGORY_LABELS, type CategoryCode } from "@/types/booking";

const catLabel = (c: string) => CATEGORY_LABELS[c as CategoryCode] || c;

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  in_progress: "bg-accent/50 text-accent-foreground",
  completed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-destructive/10 text-destructive",
};

const DISPATCH_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  dispatching: "bg-warning/20 text-warning-foreground",
  accepted: "bg-emerald-500/10 text-emerald-600",
  no_provider_found: "bg-destructive/10 text-destructive",
};

type FilterKey = "all" | "sla_breached" | "dispatch_pending" | "completed" | "cancelled";

export default function PilotBookingMonitorPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [partners, setPartners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [catFilter, setCatFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ data: bData }, { data: pData }] = await Promise.all([
      supabase.from("bookings").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(200),
      supabase.from("partners").select("id, full_name"),
    ]);
    setBookings(bData || []);
    const pMap: Record<string, string> = {};
    (pData || []).forEach(p => { pMap[p.id] = p.full_name; });
    setPartners(pMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = bookings;
    if (catFilter !== "all") list = list.filter(b => b.category_code === catFilter);
    if (filter === "sla_breached") list = list.filter(b => b.sla_breached);
    else if (filter === "dispatch_pending") list = list.filter(b => b.dispatch_status === "pending" || b.dispatch_status === "dispatching");
    else if (filter === "completed") list = list.filter(b => b.status === "completed");
    else if (filter === "cancelled") list = list.filter(b => b.status === "cancelled");
    return list;
  }, [bookings, filter, catFilter]);

  const stats = useMemo(() => ({
    total: bookings.length,
    completed: bookings.filter(b => b.status === "completed").length,
    slaBreach: bookings.filter(b => b.sla_breached).length,
    dispatchPending: bookings.filter(b => b.dispatch_status === "pending" || b.dispatch_status === "dispatching").length,
  }), [bookings]);

  const categories = useMemo(() => [...new Set(bookings.map(b => b.category_code))], [bookings]);

  const getSlaBadge = (b: any) => {
    if (b.sla_breached) return <Badge variant="destructive" className="text-[9px]">BREACHED</Badge>;
    if (b.status === "completed") return <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">OK</Badge>;
    const mins = Math.round((Date.now() - new Date(b.created_at).getTime()) / 60000);
    return <span className="text-[10px] text-muted-foreground">{mins}m</span>;
  };

  const getQuoteStatus = (b: any) => {
    if (b.status === "completed") return "paid";
    if (b.status === "confirmed") return "pending";
    return "—";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/ops/control-tower")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Live Booking Monitor
            </h1>
            <p className="text-[11px] text-muted-foreground">Last 24 hours · {stats.total} bookings</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-3 text-center cursor-pointer" onClick={() => setFilter("all")}>
            <p className="text-lg font-bold text-foreground">{stats.total}</p>
            <p className="text-[9px] text-muted-foreground">Total</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer" onClick={() => setFilter("completed")}>
            <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
            <p className="text-[9px] text-muted-foreground">Done</p>
          </Card>
          <Card className={`p-3 text-center cursor-pointer ${stats.slaBreach > 0 ? "border-destructive/30" : ""}`} onClick={() => setFilter("sla_breached")}>
            <p className={`text-lg font-bold ${stats.slaBreach > 0 ? "text-destructive" : "text-foreground"}`}>{stats.slaBreach}</p>
            <p className="text-[9px] text-muted-foreground">SLA ⚠</p>
          </Card>
          <Card className={`p-3 text-center cursor-pointer ${stats.dispatchPending > 0 ? "border-warning/30" : ""}`} onClick={() => setFilter("dispatch_pending")}>
            <p className="text-lg font-bold text-foreground">{stats.dispatchPending}</p>
            <p className="text-[9px] text-muted-foreground">Pending</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant={catFilter === "all" ? "default" : "outline"} className="text-[10px] cursor-pointer" onClick={() => setCatFilter("all")}>All</Badge>
          {categories.map(c => (
            <Badge key={c} variant={catFilter === c ? "default" : "outline"} className="text-[10px] cursor-pointer" onClick={() => setCatFilter(c)}>
              {catLabel(c)}
            </Badge>
          ))}
        </div>

        {/* Booking Table */}
        <Card>
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] w-20">ID</TableHead>
                  <TableHead className="text-[10px]">Cat</TableHead>
                  <TableHead className="text-[10px]">Zone</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                  <TableHead className="text-[10px]">Dispatch</TableHead>
                  <TableHead className="text-[10px]">Tech</TableHead>
                  <TableHead className="text-[10px]">SLA</TableHead>
                  <TableHead className="text-[10px]">Pay</TableHead>
                  <TableHead className="text-[10px]">⭐</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">No bookings match filters</TableCell></TableRow>
                )}
                {filtered.map(b => (
                  <TableRow
                    key={b.id}
                    className={`cursor-pointer hover:bg-accent/30 ${b.sla_breached ? "bg-destructive/5" : b.dispatch_status === "pending" ? "bg-warning/5" : ""}`}
                    onClick={() => navigate(`/track/${b.id}`)}
                  >
                    <TableCell className="text-[10px] font-mono">{b.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-[10px]">{catLabel(b.category_code)}</TableCell>
                    <TableCell className="text-[10px]">{b.zone_code || "—"}</TableCell>
                    <TableCell><Badge className={`text-[9px] ${STATUS_COLORS[b.status] || ""}`}>{b.status}</Badge></TableCell>
                    <TableCell><Badge className={`text-[9px] ${DISPATCH_COLORS[b.dispatch_status] || ""}`}>{b.dispatch_status}</Badge></TableCell>
                    <TableCell className="text-[10px] max-w-[60px] truncate">{b.partner_id ? (partners[b.partner_id] || b.partner_id.slice(0, 6)) : "—"}</TableCell>
                    <TableCell>{getSlaBadge(b)}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[9px] ${b.payment_status === "paid" ? "text-emerald-600" : b.payment_status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{b.payment_status || "—"}</Badge></TableCell>
                    <TableCell className="text-[10px]">{b.customer_rating || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
