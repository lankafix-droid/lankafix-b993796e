/**
 * AIPartnerSuggestion — Shows top-3 AI-ranked partners with scores and explanations.
 * Uses consumer-safe wording for strengths and weak factors.
 * Uses hardened aiPartnerMatching service. NEVER auto-assigns providers.
 */
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import AIConfidenceBadge from "./AIConfidenceBadge";
import AIWhyPanel from "./AIWhyPanel";
import AIAdvisoryFooter from "./AIAdvisoryFooter";
import AIConsentGate from "./AIConsentGate";
import AIEmptyState from "./AIEmptyState";
import { useAIAdvisory } from "@/hooks/useAIAdvisory";
import { rankPartnersForBooking, type PartnerMatchScore } from "@/services/aiPartnerMatching";
import { trackAIAnalytics } from "@/services/aiEventTracking";
import { canRunPartnerRanking } from "@/lib/aiExecutionGuards";

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

/** Consumer-safe strength labels */
function getStrengthLabel(factor: { name: string; label: string }): string {
  switch (factor.name) {
    case "category_match": return "Specializes in this category";
    case "zone_coverage": return "Good area coverage";
    case "response_speed": return "Responds relatively quickly";
    case "completion": return "Strong recent completion history";
    case "rating": return "Well-rated by customers";
    default: return factor.label;
  }
}

/** Consumer-safe weak factor labels — soft, non-defamatory */
function getWeakFactorNote(factor: { name: string; score: number }): string | null {
  if (factor.score >= 50) return null;
  switch (factor.name) {
    case "zone_coverage": return "Coverage may depend on technician availability";
    case "response_speed": return "May take longer to respond";
    case "completion": return "Limited recent job history";
    case "rating": return "Limited customer reviews available";
    default: return null;
  }
}

const AIPartnerSuggestion = ({
  partners,
  categoryCode,
  zoneCode,
  maxVisible = 3,
  className = "",
}: AIPartnerSuggestionProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canRun = canRunPartnerRanking(partners, categoryCode);

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
    autoExecute: canRun,
    deps: [partners.length, categoryCode, zoneCode],
    analyticsEvent: "ai_partner_rank_viewed",
    analyticsPayload: { categoryCode, candidateCount: partners.length },
  });

  // Guard AFTER hooks
  if (!canRun) {
    return (
      <AIEmptyState
        mode="no_data"
        title="No partner suggestions available"
        description="Awaiting category and technician data to generate recommendations."
        className={className}
      />
    );
  }

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
    return <AIEmptyState mode="disabled" title="Partner ranking is currently unavailable" className={className} />;
  }

  const ranked = advisory.data?.slice(0, maxVisible) || [];

  if (ranked.length === 0) {
    return <AIEmptyState mode="no_data" title="No partner suggestions available" className={className} />;
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
        const strengths = partner.factors.filter(f => f.score >= 70).slice(0, 3);
        const weakFactors = partner.factors
          .map(f => ({ ...f, note: getWeakFactorNote(f) }))
          .filter(f => f.note !== null)
          .slice(0, 2);

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

            {strengths.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {strengths.map(f => (
                  <Badge key={f.name} variant="secondary" className="text-[10px] font-normal">
                    ✓ {getStrengthLabel(f)}
                  </Badge>
                ))}
              </div>
            )}

            {weakFactors.length > 0 && (
              <div className="space-y-0.5">
                {weakFactors.map(f => (
                  <p key={f.name} className="text-[10px] text-muted-foreground">
                    ℹ️ {f.note}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setExpandedId(isExpanded ? null : partner.partnerId);
                if (!isExpanded) {
                  trackAIAnalytics("ai_nudge_clicked", { module: "ai_partner_ranking", partnerId: partner.partnerId });
                }
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

      <AIAdvisoryFooter
        module="ai_partner_ranking"
        confidence={advisory.confidence}
        fallbackUsed={advisory.fallback_used}
        cached={advisory.cached}
        disclaimer="Advisory only — does not auto-assign a technician."
      />
    </div>
  );
};

export default AIPartnerSuggestion;
