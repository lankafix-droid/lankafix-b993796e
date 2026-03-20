import { useState, useMemo } from 'react';
import PageTransition from '@/components/motion/PageTransition';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RefreshCw, CheckCircle, XCircle, Trash2, Pin, BarChart3,
  Activity, Eye, TrendingUp, AlertTriangle, Power, RotateCw, Star,
  Clock, Shield, Database, Layers, Radio, Zap, ChevronUp
} from 'lucide-react';

function EmptyState({ message, icon: Icon }: { message: string; icon?: any }) {
  const I = Icon ?? Database;
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <I className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, subtitle }: { label: string; value: number | string; icon: any; color: string; subtitle?: string }) {
  return (
    <Card className="p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {subtitle && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </Card>
  );
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type SourceHealth = 'healthy' | 'warning' | 'critical' | 'disabled';

function getSourceHealth(src: any): SourceHealth {
  if (!src.active) return 'disabled';
  const rejectRate = src.counts.total > 0 ? src.counts.rejected / src.counts.total : 0;
  const publishRate = src.counts.total > 0 ? src.counts.published / src.counts.total : 0;
  const isStale = src.last_fetched_at && (Date.now() - new Date(src.last_fetched_at).getTime()) > 24 * 3600000;
  const neverFetched = src.active && !src.last_fetched_at;
  const isZeroPublish = src.counts.total >= 5 && src.counts.published === 0;
  const isHighReject = src.counts.total >= 5 && rejectRate > 0.5;
  const isLowYield = src.counts.total >= 5 && publishRate < 0.2;

  if (isZeroPublish || isHighReject || (isStale && src.counts.total > 0)) return 'critical';
  if (isLowYield || isStale || neverFetched) return 'warning';
  return 'healthy';
}

const HEALTH_STYLES: Record<SourceHealth, string> = {
  healthy: 'border-primary/30',
  warning: 'border-warning/40 bg-warning/3',
  critical: 'border-destructive/30 bg-destructive/3',
  disabled: 'border-muted/40 bg-muted/5 opacity-60',
};

const HEALTH_DOT: Record<SourceHealth, string> = {
  healthy: 'bg-primary',
  warning: 'bg-warning',
  critical: 'bg-destructive',
  disabled: 'bg-muted-foreground',
};

function SourceHealthBadges({ src }: { src: any }) {
  const badges: React.ReactNode[] = [];
  const rejectRate = src.counts.total > 0 ? src.counts.rejected / src.counts.total : 0;
  const publishRate = src.counts.total > 0 ? src.counts.published / src.counts.total : 0;

  if (!src.active) {
    badges.push(<Badge key="dis" variant="secondary" className="text-[9px]">Disabled</Badge>);
    return <>{badges}</>;
  }

  // Fetch timing
  if (!src.last_fetched_at) {
    badges.push(<Badge key="nf" variant="outline" className="text-[9px] text-warning border-warning/30">Never fetched</Badge>);
  } else {
    const hours = (Date.now() - new Date(src.last_fetched_at).getTime()) / 3600000;
    if (hours > 24) badges.push(<Badge key="stale" variant="destructive" className="text-[9px]">Stale ({Math.floor(hours)}h)</Badge>);
    else if (hours > 6) badges.push(<Badge key="age" variant="outline" className="text-[9px] text-warning border-warning/30">{formatTimeAgo(src.last_fetched_at)}</Badge>);
    else badges.push(<Badge key="ok" variant="outline" className="text-[9px] text-primary border-primary/30">{formatTimeAgo(src.last_fetched_at)}</Badge>);
  }

  // Quality warnings
  if (src.counts.total >= 5 && src.counts.published === 0) {
    badges.push(<Badge key="zp" variant="destructive" className="text-[9px]">Zero publish</Badge>);
  } else if (rejectRate > 0.5) {
    badges.push(<Badge key="hr" variant="destructive" className="text-[9px]">High reject ({Math.round(rejectRate * 100)}%)</Badge>);
  } else if (src.counts.total >= 5 && publishRate < 0.2) {
    badges.push(<Badge key="ly" variant="outline" className="text-[9px] text-warning border-warning/30">Low yield</Badge>);
  }

  // Trust badge
  if (src.trust_score >= 0.85) {
    badges.push(<Badge key="tr" variant="outline" className="text-[9px] text-primary border-primary/20">★ High trust</Badge>);
  } else if (src.trust_score < 0.5) {
    badges.push(<Badge key="trl" variant="outline" className="text-[9px] text-warning border-warning/20">Low trust</Badge>);
  }

  return <>{badges}</>;
}

export default function ContentIntelligenceOpsPage() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['content-ops'] });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['content-ops', 'queue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_items')
        .select('*, content_ai_briefs(*), content_category_tags(*)')
        .in('status', ['new', 'needs_review', 'processed'])
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: published, isLoading: pubLoading } = useQuery({
    queryKey: ['content-ops', 'published'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_items')
        .select('*, content_ai_briefs(*), content_category_tags(*)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: sources, isLoading: srcLoading } = useQuery({
    queryKey: ['content-ops', 'sources'],
    queryFn: async () => {
      const { data: srcs } = await supabase.from('content_sources').select('*').order('trust_score', { ascending: false });
      if (!srcs?.length) return [];
      const ids = srcs.map((s: any) => s.id);
      const { data: items } = await supabase
        .from('content_items')
        .select('source_id, status')
        .in('source_id', ids);
      const countMap: Record<string, { published: number; rejected: number; archived: number; total: number; needs_review: number }> = {};
      (items ?? []).forEach((i: any) => {
        const c = countMap[i.source_id] ??= { published: 0, rejected: 0, archived: 0, total: 0, needs_review: 0 };
        c.total++;
        if (i.status === 'published') c.published++;
        if (i.status === 'rejected') c.rejected++;
        if (i.status === 'archived') c.archived++;
        if (i.status === 'needs_review') c.needs_review++;
      });
      return srcs.map((s: any) => ({ ...s, counts: countMap[s.id] ?? { published: 0, rejected: 0, archived: 0, total: 0, needs_review: 0 } }));
    },
  });

  const { data: surfaces } = useQuery({
    queryKey: ['content-ops', 'surfaces'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_surface_state')
        .select('*, content_items(title, content_type, status, freshness_score, source_name)')
        .eq('active', true)
        .order('surface_code')
        .order('rank_score', { ascending: false });
      return data ?? [];
    },
  });

  const { data: clusters } = useQuery({
    queryKey: ['content-ops', 'clusters'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_trend_clusters')
        .select('*')
        .eq('active', true)
        .order('momentum_score', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['content-ops', 'analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_events')
        .select('event_type, content_item_id')
        .order('created_at', { ascending: false })
        .limit(500);
      const events = data ?? [];
      const byType: Record<string, number> = {};
      events.forEach((e: any) => { byType[e.event_type] = (byType[e.event_type] ?? 0) + 1; });
      return { total: events.length, ...byType };
    },
  });

  // Aggregate pipeline stats
  const totalPublished = published?.length ?? 0;
  const totalSources = sources?.length ?? 0;
  const activeSources = sources?.filter((s: any) => s.active).length ?? 0;
  const disabledSources = sources?.filter((s: any) => !s.active).length ?? 0;
  const staleSources = sources?.filter((s: any) => {
    if (!s.active || !s.last_fetched_at) return s.active;
    return (Date.now() - new Date(s.last_fetched_at).getTime()) > 24 * 3600000;
  }).length ?? 0;
  const criticalSources = sources?.filter((s: any) => getSourceHealth(s) === 'critical').length ?? 0;
  const surfaceCount = surfaces?.length ?? 0;
  const needsReview = queue?.filter((q: any) => q.status === 'needs_review').length ?? 0;
  const totalRejected = sources?.reduce((s: number, src: any) => s + (src.counts?.rejected ?? 0), 0) ?? 0;
  const totalArchived = sources?.reduce((s: number, src: any) => s + (src.counts?.archived ?? 0), 0) ?? 0;
  const totalFetched = sources?.reduce((s: number, src: any) => s + (src.counts?.total ?? 0), 0) ?? 0;
  const backlog = queue?.length ?? 0;
  const publishRate = totalFetched > 0 ? Math.round((totalPublished / totalFetched) * 100) : 0;
  const rejectRate = totalFetched > 0 ? Math.round((totalRejected / totalFetched) * 100) : 0;

  // Surface coverage: how many of the 10 required surfaces have at least 1 active item
  const REQUIRED_SURFACES = ['homepage_hero', 'homepage_hot_now', 'homepage_did_you_know', 'homepage_innovations', 'homepage_safety', 'homepage_numbers', 'homepage_popular', 'ai_banner_forum', 'category_featured', 'category_feed'];
  const coveredSurfaces = REQUIRED_SURFACES.filter(s => surfacesByCode[s]?.length > 0).length;
  const surfaceCoverage = Math.round((coveredSurfaces / REQUIRED_SURFACES.length) * 100);

  // Mutations
  const ingestMutation = useMutation({
    mutationFn: async (mode: string) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', { body: { mode } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Pipeline complete`, { description: `Fetched: ${data?.fetched ?? 0}, Deduped: ${data?.deduped ?? 0}, Briefed: ${data?.briefed ?? 0}, Published: ${data?.published ?? 0}` });
      invalidateAll();
    },
    onError: (e) => toast.error(`Pipeline failed: ${(e as Error).message}`),
  });

  const editorialAction = useMutation({
    mutationFn: async ({ itemId, action }: { itemId: string; action: string }) => {
      const statusMap: Record<string, string> = { approve: 'published', reject: 'rejected', archive: 'archived' };
      const newStatus = statusMap[action];
      if (newStatus) {
        await supabase.from('content_items').update({ status: newStatus }).eq('id', itemId);
      }
      if (action === 'pin_hero') {
        await supabase.from('content_surface_state').update({ active: false }).eq('surface_code', 'homepage_hero').eq('active', true).lt('rank_score', 990);
        await supabase.from('content_surface_state').insert({ surface_code: 'homepage_hero', content_item_id: itemId, rank_score: 999, active: true });
      }
      if (action === 'suppress') {
        await supabase.from('content_items').update({ status: 'rejected', rejection_reason: 'ops_suppressed' }).eq('id', itemId);
        await supabase.from('content_surface_state').update({ active: false }).eq('content_item_id', itemId);
      }
      if (action === 'boost') {
        // Increment rank by +15 rather than hard-setting; cap below pin threshold (990)
        const { data: currentSurfaces } = await supabase
          .from('content_surface_state')
          .select('id, rank_score')
          .eq('content_item_id', itemId)
          .eq('active', true)
          .lt('rank_score', 990);
        for (const surf of currentSurfaces ?? []) {
          const newRank = Math.min(989, (surf.rank_score ?? 50) + 15);
          await supabase.from('content_surface_state').update({ rank_score: newRank }).eq('id', surf.id);
        }
      }
      await supabase.from('content_editorial_actions').insert({ content_item_id: itemId, action_type: action });
    },
    onSuccess: () => { toast.success('Action applied'); invalidateAll(); },
    onError: () => toast.error('Action failed'),
  });

  const toggleSource = useMutation({
    mutationFn: async ({ sourceId, active }: { sourceId: string; active: boolean }) => {
      await supabase.from('content_sources').update({ active }).eq('id', sourceId);
    },
    onSuccess: () => { toast.success('Source updated'); invalidateAll(); },
  });

  const reBriefMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase.from('content_ai_briefs').delete().eq('content_item_id', itemId);
      await supabase.from('content_items').update({ status: 'new' }).eq('id', itemId);
      const { error } = await supabase.functions.invoke('content-ingest', { body: { mode: 'brief' } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Re-briefed'); invalidateAll(); },
    onError: () => toast.error('Re-brief failed'),
  });

  const surfacesByCode = useMemo(() => {
    const map: Record<string, any[]> = {};
    (surfaces ?? []).forEach((s: any) => { (map[s.surface_code] ??= []).push(s); });
    return map;
  }, [surfaces]);

  const isPending = ingestMutation.isPending || editorialAction.isPending || reBriefMutation.isPending;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-xl font-bold flex items-center gap-2">
              Content Intelligence
              {totalPublished > 0 && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  <Radio className="h-2.5 w-2.5 mr-1 text-primary" /> Live
                </Badge>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {staleSources > 0 && (
                <span className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {staleSources} stale
                </span>
              )}
              {criticalSources > 0 && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> {criticalSources} critical
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => ingestMutation.mutate('ingest')} disabled={isPending}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${ingestMutation.isPending ? 'animate-spin' : ''}`} />
              Ingest
            </Button>
            <Button size="sm" variant="outline" onClick={() => ingestMutation.mutate('brief')} disabled={isPending}>
              <Star className="h-3.5 w-3.5 mr-1" /> Brief
            </Button>
            <Button size="sm" onClick={() => ingestMutation.mutate('full')} disabled={isPending}>
              {ingestMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
              Full Run
            </Button>
          </div>
        </div>

        {/* Executive Pipeline Metrics */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <StatCard label="Published" value={totalPublished} icon={Eye} color="text-primary" subtitle={`${publishRate}% rate`} />
          <StatCard label="Review" value={needsReview} icon={AlertTriangle} color="text-warning" subtitle={`${backlog} backlog`} />
          <StatCard label="Rejected" value={totalRejected} icon={XCircle} color="text-destructive" subtitle={`${rejectRate}% rate`} />
          <StatCard label="Archived" value={totalArchived} icon={Trash2} color="text-muted-foreground" />
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatCard label="Sources" value={`${activeSources}/${totalSources}`} icon={Layers} color="text-accent-foreground" subtitle={criticalSources > 0 ? `${criticalSources} critical` : disabledSources > 0 ? `${disabledSources} disabled` : staleSources > 0 ? `${staleSources} stale` : 'All healthy'} />
          <StatCard label="Coverage" value={`${surfaceCoverage}%`} icon={Radio} color="text-primary" subtitle={`${coveredSurfaces}/${REQUIRED_SURFACES.length} surfaces`} />
          <StatCard label="Clusters" value={clusters?.length ?? 0} icon={TrendingUp} color="text-accent-foreground" />
          <StatCard label="Events" value={analytics?.total ?? 0} icon={BarChart3} color="text-muted-foreground" subtitle={`${(analytics as any)?.click ?? 0} clicks`} />
        </div>

        <Tabs defaultValue="queue">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="queue">Queue ({queue?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="sources">Sources ({totalSources})</TabsTrigger>
            <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
            <TabsTrigger value="clusters">Trends</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="space-y-2 mt-3">
            {queueLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading queue…</p>}
            {!queueLoading && !queue?.length && <EmptyState message="No items in queue — run pipeline to ingest content" icon={CheckCircle} />}
            {(queue ?? []).map((item: any) => {
              const brief = item.content_ai_briefs?.[0];
              const quality = brief?.ai_quality_score;
              return (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                        <Badge variant={item.status === 'needs_review' ? 'destructive' : 'outline'} className="text-[10px]">{item.status}</Badge>
                        {item.content_category_tags?.slice(0, 2).map((t: any) => (
                          <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
                        ))}
                        {item.source_country === 'lk' && <span className="text-[9px]">🇱🇰</span>}
                      </div>
                      <p className="text-sm font-semibold line-clamp-1">{brief?.ai_headline ?? item.title}</p>
                      {brief?.ai_summary_short && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{brief.ai_summary_short}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Quality: <strong className={quality >= 0.6 ? 'text-primary' : quality >= 0.3 ? 'text-warning' : 'text-destructive'}>{quality?.toFixed(2) ?? 'N/A'}</strong></span>
                        <span>Trust: {item.source_trust_score?.toFixed(2) ?? 'N/A'}</span>
                        <span>{item.source_name ?? '—'}</span>
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatTimeAgo(item.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'approve' })} title="Approve & Publish">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'reject' })} title="Reject">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending || reBriefMutation.isPending}
                        onClick={() => reBriefMutation.mutate(item.id)} title="Re-run AI Brief">
                        <RotateCw className={`h-3.5 w-3.5 text-muted-foreground ${reBriefMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Published Tab */}
          <TabsContent value="published" className="space-y-2 mt-3">
            {pubLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading…</p>}
            {!pubLoading && !published?.length && <EmptyState message="No published items yet" icon={Eye} />}
            {(published ?? []).map((item: any) => {
              const brief = item.content_ai_briefs?.[0];
              return (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                        {item.content_category_tags?.slice(0, 2).map((t: any) => (
                          <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
                        ))}
                        {item.source_country === 'lk' && <span className="text-[9px]">🇱🇰</span>}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" /> {formatTimeAgo(item.published_at)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold line-clamp-1">{brief?.ai_headline ?? item.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Fresh: {item.freshness_score ?? 0}</span>
                        <span>Quality: {brief?.ai_quality_score?.toFixed(2) ?? '—'}</span>
                        <span>{item.source_name ?? 'LankaFix'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'pin_hero' })} title="Pin to Hero">
                        <Pin className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'boost' })} title="Boost">
                        <ChevronUp className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'suppress' })} title="Suppress">
                        <Shield className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'archive' })} title="Archive">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Sources Tab — with color-coded health */}
          <TabsContent value="sources" className="space-y-2 mt-3">
            {srcLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading…</p>}
            {!srcLoading && !sources?.length && <EmptyState message="No sources configured" icon={Database} />}
            {(sources ?? []).map((src: any) => {
              const health = getSourceHealth(src);
              const rejectRate = src.counts.total > 0 ? src.counts.rejected / src.counts.total : 0;
              const publishRate = src.counts.total > 0 ? src.counts.published / src.counts.total : 0;
              return (
                <Card key={src.id} className={`p-3 ${HEALTH_STYLES[health]}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${HEALTH_DOT[health]}`} />
                          <p className="text-sm font-semibold">{src.source_name}</p>
                        </div>
                        <SourceHealthBadges src={src} />
                      </div>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
                        <span>Type: <strong>{src.source_type}</strong></span>
                        <span>Trust: <strong className={src.trust_score >= 0.8 ? 'text-primary' : src.trust_score >= 0.6 ? '' : 'text-warning'}>{src.trust_score}</strong></span>
                        <span>Refresh: <strong>{src.refresh_interval_minutes}min</strong></span>
                        <span>Total: <strong>{src.counts.total}</strong></span>
                        <span>Published: <strong className="text-primary">{src.counts.published}</strong> ({src.counts.total > 0 ? Math.round(publishRate * 100) : 0}%)</span>
                        <span>Rejected: <strong className="text-destructive">{src.counts.rejected}</strong> ({src.counts.total > 0 ? Math.round(rejectRate * 100) : 0}%)</span>
                        <span>Archived: <strong>{src.counts.archived}</strong></span>
                        <span>Review: <strong className="text-warning">{src.counts.needs_review}</strong></span>
                        {src.sri_lanka_bias > 0.5 && <span>🇱🇰 SL bias: <strong>{src.sri_lanka_bias}</strong></span>}
                      </div>
                      {src.category_allowlist?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {src.category_allowlist.slice(0, 4).map((c: string) => (
                            <Badge key={c} variant="outline" className="text-[9px] py-0">{c}</Badge>
                          ))}
                          {src.category_allowlist.length > 4 && <span className="text-[9px] text-muted-foreground">+{src.category_allowlist.length - 4}</span>}
                        </div>
                      )}
                    </div>
                    <Button size="icon" variant={src.active ? 'ghost' : 'outline'} className="h-8 w-8 shrink-0"
                      onClick={() => toggleSource.mutate({ sourceId: src.id, active: !src.active })}>
                      <Power className={`h-4 w-4 ${src.active ? 'text-primary' : 'text-destructive'}`} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Surfaces Tab */}
          <TabsContent value="surfaces" className="space-y-3 mt-3">
            {!surfaces?.length && <EmptyState message="No active surface assignments — surfaces use evergreen fallback" icon={Layers} />}
            {Object.entries(surfacesByCode).map(([code, items]) => (
              <Card key={code} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[10px] font-bold">{code.replace(/_/g, ' ')}</Badge>
                  <span className="text-[10px] text-muted-foreground">{items.length} items</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((s: any, i: number) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
                      <span className={`font-medium flex-1 truncate ${s.rank_score >= 990 ? 'text-primary' : ''}`}>
                        {s.rank_score >= 990 && <Pin className="h-3 w-3 inline mr-1" />}
                        {(s as any).content_items?.title ?? s.content_item_id.slice(0, 12)}
                      </span>
                      {s.category_code && <Badge variant="outline" className="text-[9px] shrink-0">{s.category_code}</Badge>}
                      <Badge variant="outline" className="text-[9px] shrink-0">{(s as any).content_items?.content_type?.replace(/_/g, ' ') ?? '—'}</Badge>
                      <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(s.rank_score)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="clusters" className="space-y-2 mt-3">
            {!clusters?.length && <EmptyState message="No active trend clusters" icon={TrendingUp} />}
            {(clusters ?? []).map((c: any) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold capitalize">{c.cluster_label}</p>
                      {c.category_code && <Badge variant="outline" className="text-[9px]">{c.category_code}</Badge>}
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span>Articles: {c.content_count}</span>
                      <span>Momentum: {c.momentum_score}</span>
                      {c.sri_lanka_relevance_score > 50 && <span>🇱🇰 {c.sri_lanka_relevance_score}%</span>}
                      {c.commercial_relevance_score > 50 && <span>💼 {c.commercial_relevance_score}%</span>}
                    </div>
                  </div>
                  <Activity className="h-4 w-4 text-primary/40" />
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-3">
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-3">Event Summary (Last 500)</h3>
              {analytics && (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(analytics).filter(([k]) => k !== 'total').map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{type}</span>
                      <strong>{count as number}</strong>
                    </div>
                  ))}
                </div>
              )}
              {!analytics?.total && <EmptyState message="No analytics events yet" icon={BarChart3} />}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </PageTransition>
  );
}
