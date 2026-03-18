/**
 * LankaFix User Behavior Intelligence Engine
 * 
 * Tracks user interaction patterns to build a preference profile that
 * the campaign personalization engine uses to re-rank campaigns.
 * 
 * ARCHITECTURE:
 *   - Client-side preference accumulation (localStorage + session)
 *   - Lightweight affinity scoring (no heavy ML, runs in-browser)
 *   - Future: sync to backend for cross-device personalization
 * 
 * PRIVACY: No PII stored. Only category/type interaction counts.
 */

const STORAGE_KEY = 'lf_user_behavior';
const MAX_HISTORY = 100;

// ─── Interaction Types ───────────────────────────────────────────
export type InteractionType = 
  | 'view' | 'click' | 'cta_click' | 'dismiss' 
  | 'booking_started' | 'booking_completed' | 'search';

export interface UserInteraction {
  categoryId?: string;
  campaignType?: string;
  interactionType: InteractionType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface UserPreferenceProfile {
  /** Category affinity scores (0-100) */
  categoryAffinity: Record<string, number>;
  /** Campaign type preference scores (0-100) */
  typePreference: Record<string, number>;
  /** Time-of-day activity pattern (hour → engagement level) */
  activeHours: Record<number, number>;
  /** Preferred language based on interaction patterns */
  preferredLanguage?: string;
  /** Engagement velocity (interactions per session) */
  engagementVelocity: number;
  /** Last updated timestamp */
  lastUpdated: number;
}

// ─── Interaction Weights ─────────────────────────────────────────
const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  view: 1,
  click: 3,
  cta_click: 5,
  dismiss: -2,
  booking_started: 8,
  booking_completed: 12,
  search: 4,
};

// ─── Decay Factor (older interactions matter less) ───────────────
const DECAY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function decayWeight(timestampMs: number): number {
  const age = Date.now() - timestampMs;
  return Math.pow(0.5, age / DECAY_HALF_LIFE_MS);
}

// ─── Storage ─────────────────────────────────────────────────────
function loadHistory(): UserInteraction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UserInteraction[];
  } catch { return []; }
}

function saveHistory(history: UserInteraction[]) {
  try {
    // Keep only recent interactions
    const trimmed = history.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* Storage full — acceptable */ }
}

// ─── Public API ──────────────────────────────────────────────────

/** Record a user interaction for preference learning */
export function recordInteraction(interaction: UserInteraction) {
  const history = loadHistory();
  history.push({
    ...interaction,
    timestamp: interaction.timestamp || Date.now(),
  });
  saveHistory(history);
}

/** Build a preference profile from interaction history */
export function buildPreferenceProfile(): UserPreferenceProfile {
  const history = loadHistory();
  const categoryScores: Record<string, number> = {};
  const typeScores: Record<string, number> = {};
  const hourActivity: Record<number, number> = {};
  let totalInteractions = 0;

  for (const interaction of history) {
    const weight = INTERACTION_WEIGHTS[interaction.interactionType] ?? 1;
    const decay = decayWeight(interaction.timestamp);
    const score = weight * decay;

    if (interaction.categoryId) {
      categoryScores[interaction.categoryId] = 
        (categoryScores[interaction.categoryId] ?? 0) + score;
    }

    if (interaction.campaignType) {
      typeScores[interaction.campaignType] = 
        (typeScores[interaction.campaignType] ?? 0) + score;
    }

    const hour = new Date(interaction.timestamp).getHours();
    hourActivity[hour] = (hourActivity[hour] ?? 0) + 1;

    totalInteractions++;
  }

  // Normalize to 0-100 scale
  const normalize = (scores: Record<string, number>): Record<string, number> => {
    const max = Math.max(...Object.values(scores), 1);
    const normalized: Record<string, number> = {};
    for (const [key, val] of Object.entries(scores)) {
      normalized[key] = Math.round((val / max) * 100);
    }
    return normalized;
  };

  // Session count (approximate)
  const uniqueDays = new Set(
    history.map(h => new Date(h.timestamp).toDateString())
  ).size;
  const engagementVelocity = uniqueDays > 0 ? totalInteractions / uniqueDays : 0;

  return {
    categoryAffinity: normalize(categoryScores),
    typePreference: normalize(typeScores),
    activeHours: hourActivity,
    engagementVelocity,
    lastUpdated: Date.now(),
  };
}

/**
 * Compute personalization boost for a campaign based on user profile.
 * Returns a score modifier (-10 to +25) for campaign ranking.
 */
export function computePersonalizationBoost(
  campaignCategoryIds: string[],
  campaignType: string,
  profile: UserPreferenceProfile,
): number {
  let boost = 0;

  // Category affinity boost (max +15)
  if (campaignCategoryIds.length > 0) {
    const avgAffinity = campaignCategoryIds.reduce(
      (sum, cat) => sum + (profile.categoryAffinity[cat] ?? 0), 0
    ) / campaignCategoryIds.length;
    boost += Math.round(avgAffinity * 0.15);
  }

  // Campaign type preference (max +10)
  const typePref = profile.typePreference[campaignType] ?? 0;
  boost += Math.round(typePref * 0.10);

  // Time-of-day relevance bonus (max +3)
  const currentHour = new Date().getHours();
  const hourEngagement = profile.activeHours[currentHour] ?? 0;
  const maxHourEngagement = Math.max(...Object.values(profile.activeHours), 1);
  if (hourEngagement > maxHourEngagement * 0.7) {
    boost += 3; // User is typically active at this time
  }

  return Math.max(-10, Math.min(25, boost));
}
