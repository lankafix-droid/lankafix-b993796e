/**
 * AIPartnerSuggestion — Shows top-3 AI-ranked partners with scores and explanations.
 * Uses hardened aiPartnerMatching service. NEVER auto-assigns providers.
 */
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Star, Clock, Zap, Users, AlertTriangle, Loader2 } from "lucide-react";
import AIConfidenceBadge from "./AIConfidenceBadge";
import AIWhyPanel from "./AIWhyPanel";
import AIConsentGate from "./AIConsentGate";
import { useAIAdvisory } from "@/hooks/useAIAdvisory";
import { rankPartnersForBooking, type PartnerMatchScore } from "@/services/aiPartnerMatching";
import { track } from "@/lib/analytics";

interface PartnerData {
  id: string;
  full_name: string;
  categories_supported: string[];
  service_zones?: string[] | null;
  rating_average?: number | null;
  completed_jobs_count?: number | null;
  on_time_rate?: number | null;
  average_response_time_minutes?: number | null;
  availability_status?: string;
}

interface AIPartnerSuggestionProps {
  partners: PartnerData[];
  categoryCode: string;
  zoneCode?: string;
  maxVisible?: number;
  className?: string;
}

const AIPartnerSuggestion = ({
  partners,
  categoryCode,
  zoneCode,
  maxVisible = 3,
  className = "",
}: AIPartnerSuggestionProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const serviceFn = useCallback(
    () => rankPartnersForBooking(partners, categoryCode, zoneCode),
    [partners, categoryCode, zoneCode]
  );

  const advisory = useAIAdvisory<PartnerMatchScore[]>({
    featureFlag: "ai_partner_ranking",
    moduleName: "ai_partner_ranking",
    serviceFn,
    getConfidence: (d) => d.length > 0 ? d[0].confidence.confidence_score : 0,
    getFallbackUsed: (d) => d.length > 0 ? d[0].fallback_used : true,
    deps: [partners.length, categoryCode, zoneCode],
    analyticsEvent: "ai_partner_rank_viewed",
    analyticsPayload: { categoryCode, candidateCount: partners.length },
  });

  // Consent gate
  if (advisory.blockedByConsent && advisory.requiredConsent) {
    return (
      <AIConsentGate
        requiredConsent={advisory.requiredConsent}
        moduleName="ai_partner_ranking"
        onConsented={advisory.execute}
        className={className}
      />
    );
  }

  // Loading
  if (advisory.loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border/40 bg-muted/20 p-4 animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Feature disabled
  if (!advisory.available) {
    return (
      <div className={`text-center py-6 text-muted-foreground text-xs ${className}`}>
        Partner ranking is currently unavailable.
      </div>
    );
  }

  const ranked = advisory.data?.slice(0, maxVisible) || [];

  if (ranked.length === 0) {
    return (
      <div className={`text-center py-6 text-muted-foreground text-sm ${className}`}>
        No partner suggestions available.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Partner Suggestions</span>
        </div>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Advisory Only</Badge>
      </div>

      {ranked.map((partner, index) => {
        const isExpanded = expandedId === partner.partnerId;
        return (
          <div
            key={partner.partnerId}
            className="rounded-xl border border-border/40 bg-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{partner.partnerName}</p>
                  <p className="text-[11px] text-muted-foreground">Score: {partner.overallScore}/100</p>
                </div>
              </div>
              <AIConfidenceBadge
                score={partner.confidence.confidence_score}
                fallbackUsed={partner.fallback_used}
              />
            </div>

            <p className="text-xs text-muted-foreground">{partner.explanation}</p>

            {/* Top factors */}
            <div className="flex flex-wrap gap-1.5">
              {partner.factors
                .filter(f => f.score >= 70)
                .slice(0, 3)
                .map(f => (
                  <Badge key={f.name} variant="secondary" className="text-[10px] font-normal">
                    {f.label}: {Math.round(f.score)}%
                  </Badge>
                ))}
            </div>

            {partner.fallback_used && (
              <div className="flex items-center gap-1.5 text-[10px] text-destructive">
                <AlertTriangle className="w-3 h-3" />
                <span>Using estimated ranking</span>
              </div>
            )}

            {partner.cached && (
              <p className="text-[10px] text-muted-foreground">Cached result</p>
            )}

            {/* Why panel toggle */}
            <button
              onClick={() => {
                setExpandedId(isExpanded ? null : partner.partnerId);
                if (!isExpanded) track("ai_nudge_clicked", { module: "ai_partner_ranking", partnerId: partner.partnerId });
              }}
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              Why this recommendation?
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isExpanded && (
              <AIWhyPanel
                reasons={partner.confidence.reason_codes.map(r => r.replace(/_/g, " "))}
                module="ai_partner_ranking"
                fallbackUsed={partner.fallback_used}
                lowConfidence={partner.confidence.confidence_score < 50}
              />
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground italic text-center">
        ⚠️ Advisory only — does not auto-assign a technician.
      </p>
    </div>
  );
};

export default AIPartnerSuggestion;
