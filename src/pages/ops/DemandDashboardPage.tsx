/**
 * /ops/demand-dashboard — Operator Demand Intelligence Dashboard
 * Live feed of demand requests with assignment, SLA tracking, and analytics.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/categories";
import Header from "@/components/layout/Header";
import DemandStatsStrip from "@/components/ops/demand/DemandStatsStrip";
import DemandFilters from "@/components/ops/demand/DemandFilters";
import DemandRequestCard from "@/components/ops/demand/DemandRequestCard";
import DemandInsightsPanel from "@/components/ops/demand/DemandInsightsPanel";
import LeadsPipelinePanel from "@/components/ops/demand/LeadsPipelinePanel";
import PartnerSuggestionsPanel from "@/components/ops/demand/PartnerSuggestionsPanel";
import { useClassifyDemand } from "@/hooks/useLeads";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export type DemandRequest = {
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
  outcome: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  contacted_at: string | null;
  follow_up_due_at: string | null;
  notes: string | null;
  conversion_value: number | null;
  created_at: string;
};

const catNameMap = Object.fromEntries(categories.map((c) => [c.code, c.name]));

const DemandDashboardPage = () => {
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<DemandRequest | null>(null);
  const [activeTab, setActiveTab] = useState("demand");

  const classifyMutation = useClassifyDemand();

  const { data: requests = [], refetch, isLoading } = useQuery({
    queryKey: ["demand-requests", filterCategory, filterStatus, filterAssigned],
    queryFn: async () => {
      let query = supabase.from("demand_requests" as any).select("*").order("priority_score", { ascending: false }).order("created_at", { ascending: false }).limit(200);
      if (filterCategory !== "all") query = query.eq("category_code", filterCategory);
      if (filterStatus !== "all") query = query.eq("status", filterStatus);
      if (filterAssigned === "unassigned") query = query.is("assigned_to", null);
      if (filterAssigned === "assigned") query = query.not("assigned_to", "is", null);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DemandRequest[];
    },
    refetchInterval: 15000,
  });

  const updateRequest = async (id: string, updates: Partial<DemandRequest>) => {
    const { error } = await supabase.from("demand_requests" as any).update(updates as any).eq("id", id);
    if (error) {
      toast.error("Update failed");
      return;
    }
    toast.success("Updated");
    refetch();
  };

  const logContact = async (requestId: string, type: "call" | "whatsapp") => {
    await supabase.from("demand_contact_logs" as any).insert({
      demand_request_id: requestId,
      contact_type: type,
    } as any);
  };

  const handleClassify = (req: DemandRequest) => {
    classifyMutation.mutate(req.id);
  };

  const uniqueCategories = [...new Set(requests.map((r) => r.category_code))];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Demand Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">Live demand feed — own, track, convert every lead.</p>

        <DemandStatsStrip requests={requests} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="demand">Demand Feed</TabsTrigger>
            <TabsTrigger value="leads">Leads Pipeline</TabsTrigger>
          </TabsList>

          <TabsContent value="demand">
            <DemandInsightsPanel requests={requests} catNameMap={catNameMap} />
            <DemandFilters
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterAssigned={filterAssigned}
              setFilterAssigned={setFilterAssigned}
              uniqueCategories={uniqueCategories}
              catNameMap={catNameMap}
            />

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No demand requests yet.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Demand cards */}
                <div className="lg:col-span-2 space-y-3">
                  {requests.map((req) => (
                    <div key={req.id}>
                      <DemandRequestCard
                        req={req}
                        catNameMap={catNameMap}
                        onUpdate={updateRequest}
                        onLogContact={logContact}
                      />
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-primary"
                          onClick={() => handleClassify(req)}
                          disabled={classifyMutation.isPending}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Classify & Match
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px]"
                          onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                        >
                          {selectedRequest?.id === req.id ? "Hide Partners" : "Show Partners"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right sidebar: AI partner suggestions */}
                <div className="space-y-3">
                  {selectedRequest ? (
                    <PartnerSuggestionsPanel
                      req={selectedRequest}
                      onAssigned={() => {
                        refetch();
                        setSelectedRequest(null);
                      }}
                    />
                  ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                      Select a request to view AI partner suggestions
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads">
            <LeadsPipelinePanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DemandDashboardPage;
