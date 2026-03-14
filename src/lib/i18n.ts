/**
 * LankaFix Multilingual Architecture
 * 
 * Lightweight i18n system supporting English (default), Sinhala, and Tamil.
 * Uses a flat key-value structure with namespace prefixes.
 * 
 * Usage:
 *   const { t, locale, setLocale } = useI18n();
 *   t("home.hero_title")  // → "Sri Lanka's Trusted Repair & Service Platform"
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import React from "react";

export type Locale = "en" | "si" | "ta";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};

// ─── Translation Dictionaries ────────────────────────────────────
// Phase 1: English complete. Sinhala/Tamil keys added progressively.

type Dict = Record<string, string>;

const en: Dict = {
  // Common
  "common.book_now": "Book Now",
  "common.coming_soon": "Coming Soon",
  "common.join_waitlist": "Join Waitlist",
  "common.search_placeholder": "What do you need fixed today?",
  "common.pay_after_service": "Pay After Service",
  "common.learn_more": "Learn More",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.back": "Back",
  "common.next": "Next",
  "common.loading": "Loading...",

  // Home
  "home.hero_title": "Sri Lanka's Trusted Repair & Service Platform",
  "home.hero_subtitle": "Verified technicians • Transparent quotes • Warranty-backed repairs",
  "home.diagnose_cta": "Diagnose My Issue",
  "home.serving_area": "Serving Greater Colombo",
  "home.trust_verified": "Verified Technicians",
  "home.trust_pricing": "Transparent Pricing",
  "home.trust_warranty": "Warranty-Backed Service",
  "home.trust_invoice": "Digital Invoice",

  // Booking
  "booking.step_select": "Select Service",
  "booking.step_describe": "Describe Issue",
  "booking.step_confirm": "Confirm Booking",
  "booking.step_assigned": "Technician Assigned",
  "booking.step_pay": "Pay After Service",
  "booking.diagnosis_first": "Diagnosis required before quote",
  "booking.inspection_required": "Inspection required",
  "booking.no_advance_payment": "No advance payment required for most services",

  // Support
  "support.title": "How can we help?",
  "support.whatsapp": "WhatsApp Support",
  "support.faq": "Help Center / FAQ",
  "support.track": "Track Your Job",
  "support.chat_placeholder": "Ask about pricing, warranty, services...",

  // Tracker
  "tracker.assigned": "Technician Assigned",
  "tracker.on_way": "Technician On The Way",
  "tracker.started": "Service Started",
  "tracker.completed": "Service Completed",

  // Categories
  "cat.AC": "AC Service & Repair",
  "cat.MOBILE": "Mobile & Device Repair",
  "cat.IT": "IT Repair & Support",
  "cat.ELECTRONICS": "Consumer Electronics",
  "cat.CCTV": "CCTV & Security",
  "cat.SOLAR": "Solar Power",
  "cat.ELECTRICAL": "Electrical Services",
  "cat.PLUMBING": "Plumbing",
};

const si: Dict = {
  "common.book_now": "දැන් වෙන්කරවන්න",
  "common.coming_soon": "ඉක්මනින්",
  "common.search_placeholder": "අද ඔබට අවශ්‍ය අළුත්වැඩියාව කුමක්ද?",
  "common.pay_after_service": "සේවාවෙන් පසුව ගෙවන්න",
  "home.hero_title": "ශ්‍රී ලංකාවේ විශ්වාසනීය අලුත්වැඩියා හා සේවා වේදිකාව",
  "home.hero_subtitle": "සත්‍යාපිත කාර්මිකයින් • විනිවිද පෙනෙන මිල ගණන් • වගකීම් සහිත",
  "home.serving_area": "මහ කොළඹ ප්‍රදේශයේ සේවය",
  "support.title": "අපට ඔබට උදව් කළ හැක්කේ කෙසේද?",
  "support.chat_placeholder": "මිල, වගකීම්, සේවා ගැන අසන්න...",
};

const ta: Dict = {
  "common.book_now": "இப்போது முன்பதிவு செய்",
  "common.coming_soon": "விரைவில்",
  "common.search_placeholder": "இன்று என்ன பழுது பார்க்க வேண்டும்?",
  "common.pay_after_service": "சேவைக்குப் பின் பணம் செலுத்தவும்",
  "home.hero_title": "இலங்கையின் நம்பகமான பழுதுபார்ப்பு மற்றும் சேவை தளம்",
  "home.hero_subtitle": "சரிபார்க்கப்பட்ட தொழில்நுட்ப வல்லுநர்கள் • வெளிப்படையான விலை • உத்தரவாதம்",
  "home.serving_area": "கொழும்பு பகுதியில் சேவை",
  "support.title": "நாங்கள் எவ்வாறு உதவ முடியும்?",
  "support.chat_placeholder": "விலை, உத்தரவாதம், சேவைகள் பற்றி கேளுங்கள்...",
};

const dictionaries: Record<Locale, Dict> = { en, si, ta };

// ─── Context & Provider ──────────────────────────────────────────

interface I18nContext {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nCtx = createContext<I18nContext>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("lankafix_locale") as Locale | null;
    return saved && dictionaries[saved] ? saved : "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("lankafix_locale", l);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return dictionaries[locale]?.[key] || dictionaries.en[key] || fallback || key;
    },
    [locale]
  );

  return React.createElement(I18nCtx.Provider, { value: { locale, setLocale, t } }, children);
}

export function useI18n() {
  return useContext(I18nCtx);
}
