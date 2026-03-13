/** ARCHIVED — removed during homepage optimization. Candidate for reuse on bundle booking page. */
import { useNavigate } from "react-router-dom";
import { SERVICE_BUNDLES, getBundleSavingsLKR } from "@/data/serviceBundles";
import type { ServiceBundle } from "@/data/serviceBundles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Home,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Tag,
  Clock,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
};

function BundleCard({ bundle }: { bundle: ServiceBundle }) {
  const navigate = useNavigate();
  const savings = getBundleSavingsLKR(bundle);

  return (
    <div className="relative bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {iconMap[bundle.icon] ?? <Home className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">
                {bundle.name}
              </h3>
              <p className="text-xs text-muted-foreground">{bundle.tagline}</p>
            </div>
          </div>
          {bundle.popular && (
            <Badge className="bg-accent text-accent-foreground text-[10px] px-2 py-0.5 gap-1">
              <Sparkles className="w-3 h-3" /> Popular
            </Badge>
          )}
        </div>
      </div>

      {/* Services list */}
      <div className="px-5 py-4 flex-1 space-y-4">
        <div className="space-y-2.5">
          {bundle.services.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground">{s.label}</span>
                <span className="text-xs text-muted-foreground ml-1.5 line-through">
                  LKR {s.individualPriceLKR.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bonuses */}
        <div className="bg-accent/5 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-semibold text-accent flex items-center gap-1">
            <Tag className="w-3 h-3" /> Bundle Bonuses
          </p>
          {bundle.bonuses.map((b, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-4">
              • {b}
            </p>
          ))}
        </div>

        {/* Guarantees */}
        <div className="flex flex-wrap gap-1.5">
          {bundle.guarantees.slice(0, 3).map((g, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[10px] py-0.5 gap-1 font-normal text-muted-foreground"
            >
              <ShieldCheck className="w-3 h-3 text-primary" /> {g}
            </Badge>
          ))}
        </div>
      </div>

      {/* Pricing footer */}
      <div className="px-5 pb-5 pt-2 border-t border-border mt-auto">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground line-through">
              LKR {bundle.totalIndividualPriceLKR.toLocaleString()}
            </p>
            <p className="text-2xl font-bold text-foreground">
              LKR {bundle.bundlePriceLKR.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <Badge className="bg-accent/10 text-accent border-0 text-xs font-semibold">
              Save LKR {savings.toLocaleString()}
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" /> ~{bundle.estimatedHours}h total
            </p>
          </div>
        </div>

        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => navigate(`/bundle/${bundle.id}`)}
        >
          Book Bundle <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

const V2ServiceBundles = () => {
  return (
    <section className="py-8 md:py-12">
      <div className="container max-w-2xl">
        <div className="text-center mb-6">
          <Badge
            variant="outline"
            className="mb-2 text-xs gap-1 text-primary border-primary/30"
          >
            <Tag className="w-3 h-3" /> Save up to 21%
          </Badge>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Service Bundles
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Multiple services, one visit, discounted price
          </p>
        </div>

        <div className="space-y-5">
          {SERVICE_BUNDLES.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2ServiceBundles;
