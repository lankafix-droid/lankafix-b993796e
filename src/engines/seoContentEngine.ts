/**
 * SEO Content Engine
 * 
 * Generates SEO content recommendations based on platform search data,
 * service knowledge graph, and Sri Lankan market context.
 * 
 * Output: Article topics, FAQ content, and service guide ideas
 * that drive organic traffic to the LankaFix platform.
 */

import { SERVICE_KNOWLEDGE_GRAPH, getSeasonalServices, type ServiceNode } from "@/engines/serviceKnowledgeGraph";

export interface SEOContentIdea {
  id: string;
  type: "article" | "faq" | "guide" | "landing_page";
  title: string;
  targetKeywords: string[];
  estimatedSearchVolume: "high" | "medium" | "low";
  priority: "high" | "medium" | "low";
  category: string;
  outline?: string[];
}

/**
 * Generate SEO content ideas from the service knowledge graph.
 */
export function generateSEOContentIdeas(): SEOContentIdea[] {
  const ideas: SEOContentIdea[] = [];
  let idCounter = 0;

  for (const node of SERVICE_KNOWLEDGE_GRAPH) {
    const cat = node.parent || "GENERAL";

    // How-to troubleshooting article
    ideas.push({
      id: `seo_${++idCounter}`,
      type: "article",
      title: `How to Fix ${node.name} Issues — ${node.name} Guide Sri Lanka`,
      targetKeywords: [...node.keywords, `${node.name.toLowerCase()} sri lanka`, `${node.name.toLowerCase()} colombo`],
      estimatedSearchVolume: node.keywords.length > 4 ? "high" : "medium",
      priority: node.avgPriceLKR[1] > 10000 ? "high" : "medium",
      category: cat,
      outline: [
        `Common ${node.name} problems in Sri Lanka`,
        "Signs you need professional help",
        "DIY troubleshooting steps",
        `Average ${node.name} cost in Colombo (LKR ${node.avgPriceLKR[0].toLocaleString()} - ${node.avgPriceLKR[1].toLocaleString()})`,
        "When to call a verified technician",
        "How LankaFix can help",
      ],
    });

    // Cost guide landing page
    ideas.push({
      id: `seo_${++idCounter}`,
      type: "landing_page",
      title: `${node.name} Cost in Sri Lanka ${new Date().getFullYear()} — Price Guide`,
      targetKeywords: [`${node.name.toLowerCase()} cost sri lanka`, `${node.name.toLowerCase()} price colombo`, ...node.keywords.map(k => `${k} cost`)],
      estimatedSearchVolume: "medium",
      priority: "high",
      category: cat,
    });

    // FAQ entries
    for (const kw of node.keywords.slice(0, 2)) {
      ideas.push({
        id: `seo_${++idCounter}`,
        type: "faq",
        title: `How much does ${kw} cost in Colombo?`,
        targetKeywords: [`${kw} cost colombo`, `${kw} price sri lanka`],
        estimatedSearchVolume: "medium",
        priority: "medium",
        category: cat,
      });
    }
  }

  // Seasonal content
  const currentMonth = new Date().getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const seasonalServices = getSeasonalServices(nextMonth);

  for (const service of seasonalServices.slice(0, 3)) {
    ideas.push({
      id: `seo_${++idCounter}`,
      type: "guide",
      title: `Prepare Your ${service.name} for the Season — Sri Lanka Maintenance Guide`,
      targetKeywords: [...service.keywords, `${service.name.toLowerCase()} maintenance sri lanka`],
      estimatedSearchVolume: "high",
      priority: "high",
      category: service.parent || "GENERAL",
      outline: [
        "Why seasonal maintenance matters",
        `${service.name} checklist for Sri Lankan homes`,
        "Common issues to watch for",
        "Cost-saving tips",
        "Book a professional service with LankaFix",
      ],
    });
  }

  return ideas;
}

/**
 * Generate FAQ content from search data patterns.
 */
export function generateFAQContent(): { question: string; answer: string; category: string }[] {
  return [
    { question: "How much does AC gas refill cost in Colombo?", answer: "AC gas top-up typically costs LKR 3,500 – 6,500 depending on the unit type and gas required. LankaFix provides transparent pricing with no hidden charges — final price confirmed before work begins.", category: "AC" },
    { question: "How long does a phone screen repair take?", answer: "Most phone screen repairs take 45–90 minutes. LankaFix technicians carry common screen models and can repair on-site. Complex models may require 24-hour turnaround.", category: "MOBILE" },
    { question: "Is laptop repair available in Colombo?", answer: "Yes, LankaFix provides laptop repair across Greater Colombo. Services include hardware repair, software troubleshooting, SSD upgrades, and data recovery. Diagnosis starts from LKR 2,000.", category: "IT" },
    { question: "Do LankaFix technicians provide warranty?", answer: "Yes, all LankaFix repairs come with a standard 7-day service warranty. Extended warranties are available through our Care Plans for ongoing protection.", category: "GENERAL" },
    { question: "How does LankaFix pricing work?", answer: "LankaFix uses transparent pricing. You receive a clear quote before any work starts. For simple services, prices start from a fixed rate. For complex repairs, a diagnosis fee applies which is deducted from the final repair cost.", category: "GENERAL" },
    { question: "Can I pay after service?", answer: "Yes! LankaFix operates on a Pay After Service model. No advance payment is required for most services. You pay only after the work is completed to your satisfaction.", category: "GENERAL" },
    { question: "How do I track my technician?", answer: "Once a technician is assigned, you can track their status in real-time through the LankaFix app. You'll receive updates when they're on the way, arriving, and when service starts.", category: "GENERAL" },
    { question: "What areas does LankaFix cover?", answer: "LankaFix currently serves Greater Colombo including Colombo 1-15, Rajagiriya, Battaramulla, Nugegoda, Dehiwala, Mount Lavinia, and surrounding areas. We're expanding to more cities soon — join our waitlist!", category: "GENERAL" },
  ];
}

/**
 * Get high-priority SEO ideas filtered by category.
 */
export function getHighPrioritySEOIdeas(category?: string): SEOContentIdea[] {
  const all = generateSEOContentIdeas();
  const filtered = category ? all.filter(i => i.category === category) : all;
  return filtered.filter(i => i.priority === "high");
}
