/**
 * PartnerRoute — Guards partner routes.
 * Checks auth + verifies user has a partner record.
 */
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentPartner } from "@/hooks/useCurrentPartner";
import { Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

export default function PartnerRoute({ children }: Props) {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const { data: partner, isLoading: partnerLoading } = useCurrentPartner();

  if (authLoading || partnerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Partner Access Required</h1>
          <p className="text-sm text-muted-foreground">This area is for registered partners only.</p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/">Go Home</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link to="/join">Become a Partner</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
