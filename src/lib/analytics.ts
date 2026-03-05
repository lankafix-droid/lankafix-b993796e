/** Lightweight analytics wrapper — swap internals for GA/Meta later */
export function track(event: string, payload?: Record<string, unknown>) {
  console.log(`[analytics] ${event}`, payload ?? {});
}
