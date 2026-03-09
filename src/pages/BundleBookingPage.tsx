import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { getBundleById, getBundleSavingsLKR } from "@/data/serviceBundles";
import type { ServiceBundle, BundleService } from "@/data/serviceBundles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Clock,
  MapPin,
  Calendar,
  Tag,
  Home,
  Building2,
  Sparkles,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="w-6 h-6" />,
  Building2: <Building2 className="w-6 h-6" />,
};

type Step = "review" | "details" | "confirm";

const BundleBookingPage = () => {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const bundle = getBundleById(bundleId || "");
  const [step, setStep] = useState<Step>("review");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");

  if (!bundle) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-lg font-semibold text-foreground">
              Bundle not found
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const savings = getBundleSavingsLKR(bundle);

  const handleSubmit = () => {
    toast.success("Bundle booking request submitted!", {
      description: `We'll confirm your ${bundle.name} booking shortly.`,
    });
    setStep("confirm");
  };

  const canSubmit = name.trim() && phone.trim().length >= 9 && address.trim();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-lg py-6 space-y-5">
          {/* Back nav */}
          <button
            onClick={() =>
              step === "details"
                ? setStep("review")
                : step === "review"
                ? navigate("/")
                : navigate("/")
            }
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === "details" ? "Back to Review" : "Back to Home"}
          </button>

          {step === "confirm" ? (
            <ConfirmationView bundle={bundle} />
          ) : step === "details" ? (
            <DetailsStep
              bundle={bundle}
              savings={savings}
              name={name}
              phone={phone}
              address={address}
              preferredDate={preferredDate}
              notes={notes}
              onNameChange={setName}
              onPhoneChange={setPhone}
              onAddressChange={setAddress}
              onDateChange={setPreferredDate}
              onNotesChange={setNotes}
              canSubmit={canSubmit}
              onSubmit={handleSubmit}
            />
          ) : (
            <ReviewStep
              bundle={bundle}
              savings={savings}
              onContinue={() => setStep("details")}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

/* ─── Step 1: Review ─── */
function ReviewStep({
  bundle,
  savings,
  onContinue,
}: {
  bundle: ServiceBundle;
  savings: number;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Bundle header */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {iconMap[bundle.icon] ?? <Home className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{bundle.name}</h1>
            <p className="text-sm text-muted-foreground">{bundle.tagline}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{bundle.description}</p>
      </div>

      {/* Included services */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h2 className="font-semibold text-foreground">Included Services</h2>
        {bundle.services.map((s, i) => (
          <ServiceRow key={i} service={s} />
        ))}
      </div>

      {/* Bonuses */}
      <div className="bg-accent/5 rounded-2xl border border-accent/20 p-5 space-y-2">
        <p className="font-semibold text-accent flex items-center gap-1.5 text-sm">
          <Sparkles className="w-4 h-4" /> Bundle Bonuses
        </p>
        {bundle.bonuses.map((b, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{b}</span>
          </div>
        ))}
      </div>

      {/* Guarantees */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
        <p className="font-semibold text-foreground text-sm">
          LankaFix Protection
        </p>
        {bundle.guarantees.map((g, i) => (
          <div key={i} className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">{g}</span>
          </div>
        ))}
      </div>

      {/* Price summary */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">
            Individual total
          </span>
          <span className="text-sm text-muted-foreground line-through">
            LKR {bundle.totalIndividualPriceLKR.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-accent flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" /> Bundle discount
          </span>
          <span className="text-sm font-medium text-accent">
            − LKR {savings.toLocaleString()}
          </span>
        </div>
        <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
          <span className="font-bold text-foreground">Bundle Price</span>
          <span className="text-xl font-bold text-foreground">
            LKR {bundle.bundlePriceLKR.toLocaleString()}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Estimated ~{bundle.estimatedHours}{" "}
          hours • Service fee only — parts quoted separately if needed
        </p>
      </div>

      <Button className="w-full gap-2" size="lg" onClick={onContinue}>
        Continue to Booking <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ─── Step 2: Details ─── */
function DetailsStep({
  bundle,
  savings,
  name,
  phone,
  address,
  preferredDate,
  notes,
  onNameChange,
  onPhoneChange,
  onAddressChange,
  onDateChange,
  onNotesChange,
  canSubmit,
  onSubmit,
}: {
  bundle: ServiceBundle;
  savings: number;
  name: string;
  phone: string;
  address: string;
  preferredDate: string;
  notes: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          Booking Details — {bundle.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          We'll coordinate all services in a single visit
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Full Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your name"
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
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="07X XXX XXXX"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Service Address <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Full address in Greater Colombo"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Preferred Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={preferredDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Additional Notes
          </label>
          <Input
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Any special requirements..."
          />
        </div>
      </div>

      {/* Mini price summary */}
      <div className="bg-accent/5 rounded-xl border border-accent/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{bundle.name}</p>
          <p className="text-xs text-accent">
            Save LKR {savings.toLocaleString()}
          </p>
        </div>
        <p className="text-lg font-bold text-foreground">
          LKR {bundle.bundlePriceLKR.toLocaleString()}
        </p>
      </div>

      <Button
        className="w-full gap-2"
        size="lg"
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        Submit Bundle Booking <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ─── Step 3: Confirmation ─── */
function ConfirmationView({ bundle }: { bundle: ServiceBundle }) {
  const navigate = useNavigate();
  return (
    <div className="text-center space-y-5 py-8">
      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-accent" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Booking Submitted!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your <strong>{bundle.name}</strong> bundle request has been received.
          Our team will confirm your appointment shortly.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 text-left space-y-2">
        <p className="text-sm font-medium text-foreground">What happens next:</p>
        <div className="flex items-start gap-2">
          <Badge className="bg-primary text-primary-foreground text-[10px] mt-0.5 shrink-0">
            1
          </Badge>
          <span className="text-sm text-muted-foreground">
            LankaFix coordinator reviews your request
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Badge className="bg-primary text-primary-foreground text-[10px] mt-0.5 shrink-0">
            2
          </Badge>
          <span className="text-sm text-muted-foreground">
            Verified technicians assigned for all {bundle.services.length}{" "}
            services
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Badge className="bg-primary text-primary-foreground text-[10px] mt-0.5 shrink-0">
            3
          </Badge>
          <span className="text-sm text-muted-foreground">
            Confirmation call with date, time, and team details
          </span>
        </div>
      </div>

      <Button variant="outline" className="gap-2" onClick={() => navigate("/")}>
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Button>
    </div>
  );
}

/* ─── Shared: Service Row ─── */
function ServiceRow({ service }: { service: BundleService }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{service.label}</p>
        <p className="text-xs text-muted-foreground">
          {service.categoryCode} •{" "}
          <span className="line-through">
            LKR {service.individualPriceLKR.toLocaleString()}
          </span>
        </p>
      </div>
    </div>
  );
}

export default BundleBookingPage;
