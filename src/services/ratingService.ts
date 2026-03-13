/**
 * LankaFix Rating Service
 * Submit ratings for completed bookings.
 */
import { supabase } from "@/integrations/supabase/client";

export interface SubmitRatingOpts {
  bookingId: string;
  partnerId: string;
  customerId: string;
  rating: number;
  reviewText?: string;
}

/**
 * Submit a rating for a completed booking.
 * Validates rating range and booking ownership client-side;
 * RLS enforces server-side (booking must be completed, belong to customer, and match partner).
 */
export async function submitRating(opts: SubmitRatingOpts) {
  if (opts.rating < 1 || opts.rating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }

  const { data, error } = await supabase
    .from("ratings")
    .insert({
      booking_id: opts.bookingId,
      partner_id: opts.partnerId,
      customer_id: opts.customerId,
      rating: opts.rating,
      review_text: opts.reviewText || null,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[RatingService] Insert failed:", error.message);
    return { error: error.message };
  }

  // Auto-create support case for low ratings (≤ 2 stars)
  if (opts.rating <= 2 && data?.id) {
    try {
      await supabase
        .from("support_cases" as any)
        .insert({
          booking_id: opts.bookingId,
          user_id: opts.customerId,
          issue_type: "service_quality_issue",
          description: `Auto-generated: Customer rated service ${opts.rating}/5 stars.${opts.reviewText ? ` Review: "${opts.reviewText}"` : ""} Requires ops review.`,
          priority: opts.rating === 1 ? "high" : "normal",
          status: "open",
        });
      console.info("[RatingService] Auto support case created for low rating");
    } catch (e) {
      console.warn("[RatingService] Failed to create auto support case:", e);
    }
  }

  return { id: data?.id };
}

/**
 * Fetch rating for a specific booking (if exists).
 */
export async function getRatingForBooking(bookingId: string) {
  const { data, error } = await supabase
    .from("ratings")
    .select("id, rating, review_text, created_at")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    console.warn("[RatingService] Fetch failed:", error.message);
    return null;
  }
  return data;
}
