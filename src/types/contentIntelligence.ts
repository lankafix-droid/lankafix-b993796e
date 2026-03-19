/**
 * Content Intelligence Types
 * Shared types for the LankaFix Knowledge + Insight system.
 */

export type ContentType =
  | 'breaking_news' | 'hot_topic' | 'innovation' | 'trend_signal'
  | 'safety_alert' | 'scam_alert' | 'knowledge_fact' | 'history'
  | 'on_this_day' | 'numbers_insight' | 'seasonal_tip' | 'how_to'
  | 'most_read' | 'market_shift';

export type ContentStatus = 'new' | 'processed' | 'published' | 'needs_review' | 'rejected' | 'archived';

export type SurfaceCode =
  | 'homepage_hero' | 'homepage_hot_now' | 'homepage_did_you_know'
  | 'homepage_innovations' | 'homepage_safety' | 'homepage_numbers'
  | 'homepage_popular' | 'category_featured' | 'category_feed'
  | 'ai_banner_forum';

export type ContentEventType =
  | 'impression' | 'click' | 'open' | 'dismiss'
  | 'save' | 'share' | 'category_clickthrough' | 'booking_clickthrough';

export interface ContentItem {
  id: string;
  source_id: string | null;
  source_item_id: string | null;
  content_type: ContentType;
  title: string;
  raw_excerpt: string | null;
  raw_body: string | null;
  canonical_url: string | null;
  image_url: string | null;
  source_name: string | null;
  source_country: string | null;
  language: string;
  published_at: string | null;
  fetched_at: string | null;
  freshness_score: number;
  source_trust_score: number | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface ContentAIBrief {
  id: string;
  content_item_id: string;
  ai_headline: string | null;
  ai_summary_short: string | null;
  ai_summary_medium: string | null;
  ai_why_it_matters: string | null;
  ai_lankafix_angle: string | null;
  ai_banner_text: string | null;
  ai_cta_label: string | null;
  ai_keywords: string[] | null;
  ai_risk_flags: string[] | null;
  ai_quality_score: number | null;
  generated_at: string | null;
}

export interface ContentCategoryTag {
  id: string;
  content_item_id: string;
  category_code: string;
  confidence_score: number;
  reason: string | null;
}

export interface ContentTrendCluster {
  id: string;
  cluster_key: string;
  cluster_label: string;
  category_code: string | null;
  momentum_score: number;
  content_count: number;
  sri_lanka_relevance_score: number;
  commercial_relevance_score: number;
  active: boolean;
}

export interface ContentSurfaceState {
  id: string;
  surface_code: SurfaceCode;
  category_code: string | null;
  content_item_id: string;
  rank_score: number;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
}

/** Enriched content item with AI brief + tags for UI rendering */
export interface EnrichedContentItem extends ContentItem {
  ai_brief: ContentAIBrief | null;
  category_tags: ContentCategoryTag[];
}

/** Surface slot with enriched content */
export interface SurfaceSlot {
  surface_code: SurfaceCode;
  items: EnrichedContentItem[];
}
