/**
 * /ops/demand-dashboard — Operator Demand Intelligence Dashboard
 * Live feed of demand requests with filters, actions, and analytics.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/categories";
import { whatsappLink, SUPPORT_WHATSAPP } from "@/config/contact";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageCircle, CheckCircle2, UserPlus, Clock, MapPin, Filter, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { toast } from "sonner";

type DemandRequest = {
  id: string;
  user_id: string | null;
  category_code: string;
  request_type: string;
  name: string;
  phone: string;
  location: string | null;
  description: string | null;
  preferred_time: string | null;
  budget_range: string | null;
  priority: string;
  priority_score: number;
  status: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  contacted: "bg-primary/10 text-primary border-primary/20",
  converted: "bg-success/10 text-success border-success/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

const catNameMap = Object.fromEntries(categories.map((c) => [c.code, c.name]));

const DemandDashboardPage = () => {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: requests = [], refetch, isLoading } = useQuery({
    queryKey: ["demand-requests", filterCategory, filterStatus],
    queryFn: async () => {
      let query = supabase.from("demand_requests" as any).select("*").order("created_at", { ascending: false }).limit(200);
      if (filterCategory !== "all") query = query.eq("category_code", filterCategory);
      if (filterStatus !== "all") query = query.eq("status", filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DemandRequest[];
    },
    refetchInterval: 30000,
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("demand_requests" as any).update({ status } as any).eq("id", id);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    toast.success(`Marked as ${status}`);
    refetch();
  };

  // Analytics
  const pending = requests.filter((r) => r.status === "pending").length;
  const contacted = requests.filter((r) => r.status === "contacted").length;
  const converted = requests.filter((r) => r.status === "converted").length;
  const highPriority = requests.filter((r) => r.priority === "high" && r.status === "pending").length;

  // Category demand counts
  const catCounts: Record<string, number> = {};
  requests.forEach((r) => { catCounts[r.category_code] = (catCounts[r.category_code] || 0) + 1; });
  const topCategories = Object.entries(catCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  const uniqueCategories = [...new Set(requests.map((r) => r.category_code))];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Demand Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">Live demand capture feed — every request is a conversion opportunity.</p>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{highPriority}</p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{contacted}</p>
                <p className="text-xs text-muted-foreground">Contacted</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{converted}</p>
                <p className="text-xs text-muted-foreground">Converted</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top demand categories */}
        {topCategories.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Most Requested Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {topCategories.map(([code, count]) => (
                <Badge key={code} variant="outline" className="text-xs">
                  {catNameMap[code] || code}: <strong className="ml-1">{count}</strong>
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2 py-1 rounded border bg-card text-foreground text-xs">
            <option value="all">All Categories</option>
            {uniqueCategories.map((c) => <option key={c} value={c}>{catNameMap[c] || c}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-1 rounded border bg-card text-foreground text-xs">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Request cards */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No demand requests yet.</div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const ageMs = Date.now() - new Date(req.created_at).getTime();
              const ageMins = Math.floor(ageMs / 60000);
              const ageLabel = ageMins < 60 ? `${ageMins}m ago` : ageMins < 1440 ? `${Math.floor(ageMins / 60)}h ago` : `${Math.floor(ageMins / 1440)}d ago`;
              const isUrgent = req.priority === "high" && req.status === "pending" && ageMins > 10;

              return (
                <Card key={req.id} className={`${isUrgent ? "border-destructive/40 bg-destructive/5" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground truncate">{req.name}</span>
                          <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[req.status] || ""}`}>
                            {req.status}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] ${PRIORITY_COLORS[req.priority] || ""}`}>
                            {req.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{catNameMap[req.category_code] || req.category_code}</span>
                          <span>•</span>
                          <span>{req.request_type}</span>
                          <span>•</span>
                          <span>{ageLabel}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{req.phone}</span>
                    </div>

                    {req.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3" /> {req.location}
                      </div>
                    )}
                    {req.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{req.description}</p>
                    )}
                    {req.preferred_time && (
                      <Badge variant="outline" className="text-[9px] mb-2">
                        <Clock className="w-3 h-3 mr-1" /> {req.preferred_time}
                      </Badge>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                        <a href={`tel:${req.phone}`}>
                          <Phone className="w-3 h-3 mr-1" /> Call
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                        <a href={whatsappLink(req.phone.replace(/[^0-9]/g, ""), `Hi ${req.name}, this is LankaFix regarding your ${catNameMap[req.category_code] || ""} request.`)} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                        </a>
                      </Button>
                      {req.status === "pending" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(req.id, "contacted")}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Contacted
                        </Button>
                      )}
                      {(req.status === "pending" || req.status === "contacted") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-success" onClick={() => updateStatus(req.id, "converted")}>
                          <UserPlus className="w-3 h-3 mr-1" /> Converted
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default DemandDashboardPage;
