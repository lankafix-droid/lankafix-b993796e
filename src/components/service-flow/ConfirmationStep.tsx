/**
 * ConfirmationStep — Interface 4 combined confirmation layer.
 * Shows partner match preview, flow family outcome, address capture,
 * access details, required consents, commitment/fee info, and final review.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Navigation, Edit3, CheckCircle2, Shield, User, Phone,
  Clock, Star, ChevronDown, AlertTriangle,
} from "lucide-react";
import { type FlowFamily, FLOW_FAMILY_LABELS, type CommercialInfo } from "@/data/categoryFlowEngine";
import ConsentCard, { type ConsentVariant } from "@/components/booking/ConsentCard";

interface ConfirmationStepProps {
  flowFamily: FlowFamily;
  commercial: CommercialInfo;
  /** Collected from previous steps */
  serviceLabel: string;
  issueLabel: string;
  urgencyLabel: string;
  modeLabel?: string;
  categoryLabel: string;
  description?: string;
  diagnosticSummary: Record<string, string>;
  diagnosticLabels: Record<string, string>;
  /** Identity */
  name: string;
  phone: string;
  /** Location state */
  locationMethod: string;
  addressLine1: string;
  city: string;
  district: string;
  landmark: string;
  floorOrUnit: string;
  parkingNotes: string;
  savedAddressId: string;
  savedAddress: any;
  savedAddressDisplay: string;
  /** Callbacks */
  onLocationMethodChange: (m: string) => void;
  onFieldChange: (key: string, val: string) => void;
  onEditStep: (step: string) => void;
  /** Config */
  adultPresenceRequired: boolean;
  accessDetailsRequired: boolean;
  adultPresenceConfirmed: boolean;
  onAdultPresenceChange: (v: boolean) => void;
  /** Consents */
  requiredConsents: string[];
  consentState: Record<string, boolean>;
  onConsentChange: (key: string, checked: boolean) => void;
}

const VALID_CONSENT_VARIANTS: ConsentVariant[] = [
  "data_safety", "backup_responsibility", "inspection_first",
  "quote_variance", "pin_passcode", "data_risk",
];

