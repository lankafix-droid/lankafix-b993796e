import { useState } from 'react';
import PageTransition from '@/components/motion/PageTransition';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, XCircle, Eye, Trash2, Pin } from 'lucide-react';

export default function ContentIntelligenceOpsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'queue' | 'published' | 'sources' | 'surfaces'>('queue');

  // Moderation queue
  const { data: queue } = useQuery({
    queryKey: ['content-ops-queue'],
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

  // Published items
  const { data: published } = useQuery({
    queryKey: ['content-ops-published'],
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

  // Sources
  const { data: sources } = useQuery({
    queryKey: ['content-ops-sources'],
    queryFn: async () => {
      const { data } = await supabase.from('content_sources').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // Surface state
  const { data: surfaces } = useQuery({
    queryKey: ['content-ops-surfaces'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_surface_state')
        .select('*, content_items(title, content_type)')
        .eq('active', true)
        .order('surface_code')
        .order('rank_score', { ascending: false });
      return data ?? [];
    },
  });

  // Run ingestion
  const ingestMutation = useMutation({
    mutationFn: async (mode: string) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', {
        body: { mode },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Ingestion complete: ${data.briefed} briefed, ${data.published} published`);
      queryClient.invalidateQueries({ queryKey: ['content-ops'] });
    },
    onError: (e) => toast.error(`Ingestion failed: ${(e as Error).message}`),
  });

  // Editorial actions
  const editorialAction = useMutation({
    mutationFn: async ({ itemId, action }: { itemId: string; action: string }) => {
      const statusMap: Record<string, string> = {
        approve: 'published',
        reject: 'rejected',
        archive: 'archived',
      };
      const newStatus = statusMap[action];
      if (newStatus) {
        await supabase.from('content_items').update({ status: newStatus }).eq('id', itemId);
      }
      await supabase.from('content_editorial_actions').insert({
        content_item_id: itemId,
        action_type: action,
      });
    },
    onSuccess: () => {
      toast.success('Action applied');
      queryClient.invalidateQueries({ queryKey: ['content-ops'] });
    },
  });

  const tabs = [
    { key: 'queue', label: `Queue (${queue?.length ?? 0})` },
    { key: 'published', label: `Published (${published?.length ?? 0})` },
    { key: 'sources', label: `Sources (${sources?.length ?? 0})` },
    { key: 'surfaces', label: 'Surfaces' },
  ] as const;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-heading text-xl font-bold">Content Intelligence</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => ingestMutation.mutate('brief')}
              disabled={ingestMutation.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${ingestMutation.isPending ? 'animate-spin' : ''}`} />
              Run AI Briefs
            </Button>
            <Button
              size="sm"
              onClick={() => ingestMutation.mutate('publish')}
              disabled={ingestMutation.isPending}
            >
              Publish Surfaces
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border/50 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Queue */}
        {activeTab === 'queue' && (
          <div className="space-y-2">
            {(queue ?? []).map((item: any) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {item.content_type.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant={item.status === 'needs_review' ? 'destructive' : 'outline'} className="text-[10px]">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold line-clamp-1">{item.title}</p>
                    {item.content_ai_briefs?.[0]?.ai_summary_short && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {item.content_ai_briefs[0].ai_summary_short}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => editorialAction.mutate({ itemId: item.id, action: 'approve' })}
                    >
                      <CheckCircle className="h-4 w-4 text-success" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => editorialAction.mutate({ itemId: item.id, action: 'reject' })}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {!queue?.length && (
              <p className="text-center py-8 text-muted-foreground">No items in queue</p>
            )}
          </div>
        )}

        {/* Published */}
        {activeTab === 'published' && (
          <div className="space-y-2">
            {(published ?? []).map((item: any) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {item.content_type.replace(/_/g, ' ')}
                      </Badge>
                      {item.content_category_tags?.map((t: any) => (
                        <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
                      ))}
                    </div>
                    <p className="text-sm font-semibold line-clamp-1">
                      {item.content_ai_briefs?.[0]?.ai_headline ?? item.title}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => editorialAction.mutate({ itemId: item.id, action: 'archive' })}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Sources */}
        {activeTab === 'sources' && (
          <div className="space-y-2">
            {(sources ?? []).map((src: any) => (
              <Card key={src.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{src.source_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {src.source_type} · Trust: {src.trust_score} · Refresh: {src.refresh_interval_minutes}min
                    </p>
                  </div>
                  <Badge variant={src.active ? 'default' : 'secondary'}>
                    {src.active ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </Card>
            ))}
            {!sources?.length && (
              <p className="text-center py-8 text-muted-foreground">No sources configured</p>
            )}
          </div>
        )}

        {/* Surfaces */}
        {activeTab === 'surfaces' && (
          <div className="space-y-2">
            {(surfaces ?? []).map((s: any) => (
              <Card key={s.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-1">{s.surface_code}</Badge>
                    <p className="text-sm font-semibold">{s.content_items?.title ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      Rank: {s.rank_score?.toFixed(1)} · {s.category_code ?? 'All'}
                    </p>
                  </div>
                  <Pin className="h-4 w-4 text-primary" />
                </div>
              </Card>
            ))}
            {!surfaces?.length && (
              <p className="text-center py-8 text-muted-foreground">No active surfaces. Run "Publish Surfaces" to populate.</p>
            )}
          </div>
        )}
      </main>
    </PageTransition>
  );
}
