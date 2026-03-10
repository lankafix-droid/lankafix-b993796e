import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { SUPPORT_EMAIL } from "@/config/contact";

const TermsPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 bg-background">
      <div className="container py-10 max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Last updated: <strong className="text-foreground">10 March 2026</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            These Terms of Service ("Terms") govern your use of the LankaFix platform and services operated by
            Smart Office (Private) Limited, Colombo, Sri Lanka. By using LankaFix, you agree to these Terms.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Platform Role</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            LankaFix is a technology marketplace that connects customers with verified independent service technicians
            ("Service Providers") for repairs, installations, and technical support. LankaFix facilitates bookings,
            quality assurance, and payment processing but does not directly perform repair services. Service Providers
            are independent professionals, not employees of LankaFix.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. Customer Responsibilities</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1.5">
            <li>Provide accurate information about service needs, device issues, and location</li>
            <li>Ensure a safe and accessible working environment for the technician</li>
            <li>Review and approve quotes before work begins</li>
            <li>Provide OTP verification to confirm job start and completion</li>
            <li>Make timely payment for completed services</li>
            <li>Report any issues within the warranty period through the platform</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. Service Provider Responsibilities</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1.5">
            <li>Maintain valid certifications and qualifications for their service categories</li>
            <li>Arrive within the promised ETA window</li>
            <li>Perform honest on-site diagnosis and provide accurate quotes</li>
            <li>Use quality parts and follow industry-standard repair procedures</li>
            <li>Complete work as quoted and approved by the customer</li>
            <li>Honour warranty terms for completed services</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Quote Approval Process</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            After on-site diagnosis, the Service Provider submits a detailed quote through LankaFix. The quote includes
            labour charges, parts costs (with grade selection where applicable), and estimated completion time.
            <strong className="text-foreground"> No work begins until you explicitly approve the quote.</strong> You may
            request revisions, reject the quote, or cancel the booking at this stage without charge (excluding any
            applicable inspection fee for diagnostic-first services).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Pricing & Payments</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All prices are displayed in Sri Lankan Rupees (LKR). Price estimates are provided upfront based on the
            service category and problem description. Final pricing is determined after on-site diagnosis and reflected
            in the quote. Additional parts or work beyond the approved quote require separate customer approval.
            Payment is due upon job completion. Accepted payment methods include cash, card, and bank transfer.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">6. Cancellation & Refunds</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1.5">
            <li><strong className="text-foreground">Before technician dispatch:</strong> Free cancellation, full refund of any deposit.</li>
            <li><strong className="text-foreground">After dispatch, before arrival:</strong> A cancellation fee of up to LKR 500 may apply to cover travel costs.</li>
            <li><strong className="text-foreground">After work begins:</strong> Payment is due for work completed and parts used. Unused deposits are refunded.</li>
            <li><strong className="text-foreground">Quality issues:</strong> If the same problem recurs within the warranty period, a free revisit is arranged. If unresolvable, a partial or full refund may be issued through LankaFix mediation.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            Refunds are processed within 5–10 business days to the original payment method.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">7. Warranties</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Service warranties vary by category and are clearly displayed at booking confirmation and on your receipt.
            Warranties cover the specific repair or installation performed and apply to both labour and replacement parts.
            Warranties do not cover damage from misuse, accidents, or unrelated issues. Warranty claims must be initiated
            through the LankaFix platform within the stated warranty period.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">8. Dispute Resolution</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            LankaFix provides a dedicated mediation process for service disputes. If you're unsatisfied with the service:
          </p>
          <ol className="text-sm text-muted-foreground leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>Report the issue through the app within 48 hours of job completion</li>
            <li>A LankaFix support agent will review the evidence (photos, quotes, timeline)</li>
            <li>If warranted, a free revisit or corrective action will be arranged</li>
            <li>If the issue cannot be resolved, a partial or full refund will be processed</li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">9. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            LankaFix acts as a technology platform facilitating connections between customers and independent Service
            Providers. While we verify provider credentials, monitor service quality, and provide mediation for disputes,
            LankaFix is not directly liable for the outcomes of work performed by independent Service Providers beyond
            the warranty and mediation processes described in these Terms. Our total liability is limited to the amount
            paid for the specific service in question.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">10. Account Termination</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may delete your account at any time through the app via Account → Delete My Account. LankaFix may
            suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or abuse the platform.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            Upon account deletion: active bookings will be cancelled; LankaFix Care plans and subscriptions will be
            permanently terminated and unused service credits forfeited; pending refunds will be processed; warranty
            claims will be resolved before deletion is finalized; and transaction records may be retained for up to
            90 days for legal compliance. For more details, see our{" "}
            <a href="/support/account-deletion" className="text-primary hover:underline">Account Deletion</a> page.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">11. Changes to These Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update these Terms from time to time. Material changes will be communicated through the app or via
            email. Continued use of LankaFix after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-2 pb-4">
          <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about these Terms, contact us at:
          </p>
          <div className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 space-y-1">
            <p><strong className="text-foreground">Smart Office (Private) Limited</strong></p>
            <p>Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a></p>
            <p>Website: <a href="https://lankafix.lk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">lankafix.lk</a></p>
            <p>Location: Colombo, Sri Lanka</p>
          </div>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default TermsPage;
