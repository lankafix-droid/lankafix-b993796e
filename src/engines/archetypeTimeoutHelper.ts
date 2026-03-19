/**
 * Archetype-Aware Timeout Helper — LankaFix
 *
 * Different service archetypes get different acceptance windows.
 * Instant repairs need fast response; consultations allow more time.
 */

export type ServiceArchetype =
  | "instant"
  | "inspection_first"
  | "consultation"
  | "project_based"
  | "delivery"
  | "waitlist";

/**
 * Get the partner acceptance window in minutes based on service archetype.
 *
 * Rationale (Sri Lanka market):
 * - instant: 10 min — customer waiting, needs fast turnaround
 * - inspection_first: 15 min — moderate urgency
 * - consultation / project_based: 25 min — partners need time to review scope
 * - delivery: 10 min — time-sensitive
 * - waitlist: 30 min — no urgency
 */
const ACCEPT_WINDOWS: Record<ServiceArchetype, number> = {
  instant: 10,
  inspection_first: 15,
  consultation: 25,
  project_based: 25,
  delivery: 10,
  waitlist: 30,
};

export function getAcceptWindowMinutes(archetype?: ServiceArchetype | string): number {
  if (!archetype) return 10;
  return ACCEPT_WINDOWS[archetype as ServiceArchetype] ?? 10;
}
