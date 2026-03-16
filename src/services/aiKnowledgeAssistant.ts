/**
 * AI Knowledge Assistant scaffold
 * Future RAG-based assistant for customers, partners, and operators.
 * Currently uses structured knowledge base.
 */

export interface KnowledgeAnswer {
  answer: string;
  confidence: number;
  source: string;
  shouldEscalate: boolean;
  escalateReason?: string;
}

// Structured knowledge base
const KNOWLEDGE_BASE: Record<string, { answer: string; source: string }> = {
  pricing: {
    answer: "LankaFix uses transparent pricing. You'll see an estimated range before booking. Final price is confirmed after technician inspection. No hidden fees.",
    source: "pricing_policy",
  },
  warranty: {
    answer: "All LankaFix services come with a service warranty. Parts replacements carry manufacturer warranty. Keep your booking receipt for warranty claims.",
    source: "warranty_policy",
  },
  cancellation: {
    answer: "You can cancel a booking before a technician is assigned at no charge. After assignment, a cancellation fee may apply. Contact support for special circumstances.",
    source: "cancellation_policy",
  },
  payment: {
    answer: "LankaFix supports cash payment after service completion. Digital payment options are being added. All payments are tracked through the platform for your protection.",
    source: "payment_policy",
  },
  safety: {
    answer: "All LankaFix technicians are verified and background-checked. You'll see technician details before they arrive. Use the OTP system to verify the right person arrives.",
    source: "safety_guide",
  },
  dispute: {
    answer: "If you're unhappy with a service, raise a dispute through your booking page within 48 hours. Our mediation team will review and resolve fairly.",
    source: "dispute_policy",
  },
};

const ESCALATION_KEYWORDS = ["urgent", "emergency", "scam", "stolen", "danger", "threat", "legal", "police", "refund"];

/** Answer a customer question from the knowledge base */
export function answerQuestion(query: string): KnowledgeAnswer {
  const q = query.toLowerCase();

  // Check for escalation keywords
  const shouldEscalate = ESCALATION_KEYWORDS.some((kw) => q.includes(kw));
  if (shouldEscalate) {
    return {
      answer: "I'll connect you with our support team for this. They can help you better.",
      confidence: 95,
      source: "escalation_trigger",
      shouldEscalate: true,
      escalateReason: "Risk keyword detected",
    };
  }

  // Match against knowledge base
  for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
    if (q.includes(key)) {
      return {
        answer: entry.answer,
        confidence: 80,
        source: entry.source,
        shouldEscalate: false,
      };
    }
  }

  // Low confidence fallback
  return {
    answer: "I'm not sure about that specific question. Let me connect you with our support team.",
    confidence: 20,
    source: "fallback",
    shouldEscalate: true,
    escalateReason: "Low confidence answer",
  };
}
