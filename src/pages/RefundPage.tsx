import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";

const RefundPage = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container max-w-3xl py-10 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Refund Policy</h1>
      <p className="text-sm text-muted-foreground">Effective: 1 March 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Cancellation Before Service</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
          <li><strong>Within 10 minutes of booking:</strong> Full refund, no questions asked</li>
          <li><strong>Before technician dispatch:</strong> Full refund of any commitment fee</li>
          <li><strong>After technician dispatch:</strong> Travel fee may apply (LKR 500–1,000)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Diagnostic & Inspection Fees</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Diagnostic and inspection fees are non-refundable once the technician completes the on-site assessment. However, if you proceed with the repair, the diagnostic fee is deducted from the total repair cost.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Quote Rejection</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you reject the technician's quote after diagnosis, you only pay the diagnostic/inspection fee. No repair charges apply. You are never charged for work you haven't approved.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Service Quality Issues</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If the repair does not resolve the reported issue within the warranty period, LankaFix will arrange a complimentary re-visit. If the issue persists after the re-visit, you may request a partial or full refund through our mediation team.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Emergency Booking Surcharge</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The 25% emergency surcharge is non-refundable once a technician has been dispatched. If the technician fails to arrive within the 2-hour window, the surcharge will be refunded automatically.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">How to Request a Refund</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Contact LankaFix support via WhatsApp or call with your booking reference. Refund requests are reviewed within 24 hours. Approved refunds are processed within 3–5 business days to your original payment method.
        </p>
      </section>
    </main>
    <Footer />
  </div>
);

export default RefundPage;
