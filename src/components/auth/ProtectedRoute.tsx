/**
 * ProtectedRoute — Guards routes by auth status and optional role.
 * Redirects unauthenticated users to /login.
 * For role-guarded routes, shows unauthorized screen if user lacks required role.
 */
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  /** If set, user must have this role via has_role() */
  requiredRole?: "admin" | "moderator";
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Role check query — only runs when we need role validation
  const { data: hasRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role", user?.id, requiredRole],
    queryFn: async () => {
      if (!user?.id || !requiredRole) return true;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: requiredRole,
      });
      if (error) {
        console.warn("[ProtectedRoute] Role check failed:", error.message);
        return false;
      }
      return !!data;
    },
    enabled: !!user?.id && !!requiredRole,
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading || (requiredRole && roleLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredRole && hasRole === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">You don't have permission to access this page.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
