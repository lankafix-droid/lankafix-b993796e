import Header from "@/components/layout/Header";
import PageTransition from "@/components/motion/PageTransition";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl border border-border/60 p-5 space-y-2.5 shadow-[var(--shadow-card)]">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

const RefundPage = () => {
  const navigate = useNavigate();

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-lg py-5 px-4 space-y-4 pb-28">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors h-10 active:scale-95">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div>
          <h1 className="text-xl font-bold text-foreground">Refund Policy</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Effective: 1 March 2026</p>
        </div>

        <Section title="Cancellation Before Service">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary font-bold shrink-0">•</span><span><strong className="text-foreground">Within 10 min:</strong> Full refund, no questions asked</span></li>
            <li className="flex gap-2"><span className="text-primary font-bold shrink-0">•</span><span><strong className="text-foreground">Before dispatch:</strong> Full refund of commitment fee</span></li>
            <li className="flex gap-2"><span className="text-primary font-bold shrink-0">•</span><span><strong className="text-foreground">After dispatch:</strong> Travel fee may apply (LKR 500–1,000)</span></li>
          </ul>
        </Section>

        <Section title="Diagnostic & Inspection Fees">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Non-refundable once assessment is complete. If you proceed with repair, the diagnostic fee is deducted from the total cost.
          </p>
        </Section>

        <Section title="Quote Rejection">
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you reject the quote after diagnosis, you only pay the diagnostic fee. No repair charges apply. You're never charged for unapproved work.
          </p>
        </Section>

        <Section title="Service Quality Issues">
          <p className="text-sm text-muted-foreground leading-relaxed">
            If the repair doesn't resolve the issue within the warranty period, LankaFix arranges a free re-visit. If it persists, request a partial or full refund through mediation.
          </p>
        </Section>

        <Section title="Emergency Surcharge">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The 25% emergency surcharge is non-refundable after dispatch. If the technician fails to arrive within 2 hours, the surcharge is refunded automatically.
          </p>
        </Section>

        <Section title="How to Request a Refund">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Contact support via WhatsApp or call with your booking reference. Requests are reviewed within 24 hours. Approved refunds process in 3–5 business days.
          </p>
        </Section>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>LankaFix Fair Pricing Guarantee</span>
        </div>
      </main>
    </PageTransition>
  );
};

export default RefundPage;
