/**
 * AI Partner Suggestions Panel — shows ranked partner matches for a LEAD.
 *
 * SOURCE OF TRUTH: This panel operates on Lead objects, NOT DemandRequests.
 * Assignment always uses lead.id — never demand_request_id.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Star, Clock, CheckCircle, UserPlus, Loader2,
  MapPin, AlertTriangle, XCircle, Pause, ArrowRight
} from "lucide-react";
import { useOnlinePartners } from "@/hooks/usePartners";
import { scorePartnersForLead, type ScoredPartner } from "@/services/archetypePartnerScoring";
import {
  assignPartnerToLead,
  partnerAcceptLead,
  partnerRejectLead,
  markNoSupply,
  holdLead,
  convertLeadToBooking,
} from "@/engines/partnerAssignmentEngine";
import type { Lead } from "@/hooks/useLeads";
import type { ServiceArchetype } from "@/hooks/useSupplyIntelligence";
import { getZoneDisplayName } from "@/lib/zoneNormalization";

// Category → archetype mapping
const ARCHETYPE_MAP: Record<string, ServiceArchetype> = {
  AC: "inspection_first",
  MOBILE: "instant",
  IT: "instant",
  ELECTRICAL: "instant",
  PLUMBING: "instant",
  NETWORK: "instant",
  CONSUMER_ELEC: "inspection_first",
  COPIER: "inspection_first",
  APPLIANCE_INSTALL: "inspection_first",
  CCTV: "consultation",
  SOLAR: "consultation",
  SMART_HOME_OFFICE: "consultation",
  HOME_SECURITY: "consultation",
  POWER_BACKUP: "consultation",
  PRINT_SUPPLIES: "delivery",
};

type Props = {
  /** Lead object — source of truth for assignment. */
  lead: Lead;
  onUpdated: () => void;
};

export default function PartnerSuggestionsPanel({ lead, onUpdated }: Props) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const { data: partners = [] } = useOnlinePartners(lead.category_code);

  const archetype = ARCHETYPE_MAP[lead.category_code] || "instant";

  // Use archetype-aware scoring with structured zone matching
  const ranked: ScoredPartner[] = scorePartnersForLead(
    partners, archetype, lead.category_code, lead.zone_code
  );
  const top5 = ranked.filter((r) => r.score > 0).slice(0, 5);

  const handleAssign = async (partnerId: string, partnerName: string) => {
    setAssigning(partnerId);
    // Assignment uses lead.id — NEVER demand_request_id
    const result = await assignPartnerToLead(lead.id, partnerId, partnerName);
    setAssigning(null);
    if (result.success) onUpdated();
  };

  const handleAccept = async () => {
    if (!lead.assigned_partner_id) return;
    await partnerAcceptLead(lead.id, lead.assigned_partner_id);
    onUpdated();
  };

  const handleReject = async () => {
    if (!lead.assigned_partner_id) return;
    await partnerRejectLead(lead.id, lead.assigned_partner_id, "manual_rejection");
    onUpdated();
  };

  const handleConvert = async () => {
    setConverting(true);
    await convertLeadToBooking(lead.id);
    setConverting(false);
    onUpdated();
  };

  const handleNoSupply = async () => {
    await markNoSupply(lead.id, "No suitable partners available");
    onUpdated();
  };

  const handleHold = async () => {
    await holdLead(lead.id, "Operator decision");
    onUpdated();
  };

  // --- Lead status-specific UI ---

  // If partner already accepted → show conversion button
  if (lead.status === "accepted" || lead.partner_response_status === "accepted") {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-success font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Partner Accepted
          </div>
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleConvert}
            disabled={converting}
          >
            {converting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ArrowRight className="w-3 h-3 mr-1" />}
            Convert to Booking
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If assigned and awaiting response → show accept/reject controls
  if (lead.status === "assigned" && lead.assigned_partner_id) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-3 space-y-2">
          <div className="text-xs text-warning font-medium">⏳ Awaiting Partner Response</div>
          {lead.accept_by && (
            <div className="text-[10px] text-muted-foreground">
              Deadline: {new Date(lead.accept_by).toLocaleTimeString()}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="default" className="h-7 text-xs flex-1" onClick={handleAccept}>
              <CheckCircle className="w-3 h-3 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={handleReject}>
              <XCircle className="w-3 h-3 mr-1" /> Reject
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground italic">
            Simulate partner response (Phase 1: operator-mediated)
          </p>
        </CardContent>
      </Card>
    );
  }

  // Default: show ranked partner suggestions

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          AI Suggested Partners
          <Badge variant="outline" className="text-[9px] ml-auto">
            {archetype.replace("_", " ")}
          </Badge>
        </CardTitle>
        {lead.zone_code && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="w-3 h-3" /> Zone: {getZoneDisplayName(lead.zone_code)}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {top5.length === 0 ? (
          <div className="text-center py-3 text-xs text-muted-foreground">
            <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-warning" />
            No matching partners available
          </div>
        ) : (
          top5.map((match) => {
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
                        match.score >= 70 ? "bg-success/10 text-success"
                          : match.score >= 50 ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {match.score}%
                    </Badge>
                    {match.zoneMatch === "direct" && (
                      <Badge variant="outline" className="text-[8px] bg-success/10 text-success">
                        <MapPin className="w-2.5 h-2.5 mr-0.5" /> zone
                      </Badge>
                    )}
                    {match.zoneMatch === "adjacent" && (
                      <Badge variant="outline" className="text-[8px] bg-warning/10 text-warning">
                        nearby
                      </Badge>
                    )}
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
                  <p className="text-[9px] text-muted-foreground mt-0.5 italic">
                    {match.explanation}
                  </p>
                  {match.penalties.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {match.penalties.map((p) => (
                        <Badge key={p} variant="outline" className="text-[8px] text-destructive/70">
                          {p.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
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
                      <UserPlus className="w-3 h-3 mr-1" /> Assign
                    </>
                  )}
                </Button>
              </div>
            );
          })
        )}

        {/* Operator manual controls */}
        <div className="flex gap-1.5 pt-1 border-t border-border/50">
          <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={handleNoSupply}>
            <XCircle className="w-3 h-3 mr-1" /> No Supply
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={handleHold}>
            <Pause className="w-3 h-3 mr-1" /> Hold
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
