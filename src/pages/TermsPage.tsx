import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";

const TermsPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 bg-background">
      <div className="container py-12 max-w-3xl prose prose-sm">
        <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mt-2">Last updated: March 2026</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">1. Service Overview</h2>
        <p className="text-sm text-muted-foreground">LankaFix is a technology platform operated by Smart Office (Private) Limited that connects customers with verified independent service technicians for repairs, installations, and technical support across Sri Lanka.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">2. Booking & Service Delivery</h2>
        <p className="text-sm text-muted-foreground">By placing a booking, you agree to the estimated pricing shown. Final pricing may vary based on actual diagnosis. Work begins only after your explicit approval (OTP verification). LankaFix assigns technicians based on availability, proximity, and skill match.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">3. Pricing & Payments</h2>
        <p className="text-sm text-muted-foreground">All prices are displayed in Sri Lankan Rupees (LKR). Estimates are provided upfront but may change after on-site diagnosis. Additional parts or labour require customer approval before proceeding.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">4. Warranties</h2>
        <p className="text-sm text-muted-foreground">Service warranties vary by category and are displayed at booking confirmation. Warranties cover the specific repair performed and do not extend to unrelated issues or pre-existing conditions.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">5. Cancellation</h2>
        <p className="text-sm text-muted-foreground">Bookings can be cancelled free of charge before a technician is dispatched. After dispatch, a cancellation fee may apply to cover travel costs.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">6. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground">LankaFix facilitates connections between customers and independent technicians. While we verify and monitor quality, LankaFix is not directly liable for the outcomes of work performed by independent service providers.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">7. Contact</h2>
        <p className="text-sm text-muted-foreground">For questions about these terms, contact us at hello@lankafix.lk or via WhatsApp support.</p>
      </div>
    </main>
    <Footer />
  </div>
);

export default TermsPage;