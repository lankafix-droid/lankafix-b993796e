import type { CategoryCode } from "@/types/booking";

// ─── Demand Signal Types ─────────────────────────────────────────

export type CustomerType = "household" | "small_business" | "corporate";

export interface DemandSignal {
  id: string;
  signalType: "category_view" | "diagnosis_session" | "booking_attempt" | "booking_completed" | "booking_cancelled" | "emergency_request";
  categoryCode: CategoryCode;
  zoneId: string;
  date: string;
  time: string;
  customerType: CustomerType;
  customerId?: string;
}

export type DemandLevel = "high" | "medium" | "low";

export interface ZoneDemandHeatmap {
  zoneId: string;
  zoneLabel: string;
  totalSignals: number;
  bookings: number;
  cancellations: number;
  emergencies: number;
  demandLevel: DemandLevel;
  topCategory: CategoryCode;
}

// ─── Supply Analysis ─────────────────────────────────────────────

export interface TechnicianSupplyAnalysis {
  zoneId: string;
  zoneLabel: string;
  categoryCode: CategoryCode;
  dailyBookings: number;
  availableTechnicians: number;
  coverageRatio: number; // percentage
  status: "healthy" | "warning" | "critical";
}

export interface ShortageAlert {
  id: string;
  zoneId: string;
  zoneLabel: string;
  categoryCode: CategoryCode;
  coverageRatio: number;
  avgDispatchMinutes: number;
  reason: string;
  severity: "warning" | "critical";
  createdAt: string;
}

// ─── Conversion Funnel ──────────────────────────────────────────

export interface ConversionFunnel {
  categoryCode: CategoryCode;
  categoryViewed: number;
  diagnosisStarted: number;
  diagnosisCompleted: number;
  bookingInitiated: number;
  bookingConfirmed: number;
  jobCompleted: number;
}

export function computeConversionRates(funnel: ConversionFunnel) {
  const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  return {
    viewToDiagnosis: rate(funnel.diagnosisStarted, funnel.categoryViewed),
    diagnosisToBooking: rate(funnel.bookingInitiated, funnel.diagnosisCompleted),
    bookingToComplete: rate(funnel.jobCompleted, funnel.bookingConfirmed),
    overallConversion: rate(funnel.jobCompleted, funnel.categoryViewed),
  };
}

// ─── Cancellation Analytics ─────────────────────────────────────

export type CancellationReason =
  | "price_too_high"
  | "issue_resolved"
  | "booked_elsewhere"
  | "technician_delay"
  | "incorrect_diagnosis"
  | "changed_mind";

export const CANCELLATION_LABELS: Record<CancellationReason, string> = {
  price_too_high: "Price too high",
  issue_resolved: "Issue resolved",
  booked_elsewhere: "Booked elsewhere",
  technician_delay: "Technician delay",
  incorrect_diagnosis: "Incorrect diagnosis",
  changed_mind: "Changed mind",
};

export interface CancellationTrend {
  reason: CancellationReason;
  count: number;
  percentage: number;
}

// ─── Repeat Customer Analysis ───────────────────────────────────

export interface RepeatCustomerMetrics {
  totalCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  avgLifetimeValue: number;
  amcAdoptionRate: number;
}

// ─── Zone Performance Score ─────────────────────────────────────

export interface ZonePerformance {
  zoneId: string;
  zoneLabel: string;
  customerSatisfaction: number; // 0-100
  dispatchSpeed: number; // 0-100
  technicianAvailability: number; // 0-100
  completionRate: number; // 0-100
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
}

export function computeZoneGrade(score: number): ZonePerformance["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function computeZonePerformance(
  satisfaction: number,
  dispatch: number,
  availability: number,
  completion: number
): number {
  return Math.round(satisfaction * 0.3 + dispatch * 0.25 + availability * 0.25 + completion * 0.2);
}

// ─── Forecasting Types ──────────────────────────────────────────

export type ForecastHorizon = "7d" | "30d" | "90d";

export interface DemandForecast {
  horizon: ForecastHorizon;
  categoryCode: CategoryCode;
  zoneId: string;
  predictedVolume: number;
  requiredTechnicians: number;
  slaRiskLevel: "low" | "medium" | "high";
  confidence: number; // 0-100
}

export interface SeasonalPattern {
  season: string;
  months: string;
  affectedCategories: CategoryCode[];
  demandMultiplier: number;
  description: string;
}

