/**
 * CustomerTrustPanel — Consumer-facing trust reinforcement.
 * Advisory only — does not modify booking state.
 */
import { ShieldCheck, UserCheck, FileText, Headphones } from "lucide-react";

const TRUST_POINTS = [
  { icon: UserCheck, text: "Verified & rated technicians only" },
  { icon: ShieldCheck, text: "No extra work without your approval" },
  { icon: FileText, text: "Invoice, warranty & service record included" },
  { icon: Headphones, text: "Support available if anything goes wrong" },
];

const CustomerTrustPanel = () => (
  <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
    <div className="flex items-center gap-2">
      <ShieldCheck className="w-4 h-4 text-primary" />
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Your Protection</h3>
    </div>
    <div className="space-y-2">
      {TRUST_POINTS.map(({ icon: Icon, text }, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-[11px] text-foreground">{text}</p>
        </div>
      ))}
    </div>
  </div>
);

export default CustomerTrustPanel;
