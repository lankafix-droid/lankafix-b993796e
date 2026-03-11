/**
 * ConsentGate — Role-based Terms & Conditions acceptance screen.
 * Blocks app access until the user accepts all required policies.
 */
import { useState } from "react";
import { Shield, FileText, CreditCard, Lock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import { useAcceptTerms, type UserRole } from "@/hooks/useTermsAcceptance";
import { toast } from "sonner";

interface ConsentGateProps {
  userId: string;
  role: UserRole;
  onAccepted: () => void;
}

// ─── Content Sections ───

const customerSections = [
  {
    icon: Shield,
    title: "How LankaFix Works",
    points: [
      "LankaFix is a marketplace platform connecting you with independent service providers in Sri Lanka.",
      "Service delivery, workmanship, parts used, and technical outcomes are primarily the responsibility of the selected provider.",
      "Pricing may vary after on-site inspection or diagnosis depending on the service category.",
    ],
  },
  {
    icon: FileText,
    title: "Your Responsibilities",
    points: [
      "Provide accurate booking information including address, device details, and issue description.",
      "Review quotes carefully before approval.",
      "Where relevant, inspect parts and completed services before final acceptance.",
      "Use the platform lawfully and respectfully.",
    ],
  },
  {
    icon: Shield,
    title: "Provider Responsibilities",
    points: [
      "Providers must deliver professional, ethical, and quality service.",
      "Providers must clearly disclose whether parts are genuine/OEM, compatible, refurbished, or customer-supplied.",
      "Providers are responsible for their staff, technicians, and representatives.",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments, Complaints & Disputes",
    points: [
      "LankaFix-approved payment methods should be used where available.",
      "Report complaints, misconduct, poor service, or disputes to LankaFix promptly.",
      "LankaFix may review complaints, assist with dispute handling, and enforce platform rules.",
      "LankaFix's role is as a marketplace facilitator, subject to applicable policy and law.",
    ],
  },
  {
    icon: Lock,
    title: "Privacy & Consent",
    points: [
      "LankaFix may collect and process account, booking, location, quote, support, and payment information needed to run the platform.",
      "LankaFix may use this data to operate services, improve matching, verify providers, and maintain platform safety.",
      "LankaFix may send relevant service, support, security, and policy communications.",
    ],
  },
];

const providerSections = [
  {
    icon: Shield,
    title: "Your Role on LankaFix",
    points: [
      "Service providers are independent parties using LankaFix to offer services to customers.",
      "You are responsible for delivering lawful, ethical, professional, and quality service.",
      "You are responsible for your staff, technicians, and representatives.",
    ],
  },
  {
    icon: FileText,
    title: "Quality, Conduct & Parts Rules",
    points: [
      "Do not engage in fraud, misconduct, unsafe work, harassment, misrepresentation, or unfair overbilling.",
      "Clearly disclose whether parts are genuine/OEM, compatible, refurbished, or customer-supplied.",
      "Follow LankaFix conduct, platform, and quality rules at all times.",
    ],
  },
  {
    icon: CreditCard,
    title: "Quotes, Payments & Commission",
    points: [
      "LankaFix-approved payment methods should be used where available.",
      "Where you collect payment directly from a customer under an approved COD flow, remit LankaFix commission and platform dues within 48 hours.",
      "LankaFix may request proof of collection or reconciliation details.",
      "Failure to settle dues on time may lead to suspension, settlement hold, restrictions, or termination.",
    ],
  },
  {
    icon: Shield,
    title: "Anti-Bypass & Enforcement",
    points: [
      "LankaFix-originated leads must not be diverted off-platform to avoid platform dues.",
      "LankaFix may suspend, restrict, investigate, penalize, hold settlements, or terminate providers for misconduct, fraud risk, payment default, or policy breach.",
    ],
  },
  {
    icon: FileText,
    title: "Complaints, Evidence & Investigations",
    points: [
      "Cooperate with complaint investigations, evidence requests, and dispute handling.",
      "LankaFix may investigate complaints, fraud risk, payment default, misconduct, or suspicious activity.",
      "Users should report complaints or disputes through LankaFix promptly.",
    ],
  },
  {
    icon: Lock,
    title: "Privacy & Consent",
    points: [
      "LankaFix may collect and process account, booking, verification, settlement, and payment information needed to run the platform.",
      "LankaFix may use this data to operate services, verify providers, support bookings, handle complaints, and maintain platform safety.",
      "LankaFix may keep acceptance and policy-version records for compliance purposes.",
    ],
  },
];

function CollapsibleSection({ icon: Icon, title, points }: { icon: any; title: string; points: string[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 text-left hover:bg-muted/60 transition-colors"
      >
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <ul className="px-4 py-3 space-y-2">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
              <span className="text-primary mt-1 shrink-0">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ConsentGate({ userId, role, onAccepted }: ConsentGateProps) {
  const [checked, setChecked] = useState(false);
  const acceptMutation = useAcceptTerms();

  const isCustomer = role === "customer";
  const sections = isCustomer ? customerSections : providerSections;

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync({ userId, role });
      toast.success("Terms accepted. Welcome to LankaFix!");
      onAccepted();
    } catch {
      toast.error("Failed to save acceptance. Please try again.");
    }
  };

  const checkboxLabel = isCustomer
    ? "I have read and agree to the LankaFix Customer Terms, Payment Rules, and Privacy Policy."
    : "I have read and agree to the LankaFix Service Provider Terms, Payment & Commission Rules, Platform Conduct Requirements, and Privacy Policy.";

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex justify-center">
        <LankaFixLogo variant="horizontal" size="md" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Title */}
          <div className="text-center space-y-1 pb-2">
            <h1 className="text-xl font-bold text-foreground font-heading">
              {isCustomer ? "Before You Continue" : "Provider Terms"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isCustomer
                ? "Please review how LankaFix works and your rights as a customer."
                : "Please review the platform rules and your obligations as a service provider."}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {sections.map((s, i) => (
              <CollapsibleSection key={i} {...s} />
            ))}
          </div>

          {/* Policy links */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a href="/terms" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> Full Terms
            </a>
            <a href="/privacy" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> Privacy Policy
            </a>
            <a href="/how-pricing-works" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> Payment Rules
            </a>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-4 safe-area-bottom">
        <div className="max-w-lg mx-auto space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <span className="text-[13px] leading-snug text-foreground">
              {checkboxLabel}
            </span>
          </label>

          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!checked || acceptMutation.isPending}
            onClick={handleAccept}
          >
            {acceptMutation.isPending ? "Saving…" : "Continue to LankaFix"}
          </Button>
        </div>
      </div>
    </div>
  );
}
