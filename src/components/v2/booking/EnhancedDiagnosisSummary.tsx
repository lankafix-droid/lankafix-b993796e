/**
 * Enhanced Diagnosis Summary — shows price intelligence, repair time,
 * parts probability, severity, and safety disclaimer.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, CheckCircle2, AlertTriangle, Stethoscope, FileText,
  Clock, DollarSign, Wrench, TrendingUp, ShieldAlert, Package,
} from "lucide-react";
import { getPriceEstimate, formatPriceRange, formatDuration, getSeverity, SEVERITY_CONFIG, type PriceEstimate } from "@/engines/priceIntelligenceEngine";

interface SummaryData {
  device: string;
  reportedProblem: string;
  likelyService: string;
  repairPath: string;
  confidence: "high" | "medium" | "low";
  keyFindings: string[];
  technicianNotes: string[];
}

interface Props {
  summary: SummaryData;
  categoryCode: string;
  problemKey?: string;
  serviceType?: string;
  deviceBrand?: string;
  onContinue: () => void;
}

const CONFIDENCE_STYLES = {
  high: { label: "High Confidence", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950", icon: CheckCircle2 },
  medium: { label: "Medium Confidence", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950", icon: AlertTriangle },
  low: { label: "Low Confidence", color: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950", icon: AlertTriangle },
};

const PRICE_CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high_confidence: { label: "High Accuracy", color: "text-emerald-600" },
  moderate_confidence: { label: "Moderate Accuracy", color: "text-amber-600" },
  rough_estimate: { label: "Rough Estimate", color: "text-orange-600" },
};

export default function EnhancedDiagnosisSummary({ summary, categoryCode, problemKey, serviceType, deviceBrand, onContinue }: Props) {
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const conf = CONFIDENCE_STYLES[summary.confidence];
  const ConfIcon = conf.icon;
  const severity = problemKey ? getSeverity(categoryCode, problemKey) : null;

  useEffect(() => {
    if (!serviceType && !categoryCode) return;
    setLoading(true);
    getPriceEstimate(categoryCode, serviceType || "repair", deviceBrand)
      .then(setPriceEstimate)
      .finally(() => setLoading(false));
  }, [categoryCode, serviceType, deviceBrand]);

  const priceConf = priceEstimate?.confidence
    ? PRICE_CONFIDENCE_LABELS[priceEstimate.confidence] || PRICE_CONFIDENCE_LABELS.rough_estimate
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Stethoscope className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Diagnosis Summary</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Here's what we've identified. Your technician will verify everything on-site.
      </p>

      {/* Main Summary Card */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className={`flex items-center gap-2 px-4 py-2.5 ${conf.color}`}>
          <ConfIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{conf.label} Diagnosis</span>
          {severity && (
            <Badge variant="outline" className={`ml-auto text-[10px] ${severity.color}`}>
              {severity.label}
            </Badge>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Device</p>
              <p className="text-sm font-medium text-foreground">{summary.device}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reported Issue</p>
              <p className="text-sm font-medium text-foreground">{summary.reportedProblem}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Likely Service</p>
              <p className="text-sm font-medium text-primary">{summary.likelyService}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Repair Path</p>
              <p className="text-sm font-medium text-foreground">{summary.repairPath}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Estimate Card */}
      {priceEstimate && priceEstimate.minPrice > 0 && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Estimated Price</h3>
            {priceConf && (
              <span className={`text-[10px] ml-auto ${priceConf.color}`}>{priceConf.label}</span>
            )}
          </div>
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-primary">
              {formatPriceRange(priceEstimate.minPrice, priceEstimate.maxPrice)}
            </p>
            {priceEstimate.sampleSize > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Based on {priceEstimate.sampleSize} similar repairs
              </p>
            )}
          </div>
          {priceEstimate.priceFactors.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Factors affecting price:</p>
              <div className="flex flex-wrap gap-1.5">
                {priceEstimate.priceFactors.map((f, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duration + Parts Row */}
      <div className="grid grid-cols-2 gap-3">
        {priceEstimate?.durationMinutes && (
          <div className="bg-card border rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Est. Time</span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {formatDuration(priceEstimate.durationMinutes)}
            </p>
          </div>
        )}
        {priceEstimate && priceEstimate.commonParts.length > 0 && (
          <div className="bg-card border rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Parts Likely</span>
            </div>
            <div className="space-y-1">
              {priceEstimate.commonParts.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <p className="text-[11px] text-foreground truncate">{p.name}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{p.probability}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key Findings */}
      {summary.keyFindings.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Key Findings
          </p>
          <ul className="space-y-1">
            {summary.keyFindings.map((f, i) => (
              <li key={i} className="text-xs text-foreground">{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Technician Prep Notes */}
      {summary.technicianNotes.length > 0 && (
        <div className="bg-muted/30 border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> Technician will verify
          </p>
          <ul className="space-y-1">
            {summary.technicianNotes.map((n, i) => (
              <li key={i} className="text-xs text-muted-foreground">{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Safety Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Final inspection by technician may change diagnosis or price. No repair begins without your approval.
        </p>
      </div>

      {/* What happens next */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
        <p className="text-sm text-foreground font-medium">What happens next?</p>
        <p className="text-xs text-muted-foreground mt-1">
          This summary will be shared with your assigned technician so they can arrive prepared with the right tools and parts.
        </p>
      </div>

      <Button onClick={onContinue} size="lg" className="w-full gap-2">
        Continue to Booking <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
