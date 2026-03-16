import { Textarea } from "@/components/ui/textarea";

interface Props {
  description: string;
  onChange: (value: string) => void;
}

const DescriptionStep = ({ description, onChange }: Props) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-bold text-foreground">Describe the Issue</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Add any extra details — when it started, what you've tried, etc. (Optional)
      </p>
    </div>
    <Textarea
      placeholder="E.g., My phone screen cracked after a fall yesterday. Touch still works on the left side…"
      value={description}
      onChange={(e) => onChange(e.target.value)}
      rows={5}
      maxLength={1000}
      className="resize-none"
    />
    <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
  </div>
);

export default DescriptionStep;
