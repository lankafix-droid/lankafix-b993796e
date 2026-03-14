/**
 * Pre-Dispatch Intelligence Card — shown to technicians before/during job.
 * Displays diagnosis data to help technician prepare.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, AlertTriangle, Clock, Package, DollarSign, FileText } from "lucide-react";

interface DiagnosisData {
  reportedSymptom?: string;
  probableIssue?: string;
  recommendedServiceType?: string;
  severityLevel?: string;
  confidenceScore?: number;
  estimatedDuration?: number;
  estimatedMinPrice?: number;
  estimatedMaxPrice?: number;
  possibleParts?: { name: string; probability: number }[];
  keyFindings?: string[];
  deviceBrand?: string;
  deviceModel?: string;
}

interface Props {
  diagnosis: DiagnosisData | null;
  categoryCode: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  major: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function PreDispatchIntelligence({ diagnosis, categoryCode }: Props) {
  if (!diagnosis) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary" />
          Pre-Dispatch Intelligence
          {diagnosis.confidenceScore && diagnosis.confidenceScore > 0 && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {diagnosis.confidenceScore >= 70 ? "High" : diagnosis.confidenceScore >= 40 ? "Medium" : "Low"} Conf.
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Device Info */}
        {(diagnosis.deviceBrand || diagnosis.deviceModel) && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Device:</span>
            <span className="font-medium text-foreground">
              {[diagnosis.deviceBrand, diagnosis.deviceModel].filter(Boolean).join(" ")}
            </span>
          </div>
        )}

        {/* Symptom + Probable Issue */}
        <div className="grid grid-cols-2 gap-2">
          {diagnosis.reportedSymptom && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Reported</p>
              <p className="text-xs font-medium text-foreground">{diagnosis.reportedSymptom}</p>
            </div>
          )}
          {diagnosis.probableIssue && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Probable Issue</p>
              <p className="text-xs font-medium text-primary">{diagnosis.probableIssue}</p>
            </div>
          )}
        </div>

        {/* Severity */}
        {diagnosis.severityLevel && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
            <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[diagnosis.severityLevel] || ""}`}>
              {diagnosis.severityLevel.charAt(0).toUpperCase() + diagnosis.severityLevel.slice(1)} Severity
            </Badge>
          </div>
        )}

        {/* Duration + Price Row */}
        <div className="flex gap-3">
          {diagnosis.estimatedDuration && (
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">~{diagnosis.estimatedDuration}min</span>
            </div>
          )}
          {diagnosis.estimatedMinPrice && diagnosis.estimatedMaxPrice && (
            <div className="flex items-center gap-1.5 text-xs">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                Rs {diagnosis.estimatedMinPrice.toLocaleString()} – {diagnosis.estimatedMaxPrice.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Possible Parts */}
        {diagnosis.possibleParts && diagnosis.possibleParts.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Package className="w-3 h-3" /> Prepare Parts
            </p>
            <div className="space-y-1">
              {diagnosis.possibleParts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{p.name}</span>
                  <span className="text-muted-foreground">{p.probability}% likely</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Findings */}
        {diagnosis.keyFindings && diagnosis.keyFindings.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Customer Findings
            </p>
            <ul className="space-y-0.5">
              {diagnosis.keyFindings.slice(0, 5).map((f, i) => (
                <li key={i} className="text-[11px] text-foreground">{f}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
