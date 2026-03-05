/**
 * LankaFix Quote Engine
 * Generates demo quotes for testing the quote approval flow.
 */
import type { QuoteData, QuoteOption, CategoryCode, PartQuality } from "@/types/booking";

const QUALITY_LABELS: Record<PartQuality, string> = {
  genuine: "Genuine Parts",
  oem_grade: "OEM Grade Parts",
  compatible: "Compatible Parts",
};

const QUALITY_MULTIPLIERS: Record<PartQuality, number> = {
  genuine: 1.0,
  oem_grade: 0.7,
  compatible: 0.45,
};

const WARRANTY_DAYS: Record<PartQuality, { laborDays: number; partsDays: number; labor: string; parts: string }> = {
  genuine: { laborDays: 90, partsDays: 365, labor: "90 days", parts: "Manufacturer warranty (12 months)" },
  oem_grade: { laborDays: 90, partsDays: 180, labor: "90 days", parts: "OEM warranty (6 months)" },
  compatible: { laborDays: 90, partsDays: 90, labor: "90 days", parts: "LankaFix warranty (3 months)" },
};

function generateOption(
  id: string,
  quality: PartQuality,
  basePartsCost: number,
  laborCost: number
): QuoteOption {
  const multiplier = QUALITY_MULTIPLIERS[quality];
  const partsCost = Math.round(basePartsCost * multiplier);
  const wiring = Math.round(2500 * multiplier);
  const addOnCost = quality === "genuine" ? 3000 : quality === "oem_grade" ? 1500 : 0;

  const laborItems = [
    { description: "Site inspection & assessment", amount: 3000 },
    { description: "Installation / repair labor", amount: laborCost },
    { description: "Configuration & testing", amount: 2000 },
  ];
  const partsItems = [
    { description: `Primary component (${QUALITY_LABELS[quality]})`, amount: partsCost, partQuality: quality },
    { description: "Wiring & connectors", amount: wiring, partQuality: quality },
  ];
  const addOns = addOnCost > 0
    ? [{ description: `Extended warranty (${quality === "genuine" ? "6" : "3"} months)`, amount: addOnCost }]
    : [];

  const laborTotal = laborItems.reduce((s, i) => s + i.amount, 0);
  const partsTotal = partsItems.reduce((s, i) => s + i.amount, 0);
  const addOnsTotal = addOns.reduce((s, i) => s + i.amount, 0);

  return {
    id,
    label: `Option ${id} — ${QUALITY_LABELS[quality]}`,
    laborItems,
    partsItems,
    addOns,
    totals: { labor: laborTotal, parts: partsTotal, addOns: addOnsTotal, total: laborTotal + partsTotal + addOnsTotal },
    warranty: WARRANTY_DAYS[quality],
    partQuality: quality,
  };
}

export function generateDemoQuote(
  categoryCode: CategoryCode,
  serviceCode: string,
  fromPrice: number
): QuoteData {
  const baseParts = Math.max(fromPrice * 0.6, 5000);
  const laborCost = Math.max(fromPrice * 0.3, 3000);

  const optionA = generateOption("A", "genuine", baseParts, laborCost);
  const optionB = generateOption("B", "oem_grade", baseParts, laborCost);
  const optionC = generateOption("C", "compatible", baseParts, laborCost);

  return {
    options: [optionA, optionB, optionC],
    selectedOptionId: null,
    recommendedOptionId: "B",
    recommendedReason: "Best balance of quality, warranty coverage, and price for this service type.",
    scopeIncludes: [
      "Full site inspection and assessment",
      "Component replacement and installation",
      "Post-installation testing and calibration",
      "Clean-up and disposal of old parts",
    ],
    scopeExcludes: [
      "Structural modifications to walls or ceilings",
      "Electrical rewiring beyond connection points",
      "Additional units not listed in quote",
    ],
    notes: "Quote valid for the listed scope only. Any additional work discovered during service will require a revised quote. Parts availability may affect timeline by 1–3 business days.",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    inspectionFindings: [
      "Primary component shows signs of wear and requires replacement",
      "Secondary connections in acceptable condition",
      "Electrical supply meets requirements for the repair",
    ],
    // Legacy compat
    laborItems: optionA.laborItems,
    partsItems: optionA.partsItems,
    addOns: optionA.addOns,
    totals: optionA.totals,
    warranty: optionA.warranty,
  };
}
