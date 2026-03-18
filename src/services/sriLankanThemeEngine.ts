/**
 * LankaFix Sri Lankan Cultural Visual Intelligence Engine
 * 
 * Provides contextual theming based on:
 *   - Sri Lankan festivals & holidays
 *   - Time of day (golden hour, tropical sunset palette)
 *   - Regional/zone-aware imagery hints
 *   - Seasonal weather patterns
 * 
 * DESIGN PHILOSOPHY:
 *   Premium, culturally-authentic, never tacky.
 *   Subtle cultural motifs woven into gradient palettes,
 *   not slapped-on clip art.
 */

// ─── Festival Calendar ───────────────────────────────────────────
export interface CulturalMoment {
  id: string;
  name: string;
  /** Month-day ranges [startMMDD, endMMDD] */
  dateRanges: [string, string][];
  /** CSS gradient override for campaign cards */
  gradient: string;
  /** Subtle pattern/motif class name */
  motifClass: string;
  /** Accent color override (HSL values) */
  accentHsl: string;
  /** Emoji accent for UI elements */
  icon: string;
  /** Greeting text */
  greeting?: string;
}

export const SRI_LANKAN_CULTURAL_MOMENTS: CulturalMoment[] = [
  {
    id: 'sinhala-tamil-new-year',
    name: 'Sinhala & Tamil New Year',
    dateRanges: [['0410', '0416']],
    gradient: 'from-[hsl(30,85%,55%)] via-[hsl(45,90%,50%)] to-[hsl(15,80%,50%)]',
    motifClass: 'motif-avurudu',
    accentHsl: '30 85% 55%',
    icon: '🪔',
    greeting: 'සුභ අලුත් අවුරුද්දක් වේවා!',
  },
  {
    id: 'vesak',
    name: 'Vesak Poya',
    dateRanges: [['0520', '0526']],
    gradient: 'from-[hsl(45,80%,60%)] via-[hsl(35,75%,50%)] to-[hsl(25,70%,45%)]',
    motifClass: 'motif-vesak',
    accentHsl: '45 80% 60%',
    icon: '🏮',
    greeting: 'Happy Vesak!',
  },
  {
    id: 'poson',
    name: 'Poson Poya',
    dateRanges: [['0620', '0622']],
    gradient: 'from-[hsl(200,60%,50%)] via-[hsl(180,55%,45%)] to-[hsl(160,50%,40%)]',
    motifClass: 'motif-poson',
    accentHsl: '200 60% 50%',
    icon: '🙏',
  },
  {
    id: 'deepavali',
    name: 'Deepavali',
    dateRanges: [['1025', '1105']],
    gradient: 'from-[hsl(35,90%,50%)] via-[hsl(20,85%,45%)] to-[hsl(350,70%,40%)]',
    motifClass: 'motif-deepavali',
    accentHsl: '35 90% 50%',
    icon: '✨',
    greeting: 'Happy Deepavali!',
  },
  {
    id: 'christmas',
    name: 'Christmas Season',
    dateRanges: [['1215', '1226']],
    gradient: 'from-[hsl(0,70%,45%)] via-[hsl(145,60%,35%)] to-[hsl(0,65%,40%)]',
    motifClass: 'motif-christmas',
    accentHsl: '0 70% 45%',
    icon: '🎄',
    greeting: 'Merry Christmas!',
  },
  {
    id: 'independence-day',
    name: 'Independence Day',
    dateRanges: [['0202', '0205']],
    gradient: 'from-[hsl(25,80%,45%)] via-[hsl(45,85%,50%)] to-[hsl(0,70%,40%)]',
    motifClass: 'motif-national',
    accentHsl: '25 80% 45%',
    icon: '🇱🇰',
  },
];

// ─── Time-of-Day Palette ─────────────────────────────────────────
export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'golden' | 'evening' | 'night';

export interface TimeTheme {
  period: TimeOfDay;
  /** Ambient gradient for hero backgrounds */
  ambientGradient: string;
  /** Card glass tint */
  glassTint: string;
  /** Text emphasis color */
  emphasisHsl: string;
  /** Warm/cool indicator for UI mood */
  warmth: 'warm' | 'cool' | 'neutral';
}

export function getTimeOfDay(): TimeOfDay {
  // Sri Lankan time (UTC+5:30)
  const sriLankaHour = new Date().getUTCHours() + 5 + (new Date().getUTCMinutes() + 30 >= 60 ? 1 : 0);
  const hour = sriLankaHour % 24;

  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 18) return 'golden';
  if (hour >= 18 && hour < 20) return 'evening';
  return 'night';
}

