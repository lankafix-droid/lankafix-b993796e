/**
 * Lightweight analytics wrapper.
 * All UI interaction events flow through this single entry point.
 * Swap internals for GA4 / PostHog / Meta Pixel when ready.
 *
 * Event naming convention: {page}_{action}
 *   homepage_search_focus, homepage_search_select, homepage_search_suggestion,
 *   homepage_category_click, homepage_popular_click, homepage_hero_category,
 *   homepage_emergency_click, homepage_book_again_click, homepage_technician_view,
 *   homepage_support_click, homepage_faq_expand,
 *   booking_start, booking_complete, booking_cancel,
 *   quote_request, quote_approve, quote_reject,
 *   technician_view, ai_search_use, ai_diagnose_use
 */
export function track(event: string, payload?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${event}`, payload ?? {});
  }
  // Future: gtag('event', event, payload);
}
