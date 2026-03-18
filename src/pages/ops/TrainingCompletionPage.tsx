/**
 * Training Completion Tracker — DB-backed training module completion tracking.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchTrainingModules } from "@/services/readiness/readinessReadModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const MODULES = fetchTrainingModules();

export default function TrainingCompletionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: completions } = useQuery({
    queryKey: ["training-completions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_completions")
        .select("module_id, user_id, completed_at");
      return data || [];
    },
    staleTime: 10_000,
  });

  const completedSet = new Set((completions || []).map((c: any) => c.module_id));
  const completionPercent = MODULES.length > 0 ? Math.round((completedSet.size / MODULES.length) * 100) : 0;

  const markComplete = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("training_completions").insert({
        user_id: user.id,
        module_id: moduleId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-completions"] });
      toast.success("Module marked complete");
    },
    onError: (e: any) => toast.error(e.message || "Failed to mark complete"),
  });

  return (
    <div className="min-h-screen bg-background safe-area-top">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/launch-command-center-v2")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-heading">Training Completion</h1>
            <p className="text-xs text-muted-foreground">Track operator training for pilot readiness</p>
          </div>
        </div>

        {/* Overall */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Completion</span>
              <span className="text-sm font-bold">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-2.5" />
            <p className="text-[11px] text-muted-foreground mt-1">
              {completedSet.size} of {MODULES.length} modules completed
            </p>
          </CardContent>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Training Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {MODULES.map(mod => {
              const done = completedSet.has(mod.id);
              return (
                <div key={mod.id} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{mod.title}</span>
                      {done && <Badge className="text-[10px] bg-success/10 text-success border-success/30" variant="outline">Done</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{mod.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Roles: {mod.requiredForRoles.join(", ")} · Owner: {mod.owner}
                    </p>
                  </div>
                  {!done && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs shrink-0"
                      onClick={() => markComplete.mutate(mod.id)}
                      disabled={markComplete.isPending}
                    >
                      Mark Done
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
