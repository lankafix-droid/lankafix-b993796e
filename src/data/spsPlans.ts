/**
 * LankaFix SPS — Default Plan Definitions (seed data + recommendation engine)
 */
import type { SPSPlan, SPSSegment, FindMyPlanInputs, FitConfidence, PrinterClass } from "@/types/sps";

export const SPS_PLANS: SPSPlan[] = [
  // ── Group A: Home & Student ──
  {
    id: "plan-home-lite", plan_code: "HOME_LITE", plan_name: "Home Lite",
    segment: "home", best_for: "Light personal printing – letters, forms, occasional documents",
    printer_class: "mono_laser", monthly_fee: 1990, included_pages: 200, overage_rate: 5,
    deposit_amount: 5000, setup_fee: 1500, support_level: "basic", uptime_priority: "normal",
    min_term_months: 6, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: false, is_active: true, sort_order: 1,
    plan_description: "Affordable mono laser for light home use. Perfect for occasional printing needs.",
    features: ["200 pages/month included", "Mono laser printer", "Basic phone support", "Free delivery & setup"],
  },
  {
    id: "plan-home-smart", plan_code: "HOME_SMART", plan_name: "Home Smart",
    segment: "home", best_for: "Regular home printing – school work, recipes, home projects",
    printer_class: "ink_tank", monthly_fee: 2490, included_pages: 400, overage_rate: 4,
    deposit_amount: 5000, setup_fee: 1500, support_level: "standard", uptime_priority: "normal",
    min_term_months: 6, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: false, is_active: true, sort_order: 2,
    plan_description: "Ink tank printer with generous page allowance for busy households.",
    features: ["400 pages/month included", "Ink tank printer", "Standard support", "Low-cost colour option"],
  },
  {
    id: "plan-family-print", plan_code: "FAMILY_PRINT", plan_name: "Family Print",
    segment: "student", best_for: "Student homework, family documents, school projects",
    printer_class: "mono_mfp_laser", monthly_fee: 2990, included_pages: 500, overage_rate: 4,
    deposit_amount: 7500, setup_fee: 1500, support_level: "standard", uptime_priority: "normal",
    min_term_months: 6, meter_submission_type: "manual", pause_allowed: true,
    is_custom_quote: false, is_active: true, sort_order: 3,
    plan_description: "Print, scan & copy for the whole family. Ideal for students and busy households.",
    features: ["500 pages/month included", "Print + Scan + Copy", "Pause-friendly for school holidays", "Standard support"],
  },
  {
    id: "plan-student-study", plan_code: "STUDENT_STUDY", plan_name: "Student Study Plan",
    segment: "student", best_for: "University students – notes, assignments, research papers",
    printer_class: "mono_laser", monthly_fee: 1790, included_pages: 300, overage_rate: 4,
    deposit_amount: 5000, setup_fee: 1000, support_level: "basic", uptime_priority: "normal",
    min_term_months: 6, meter_submission_type: "manual", pause_allowed: true,
    is_custom_quote: false, is_active: true, sort_order: 4,
    plan_description: "Budget-friendly plan for students. Pause during holidays, resume when needed.",
    features: ["300 pages/month included", "Mono laser", "Holiday pause option", "Student-friendly pricing"],
  },
  // ── Group B: Tuition / Small Business ──
  {
    id: "plan-tuition-print", plan_code: "TUITION_PRINT", plan_name: "Tuition Print",
    segment: "tuition", best_for: "Tuition classes – worksheets, question papers, handouts",
    printer_class: "mono_mfp_laser", monthly_fee: 3990, included_pages: 1000, overage_rate: 3,
    deposit_amount: 10000, setup_fee: 2000, support_level: "standard", uptime_priority: "normal",
    min_term_months: 6, meter_submission_type: "manual", pause_allowed: true,
    is_custom_quote: false, is_active: true, sort_order: 5,
    plan_description: "High-volume plan for tuition classes. Print worksheets, papers, and handouts reliably.",
    features: ["1,000 pages/month included", "Print + Scan + Copy", "Term pause option", "Priority consumable delivery"],
  },
  {
    id: "plan-home-office-pro", plan_code: "HOME_OFFICE_PRO", plan_name: "Home Office Pro",
    segment: "home_office", best_for: "Freelancers, remote workers, home-based professionals",
    printer_class: "mono_mfp_laser", monthly_fee: 3490, included_pages: 750, overage_rate: 3.5,
    deposit_amount: 7500, setup_fee: 1500, support_level: "standard", uptime_priority: "normal",
    min_term_months: 6, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: false, is_active: true, sort_order: 6,
    plan_description: "Professional-grade MFP for home office. Scan, copy, and print with confidence.",
    features: ["750 pages/month included", "Print + Scan + Copy", "Wi-Fi enabled", "Standard support"],
  },
  {
    id: "plan-small-biz-mono", plan_code: "SMALL_BIZ_MONO", plan_name: "Small Biz Mono",
    segment: "small_business", best_for: "Shops, boutiques, small retail – invoices, receipts, labels",
    printer_class: "mono_laser", monthly_fee: 2990, included_pages: 600, overage_rate: 3.5,
    deposit_amount: 7500, setup_fee: 1500, support_level: "standard", uptime_priority: "normal",
    min_term_months: 6, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: false, is_active: true, sort_order: 7,
    plan_description: "Reliable mono printing for small businesses. Clear invoices and receipts every day.",
    features: ["600 pages/month included", "Mono laser", "Business support hours", "Fast consumable delivery"],
  },
  // ── Group C: SME / Office ──
  {
    id: "plan-biz-mono", plan_code: "BIZ_MONO", plan_name: "Biz Mono",
    segment: "sme_office", best_for: "Office teams – correspondence, reports, internal docs",
    printer_class: "mono_laser", monthly_fee: 4490, included_pages: 1500, overage_rate: 2.5,
    deposit_amount: 15000, setup_fee: 2500, support_level: "priority", uptime_priority: "high",
    min_term_months: 12, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: false, is_active: true, sort_order: 8,
    plan_description: "High-duty mono laser for office environments. Fast, reliable, supported.",
    features: ["1,500 pages/month included", "Priority support", "Next-day technician visit", "Network ready"],
  },
  {
    id: "plan-biz-mfp", plan_code: "BIZ_MFP", plan_name: "Biz Multifunction",
    segment: "sme_office", best_for: "SME offices – printing, scanning, copying in one device",
    printer_class: "mono_mfp_laser", monthly_fee: 5990, included_pages: 2000, overage_rate: 2,
    deposit_amount: 20000, setup_fee: 3000, support_level: "priority", uptime_priority: "high",
    min_term_months: 12, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: false, is_active: true, sort_order: 9,
    plan_description: "All-in-one MFP for growing offices. Print, scan, copy with priority support.",
    features: ["2,000 pages/month included", "Print + Scan + Copy + Fax", "Priority support", "Network + Wi-Fi", "Next-day technician"],
  },
  {
    id: "plan-biz-office-plus", plan_code: "BIZ_OFFICE_PLUS", plan_name: "Biz Office Plus",
    segment: "sme_office", best_for: "Larger offices needing maximum throughput and uptime",
    printer_class: "mono_mfp_laser", monthly_fee: 7990, included_pages: 3000, overage_rate: 1.75,
    deposit_amount: 25000, setup_fee: 3500, support_level: "premium", uptime_priority: "critical",
    min_term_months: 12, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: false, is_active: true, sort_order: 10,
    plan_description: "Premium office plan with maximum pages and fastest support response.",
    features: ["3,000 pages/month included", "Premium support with 4hr response", "Backup device coverage", "Full MFP", "Duplex + Network"],
  },
  // ── Group D: Advanced / Custom ──
  {
    id: "plan-biz-colour", plan_code: "BIZ_COLOUR", plan_name: "Biz Colour",
    segment: "sme_office", best_for: "Marketing teams, design studios needing colour output",
    printer_class: "colour_mfp", monthly_fee: 0, included_pages: 0, overage_rate: 0,
    deposit_amount: 0, setup_fee: 0, support_level: "premium", uptime_priority: "high",
    min_term_months: 12, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: true, is_active: true, sort_order: 11,
    plan_description: "Colour MFP for professional colour output. Custom pricing based on requirements.",
    features: ["Custom page allocation", "Colour MFP device", "Custom quote required", "LankaFix Review"],
  },
  {
    id: "plan-institution", plan_code: "INSTITUTION", plan_name: "Institution Plan",
    segment: "business_institution", best_for: "Schools, corporates, government offices",
    printer_class: "business_mfp", monthly_fee: 0, included_pages: 0, overage_rate: 0,
    deposit_amount: 0, setup_fee: 0, support_level: "premium", uptime_priority: "critical",
    min_term_months: 12, meter_submission_type: "manual", pause_allowed: false,
    is_custom_quote: true, is_active: true, sort_order: 12,
    plan_description: "Enterprise-grade printing for institutions. Multi-device fleet support available.",
    features: ["Custom page allocation", "Multi-device options", "Dedicated account manager", "LankaFix Review Required"],
  },
];