export default function ConfirmationStep(props: ConfirmationStepProps) {
  const {
    flowFamily, commercial, serviceLabel, issueLabel, urgencyLabel, modeLabel,
    categoryLabel, description, diagnosticSummary, diagnosticLabels,
    name, phone, locationMethod, addressLine1, city, district, landmark,
    floorOrUnit, parkingNotes, savedAddressId, savedAddress, savedAddressDisplay,
    onLocationMethodChange, onFieldChange, onEditStep,
    adultPresenceRequired, accessDetailsRequired, adultPresenceConfirmed, onAdultPresenceChange,
    requiredConsents, consentState, onConsentChange,
  } = props;

  const familyMeta = FLOW_FAMILY_LABELS[flowFamily];
  const [showAccess, setShowAccess] = useState(false);

  // Filter to only known consent variants
  const validConsents = requiredConsents.filter(
    (c) => VALID_CONSENT_VARIANTS.includes(c as ConsentVariant)
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Review & Confirm
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verify your details before submitting
        </p>
      </div>

      {/* Flow Family Outcome — what happens next */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/5 border border-primary/15">
        <span className="text-lg mt-0.5">{familyMeta.icon}</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary">{familyMeta.label}</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{familyMeta.nextStep}</p>
        </div>
      </div>

      {/* Request Summary */}
      <div className="rounded-2xl bg-card border border-border/40 divide-y divide-border/30">
        <ReviewRow label="Category" value={categoryLabel} step="service" onEdit={onEditStep} />
        <ReviewRow label="Service" value={serviceLabel} step="service" onEdit={onEditStep} />
        {issueLabel && <ReviewRow label="Issue" value={issueLabel} step="details" onEdit={onEditStep} />}
        {description && <ReviewRow label="Details" value={description} step="details" onEdit={onEditStep} />}

        {/* Key diagnostic answers */}
        {Object.entries(diagnosticSummary).slice(0, 4).map(([key, val]) => (
          <ReviewRow key={key} label={diagnosticLabels[key] || key} value={val} step="diagnostic" onEdit={onEditStep} />
        ))}

        <ReviewRow label="When" value={urgencyLabel} step="urgency" onEdit={onEditStep} />
        {modeLabel && <ReviewRow label="Mode" value={modeLabel} step="urgency" onEdit={onEditStep} />}
      </div>

      {/* Identity */}
      <div className="rounded-2xl bg-card border border-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{name || "—"}</p>
            <p className="text-xs text-muted-foreground">{phone || "—"}</p>
          </div>
          <button onClick={() => onEditStep("identity")} className="text-xs text-primary font-medium">
            Edit
          </button>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Service Location</h3>

        <div className="space-y-2.5">
          {savedAddress && (
            <LocationOption
              active={locationMethod === "saved"}
              icon={<MapPin className="w-4 h-4" />}
              title={savedAddress.label || "Saved Address"}
              subtitle={savedAddressDisplay}
              onClick={() => onLocationMethodChange("saved")}
            />
          )}
          <LocationOption
            active={locationMethod === "current"}
            icon={<Navigation className="w-4 h-4" />}
            title="Use Current Location"
            subtitle="Auto-detect with GPS"
            onClick={() => onLocationMethodChange("current")}
          />
          <LocationOption
            active={locationMethod === "manual"}
            icon={<Edit3 className="w-4 h-4" />}
            title="Enter Address"
            subtitle="Type your service location"
            onClick={() => onLocationMethodChange("manual")}
          />
        </div>

        {locationMethod === "manual" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-1">
            <Input placeholder="Address line 1" value={addressLine1} onChange={(e) => onFieldChange("addressLine1", e.target.value)} className="h-11 rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={city} onChange={(e) => onFieldChange("city", e.target.value)} className="h-11 rounded-xl" />
              <Input placeholder="District" value={district} onChange={(e) => onFieldChange("district", e.target.value)} className="h-11 rounded-xl" />
            </div>
            <Input placeholder="Landmark (optional)" value={landmark} onChange={(e) => onFieldChange("landmark", e.target.value)} className="h-11 rounded-xl" />
          </motion.div>
        )}

        {locationMethod === "current" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-secondary/50 border border-border/40">
            <p className="text-xs text-muted-foreground text-center">
              📍 Your browser will ask for location permission.
            </p>
          </motion.div>
        )}
      </div>

      {/* Access Details */}
      {accessDetailsRequired && locationMethod && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAccess(!showAccess)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAccess ? "rotate-180" : ""}`} />
            Access details (optional)
          </button>
          {showAccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <Input placeholder="Floor / Unit" value={floorOrUnit} onChange={(e) => onFieldChange("floorOrUnit", e.target.value)} className="h-11 rounded-xl" />
              <Input placeholder="Parking notes" value={parkingNotes} onChange={(e) => onFieldChange("parkingNotes", e.target.value)} className="h-11 rounded-xl" />
            </motion.div>
          )}
        </div>
      )}

      {/* Adult Presence */}
      {adultPresenceRequired && (
        <button
          onClick={() => onAdultPresenceChange(!adultPresenceConfirmed)}
          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
            adultPresenceConfirmed ? "border-primary bg-primary/5" : "border-border/40 bg-card"
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 shrink-0 ${adultPresenceConfirmed ? "text-primary" : "text-muted-foreground/30"}`} />
          <span className="text-xs font-medium text-foreground">An adult (18+) will be present during service</span>
        </button>
      )}

      {/* Required Consents — compact inline style */}
      {validConsents.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Acknowledgements
          </p>
          {validConsents.map((consent) => (
            <ConsentCard
              key={consent}
              variant={consent as ConsentVariant}
              checked={!!consentState[consent]}
              onCheckedChange={(v) => onConsentChange(consent, v)}
            />
          ))}
        </div>
      )}

      {/* Commercial Info */}
      <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/40">
        <p className="text-xs font-medium text-foreground">{commercial.expectationLabel}</p>
        {commercial.commitmentFeeRange && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Commitment fee: {commercial.commitmentFeeRange}
          </p>
        )}
        {commercial.warrantyHint && (
          <p className="text-[11px] text-primary mt-1 font-medium">
            ✓ {commercial.warrantyHint}
          </p>
        )}
      </div>

      {/* Guarantee */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Your request is protected by the LankaFix Guarantee.
          A verified technician will be matched and coordinated for you.
        </p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, step, onEdit }: { label: string; value: string; step: string; onEdit: (s: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value || "—"}</p>
      </div>
      <button onClick={() => onEdit(step)} className="text-xs text-primary font-medium shrink-0 mt-1">
        Edit
      </button>
    </div>
  );
}

function LocationOption({ active, icon, title, subtitle, onClick }: {
  active: boolean; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
        active ? "border-primary bg-primary/5" : "border-border/40 bg-card hover:border-primary/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        </div>
        {active && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
      </div>
    </button>
  );
}
