/**
 * Leads Pipeline View — shows leads in the demand→assignment→conversion pipeline.
 * Separated from Demand Feed: only classified leads appear here.
 *
 * Lifecycle states are fully visible: awaiting_response, accepted, rejected,
 * unavailable, expired, needs_reassignment, no_supply, on_hold, converted.
 */
import { useState } from "react";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitBranch, User, Clock, MapPin, ChevronRight, ChevronDown,
  AlertTriangle, Timer, RotateCcw
} from "lucide-react";
import { categories } from "@/data/categories";
import PartnerSuggestionsPanel from "./PartnerSuggestionsPanel";
import { getZoneDisplayName } from "@/lib/zoneNormalization";
import { expireAssignment } from "@/engines/partnerAssignmentEngine";
import { toast } from "sonner";

const catNameMap = Object.fromEntries(categories.map((c) => [c.code, c.name]));

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  qualified: "bg-warning/10 text-warning",
  assigned: "bg-accent/10 text-accent-foreground",
  accepted: "bg-success/10 text-success",
  converted: "bg-success/20 text-success",
  dropped: "bg-muted text-muted-foreground",
};

const ROUTING_LABELS: Record<string, { label: string; color: string; icon?: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground" },
  awaiting_response: { label: "Awaiting Partner", color: "text-warning", icon: "⏳" },
  needs_reassignment: { label: "Needs Reassign", color: "text-destructive", icon: "🔄" },
  accepted: { label: "Accepted", color: "text-success", icon: "✅" },
  routing_failed: { label: "Routing Failed", color: "text-destructive", icon: "❌" },
  no_supply: { label: "No Supply", color: "text-destructive", icon: "🚫" },
  on_hold: { label: "On Hold", color: "text-muted-foreground", icon: "⏸" },
  converted: { label: "Converted", color: "text-success", icon: "🎉" },
};

function isOverdue(lead: Lead): boolean {
  if (!lead.accept_by || lead.partner_response_status !== "pending") return false;
  return new Date(lead.accept_by) < new Date();
}

export default function LeadsPipelinePanel() {
  const { data: leads = [], isLoading, refetch } = useLeads();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

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

  const handleExpireManual = async (leadId: string) => {
    await expireAssignment(leadId);
    toast.info("Assignment expired manually");
    refetch();
  };

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
          const overdue = isOverdue(lead);
          const historyExpanded = expandedHistory === lead.id;

          return (
            <Card
              key={lead.id}
              className={`cursor-pointer transition-colors ${
                overdue ? "border-destructive/50 bg-destructive/5" :
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
                      {routing.icon && `${routing.icon} `}{routing.label}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Assignment info with deadline */}
                {lead.assigned_partner_id && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                    <User className="w-3 h-3" />
                    Partner assigned
                    {lead.assignment_attempt > 1 && (
                      <span className="text-warning"> (attempt {lead.assignment_attempt})</span>
                    )}
                    {lead.accept_by && (
                      <span className={`flex items-center gap-0.5 ml-2 ${overdue ? "text-destructive font-medium" : ""}`}>
                        <Clock className="w-3 h-3" />
                        {overdue ? "⚠ OVERDUE" : `Accept by ${new Date(lead.accept_by).toLocaleTimeString()}`}
                      </span>
                    )}
                    {overdue && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[9px] text-destructive ml-1 px-1"
                        onClick={(e) => { e.stopPropagation(); handleExpireManual(lead.id); }}
                      >
                        <Timer className="w-3 h-3 mr-0.5" /> Expire
                      </Button>
                    )}
                  </div>
                )}

                {/* Rejection info */}
                {lead.partner_response_status === "rejected" && lead.rejection_reason && (
                  <div className="text-[10px] text-destructive mt-1">
                    ❌ Rejected: {lead.rejection_reason.replace(/_/g, " ")}
                  </div>
                )}

                {/* Unavailable info */}
                {lead.partner_response_status === "unavailable" && (
                  <div className="text-[10px] text-warning mt-1">
                    ⏸ Partner temporarily unavailable
                  </div>
                )}

                {/* Expired info */}
                {lead.partner_response_status === "expired" && (
                  <div className="text-[10px] text-destructive mt-1">
                    ⏰ Assignment expired — needs reassignment
                  </div>
                )}

                {/* Operator notes */}
                {lead.operator_notes && (
                  <div className="text-[10px] text-muted-foreground mt-1 italic bg-muted/30 rounded px-1.5 py-0.5">
                    📝 {lead.operator_notes}
                  </div>
                )}

                {/* Assignment history (expandable) */}
                {lead.assignment_history && lead.assignment_history.length > 0 && (
                  <div className="mt-1.5">
                    <button
                      className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedHistory(historyExpanded ? null : lead.id);
                      }}
                    >
                      {historyExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <RotateCcw className="w-3 h-3" />
                      {lead.assignment_history.length} assignment{lead.assignment_history.length > 1 ? "s" : ""}
                    </button>
                    {historyExpanded && (
                      <div className="mt-1 space-y-1 pl-3 border-l border-border/50">
                        {lead.assignment_history.map((entry: any, i: number) => (
                          <div key={i} className="text-[9px] text-muted-foreground">
                            <span className="font-medium">#{entry.attempt}</span>
                            {" "}{entry.partner_name || "Unknown"}
                            {" → "}
                            <span className={
                              entry.response_status === "accepted" ? "text-success" :
                              entry.response_status === "rejected" ? "text-destructive" :
                              entry.response_status === "expired" ? "text-destructive" :
                              "text-muted-foreground"
                            }>
                              {entry.response_status || entry.outcome || "assigned"}
                            </span>
                            {entry.rejection_reason && ` (${entry.rejection_reason.replace(/_/g, " ")})`}
                            {entry.assigned_at && (
                              <span className="ml-1 opacity-60">
                                {new Date(entry.assigned_at).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