export const SEASONAL_PATTERNS: SeasonalPattern[] = [
  { season: "Hot Season", months: "Mar–May", affectedCategories: ["AC"], demandMultiplier: 1.6, description: "High AC servicing demand during peak heat" },
  { season: "School Season", months: "Jan–Feb, Sep", affectedCategories: ["IT", "COPIER", "PRINT"], demandMultiplier: 1.3, description: "Increased printer and IT demand for school/office prep" },
  { season: "Rainy Season", months: "May–Jul, Oct–Nov", affectedCategories: ["SOLAR", "ROUTER"], demandMultiplier: 1.4, description: "Electrical and connectivity issues from rain and lightning" },
  { season: "Festive Season", months: "Dec, Apr", affectedCategories: ["ELECTRONICS", "SMART_HOME"], demandMultiplier: 1.3, description: "Consumer electronics surge during holidays" },
];

// ─── District Expansion ─────────────────────────────────────────

export type ExpansionReadiness = "launch_ready" | "pilot_ready" | "waitlist_only";

export interface DistrictExpansionScore {
  districtId: string;
  districtName: string;
  diagnosisVolume: number;
  bookingConversion: number; // percentage
  technicianAvailability: number;
  demandDensity: number; // signals per 1000 residents
  avgServiceRevenue: number;
  readinessScore: number; // 0-100
  readiness: ExpansionReadiness;
}

export function classifyExpansionReadiness(score: number): ExpansionReadiness {
  if (score >= 70) return "launch_ready";
  if (score >= 45) return "pilot_ready";
  return "waitlist_only";
}

// ─── Recruitment Planner ────────────────────────────────────────

export interface RecruitmentTarget {
  zoneId: string;
  zoneLabel: string;
  categoryCode: CategoryCode;
  currentTechnicians: number;
  requiredTechnicians: number;
  deficit: number;
  priority: "urgent" | "moderate" | "low";
}

// ─── Marketing Intelligence ────────────────────────────────────

export interface MarketingInsight {
  zoneId: string;
  zoneLabel: string;
  categoryCode: CategoryCode;
  diagnosisActivity: number;
  bookingConversion: number;
  gap: number; // high activity but low conversion = opportunity
  recommendation: string;
}

// ─── Scenario Planning ─────────────────────────────────────────

export type ScenarioType = "base" | "high_demand" | "technician_shortage";

export interface DemandScenario {
  type: ScenarioType;
  label: string;
  predictedVolume: number;
  requiredTechnicians: number;
  estimatedRevenue: number;
  slaRisk: "low" | "medium" | "high";
}

// ─── Service Category Trends ────────────────────────────────────

export interface CategoryTrend {
  categoryCode: CategoryCode;
  categoryName: string;
  currentMonthBookings: number;
  previousMonthBookings: number;
  growthRate: number; // percentage
  trending: "up" | "down" | "stable";
}

// ─── Mock Data Generators ───────────────────────────────────────

const CATEGORY_CODES: CategoryCode[] = ["AC", "CCTV", "IT", "MOBILE", "SOLAR", "COPIER", "SMART_HOME_OFFICE", "CONSUMER_ELEC", "PRINT_SUPPLIES"];

