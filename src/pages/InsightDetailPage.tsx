import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageTransition from '@/components/motion/PageTransition';
import Header from '@/components/layout/Header';
import Footer from '@/components/landing/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Clock, Shield, BookOpen, Wrench, TrendingUp } from 'lucide-react';
import { trackContentEvent } from '@/hooks/useContentIntelligence';
import { useTrackContentOpen } from '@/hooks/useTrackContentOpen';
import ContentCard from '@/components/content/ContentCard';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

async function fetchContentDetail(id: string): Promise<EnrichedContentItem | null> {
  // Support evergreen items
  if (id.startsWith('evergreen-')) return null;

  const { data: item } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (!item) return null;

  const [{ data: briefs }, { data: tags }] = await Promise.all([
    supabase.from('content_ai_briefs').select('*').eq('content_item_id', id),
    supabase.from('content_category_tags').select('*').eq('content_item_id', id),
  ]);

  return {
    ...(item as any),
    ai_brief: briefs?.[0] ?? null,
    category_tags: tags ?? [],
  };
}

async function fetchRelatedContent(itemId: string, categoryCode: string | null, contentType: string): Promise<EnrichedContentItem[]> {
  // Fetch items from the same category first, then same type, excluding current
  let query = supabase
    .from('content_items')
    .select('*')
    .eq('status', 'published')
    .neq('id', itemId)
    .order('freshness_score', { ascending: false })
    .limit(12);

  const { data: items } = await query;
  if (!items?.length) return [];

  const ids = items.map((i: any) => i.id);
  const [{ data: briefs }, { data: tags }] = await Promise.all([
    supabase.from('content_ai_briefs').select('*').in('content_item_id', ids),
    supabase.from('content_category_tags').select('*').in('content_item_id', ids),
  ]);

  const briefMap = new Map((briefs ?? []).map((b: any) => [b.content_item_id, b]));
  const tagMap = new Map<string, any[]>();
  (tags ?? []).forEach((t: any) => {
    const arr = tagMap.get(t.content_item_id) ?? [];
    arr.push(t);
    tagMap.set(t.content_item_id, arr);
  });

  const enriched: EnrichedContentItem[] = items.map((i: any) => ({
    ...i,
    ai_brief: briefMap.get(i.id) ?? null,
    category_tags: tagMap.get(i.id) ?? [],
  }));

  // Score by relevance: same category > same type > other
  const scored = enriched.map(item => {
    let score = item.freshness_score ?? 0;
    const itemCats = (item.category_tags ?? []).map((t: any) => t.category_code);
    if (categoryCode && itemCats.includes(categoryCode)) score += 50;
    if (item.content_type === contentType) score += 20;
    return { item, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.item);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function InsightMeta({ item }: { item: EnrichedContentItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="text-xs font-semibold capitalize">
        {item.content_type.replace(/_/g, ' ')}
      </Badge>
      {(item.category_tags ?? []).map(t => (
        <Badge key={t.id} variant="outline" className="text-xs">
          {t.category_code}
        </Badge>
      ))}
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {formatDate(item.published_at)}
      </span>
    </div>
  );
}

function RelatedInsights({ itemId, categoryCode, contentType }: { itemId: string; categoryCode: string | null; contentType: string }) {
  const navigate = useNavigate();
  const { data: related } = useQuery({
    queryKey: ['content-related', itemId],
    queryFn: () => fetchRelatedContent(itemId, categoryCode, contentType),
    enabled: !!itemId,
  });

  if (!related?.length) return null;

  return (
    <div className="pt-4 border-t border-border/50">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        Related Insights
      </h3>
      <div className="space-y-2">
        {related.map(item => (
          <ContentCard
            key={item.id}
            item={item}
            variant="compact"
            className="w-full"
            onOpen={() => {
              trackContentEvent(item.id, 'click', { action: 'related_insight' });
              navigate(`/insights/${item.id}`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function InsightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ['content-detail', id],
    queryFn: () => fetchContentDetail(id!),
    enabled: !!id,
  });

  // Safe open tracking via useEffect hook
  useTrackContentOpen(item?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-2xl py-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted mb-4" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted mb-4" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-2xl py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-heading text-xl font-bold">Insight Not Found</h1>
          <p className="text-muted-foreground mt-2">This content may have been archived.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </main>
      </div>
    );
  }

  const brief = item.ai_brief;
  const headline = brief?.ai_headline ?? item.title;
  const primaryCategory = (item.category_tags ?? [])[0]?.category_code ?? null;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-2xl pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {item.image_url && (
          <div className="w-full max-w-2xl mx-auto">
            <img src={item.image_url} alt="" className="w-full h-56 object-cover rounded-b-2xl" />
          </div>
        )}

        <article className="container max-w-2xl py-4 space-y-4">
          <InsightMeta item={item} />

          <h1 className="font-heading text-2xl font-bold leading-tight text-foreground">
            {headline}
          </h1>

          {brief?.ai_summary_medium && (
            <div className="text-base text-foreground/90 leading-relaxed">
              {brief.ai_summary_medium}
            </div>
          )}

          {brief?.ai_why_it_matters && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
              <h3 className="text-sm font-bold text-primary mb-1 flex items-center gap-1.5">
                💡 Why This Matters
              </h3>
              <p className="text-sm text-foreground/80">{brief.ai_why_it_matters}</p>
            </div>
          )}

          {brief?.ai_lankafix_angle && (
            <div className="rounded-xl bg-accent/5 border border-accent/10 p-4">
              <h3 className="text-sm font-bold text-accent-foreground mb-1 flex items-center gap-1.5">
                <Wrench className="h-4 w-4" />
                LankaFix Relevance
              </h3>
              <p className="text-sm text-foreground/80">{brief.ai_lankafix_angle}</p>
            </div>
          )}

          {Array.isArray(brief?.ai_risk_flags) && brief.ai_risk_flags.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/5 border border-destructive/10 p-3">
              <Shield className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm text-foreground/80">
                {brief.ai_risk_flags.join(' · ')}
              </div>
            </div>
          )}

          {/* Source attribution */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground">
              Source: {item.source_name ?? 'LankaFix Intelligence'}
            </div>
            {item.canonical_url && (
              <a
                href={item.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary font-medium"
                onClick={() => trackContentEvent(item.id, 'click', { action: 'source_link' })}
              >
                Read Original
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* CTA Section */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {primaryCategory && (
              <Button asChild variant="default" size="sm" className="w-full">
                <Link
                  to={`/book/${primaryCategory.toLowerCase()}`}
                  onClick={() => trackContentEvent(item.id, 'booking_clickthrough', { category: primaryCategory })}
                >
                  Book Related Service
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link
                to="/services"
                onClick={() => trackContentEvent(item.id, 'category_clickthrough')}
              >
                Explore Services
              </Link>
            </Button>
          </div>

          {/* Related Insights — category-aware */}
          <RelatedInsights
            itemId={item.id}
            categoryCode={primaryCategory}
            contentType={item.content_type}
          />
        </article>
      </main>
      <Footer />
    </PageTransition>
  );
}
