/**
 * LankaFix Smart Price Estimator
 * Shows estimated repair cost based on historical quote data for the category.
 * Dramatically increases booking conversion.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Info } from "lucide-react";

interface SmartPriceEstimatorProps {
  categoryCode: string;
  serviceType?: string;
}

interface PriceEstimate {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  sampleSize: number;
  confidence: "high" | "medium" | "low";
}

export default function SmartPriceEstimator({ categoryCode, serviceType }: SmartPriceEstimatorProps) {
  const { data: estimate, isLoading } = useQuery<PriceEstimate | null>({
    queryKey: ["price-estimate", categoryCode, serviceType],
    queryFn: async () => {
      // Query approved quotes joined with bookings for this category
      const { data: bookingIds } = await supabase
        .from("bookings")
        .select("id")
        .eq("category_code", categoryCode)
        .limit(200);

      if (!bookingIds || bookingIds.length === 0) return null;

      const ids = bookingIds.map((b) => b.id);
      const { data: quotes } = await supabase
        .from("quotes")
        .select("total_lkr")
        .in("booking_id", ids)
        .eq("status", "approved")
        .not("total_lkr", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!quotes || quotes.length < 3) return null;

      const prices = quotes.map((q) => q.total_lkr!).filter(Boolean).sort((a, b) => a - b);
      if (prices.length < 3) return null;

      // Remove outliers (top/bottom 10%)
      const trimStart = Math.floor(prices.length * 0.1);
      const trimEnd = Math.ceil(prices.length * 0.9);
      const trimmed = prices.slice(trimStart, trimEnd);

      const avg = Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
      const min = trimmed[0];
      const max = trimmed[trimmed.length - 1];

      const confidence: PriceEstimate["confidence"] =
        trimmed.length >= 20 ? "high" : trimmed.length >= 10 ? "medium" : "low";

      return { avgPrice: avg, minPrice: min, maxPrice: max, sampleSize: trimmed.length, confidence };
    },
    staleTime: 300_000, // Cache 5 min
  });

  if (isLoading || !estimate) return null;

  const confidenceColors = {
    high: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Estimated Cost</span>
          </div>
          <Badge variant="outline" className={`text-[9px] ${confidenceColors[estimate.confidence]}`}>
            {estimate.confidence === "high" ? "High confidence" : estimate.confidence === "medium" ? "Based on data" : "Estimate"}
          </Badge>
        </div>

        <div className="text-center py-2">
          <p className="text-2xl font-bold text-primary">
            LKR {estimate.avgPrice.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Range: LKR {estimate.minPrice.toLocaleString()} – {estimate.maxPrice.toLocaleString()}
          </p>
        </div>

        <div className="flex items-start gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Based on {estimate.sampleSize} completed jobs. Final price confirmed after on-site inspection and your approval.
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-2 justify-center">
          <Shield className="w-3 h-3 text-success" />
          <span className="text-[10px] text-muted-foreground">No work starts without your quote approval</span>
        </div>
      </CardContent>
    </Card>
  );
}
