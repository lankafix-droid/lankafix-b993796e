/**
 * AI Usage Meter
 * Client-side tracking of AI call volume for rate-limit awareness,
 * cost monitoring, and analytics.
 * Does NOT enforce limits — that happens server-side.
 */

interface UsageEntry {
  module: string;
  timestamp: number;
  latencyMs: number;
  fallbackUsed: boolean;
}

const SESSION_KEY = "lankafix_ai_usage";
const MAX_ENTRIES = 200;

/** Record an AI call in session storage */
export function recordAIUsage(
  module: string,
  latencyMs: number,
  fallbackUsed = false
): void {
  try {
    const entries = getUsageEntries();
    entries.push({ module, timestamp: Date.now(), latencyMs, fallbackUsed });

    // Keep only recent entries
    const trimmed = entries.slice(-MAX_ENTRIES);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent — metering should never block UX
  }
}

/** Get session usage entries */
export function getUsageEntries(): UsageEntry[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as UsageEntry[]) : [];
  } catch {
    return [];
  }
}

/** Get usage summary for the current session */
export function getUsageSummary() {
  const entries = getUsageEntries();
  const now = Date.now();
  const lastMinute = entries.filter((e) => now - e.timestamp < 60_000);
  const lastHour = entries.filter((e) => now - e.timestamp < 3_600_000);

  const byModule: Record<string, number> = {};
  for (const e of entries) {
    byModule[e.module] = (byModule[e.module] ?? 0) + 1;
  }

  return {
    totalCalls: entries.length,
    callsLastMinute: lastMinute.length,
    callsLastHour: lastHour.length,
    fallbackRate:
      entries.length > 0
        ? entries.filter((e) => e.fallbackUsed).length / entries.length
        : 0,
    avgLatencyMs:
      entries.length > 0
        ? Math.round(entries.reduce((s, e) => s + e.latencyMs, 0) / entries.length)
        : 0,
    byModule,
  };
}

/** Clear session usage data */
export function clearUsageData(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Silent
  }
}
