/**
 * AIIssueTriage — Free-text issue analysis card for booking intake.
 * Shows structured advisory output: likely issue, suggested category, urgency.
 * Module identity: ai_issue_triage (distinct from ai_estimate_assist).
 * NEVER auto-modifies booking. Advisory only.
 */
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Search, Loader2 } from "lucide-react";
import AIAdvisoryFooter from "./AIAdvisoryFooter";
import AIConsentGate from "./AIConsentGate";
import { useAIAdvisory } from "@/hooks/useAIAdvisory";
import { CATEGORY_LABELS, type CategoryCode } from "@/config/aiFlags";

const MIN_DESCRIPTION_LENGTH = 15;

interface AIIssueTriageProps {
  description: string;
  categoryCode?: string;
  className?: string;
}

interface TriageResult {
  likelyIssue: string;
  suggestedCategory: CategoryCode;
  suggestedCategoryLabel: string;
  urgency: "low" | "normal" | "high" | "emergency";
  technicianRequired: boolean;
  confidence: { confidence_score: number };
  fallback_used: boolean;
  advisory_only: true;
  reasoning: string[];
}

const URGENCY_CONFIG = {
  low: { label: "Low Priority", style: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  normal: { label: "Normal", style: "bg-green-500/10 text-green-700 border-green-500/20" },
  high: { label: "High Priority", style: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  emergency: { label: "Emergency", style: "bg-red-500/10 text-red-700 border-red-500/20" },
};

/** Simple keyword-based triage (deterministic, no external API) */
function triageIssue(description: string, currentCategory?: string): TriageResult {
  const text = description.toLowerCase();
  const reasons: string[] = [];

  let detectedCategory: CategoryCode = (currentCategory as CategoryCode) || "MOBILE";
  if (text.includes("laptop") || text.includes("notebook")) { detectedCategory = "LAPTOP"; reasons.push("laptop_keyword"); }
  else if (text.includes("printer") || text.includes("printing")) { detectedCategory = "PRINTER"; reasons.push("printer_keyword"); }
  else if (text.includes("cctv") || text.includes("camera") || text.includes("surveillance")) { detectedCategory = "CCTV"; reasons.push("cctv_keyword"); }
  else if (text.includes("ac") || text.includes("air condition") || text.includes("cooling")) { detectedCategory = "AC"; reasons.push("ac_keyword"); }
  else if (text.includes("solar") || text.includes("panel") || text.includes("inverter")) { detectedCategory = "SOLAR"; reasons.push("solar_keyword"); }
  else if (text.includes("phone") || text.includes("screen") || text.includes("mobile")) { detectedCategory = "MOBILE"; reasons.push("mobile_keyword"); }
  else if (currentCategory) { reasons.push("user_selected_category"); }

  let likelyIssue = "General service request";
  if (text.includes("broken") || text.includes("cracked")) { likelyIssue = "Physical damage — screen or body repair likely needed"; reasons.push("damage_detected"); }
  else if (text.includes("not charging") || text.includes("battery")) { likelyIssue = "Power/charging issue — battery or port inspection needed"; reasons.push("power_issue"); }
  else if (text.includes("water") || text.includes("wet") || text.includes("spill")) { likelyIssue = "Liquid damage — urgent internal cleaning recommended"; reasons.push("water_damage"); }
  else if (text.includes("slow") || text.includes("hang") || text.includes("lag")) { likelyIssue = "Performance issue — software/hardware diagnostic needed"; reasons.push("performance_issue"); }
  else if (text.includes("install") || text.includes("setup") || text.includes("mount")) { likelyIssue = "Installation/setup service"; reasons.push("installation_request"); }
  else if (text.includes("not working") || text.includes("stopped")) { likelyIssue = "Device malfunction — technician diagnosis required"; reasons.push("malfunction_detected"); }

  let urgency: TriageResult["urgency"] = "normal";
  if (text.includes("urgent") || text.includes("emergency") || text.includes("asap")) { urgency = "emergency"; reasons.push("urgency_keyword"); }
  else if (text.includes("water") || text.includes("smoke") || text.includes("spark")) { urgency = "high"; reasons.push("safety_concern"); }
  else if (text.includes("maintenance") || text.includes("routine")) { urgency = "low"; reasons.push("routine_service"); }

  const technicianRequired = !text.includes("advice") && !text.includes("question") && !text.includes("how to");
  const confidenceScore = Math.min(80, 30 + reasons.length * 10);

  return {
    likelyIssue,
    suggestedCategory: detectedCategory,
    suggestedCategoryLabel: CATEGORY_LABELS[detectedCategory] || detectedCategory,
    urgency,
    technicianRequired,
    confidence: { confidence_score: confidenceScore },
    fallback_used: false,
    advisory_only: true,
    reasoning: reasons,
  };
}

const AIIssueTriage = ({ description, categoryCode, className = "" }: AIIssueTriageProps) => {
  const [triggered, setTriggered] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const serviceFn = useCallback(
    () => triageIssue(description, categoryCode),
    [description, categoryCode]
  );

  const advisory = useAIAdvisory<TriageResult>({
    featureFlag: "ai_issue_triage",
    moduleName: "ai_issue_triage",
    serviceFn,
    getConfidence: (d) => d.confidence.confidence_score,
    getFallbackUsed: (d) => d.fallback_used,
    autoExecute: false,
    deps: [description, categoryCode],
    analyticsEvent: "ai_issue_triage_used",
  });

  // Safe execution guard: only actionable with meaningful description
  if (!description || description.trim().length < MIN_DESCRIPTION_LENGTH) return null;

  // Consent gate
  if (advisory.blockedByConsent && advisory.requiredConsent) {
    return (
      <AIConsentGate
        requiredConsent={advisory.requiredConsent}
        moduleName="ai_issue_triage"
        onConsented={advisory.execute}
        onDismissed={() => setDismissed(true)}
        className={className}
      />
    );
  }

  if (dismissed) return null;

  // Not yet triggered
  if (!triggered && !advisory.data) {
    return (
      <button
        onClick={() => { setTriggered(true); advisory.execute(); }}
        className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors ${className}`}
      >
        <Search className="w-4 h-4 text-primary" />
        <span className="text-sm text-primary font-medium">Analyze issue with AI</span>
        <Badge variant="outline" className="text-[9px] ml-auto text-muted-foreground">Advisory</Badge>
      </button>
    );
  }

  // Loading
  if (advisory.loading) {
    return (
      <div className={`rounded-xl border border-primary/20 bg-primary/5 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing your description…
        </div>
      </div>
    );
  }

  // Feature disabled
  if (!advisory.available) return null;

  const data = advisory.data;
  if (!data) return null;

  const urgencyConfig = URGENCY_CONFIG[data.urgency];

  return (
    <div className={`rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">AI Issue Analysis</span>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Likely Issue</p>
          <p className="text-sm font-medium text-foreground">{data.likelyIssue}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            {data.suggestedCategoryLabel}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${urgencyConfig.style}`}>
            {urgencyConfig.label}
          </Badge>
          {data.technicianRequired && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">
              <Zap className="w-2.5 h-2.5 mr-0.5" />
              Technician Required
            </Badge>
          )}
        </div>
      </div>

      <AIAdvisoryFooter
        module="ai_issue_triage"
        confidence={data.confidence.confidence_score}
        fallbackUsed={advisory.fallback_used}
        cached={advisory.cached}
        disclaimer="Advisory only — final diagnosis by technician. Does not affect your booking."
      />
    </div>
  );
};

export default AIIssueTriage;
