import { TRUST_ICONS } from "@/brand/trustSystem";

const items = [
  { icon: <TRUST_ICONS.ShieldCheck className="w-3.5 h-3.5" />, label: "Verified Tech" },
  { icon: <TRUST_ICONS.KeyRound className="w-3.5 h-3.5" />, label: "OTP Protected" },
  { icon: <TRUST_ICONS.ShieldCheck className="w-3.5 h-3.5" />, label: "Warranty" },
  { icon: <TRUST_ICONS.CreditCard className="w-3.5 h-3.5" />, label: "Transparent Pricing" },
];

const TrustRibbon = () => (
  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-2 text-xs text-muted-foreground">
    {items.map((item, i) => (
      <span key={i} className="inline-flex items-center gap-1">
        <span className="text-success">{item.icon}</span>
        {item.label}
      </span>
    ))}
  </div>
);

export default TrustRibbon;
