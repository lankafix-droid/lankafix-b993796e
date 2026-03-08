/**
 * LankaFix Anti-Bypass Engine
 * Detects and masks contact details in chat messages.
 * Logs bypass attempts for ops monitoring.
 */

// ─── Contact Detection Patterns ───
const PHONE_PATTERNS = [
  /(?:\+?94|0)\s*\d[\d\s\-]{7,12}/g,          // Sri Lankan phone numbers
  /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b/g,       // Generic 10-digit
  /\b\d{2}[\s\-]?\d{7,8}\b/g,                  // Short format
];

const WHATSAPP_PATTERNS = [
  /wa\.me\/[\d+]+/gi,
  /whatsapp\.com\/send\?phone=[\d+]+/gi,
  /whats\s*app[\s:]*[\d\s\-+]{8,}/gi,
  /\bwa\b[\s:]*[\d\s\-+]{8,}/gi,
];

const EMAIL_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
];

const SOCIAL_PATTERNS = [
  /(?:facebook|fb|instagram|ig|viber|telegram|tg)[\s.:/@]*[\w.]+/gi,
  /(?:call|ring|text|msg|message|contact)\s+me\s+(?:on|at|@)\s*[\d\s\-+]{8,}/gi,
];

export interface BypassDetection {
  detected: boolean;
  types: string[];
  maskedContent: string;
  originalContent: string;
}

const MASK_REPLACEMENT = "🔒 [Contact details shared after booking confirmation]";

export function detectAndMaskContact(content: string): BypassDetection {
  const types: string[] = [];
  let masked = content;

  // Check each pattern category
  for (const pat of PHONE_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(content)) {
      types.push("phone_number");
      masked = masked.replace(pat, MASK_REPLACEMENT);
    }
  }

  for (const pat of WHATSAPP_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(content)) {
      types.push("whatsapp");
      masked = masked.replace(pat, MASK_REPLACEMENT);
    }
  }

  for (const pat of EMAIL_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(content)) {
      types.push("email");
      masked = masked.replace(pat, MASK_REPLACEMENT);
    }
  }

  for (const pat of SOCIAL_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(content)) {
      types.push("social_media");
      masked = masked.replace(pat, MASK_REPLACEMENT);
    }
  }

  return {
    detected: types.length > 0,
    types: [...new Set(types)],
    maskedContent: types.length > 0 ? masked : content,
    originalContent: content,
  };
}

/** Whether contact reveal is allowed for a booking */
export function isContactRevealAllowed(
  protectionStatus: string | null,
  dispatchStatus: string | null
): boolean {
  return protectionStatus === "paid" && (dispatchStatus === "accepted" || dispatchStatus === "ops_confirmed");
}

/** Provider identity masking — show "First Name + Initial" only */
export function maskProviderName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || "Technician";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/** Loyalty points calculation */
export function calculateLoyaltyPoints(bookingValue: number, isRepeat: boolean): number {
  const base = Math.floor(bookingValue / 100); // 1 point per Rs.100
  const repeatBonus = isRepeat ? Math.floor(base * 0.2) : 0; // 20% bonus for repeat
  return base + repeatBonus;
}

/** Get repeat service message */
export function getRepeatServiceMessage(partnerName: string): string {
  return `Book again through LankaFix to enjoy service protection, warranty support, and loyalty rewards with ${partnerName}.`;
}

/** Partner bypass risk score (0-100) */
export function calculateBypassRiskScore(stats: {
  bypassAttempts: number;
  cancellationRate: number;
  totalJobs: number;
  warningCount: number;
}): number {
  let score = 0;
  score += Math.min(stats.bypassAttempts * 15, 40);
  score += Math.min(stats.cancellationRate * 30, 25);
  score += Math.min(stats.warningCount * 10, 20);
  if (stats.totalJobs < 5) score += 15; // new partner risk
  return Math.min(score, 100);
}
