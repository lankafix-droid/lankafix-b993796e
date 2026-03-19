import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageTransition from '@/components/motion/PageTransition';
import Header from '@/components/layout/Header';
import Footer from '@/components/landing/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Clock, Shield, BookOpen, Wrench } from 'lucide-react';
import { trackContentEvent } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

async function fetchContentDetail(id: string): Promise<EnrichedContentItem | null> {
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

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function InsightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ['content-detail', id],
    queryFn: () => fetchContentDetail(id!),
    enabled: !!id,
  });

  // Track open
  if (item) {
    trackContentEvent(item.id, 'open');
  }

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
  const primaryCategory = item.category_tags[0]?.category_code;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Back nav */}
        <div className="container max-w-2xl pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Hero image */}
        {item.image_url && (
          <div className="w-full max-w-2xl mx-auto">
            <img
              src={item.image_url}
              alt=""
              className="w-full h-56 object-cover rounded-b-2xl"
            />
          </div>
        )}

        <article className="container max-w-2xl py-4 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold capitalize">
              {item.content_type.replace(/_/g, ' ')}
            </Badge>
            {item.category_tags.map(t => (
              <Badge key={t.id} variant="outline" className="text-xs">
                {t.category_code}
              </Badge>
            ))}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDate(item.published_at)}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-heading text-2xl font-bold leading-tight text-foreground">
            {headline}
          </h1>

          {/* AI Summary */}
          {brief?.ai_summary_medium && (
            <div className="text-base text-foreground/90 leading-relaxed">
              {brief.ai_summary_medium}
            </div>
          )}

          {/* Why it matters */}
          {brief?.ai_why_it_matters && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
              <h3 className="text-sm font-bold text-primary mb-1 flex items-center gap-1.5">
                💡 Why This Matters
              </h3>
              <p className="text-sm text-foreground/80">{brief.ai_why_it_matters}</p>
            </div>
          )}

          {/* LankaFix Angle */}
          {brief?.ai_lankafix_angle && (
            <div className="rounded-xl bg-accent/5 border border-accent/10 p-4">
              <h3 className="text-sm font-bold text-accent-foreground mb-1 flex items-center gap-1.5">
                <Wrench className="h-4 w-4" />
                LankaFix Relevance
              </h3>
              <p className="text-sm text-foreground/80">{brief.ai_lankafix_angle}</p>
            </div>
          )}

          {/* Risk flags */}
          {brief?.ai_risk_flags && brief.ai_risk_flags.length > 0 && (
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
                <Link to={`/book/${primaryCategory.toLowerCase()}`}>
                  Book Related Service
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/services">
                Explore Services
              </Link>
            </Button>
          </div>
        </article>
      </main>
      <Footer />
    </PageTransition>
  );
}
