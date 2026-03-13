/** ARCHIVED — removed during homepage optimization. Candidate for reuse on SME services page. */
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, ShieldCheck, Users, Headset } from "lucide-react";

const V2SMEBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="py-6 md:py-8">
      <div className="container max-w-2xl">
        <div className="bg-navy text-navy-foreground rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/15 to-accent/10" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <Badge className="bg-accent text-accent-foreground text-[10px] gap-1">
                <Building2 className="w-3 h-3" /> For Businesses
              </Badge>
            </div>
            <h3 className="text-lg font-bold mb-1">SME Service Solutions</h3>
            <p className="text-sm opacity-75 mb-4">
              Office network setup, CCTV maintenance, IT support subscriptions
              and more — tailored for Sri Lankan businesses.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["Dedicated Account Manager", "Priority Response", "Custom Packages"].map((t) => (
                <span
                  key={t}
                  className="text-[10px] bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-accent" /> {t}
                </span>
              ))}
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => navigate("/sme")}
            >
              Explore SME Packages <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default V2SMEBanner;
