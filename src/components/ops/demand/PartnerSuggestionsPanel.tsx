/**
 * AI Partner Suggestions Panel — shows ranked partner matches for a demand request.
 * Operator can assign a partner from this panel.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Star, Clock, CheckCircle, UserPlus, Loader2 } from "lucide-react";
import { useOnlinePartners } from "@/hooks/usePartners";
import { rankPartnersForBooking } from "@/services/aiPartnerMatching";
import { assignPartnerToLead } from "@/engines/partnerAssignmentEngine";
import type { DemandRequest } from "@/pages/ops/DemandDashboardPage";

type Props = {
  req: DemandRequest;
  onAssigned: () => void;
};

export default function PartnerSuggestionsPanel({ req, onAssigned }: Props) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const { data: partners = [] } = useOnlinePartners(req.category_code);

  const ranked = rankPartnersForBooking(partners, req.category_code);
  const top5 = ranked.slice(0, 5);

  const handleAssign = async (partnerId: string, partnerName: string) => {
    setAssigning(partnerId);
    // We need a lead_id — for now, create assignment via demand_request
    // In production this would go through classify-demand first
    const result = await assignPartnerToLead(req.id, partnerId, partnerName);
    setAssigning(null);
    if (result.success) onAssigned();
  };

  if (partners.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-3 text-center text-xs text-muted-foreground">
          No verified partners online for {req.category_code}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          AI Suggested Partners
          <Badge variant="outline" className="text-[9px] ml-auto">
            {top5.length} matches
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {top5.map((match) => {
          const partner = partners.find((p) => p.id === match.partnerId);
          if (!partner) return null;

          return (
            <div
              key={match.partnerId}
              className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-medium text-foreground truncate">
                    {match.partnerName}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${
                      match.overallScore >= 70
                        ? "bg-success/10 text-success"
                        : match.overallScore >= 50
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {match.overallScore}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3" />
                    {partner.rating_average?.toFixed(1) || "N/A"}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {partner.average_response_time_minutes || "?"}m
                  </span>
                  <span className="flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" />
                    {partner.completed_jobs_count} jobs
                  </span>
                </div>
                {match.explanation && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 italic">
                    {match.explanation}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] shrink-0"
                disabled={assigning !== null}
                onClick={() => handleAssign(match.partnerId, match.partnerName)}
              >
                {assigning === match.partnerId ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 mr-1" />
                    Assign
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