const MOCK_ZONES = [
  { id: "col_05", label: "Colombo 5 - Havelock Town" },
  { id: "dehiwala", label: "Dehiwala" },
  { id: "nugegoda", label: "Nugegoda" },
  { id: "kandy_city", label: "Kandy City" },
  { id: "gampaha", label: "Gampaha" },
  { id: "maharagama", label: "Maharagama" },
  { id: "col_03", label: "Colombo 3 - Kollupitiya" },
  { id: "negombo", label: "Negombo" },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateMockHeatmap(): ZoneDemandHeatmap[] {
  return MOCK_ZONES.map((z, i) => {
    const signals = Math.round(40 + seededRandom(i * 7) * 160);
    const bookings = Math.round(signals * (0.15 + seededRandom(i * 3) * 0.25));
    const level: DemandLevel = signals > 140 ? "high" : signals > 80 ? "medium" : "low";
    return {
      zoneId: z.id,
      zoneLabel: z.label,
      totalSignals: signals,
      bookings,
      cancellations: Math.round(bookings * 0.12),
      emergencies: Math.round(bookings * 0.08),
      demandLevel: level,
      topCategory: CATEGORY_CODES[i % CATEGORY_CODES.length],
    };
  });
}

export function generateMockSupplyAnalysis(): TechnicianSupplyAnalysis[] {
  const results: TechnicianSupplyAnalysis[] = [];
  MOCK_ZONES.slice(0, 5).forEach((z, i) => {
    const cats: CategoryCode[] = ["AC", "CCTV", "IT"];
    cats.forEach((cat, j) => {
      const daily = Math.round(8 + seededRandom(i * 10 + j) * 25);
      const techs = Math.round(2 + seededRandom(i * 5 + j) * 8);
      const coverage = Math.round((techs / (daily / 4)) * 100);
      results.push({
        zoneId: z.id,
        zoneLabel: z.label,
        categoryCode: cat,
        dailyBookings: daily,
        availableTechnicians: techs,
        coverageRatio: Math.min(coverage, 100),
        status: coverage < 50 ? "critical" : coverage < 70 ? "warning" : "healthy",
      });
    });
  });
  return results;
}

export function generateMockShortageAlerts(): ShortageAlert[] {
  return [
    { id: "SA-001", zoneId: "dehiwala", zoneLabel: "Dehiwala", categoryCode: "AC", coverageRatio: 25, avgDispatchMinutes: 85, reason: "AC technician shortage detected in Dehiwala zone.", severity: "critical", createdAt: new Date().toISOString() },
    { id: "SA-002", zoneId: "kandy_city", zoneLabel: "Kandy City", categoryCode: "IT", coverageRatio: 55, avgDispatchMinutes: 48, reason: "IT repair coverage below threshold in Kandy.", severity: "warning", createdAt: new Date().toISOString() },
    { id: "SA-003", zoneId: "gampaha", zoneLabel: "Gampaha", categoryCode: "CCTV", coverageRatio: 40, avgDispatchMinutes: 62, reason: "CCTV installer shortage in Gampaha zone.", severity: "critical", createdAt: new Date().toISOString() },
  ];
}

export function generateMockFunnels(): ConversionFunnel[] {
  return CATEGORY_CODES.slice(0, 6).map((cat, i) => {
    const viewed = Math.round(500 + seededRandom(i * 13) * 1200);
    const diagStart = Math.round(viewed * (0.4 + seededRandom(i * 7) * 0.2));
    const diagComplete = Math.round(diagStart * (0.6 + seededRandom(i * 9) * 0.2));
    const bookInit = Math.round(diagComplete * (0.3 + seededRandom(i * 11) * 0.3));
    const bookConfirm = Math.round(bookInit * (0.7 + seededRandom(i * 2) * 0.2));
    const completed = Math.round(bookConfirm * (0.85 + seededRandom(i * 4) * 0.1));
    return { categoryCode: cat, categoryViewed: viewed, diagnosisStarted: diagStart, diagnosisCompleted: diagComplete, bookingInitiated: bookInit, bookingConfirmed: bookConfirm, jobCompleted: completed };
  });
}

export function generateMockCancellationTrends(): CancellationTrend[] {
  const raw: { reason: CancellationReason; count: number }[] = [
    { reason: "price_too_high", count: 45 },
    { reason: "issue_resolved", count: 32 },
    { reason: "booked_elsewhere", count: 18 },
    { reason: "technician_delay", count: 28 },
    { reason: "incorrect_diagnosis", count: 12 },
    { reason: "changed_mind", count: 22 },
  ];
  const total = raw.reduce((s, r) => s + r.count, 0);
  return raw.map((r) => ({ ...r, percentage: Math.round((r.count / total) * 100) }));
}

export function generateMockRepeatMetrics(): RepeatCustomerMetrics {
  return { totalCustomers: 3420, repeatCustomers: 890, repeatRate: 26, avgLifetimeValue: 18500, amcAdoptionRate: 12 };
}

export function generateMockZonePerformances(): ZonePerformance[] {
  return MOCK_ZONES.map((z, i) => {
    const sat = Math.round(60 + seededRandom(i * 17) * 35);
    const dispatch = Math.round(50 + seededRandom(i * 23) * 45);
    const avail = Math.round(40 + seededRandom(i * 31) * 50);
    const completion = Math.round(70 + seededRandom(i * 37) * 25);
    const overall = computeZonePerformance(sat, dispatch, avail, completion);
    return { zoneId: z.id, zoneLabel: z.label, customerSatisfaction: sat, dispatchSpeed: dispatch, technicianAvailability: avail, completionRate: completion, overallScore: overall, grade: computeZoneGrade(overall) };
  });
}

export function generateMockForecasts(): DemandForecast[] {
  const horizons: ForecastHorizon[] = ["7d", "30d", "90d"];
  const results: DemandForecast[] = [];
  horizons.forEach((h, hi) => {
    MOCK_ZONES.slice(0, 4).forEach((z, zi) => {
      const mult = h === "7d" ? 1 : h === "30d" ? 4 : 12;
      const vol = Math.round((15 + seededRandom(hi * 10 + zi) * 40) * mult);
      const techs = Math.round(vol / (4 * mult));
      results.push({
        horizon: h,
        categoryCode: CATEGORY_CODES[zi % CATEGORY_CODES.length],
        zoneId: z.id,
        predictedVolume: vol,
        requiredTechnicians: techs,
        slaRiskLevel: techs > 8 ? "high" : techs > 4 ? "medium" : "low",
        confidence: Math.round(60 + seededRandom(hi + zi) * 30),
      });
    });
  });
  return results;
}

export function generateMockExpansionScores(): DistrictExpansionScore[] {
  const districts = [
    { id: "colombo", name: "Colombo District" },
    { id: "gampaha", name: "Gampaha District" },
    { id: "kandy", name: "Kandy District" },
    { id: "galle", name: "Galle District" },
    { id: "kurunegala", name: "Kurunegala District" },
    { id: "matara", name: "Matara District" },
    { id: "jaffna", name: "Jaffna District" },
  ];
  return districts.map((d, i) => {
    const score = Math.round(30 + seededRandom(i * 19) * 60);
    return {
      districtId: d.id,
      districtName: d.name,
      diagnosisVolume: Math.round(50 + seededRandom(i * 7) * 500),
      bookingConversion: Math.round(10 + seededRandom(i * 11) * 30),
      technicianAvailability: Math.round(seededRandom(i * 3) * 20),
      demandDensity: Math.round(seededRandom(i * 13) * 50) / 10,
      avgServiceRevenue: Math.round(5000 + seededRandom(i * 23) * 15000),
      readinessScore: score,
      readiness: classifyExpansionReadiness(score),
    };
  });
}

export function generateMockRecruitmentTargets(): RecruitmentTarget[] {
  return [
    { zoneId: "dehiwala", zoneLabel: "Dehiwala", categoryCode: "AC", currentTechnicians: 3, requiredTechnicians: 8, deficit: 5, priority: "urgent" },
    { zoneId: "gampaha", zoneLabel: "Gampaha", categoryCode: "CCTV", currentTechnicians: 1, requiredTechnicians: 4, deficit: 3, priority: "urgent" },
    { zoneId: "kandy_city", zoneLabel: "Kandy City", categoryCode: "IT", currentTechnicians: 2, requiredTechnicians: 5, deficit: 3, priority: "moderate" },
    { zoneId: "negombo", zoneLabel: "Negombo", categoryCode: "SOLAR", currentTechnicians: 1, requiredTechnicians: 3, deficit: 2, priority: "moderate" },
    { zoneId: "col_05", zoneLabel: "Colombo 5", categoryCode: "MOBILE", currentTechnicians: 4, requiredTechnicians: 5, deficit: 1, priority: "low" },
  ];
}

export function generateMockMarketingInsights(): MarketingInsight[] {
  return [
    { zoneId: "dehiwala", zoneLabel: "Dehiwala", categoryCode: "AC", diagnosisActivity: 180, bookingConversion: 15, gap: 85, recommendation: "Run promotional AC servicing campaign — high diagnosis but low conversion." },
    { zoneId: "kandy_city", zoneLabel: "Kandy City", categoryCode: "IT", diagnosisActivity: 120, bookingConversion: 22, gap: 78, recommendation: "Launch IT repair awareness campaign with introductory pricing." },
    { zoneId: "gampaha", zoneLabel: "Gampaha", categoryCode: "CCTV", diagnosisActivity: 95, bookingConversion: 18, gap: 77, recommendation: "CCTV installation promotions for new housing developments." },
  ];
}

export function generateMockScenarios(cat: CategoryCode): DemandScenario[] {
  return [
    { type: "base", label: "Base Forecast", predictedVolume: 340, requiredTechnicians: 12, estimatedRevenue: 2800000, slaRisk: "low" },
    { type: "high_demand", label: "High Demand Scenario", predictedVolume: 520, requiredTechnicians: 18, estimatedRevenue: 4200000, slaRisk: "medium" },
    { type: "technician_shortage", label: "Technician Shortage", predictedVolume: 340, requiredTechnicians: 7, estimatedRevenue: 1900000, slaRisk: "high" },
  ];
}

export function generateMockCategoryTrends(): CategoryTrend[] {
  const names: Record<string, string> = { AC: "AC Service & Repair", CCTV: "CCTV & Security", IT: "IT Repair & Support", MOBILE: "Mobile & Device Repair", SOLAR: "Solar Power", COPIER: "Copier Repair" };
  return CATEGORY_CODES.slice(0, 6).map((cat, i) => {
    const curr = Math.round(80 + seededRandom(i * 41) * 200);
    const prev = Math.round(60 + seededRandom(i * 43) * 180);
    const growth = Math.round(((curr - prev) / prev) * 100);
    return { categoryCode: cat, categoryName: names[cat] ?? cat, currentMonthBookings: curr, previousMonthBookings: prev, growthRate: growth, trending: growth > 5 ? "up" : growth < -5 ? "down" : "stable" };
  });
}
