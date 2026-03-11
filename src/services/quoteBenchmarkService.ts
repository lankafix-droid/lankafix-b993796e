/**
 * Quote Benchmark Service — Chunk 5E
 * Ops-only advisory benchmarks from real approved quote history.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BenchmarkStatus =
  | "within_range"
  | "slightly_high"
  | "significantly_high"
  | "significantly_low"
  | "insufficient_data";

export interface QuoteBenchmark {
  benchmark_status: BenchmarkStatus;
  average_lkr: number | null;
  median_lkr: number | null;
  sample_size: number;
  variance_note: string | null;
  ops_recommendation: string;
}

export interface BenchmarkInput {
  category_code: string;
  service_type?: string;
  zone_code?: string;
  part_grade?: string;
  total_lkr: number;
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function classify(total: number, avg: number): { status: BenchmarkStatus; note: string | null; rec: string } {
  const ratio = total / avg;
  if (ratio > 1.5) return { status: "significantly_high", note: `${Math.round((ratio - 1) * 100)}% above average`, rec: "Review itemised breakdown before approval" };
  if (ratio > 1.2) return { status: "slightly_high", note: `${Math.round((ratio - 1) * 100)}% above average`, rec: "Acceptable if justified by parts/complexity" };
  if (ratio < 0.5) return { status: "significantly_low", note: `${Math.round((1 - ratio) * 100)}% below average`, rec: "Verify scope — possible underquote or missing items" };
  return { status: "within_range", note: null, rec: "Quote is within normal market range" };
}

async function fetchBenchmark(input: BenchmarkInput): Promise<QuoteBenchmark> {
  // Query approved quotes for same category
  let q = supabase
    .from("quotes")
    .select("total_lkr, part_grade, booking_id")
    .eq("status", "approved")
    .not("total_lkr", "is", null);

  // We need category from bookings — fetch approved quotes then filter
  // For efficiency, get quotes with their booking's category via a second lightweight query
  const { data: approvedQuotes } = await q.order("created_at", { ascending: false }).limit(500);
  if (!approvedQuotes || approvedQuotes.length === 0) {
    return { benchmark_status: "insufficient_data", average_lkr: null, median_lkr: null, sample_size: 0, variance_note: null, ops_recommendation: "No approved quotes in system yet" };
  }

  // Get booking IDs to filter by category
  const bookingIds = [...new Set(approvedQuotes.map(q => q.booking_id))];
  let bq = supabase
    .from("bookings")
    .select("id, category_code, service_type, zone_code")
    .in("id", bookingIds.slice(0, 200));

  const { data: bookings } = await bq;
  const bookingMap = new Map((bookings || []).map(b => [b.id, b]));

  // Filter quotes by category (required), then optionally narrow
  let filtered = approvedQuotes.filter(q => {
    const b = bookingMap.get(q.booking_id);
    return b && b.category_code === input.category_code;
  });

  // Narrow by service_type if enough data
  if (input.service_type && filtered.length >= 5) {
    const narrower = filtered.filter(q => bookingMap.get(q.booking_id)?.service_type === input.service_type);
    if (narrower.length >= 5) filtered = narrower;
  }

  // Narrow by part_grade if enough data
  if (input.part_grade && filtered.length >= 5) {
    const narrower = filtered.filter(q => q.part_grade === input.part_grade);
    if (narrower.length >= 5) filtered = narrower;
  }

  const totals = filtered.map(q => q.total_lkr!).filter(Boolean) as number[];
  if (totals.length < 5) {
    return { benchmark_status: "insufficient_data", average_lkr: null, median_lkr: null, sample_size: totals.length, variance_note: null, ops_recommendation: "Fewer than 5 comparable quotes — benchmark unavailable" };
  }

  const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  const med = median(totals);
  const { status, note, rec } = classify(input.total_lkr, avg);

  return {
    benchmark_status: status,
    average_lkr: avg,
    median_lkr: med,
    sample_size: totals.length,
    variance_note: note,
    ops_recommendation: rec,
  };
}

export function useQuoteBenchmark(input: BenchmarkInput | null) {
  return useQuery({
    queryKey: ["quote-benchmark", input],
    queryFn: () => fetchBenchmark(input!),
    enabled: !!input && !!input.category_code && input.total_lkr > 0,
    staleTime: 30_000,
  });
}
