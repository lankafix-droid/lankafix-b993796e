/**
 * Leads Pipeline View — shows leads in the demand→assignment→conversion pipeline.
 * Separated from Demand Feed: only classified leads appear here.
 */
import { useState } from "react";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, User, Clock, MapPin, ChevronRight } from "lucide-react";
import { categories } from "@/data/categories";
import PartnerSuggestionsPanel from "./PartnerSuggestionsPanel";
import { getZoneDisplayName } from "@/lib/zoneNormalization";

const catNameMap = Object.fromEntries(categories.map((c) => [c.code, c.name]));

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  qualified: "bg-warning/10 text-warning",
  assigned: "bg-accent/10 text-accent-foreground",
  accepted: "bg-success/10 text-success",
  converted: "bg-success/20 text-success",
  dropped: "bg-muted text-muted-foreground",
};

const ROUTING_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground" },
  awaiting_response: { label: "Awaiting Partner", color: "text-warning" },
  needs_reassignment: { label: "Needs Reassign", color: "text-destructive" },
  accepted: { label: "Accepted", color: "text-success" },
  routing_failed: { label: "Routing Failed", color: "text-destructive" },
  no_supply: { label: "No Supply", color: "text-destructive" },
  on_hold: { label: "On Hold", color: "text-muted-foreground" },
  converted: { label: "Converted", color: "text-success" },
};

export default function LeadsPipelinePanel() {
  const { data: leads = [], isLoading, refetch } = useLeads();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Loading leads...</p>;
  }

  if (leads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-xs text-muted-foreground">
          No leads yet. Use "AI Classify & Match" on demand requests to create leads.
        </CardContent>
      </Card>
    );
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Lead cards */}
      <div className="lg:col-span-2 space-y-2">
        <div className="flex items-center gap-1.5 mb-2">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Leads Pipeline</h3>
          <Badge variant="outline" className="text-[9px] ml-auto">{leads.length} leads</Badge>
        </div>

        {leads.map((lead) => {
          const routing = ROUTING_LABELS[lead.routing_status || "pending"];
          const isSelected = selectedLeadId === lead.id;

          return (
            <Card
              key={lead.id}
              className={`cursor-pointer transition-colors ${
                isSelected ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border"
              }`}
              onClick={() => setSelectedLeadId(isSelected ? null : lead.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-xs font-medium text-foreground truncate">
                        {lead.customer_name || "Unknown"}
                      </span>
                      <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[lead.status] || ""}`}>
                        {lead.status}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {lead.request_type?.replace(/_/g, " ")}
                      </Badge>
                      {lead.ai_priority_score > 70 && (
                        <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive">
                          P{lead.ai_priority_score}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                      <span>{catNameMap[lead.category_code] || lead.category_code}</span>
                      {lead.zone_code && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" /> {getZoneDisplayName(lead.zone_code)}
                        </span>
                      )}
                      {lead.estimated_complexity && lead.estimated_complexity !== "standard" && (
                        <span>• {lead.estimated_complexity}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-medium ${routing.color}`}>
                      {routing.label}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Assignment info */}
                {lead.assigned_partner_id && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                    <User className="w-3 h-3" />
                    Partner assigned
                    {lead.assignment_attempt > 1 && (
                      <span className="text-warning"> (attempt {lead.assignment_attempt})</span>
                    )}
                    {lead.accept_by && (
                      <span className="flex items-center gap-0.5 ml-2">
                        <Clock className="w-3 h-3" />
                        Accept by {new Date(lead.accept_by).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Rejection info */}
                {lead.partner_response_status === "rejected" && lead.rejection_reason && (
                  <div className="text-[10px] text-destructive mt-1">
                    ❌ Last rejection: {lead.rejection_reason}
                  </div>
                )}

                {/* Operator notes */}
                {(lead as any).operator_notes && (
                  <div className="text-[10px] text-muted-foreground mt-1 italic bg-muted/30 rounded px-1.5 py-0.5">
                    📝 {(lead as any).operator_notes}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Right sidebar: partner suggestions for selected lead */}
      <div className="space-y-3">
        {selectedLead ? (
          <PartnerSuggestionsPanel
            lead={selectedLead}
            onUpdated={() => refetch()}
          />
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
            Select a lead to view AI partner suggestions
          </div>
        )}
      </div>
    </div>
  );
}
