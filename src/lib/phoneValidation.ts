/**
 * Sri Lankan phone validation + anti-spam utilities
 */

const SL_PHONE_REGEX = /^(?:\+?94|0)?7[0-9]{8}$/;

/** Validate Sri Lankan phone number format */
export function isValidSLPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return SL_PHONE_REGEX.test(cleaned);
}

/** Normalize phone to +94 format */
export function normalizeSLPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+94")) return cleaned;
  if (cleaned.startsWith("94")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+94${cleaned.slice(1)}`;
  return `+94${cleaned}`;
}

/** Simple client-side rate limit tracker */
const submissionTimestamps: number[] = [];
const MAX_SUBMISSIONS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function canSubmitRequest(): boolean {
  const now = Date.now();
  // Clean old entries
  while (submissionTimestamps.length > 0 && submissionTimestamps[0] < now - WINDOW_MS) {
    submissionTimestamps.shift();
  }
  return submissionTimestamps.length < MAX_SUBMISSIONS;
}

export function recordSubmission(): void {
  submissionTimestamps.push(Date.now());
}

/** Check for duplicate: same phone+category within window */
const recentSubmissions: Array<{ phone: string; category: string; ts: number }> = [];
const DUPE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export function isDuplicateRequest(phone: string, category: string): boolean {
  const now = Date.now();
  const normalized = normalizeSLPhone(phone);
  return recentSubmissions.some(
    (s) => s.phone === normalized && s.category === category && now - s.ts < DUPE_WINDOW_MS
  );
}

export function recordRequest(phone: string, category: string): void {
  recentSubmissions.push({ phone: normalizeSLPhone(phone), category, ts: Date.now() });
}