export function getPlanById(id: string): SPSPlan | undefined {
  return SPS_PLANS.find((p) => p.id === id);
}

export function getPlanByCode(code: string): SPSPlan | undefined {
  return SPS_PLANS.find((p) => p.plan_code === code);
}

export function getPlansBySegment(segment: SPSSegment): SPSPlan[] {
  return SPS_PLANS.filter((p) => p.segment === segment && p.is_active);
}

export function getGroupedPlans() {
  return {
    "Home & Student": SPS_PLANS.filter((p) => ["home", "student"].includes(p.segment) && p.is_active),
    "Tuition & Small Business": SPS_PLANS.filter((p) => ["tuition", "home_office", "small_business"].includes(p.segment) && p.is_active),
    "SME & Office": SPS_PLANS.filter((p) => p.segment === "sme_office" && p.is_active && !p.is_custom_quote),
    "Advanced / Custom": SPS_PLANS.filter((p) => (p.is_custom_quote || p.segment === "business_institution") && p.is_active),
  };
}

/** Recommendation engine */
export function recommendPlan(inputs: FindMyPlanInputs): { plan: SPSPlan; confidence: FitConfidence; reason: string } {
  const candidates = SPS_PLANS.filter((p) => p.is_active && !p.is_custom_quote);

  let scored = candidates.map((plan) => {
    let score = 0;
    let reasons: string[] = [];

    // Segment match
    if (plan.segment === inputs.userType) { score += 30; reasons.push("Matches your user type"); }

    // Page volume fit
    if (inputs.monthlyPages <= plan.included_pages) { score += 25; reasons.push(`Covers your ${inputs.monthlyPages} pages/month`); }
    else if (inputs.monthlyPages <= plan.included_pages * 1.3) { score += 10; reasons.push("Close to your page needs with small overage"); }

    // Multifunction
    if (inputs.needsMultifunction && ["mono_mfp_laser", "colour_mfp", "business_mfp"].includes(plan.printer_class)) {
      score += 15; reasons.push("Includes scan & copy");
    }
    if (!inputs.needsMultifunction && plan.printer_class === "mono_laser") { score += 5; }

    // Budget
    if (inputs.budgetPreference === "lowest" && plan.monthly_fee <= 2500) { score += 10; reasons.push("Budget-friendly"); }
    if (inputs.budgetPreference === "premium" && plan.support_level === "priority") { score += 10; reasons.push("Premium reliability"); }

    // Pause for seasonal
    if (inputs.seasonalUsage && plan.pause_allowed) { score += 10; reasons.push("Supports seasonal pause"); }

    // Colour preference
    if (inputs.monoOrColour === "colour" && !["colour_laser", "colour_mfp", "ink_tank"].includes(plan.printer_class)) { score -= 10; }

    return { plan, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  let confidence: FitConfidence = "recommended";
  if (best.score < 30) confidence = "review_required";
  else if (best.score < 50) confidence = "good_fit";

  // If custom quote territory
  if (inputs.monthlyPages > 3000 || inputs.userType === "business_institution") {
    const customPlan = SPS_PLANS.find((p) => p.plan_code === "INSTITUTION")!;
    return { plan: customPlan, confidence: "review_required", reason: "Your requirements suggest a custom enterprise solution. A LankaFix advisor will tailor the perfect plan." };
  }

  return {
    plan: best.plan,
    confidence,
    reason: best.reasons.slice(0, 3).join(". ") + ".",
  };
}
