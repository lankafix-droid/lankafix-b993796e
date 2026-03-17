/**
 * AITrustLaunchNote — Consumer-safe trust card.
 * Reinforces that AI is optional and advisory only.
 */
import { ShieldCheck } from "lucide-react";

const AITrustLaunchNote = () => (
  <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-2.5">
    <div className="flex items-center gap-2">
      <ShieldCheck className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold text-foreground">AI is always optional</span>
    </div>
    <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed list-disc list-inside">
      <li>LankaFix AI features provide helpful suggestions only</li>
      <li>Your bookings work perfectly without AI turned on</li>
      <li>AI never controls your bookings or payments</li>
      <li>A qualified technician always gives the final assessment</li>
      <li>You can change these settings anytime</li>
    </ul>
  </div>
);

export default AITrustLaunchNote;
