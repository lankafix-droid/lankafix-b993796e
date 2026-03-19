/**
 * Leads Pipeline View — shows leads in the demand→assignment→conversion pipeline.
 */
import { useLeads } from "@/hooks/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, User, Clock, MapPin } from "lucide-react";
import { categories } from "@/data/categories";

const catNameMap = Object.fromEntries(categories.map((c) => [c.code, c.name]));

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  qualified: "bg-warning/10 text-warning",
  assigned: "bg-accent/10 text-accent-foreground",
  accepted: "bg-success/10 text-success",
  converted: "bg-success/20 text-success",
  dropped: "bg-muted text-muted-foreground",
};

export default function LeadsPipelinePanel() {
  const { data: leads = [], isLoading } = useLeads();

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Loading leads...</p>;
  }

  if (leads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-xs text-muted-foreground">
          No leads yet. Classify demand requests to create leads.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <GitBranch className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Leads Pipeline</h3>
        <Badge variant="outline" className="text-[9px] ml-auto">{leads.length} leads</Badge>
      </div>

      {leads.map((lead) => (
        <Card key={lead.id} className="border-border/50">
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
                    {lead.request_type?.replace("_", " ")}
                  </Badge>
                  {lead.ai_priority_score > 70 && (
                    <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive">
                      P{lead.ai_priority_score}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{catNameMap[lead.category_code] || lead.category_code}</span>
                  {lead.customer_location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" /> {lead.customer_location}
                    </span>
                  )}
                  {lead.estimated_complexity && (
                    <span>• {lead.estimated_complexity}</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                {lead.customer_phone}
              </span>
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

            {/* AI suggestions count */}
            {lead.ai_suggested_partners && Array.isArray(lead.ai_suggested_partners) && lead.ai_suggested_partners.length > 0 && (
              <div className="text-[10px] text-primary mt-1">
                ✨ {lead.ai_suggested_partners.length} AI-suggested partners available
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
