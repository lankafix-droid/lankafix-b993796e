import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { SME_PACKAGES } from "@/data/smePackages";
import type { SMEPackage } from "@/data/smePackages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Headset,
  Monitor,
  Network,
  Camera,
  Printer,
  Phone,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Network: <Network className="w-5 h-5" />,
  Monitor: <Monitor className="w-5 h-5" />,
  Camera: <Camera className="w-5 h-5" />,
  Printer: <Printer className="w-5 h-5" />,
  Headset: <Headset className="w-5 h-5" />,
};

const TRUST_STATS = [
  { icon: <Building2 className="w-5 h-5" />, value: "200+", label: "Businesses Served" },
  { icon: <Users className="w-5 h-5" />, value: "50+", label: "Verified Technicians" },
  { icon: <Star className="w-5 h-5" />, value: "4.8", label: "Average Rating" },
  { icon: <Clock className="w-5 h-5" />, value: "< 4h", label: "Response Time" },
];

function PricingBadge({ pkg }: { pkg: SMEPackage }) {
  const modelLabel =
    pkg.pricingModel === "monthly"
      ? "/mo"
      : pkg.pricingModel === "annual"
      ? "/yr"
      : "";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{pkg.pricingLabel}</p>
      <p className="text-xl font-bold text-foreground">
        LKR {pkg.fromPriceLKR.toLocaleString()}
        {pkg.toPriceLKR && (
          <span className="text-sm font-normal text-muted-foreground">
            {" "}– {pkg.toPriceLKR.toLocaleString()}
          </span>
        )}
        <span className="text-sm font-normal text-muted-foreground">
          {modelLabel}
        </span>
      </p>
    </div>
  );
}

