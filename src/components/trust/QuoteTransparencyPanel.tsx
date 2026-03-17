/**
 * QuoteTransparencyPanel — Explains quote contents to customer.
 * Advisory only — does not modify booking state.
 */
import { FileText, ShieldCheck } from "lucide-react";

const QuoteTransparencyPanel = () => (
  <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3">
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4 text-primary" />
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Quote Transparency</h3>
    </div>
    <ul className="space-y-1.5 text-[11px] text-muted-foreground">
      <li className="flex items-start gap-2">
        <ShieldCheck className="w-3 h-3 mt-0.5 text-primary shrink-0" />
        <span>All costs are itemized — labor, parts, and any additional fees</span>
      </li>
      <li className="flex items-start gap-2">
        <ShieldCheck className="w-3 h-3 mt-0.5 text-primary shrink-0" />
        <span>No work begins until you approve the quote</span>
      </li>
      <li className="flex items-start gap-2">
        <ShieldCheck className="w-3 h-3 mt-0.5 text-primary shrink-0" />
        <span>Any extra work requires separate approval</span>
      </li>
      <li className="flex items-start gap-2">
        <ShieldCheck className="w-3 h-3 mt-0.5 text-primary shrink-0" />
        <span>Final diagnosis is always confirmed by the technician</span>
      </li>
    </ul>
  </div>
);

export default QuoteTransparencyPanel;
