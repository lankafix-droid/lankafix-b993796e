/**
 * Lightweight analytics wrapper — swap internals for GA/Meta later.
 * All UI interaction events flow through this single entry point.
 * 
 * Standard event names:
 *   homepage_search, category_click, booking_start, booking_complete,
 *   technician_view, quote_request, ai_search_use, popular_click,
 *   emergency_click, quickbook_click, hero_book_click, hero_diagnose_click,
 *   search_select, search_suggestion_click, faq_toggle, support_click
 */

export function track(event: string, payload?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${event}`, payload ?? {});
  }

  // Future: send to GA4 / Meta Pixel / PostHog
  // gtag('event', event, payload);
}
