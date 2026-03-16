import { getIssuesForCategory } from "@/data/consumerBookingCategories";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  categoryCode: string;
  selected: string;
  onSelect: (issueId: string) => void;
}

const IssueSelectionStep = ({ categoryCode, selected, onSelect }: Props) => {
  const issues = getIssuesForCategory(categoryCode);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">What's the issue?</h2>
        <p className="text-sm text-muted-foreground mt-1">Select the problem that best describes your situation.</p>
      </div>
      <div className="space-y-2">
        {issues.map((issue, i) => (
          <motion.button
            key={issue.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            onClick={() => onSelect(issue.id)}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] ${
              selected === issue.id
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border/50 bg-card hover:border-border"
            }`}
          >
            <span className="text-sm font-medium text-foreground">{issue.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default IssueSelectionStep;
