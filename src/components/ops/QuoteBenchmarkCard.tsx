import { useQuoteBenchmark, type BenchmarkInput, type BenchmarkStatus } from "@/services/quoteBenchmarkService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

const statusConfig: Record<BenchmarkStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  within_range: { label: "Within Range", variant: "default" },
  slightly_high: { label: "Slightly High", variant: "secondary" },
  significantly_high: { label: "Significantly High", variant: "destructive" },
  significantly_low: { label: "Significantly Low", variant: "destructive" },
  insufficient_data: { label: "Insufficient Data", variant: "outline" },
};

interface Props {
  input: BenchmarkInput | null;
}

export default function QuoteBenchmarkCard({ input }: Props) {
  const { data, isLoading } = useQuoteBenchmark(input);
  if (!input || isLoading || !data) return null;

  const cfg = statusConfig[data.benchmark_status];

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Quote Benchmark (Ops)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        </div>
        {data.average_lkr != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg / Median</span>
            <span>Rs.{data.average_lkr.toLocaleString()} / Rs.{data.median_lkr?.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sample</span>
          <span>{data.sample_size} quotes</span>
        </div>
        {data.variance_note && <p className="text-xs text-muted-foreground">{data.variance_note}</p>}
        <p className="text-xs font-medium">{data.ops_recommendation}</p>
      </CardContent>
    </Card>
  );
}
