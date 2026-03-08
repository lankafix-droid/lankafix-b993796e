import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, AlertTriangle, Stethoscope, FileText } from "lucide-react";

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
  onContinue: () => void;
}

const CONFIDENCE_STYLES = {
  high: { label: "High Confidence", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950", icon: CheckCircle2 },
  medium: { label: "Medium Confidence", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950", icon: AlertTriangle },
  low: { label: "Low Confidence", color: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950", icon: AlertTriangle },
};

const DiagnosisSummaryCard = ({ summary, onContinue }: Props) => {
  const conf = CONFIDENCE_STYLES[summary.confidence];
  const ConfIcon = conf.icon;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Stethoscope className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Diagnosis Summary</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Here's what we've identified based on your answers. Your technician will verify everything on-site.
      </p>

      {/* Summary Card */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {/* Confidence Badge */}
        <div className={`flex items-center gap-2 px-4 py-2.5 ${conf.color}`}>
          <ConfIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{conf.label} Diagnosis</span>
        </div>

        {/* Summary Grid */}
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

        {/* Key Findings */}
        {summary.keyFindings.length > 0 && (
          <div className="border-t px-4 py-3">
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

        {/* Technician Notes */}
        {summary.technicianNotes.length > 0 && (
          <div className="border-t px-4 py-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Technician will verify:</p>
            <ul className="space-y-1">
              {summary.technicianNotes.map((n, i) => (
                <li key={i} className="text-xs text-muted-foreground">{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Reassurance */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
        <p className="text-sm text-foreground font-medium">What happens next?</p>
        <p className="text-xs text-muted-foreground mt-1">
          This summary will be shared with your assigned technician so they can arrive prepared with the right tools and parts. No repair begins without your approval.
        </p>
      </div>

      <Button onClick={onContinue} size="lg" className="w-full gap-2">
        Continue to Booking <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default DiagnosisSummaryCard;
