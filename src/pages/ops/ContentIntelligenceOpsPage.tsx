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

function SourceHealthBadge({ lastFetched, active }: { lastFetched: string | null; active: boolean }) {
  if (!active) return <Badge variant="secondary" className="text-[9px]">Disabled</Badge>;
  if (!lastFetched) return <Badge variant="outline" className="text-[9px] text-warning border-warning/30">Never fetched</Badge>;
  const hours = (Date.now() - new Date(lastFetched).getTime()) / 3600000;
  if (hours > 24) return <Badge variant="destructive" className="text-[9px]">Stale ({Math.floor(hours)}h)</Badge>;
  if (hours > 6) return <Badge variant="outline" className="text-[9px] text-warning border-warning/30">{formatTimeAgo(lastFetched)}</Badge>;
  return <Badge variant="outline" className="text-[9px] text-primary border-primary/30">{formatTimeAgo(lastFetched)}</Badge>;
}

export default function ContentIntelligenceOpsPage() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['content-ops'] });

  // ─── Queries ───
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
      const countMap: Record<string, { published: number; rejected: number; archived: number; total: number }> = {};
      (items ?? []).forEach((i: any) => {
        const c = countMap[i.source_id] ??= { published: 0, rejected: 0, archived: 0, total: 0 };
        c.total++;
        if (i.status === 'published') c.published++;
        if (i.status === 'rejected') c.rejected++;
        if (i.status === 'archived') c.archived++;
      });
      return srcs.map((s: any) => ({ ...s, counts: countMap[s.id] ?? { published: 0, rejected: 0, archived: 0, total: 0 } }));
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

  // Pipeline stats
  const totalPublished = published?.length ?? 0;
  const totalSources = sources?.length ?? 0;
  const activeSources = sources?.filter((s: any) => s.active).length ?? 0;
  const staleSources = sources?.filter((s: any) => {
    if (!s.active || !s.last_fetched_at) return s.active;
    return (Date.now() - new Date(s.last_fetched_at).getTime()) > 24 * 3600000;
  }).length ?? 0;
  const surfaceCount = surfaces?.length ?? 0;

  // ─── Mutations ───
  const ingestMutation = useMutation({
    mutationFn: async (mode: string) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', { body: { mode } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Pipeline complete`, { description: `Fetched: ${data?.fetched ?? 0}, Briefed: ${data?.briefed ?? 0}, Published: ${data?.published ?? 0}, Surfaces: ${data?.surfaces_refreshed ?? 0}` });
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
        // Boost item rank on current surfaces by adding a quality bump
        await supabase.from('content_surface_state').update({ rank_score: 85 }).eq('content_item_id', itemId).eq('active', true);
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
    onSuccess: () => { toast.success('Re-briefed successfully'); invalidateAll(); },
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
            {staleSources > 0 && (
              <p className="text-xs text-warning flex items-center gap-1 mt-0.5">
                <AlertTriangle className="h-3 w-3" /> {staleSources} stale source{staleSources > 1 ? 's' : ''}
              </p>
            )}
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
              Full Pipeline
            </Button>
          </div>
        </div>

        {/* Stats — expanded */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <StatCard label="Queue" value={queue?.length ?? 0} icon={AlertTriangle} color="text-warning" />
          <StatCard label="Published" value={totalPublished} icon={Eye} color="text-primary" />
          <StatCard label="Sources" value={`${activeSources}/${totalSources}`} icon={Layers} color="text-accent-foreground" subtitle={staleSources > 0 ? `${staleSources} stale` : undefined} />
          <StatCard label="Surfaces" value={surfaceCount} icon={Pin} color="text-primary" />
          <StatCard label="Events" value={analytics?.total ?? 0} icon={BarChart3} color="text-muted-foreground" />
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

          {/* ─── Queue Tab ─── */}
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

          {/* ─── Published Tab ─── */}
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

          {/* ─── Sources Tab ─── */}
          <TabsContent value="sources" className="space-y-2 mt-3">
            {srcLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading…</p>}
            {!srcLoading && !sources?.length && <EmptyState message="No sources configured" icon={Database} />}
            {(sources ?? []).map((src: any) => (
              <Card key={src.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-semibold">{src.source_name}</p>
                      <SourceHealthBadge lastFetched={src.last_fetched_at} active={src.active} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
                      <span>Type: <strong>{src.source_type}</strong></span>
                      <span>Trust: <strong className={src.trust_score >= 0.8 ? 'text-primary' : src.trust_score >= 0.6 ? '' : 'text-warning'}>{src.trust_score}</strong></span>
                      <span>Refresh: <strong>{src.refresh_interval_minutes}min</strong></span>
                      <span>Freshness: <strong>{src.freshness_priority}</strong></span>
                      <span>Total: <strong>{src.counts?.total ?? 0}</strong></span>
                      <span>Published: <strong className="text-primary">{src.counts?.published ?? 0}</strong></span>
                      <span>Rejected: <strong className="text-destructive">{src.counts?.rejected ?? 0}</strong></span>
                      <span>Archived: <strong>{src.counts?.archived ?? 0}</strong></span>
                      {src.category_allowlist?.length > 0 && (
                        <span className="col-span-2">Categories: <strong>{src.category_allowlist.join(', ')}</strong></span>
                      )}
                      {(src.sri_lanka_bias ?? 0) > 0.5 && (
                        <span>🇱🇰 SL bias: <strong className="text-primary">{src.sri_lanka_bias}</strong></span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={src.active ? 'destructive' : 'default'}
                    disabled={toggleSource.isPending}
                    onClick={() => toggleSource.mutate({ sourceId: src.id, active: !src.active })}
                    className="shrink-0"
                  >
                    <Power className="h-3 w-3 mr-1" />
                    {src.active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Surfaces Tab ─── */}
          <TabsContent value="surfaces" className="space-y-4 mt-3">
            {!surfaces?.length && <EmptyState message="No active surfaces — run full pipeline to populate" icon={Layers} />}
            {Object.entries(surfacesByCode).map(([code, items]) => (
              <div key={code}>
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5 capitalize">
                  <Pin className="h-3.5 w-3.5 text-primary" />
                  {code.replace(/_/g, ' ')}
                  <Badge variant="outline" className="text-[10px] ml-1">{items.length} items</Badge>
                </h3>
                <div className="space-y-1">
                  {items.map((s: any) => (
                    <Card key={s.id} className="p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium line-clamp-1">{s.content_items?.title ?? 'Unknown'}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span className="capitalize">{s.content_items?.content_type?.replace(/_/g, ' ') ?? ''}</span>
                            {s.content_items?.freshness_score != null && (
                              <span>Fresh: {s.content_items.freshness_score}</span>
                            )}
                            {s.content_items?.source_name && (
                              <span className="truncate max-w-[100px]">{s.content_items.source_name}</span>
                            )}
                            {s.rank_score >= 990 && (
                              <Badge variant="default" className="text-[9px] px-1 py-0">PINNED</Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                          {s.rank_score?.toFixed(1)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ─── Clusters Tab ─── */}
          <TabsContent value="clusters" className="space-y-2 mt-3">
            {!clusters?.length && <EmptyState message="No trend clusters detected yet" icon={TrendingUp} />}
            {(clusters ?? []).map((c: any) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{c.cluster_label}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{c.category_code ?? 'General'}</Badge>
                      <span>{c.content_count} items</span>
                      <span>Momentum: <strong>{c.momentum_score}</strong></span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span>🇱🇰 Relevance: {c.sri_lanka_relevance_score ?? 0}</span>
                      <span>💼 Commercial: {c.commercial_relevance_score ?? 0}</span>
                    </div>
                  </div>
                  <Activity className="h-4 w-4 text-primary shrink-0" />
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Analytics Tab ─── */}
          <TabsContent value="analytics" className="mt-3">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Impressions', value: (analytics as any)?.impression ?? 0, icon: Eye, color: 'text-primary' },
                { label: 'Clicks', value: (analytics as any)?.click ?? 0, icon: TrendingUp, color: 'text-accent-foreground' },
                { label: 'Opens', value: (analytics as any)?.open ?? 0, icon: Activity, color: 'text-muted-foreground' },
              ].map(m => (
                <StatCard key={m.label} label={m.label} value={m.value} icon={m.icon} color={m.color} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Saves', value: (analytics as any)?.save ?? 0 },
                { label: 'Shares', value: (analytics as any)?.share ?? 0 },
                { label: 'Booking CTR', value: (analytics as any)?.booking_clickthrough ?? 0 },
                { label: 'Category CTR', value: (analytics as any)?.category_clickthrough ?? 0 },
                { label: 'Source Links', value: (analytics as any)?.source_link ?? 0 },
                { label: 'Related Clicks', value: (analytics as any)?.related_insight ?? 0 },
              ].map(m => (
                <Card key={m.label} className="p-3 text-center">
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </PageTransition>
  );
}
