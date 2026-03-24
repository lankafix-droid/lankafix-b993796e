/**
 * DetailsStep — Step 2: Select common issue and describe the problem.
 */
import { Textarea } from "@/components/ui/textarea";

interface DetailsStepProps {
  issues: { id: string; label: string; hint?: string }[];
  selectedIssue: string;
  description: string;
  onSelectIssue: (id: string, label: string) => void;
  onDescriptionChange: (v: string) => void;
}

export default function DetailsStep({
  issues, selectedIssue, description, onSelectIssue, onDescriptionChange,
}: DetailsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Describe the issue</h2>
        <p className="text-sm text-muted-foreground mt-1">Select the closest match or describe your problem</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {issues.map((issue) => (
          <button
            key={issue.id}
            onClick={() => onSelectIssue(issue.id, issue.label)}
            className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
              selectedIssue === issue.id ? "border-primary bg-primary/5" : "border-border/40 bg-card hover:border-primary/20"
            }`}
          >
            <p className="text-xs font-semibold text-foreground">{issue.label}</p>
            {issue.hint && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{issue.hint}</p>}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">
          Additional details <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          placeholder="Tell us more about the issue..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="rounded-xl min-h-[80px] text-sm resize-none"
        />
      </div>
    </div>
  );
}