function PackageCard({
  pkg,
  onEnquire,
}: {
  pkg: SMEPackage;
  onEnquire: (pkg: SMEPackage) => void;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {iconMap[pkg.icon] ?? <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-[15px] leading-tight">
                {pkg.name}
              </h3>
              <p className="text-xs text-muted-foreground">{pkg.tagline}</p>
            </div>
          </div>
          {pkg.popular && (
            <Badge className="bg-accent text-accent-foreground text-[10px] px-2 py-0.5 gap-1">
              <Sparkles className="w-3 h-3" /> Popular
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{pkg.description}</p>
      </div>

      {/* Features */}
      <div className="px-5 py-3 space-y-1.5">
        {pkg.features.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="text-sm text-foreground">{f}</span>
          </div>
        ))}
      </div>

      {/* Deliverables */}
      <div className="mx-5 bg-primary/5 rounded-xl p-3 space-y-1.5 mb-3">
        <p className="text-xs font-semibold text-primary flex items-center gap-1">
          <FileText className="w-3 h-3" /> What You Get
        </p>
        {pkg.deliverables.map((d, i) => (
          <p key={i} className="text-xs text-muted-foreground pl-4">
            • {d}
          </p>
        ))}
      </div>

      {/* SLA */}
      <div className="px-5 pb-3 flex flex-wrap gap-1.5">
        {pkg.sla.map((s, i) => (
          <Badge
            key={i}
            variant="outline"
            className="text-[10px] py-0.5 gap-1 font-normal text-muted-foreground"
          >
            <Zap className="w-3 h-3 text-warning" /> {s}
          </Badge>
        ))}
      </div>

      {/* Pricing + CTA */}
      <div className="px-5 pb-5 pt-2 border-t border-border flex items-end justify-between">
        <PricingBadge pkg={pkg} />
        <Button size="sm" className="gap-1.5" onClick={() => onEnquire(pkg)}>
          Get Quote <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Enquiry Modal (inline step) ─── */
function EnquiryForm({
  pkg,
  onBack,
}: {
  pkg: SMEPackage;
  onBack: () => void;
}) {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [employees, setEmployees] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = !!(businessName.trim() && contactName.trim() && phone.trim().length >= 9);

  const handleSubmit = () => {
    toast.success("Enquiry submitted!", {
      description: `We'll contact you about ${pkg.name} shortly.`,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center space-y-5 py-8">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Enquiry Received!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Our SME solutions team will contact <strong>{businessName}</strong>{" "}
            within 24 hours to discuss your <strong>{pkg.name}</strong> requirements.
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 text-left space-y-2">
          <p className="text-sm font-medium text-foreground">What happens next:</p>
          {[
            "LankaFix SME coordinator reviews your requirements",
            "Free consultation call to understand your setup",
            "Custom quote with transparent pricing breakdown",
            "Scheduled installation at your convenience",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <Badge className="bg-primary text-primary-foreground text-[10px] mt-0.5 shrink-0">
                {i + 1}
              </Badge>
              <span className="text-sm text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" className="gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to SME Services
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to packages
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {iconMap[pkg.icon] ?? <Building2 className="w-5 h-5" />}
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Get a Quote — {pkg.name}
          </h2>
          <p className="text-xs text-muted-foreground">{pkg.tagline}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Business Name <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Contact Person <span className="text-destructive">*</span>
          </label>
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Phone Number <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07X XXX XXXX"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Business Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Office address"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Number of Employees
          </label>
          <Input
            value={employees}
            onChange={(e) => setEmployees(e.target.value)}
            placeholder="e.g. 10"
            type="number"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Additional Requirements
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tell us about your needs..."
          />
        </div>
      </div>

      {/* Price reference */}
      <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{pkg.name}</p>
          <p className="text-xs text-muted-foreground">{pkg.pricingLabel}</p>
        </div>
        <p className="text-lg font-bold text-foreground">
          LKR {pkg.fromPriceLKR.toLocaleString()}
          {pkg.toPriceLKR && (
            <span className="text-sm font-normal text-muted-foreground">
              +
            </span>
          )}
        </p>
      </div>

      <Button
        className="w-full gap-2"
        size="lg"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        Submit Enquiry <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ─── Main Page ─── */
const SMEServicesPage = () => {
  const navigate = useNavigate();
  const [enquiringPkg, setEnquiringPkg] = useState<SMEPackage | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-2xl py-6 space-y-6">
          {enquiringPkg ? (
            <EnquiryForm
              pkg={enquiringPkg}
              onBack={() => setEnquiringPkg(null)}
            />
          ) : (
            <>
              {/* Back */}
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </button>

              {/* Hero */}
              <div className="bg-navy text-navy-foreground rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                <div className="relative z-10">
                  <Badge className="bg-accent text-accent-foreground text-xs mb-3 gap-1">
                    <Building2 className="w-3 h-3" /> For Small & Medium
                    Businesses
                  </Badge>
                  <h1 className="text-2xl font-bold mb-2">
                    SME Service Solutions
                  </h1>
                  <p className="text-sm opacity-80 mb-4">
                    Dedicated technical service packages designed for Sri Lankan
                    businesses. From office setup to ongoing maintenance —
                    managed end-to-end by LankaFix.
                  </p>
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    {TRUST_STATS.map((s, i) => (
                      <div
                        key={i}
                        className="text-center bg-white/10 backdrop-blur-sm rounded-xl py-2 px-1"
                      >
                        <div className="flex justify-center mb-1 text-accent">
                          {s.icon}
                        </div>
                        <p className="text-sm font-bold">{s.value}</p>
                        <p className="text-[9px] opacity-70">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Verified Technicians",
                  "Transparent Pricing",
                  "Service Warranty",
                  "Dedicated Account Manager",
                ].map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="text-xs gap-1 text-muted-foreground"
                  >
                    <ShieldCheck className="w-3 h-3 text-primary" /> {t}
                  </Badge>
                ))}
              </div>

              {/* Package cards */}
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-foreground">
                  Service Packages
                </h2>
                {SME_PACKAGES.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onEnquire={setEnquiringPkg}
                  />
                ))}
              </div>

              {/* CTA */}
              <div className="bg-card rounded-2xl border border-border p-5 text-center space-y-3">
                <h3 className="font-bold text-foreground">
                  Need a custom solution?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Our SME team can design a tailored package for your business
                  requirements.
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    (window.location.href =
                      "https://wa.me/94770001234?text=Hi%20LankaFix%2C%20I%20need%20a%20custom%20SME%20package")
                  }
                >
                  <Headset className="w-4 h-4" /> Talk to SME Team
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SMEServicesPage;
