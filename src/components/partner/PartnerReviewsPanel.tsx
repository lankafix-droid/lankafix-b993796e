/**
 * PartnerReviewsPanel — Shows per-job customer ratings and feedback.
 * Used in partner dashboard to make service quality feedback visible and actionable.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PartnerReview {
  id: string;
  booking_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  category_code?: string;
}

interface Props {
  partnerId: string;
  ratingAverage: number | null;
}

const RATING_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: "Poor", emoji: "😞" },
  2: { label: "Fair", emoji: "😐" },
  3: { label: "Good", emoji: "🙂" },
  4: { label: "Very Good", emoji: "😊" },
  5: { label: "Excellent", emoji: "🎉" },
};

export default function PartnerReviewsPanel({ partnerId, ratingAverage }: Props) {
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id, booking_id, rating, review_text, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setReviews(data);
        const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        data.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
        setRatingDistribution(dist);
      }
      setLoading(false);
    };
    load();
  }, [partnerId]);

  const totalReviews = reviews.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Your Service Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {ratingAverage ? Number(ratingAverage).toFixed(1) : "—"}
              </p>
              <div className="flex items-center gap-0.5 justify-center mt-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i <= Math.round(ratingAverage || 0) ? "fill-warning text-warning" : "text-muted"}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{totalReviews} reviews</p>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingDistribution[star] || 0;
                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-3 text-right">{star}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-5">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {totalReviews === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No customer reviews yet. Complete jobs to start building your reputation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Individual reviews */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Recent Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/30">
            {reviews.map(review => {
              const info = RATING_LABELS[review.rating] || RATING_LABELS[3];
              return (
                <div key={review.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i <= review.rating ? "fill-warning text-warning" : "text-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {info.emoji} {info.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      "{review.review_text}"
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-medium">Verified Job</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {review.booking_id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
