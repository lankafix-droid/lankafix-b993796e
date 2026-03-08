import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";

const WarrantyPage = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container max-w-3xl py-10 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Warranty Policy</h1>
      <p className="text-sm text-muted-foreground">Effective: 1 March 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Labour Warranty</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All repairs completed through LankaFix include a minimum <strong>30-day labour warranty</strong>. If the same issue recurs within the warranty period due to workmanship, LankaFix will arrange a re-visit at no additional labour cost.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Parts Warranty</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Parts warranty depends on the grade selected at the time of booking:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
          <li><strong>Original parts:</strong> 12-month manufacturer warranty</li>
          <li><strong>OEM parts:</strong> 6-month OEM warranty</li>
          <li><strong>A Grade parts:</strong> 3-month LankaFix warranty</li>
          <li><strong>Compatible parts:</strong> 30-day LankaFix replacement warranty</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Service-Specific Warranty</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
          <li>AC servicing & cleaning: 30-day service warranty</li>
          <li>AC gas refill: 90-day warranty (no external leak)</li>
          <li>Software fixes (virus removal, OS install): 7-day warranty</li>
          <li>CCTV installation: Installation warranty per project terms</li>
          <li>Solar installation: Installation warranty + panel manufacturer warranty</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Warranty Exclusions</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
          <li>Physical damage caused after repair completion</li>
          <li>Water or liquid damage occurring after repair</li>
          <li>Unauthorized modifications or repairs by third parties</li>
          <li>Normal wear and tear</li>
          <li>Devices with prior undisclosed damage</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">How to Claim Warranty</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Contact LankaFix support via WhatsApp or call with your booking reference number. Our team will verify warranty eligibility and schedule a re-visit within 48 hours.
        </p>
      </section>
    </main>
    <Footer />
  </div>
);

export default WarrantyPage;
