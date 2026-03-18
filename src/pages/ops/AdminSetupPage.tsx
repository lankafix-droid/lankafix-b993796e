/**
 * LankaFix Admin Setup Page
 * Assign roles to authenticated users for pilot operations.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, UserPlus, Users, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type AppRole = "admin" | "operator" | "support";

interface RoleAssignment {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
}

export default function AdminSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("operator");

  // Fetch existing role assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role")
        .order("role");
      if (error) throw error;

      // Fetch profile info for each user
      const userIds = (data || []).map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      return (data || []).map((r: any) => ({
        ...r,
        email: profileMap.get(r.user_id) || r.user_id.slice(0, 8) + "…",
      })) as RoleAssignment[];
    },
  });

  // Assign role mutation
  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Role assigned successfully");
      setEmail("");
    },
    onError: (e: any) => {
      toast.error(e.message?.includes("duplicate") ? "User already has this role" : e.message);
    },
  });

  // Assign role to self (bootstrap)
  const assignSelf = useMutation({
    mutationFn: async (role: AppRole) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Admin role assigned to your account");
    },
    onError: (e: any) => {
      toast.error(e.message?.includes("duplicate") ? "You already have this role" : e.message);
    },
  });

  // Remove role
  const removeRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Role removed");
    },
  });

  const handleAssignByUserId = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    assignRole.mutate({ userId: trimmed, role: selectedRole });
  };

  const roleColor = (role: string) => {
    if (role === "admin") return "bg-destructive/10 text-destructive border-destructive/20";
    if (role === "operator") return "bg-primary/10 text-primary border-primary/20";
    return "bg-accent/10 text-accent-foreground border-accent/20";
  };

  const hasAdmins = assignments.some(a => a.role === "admin");

  return (
    <div className="min-h-screen bg-background safe-area-top">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-heading">Admin & Operator Setup</h1>
            <p className="text-sm text-muted-foreground">Assign roles for pilot operations</p>
          </div>
        </div>

        {/* Bootstrap Warning */}
        {!hasAdmins && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">No admin users configured</p>
                  <p className="text-xs text-muted-foreground">
                    Bootstrap your account as admin to access all ops dashboards.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => assignSelf.mutate("admin")}
                    disabled={assignSelf.isPending}
                  >
                    <Shield className="w-4 h-4 mr-1.5" />
                    Make Me Admin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assign Role */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Assign Role
            </CardTitle>
            <CardDescription>Enter a user ID to assign a role. Find user IDs in the backend auth panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="User ID (UUID)"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssignByUserId}
                disabled={!email.trim() || assignRole.isPending}
              >
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Current Role Assignments
              <Badge variant="secondary" className="ml-auto">{assignments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No roles assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Badge className={`text-[11px] ${roleColor(a.role)}`}>{a.role}</Badge>
                      <span className="text-sm font-mono">{a.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeRole.mutate(a.id)}
                      disabled={removeRole.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        {hasAdmins && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Pilot Ready Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Admin configured", done: hasAdmins },
                { label: "Operator assigned", done: assignments.some(a => a.role === "operator") },
                { label: "Support assigned", done: assignments.some(a => a.role === "support") },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${item.done ? "bg-green-500" : "bg-muted"}`} />
                  <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