const TIME_THEMES: Record<TimeOfDay, TimeTheme> = {
  dawn: {
    period: 'dawn',
    ambientGradient: 'from-[hsl(25,60%,50%)] via-[hsl(200,50%,55%)] to-[hsl(211,82%,31%)]',
    glassTint: 'hsl(25 60% 50% / 0.08)',
    emphasisHsl: '25 60% 50%',
    warmth: 'warm',
  },
  morning: {
    period: 'morning',
    ambientGradient: 'from-[hsl(147,57%,43%)] via-[hsl(180,55%,40%)] to-[hsl(211,82%,31%)]',
    glassTint: 'hsl(147 57% 43% / 0.06)',
    emphasisHsl: '147 57% 43%',
    warmth: 'neutral',
  },
  afternoon: {
    period: 'afternoon',
    ambientGradient: 'from-[hsl(211,82%,31%)] via-[hsl(200,70%,40%)] to-[hsl(180,55%,38%)]',
    glassTint: 'hsl(211 82% 31% / 0.06)',
    emphasisHsl: '211 82% 31%',
    warmth: 'cool',
  },
  golden: {
    period: 'golden',
    ambientGradient: 'from-[hsl(30,80%,55%)] via-[hsl(15,70%,45%)] to-[hsl(350,60%,40%)]',
    glassTint: 'hsl(30 80% 55% / 0.10)',
    emphasisHsl: '30 80% 55%',
    warmth: 'warm',
  },
  evening: {
    period: 'evening',
    ambientGradient: 'from-[hsl(260,45%,30%)] via-[hsl(280,40%,25%)] to-[hsl(220,50%,20%)]',
    glassTint: 'hsl(260 45% 30% / 0.12)',
    emphasisHsl: '260 45% 30%',
    warmth: 'cool',
  },
  night: {
    period: 'night',
    ambientGradient: 'from-[hsl(220,50%,12%)] via-[hsl(230,45%,15%)] to-[hsl(211,60%,18%)]',
    glassTint: 'hsl(220 50% 12% / 0.15)',
    emphasisHsl: '211 60% 25%',
    warmth: 'cool',
  },
};

export function getCurrentTimeTheme(): TimeTheme {
  return TIME_THEMES[getTimeOfDay()];
}

// ─── Active Cultural Moment ──────────────────────────────────────
export function getActiveCulturalMoment(): CulturalMoment | null {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  for (const moment of SRI_LANKAN_CULTURAL_MOMENTS) {
    for (const [start, end] of moment.dateRanges) {
      if (mmdd >= start && mmdd <= end) return moment;
    }
  }
  return null;
}

// ─── Zone-Aware Visual Hints ─────────────────────────────────────
export type ZoneVisualHint = {
  zone: string;
  landscapeHint: string;
  colorAccent: string;
};

export const ZONE_VISUAL_HINTS: Record<string, ZoneVisualHint> = {
  COLOMBO: { zone: 'COLOMBO', landscapeHint: 'urban-coastal', colorAccent: '211 82% 31%' },
  KANDY: { zone: 'KANDY', landscapeHint: 'hill-country', colorAccent: '147 57% 43%' },
  GALLE: { zone: 'GALLE', landscapeHint: 'southern-coastal', colorAccent: '195 70% 45%' },
  JAFFNA: { zone: 'JAFFNA', landscapeHint: 'northern-cultural', colorAccent: '30 80% 50%' },
  NEGOMBO: { zone: 'NEGOMBO', landscapeHint: 'western-coastal', colorAccent: '200 65% 42%' },
  NUWARA_ELIYA: { zone: 'NUWARA_ELIYA', landscapeHint: 'highland-misty', colorAccent: '180 45% 40%' },
};

// ─── Combined Visual Context ─────────────────────────────────────
export interface VisualContext {
  timeTheme: TimeTheme;
  culturalMoment: CulturalMoment | null;
  zoneHint: ZoneVisualHint | null;
  /** Final computed gradient for hero cards */
  heroGradient: string;
  /** Whether festive decorative elements should show */
  isFestive: boolean;
}

export function getVisualContext(userZone?: string): VisualContext {
  const timeTheme = getCurrentTimeTheme();
  const culturalMoment = getActiveCulturalMoment();
  const zoneHint = userZone ? ZONE_VISUAL_HINTS[userZone] ?? null : null;

  // Cultural moment overrides time-of-day gradient
  const heroGradient = culturalMoment?.gradient ?? timeTheme.ambientGradient;

  return {
    timeTheme,
    culturalMoment,
    zoneHint,
    heroGradient,
    isFestive: culturalMoment !== null,
  };
}
