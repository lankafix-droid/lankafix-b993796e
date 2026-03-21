/**
 * Partner Onboarding Review Page — Ops/Admin interface for reviewing partner applications.
 */
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import OnboardingReviewPanel from "@/components/v2/ops/OnboardingReviewPanel";

export default function PartnerOnboardingReviewPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border/60 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground">Partner Onboarding Review</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto p-4">
        <OnboardingReviewPanel />
      </div>
    </div>
  );
}
