import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SUPPORT_EMAIL } from "@/config/contact";

function LegalSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-foreground">{number}. {title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

const TermsPage = () => (
  <PageTransition className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 bg-background">
      <div className="container py-6 px-4 max-w-2xl space-y-6 pb-28">
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Last updated: <strong className="text-foreground">10 March 2026</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            These Terms of Service govern your use of the LankaFix platform operated by
            Smart Office (Private) Limited, Colombo, Sri Lanka.
          </p>
        </div>

        <LegalSection number="1" title="Platform Role">
          <p>
            LankaFix is a technology marketplace that connects customers with verified independent service technicians.
            Service Providers are independent professionals, not employees of LankaFix.
          </p>
        </LegalSection>

        <LegalSection number="2" title="Customer Responsibilities">
          <ul className="list-disc pl-5 space-y-2">
            <li>Provide accurate information about service needs and location</li>
            <li>Ensure a safe and accessible working environment</li>
            <li>Review and approve quotes before work begins</li>
            <li>Provide OTP verification to confirm job start and completion</li>
            <li>Make timely payment for completed services</li>
          </ul>
        </LegalSection>

        <LegalSection number="3" title="Service Provider Responsibilities">
          <ul className="list-disc pl-5 space-y-2">
            <li>Maintain valid certifications and qualifications</li>
            <li>Arrive within the promised ETA window</li>
            <li>Perform honest diagnosis and provide accurate quotes</li>
            <li>Use quality parts and follow industry-standard procedures</li>
            <li>Honour warranty terms for completed services</li>
          </ul>
        </LegalSection>

        <LegalSection number="4" title="Quote Approval Process">
          <p>
            After on-site diagnosis, a detailed quote is submitted through LankaFix.{" "}
            <strong className="text-foreground">No work begins until you explicitly approve the quote.</strong>{" "}
            You may request revisions, reject the quote, or cancel without charge at this stage.
          </p>
        </LegalSection>

        <LegalSection number="5" title="Pricing & Payments">
          <p>
            All prices are in Sri Lankan Rupees (LKR). Price estimates are provided upfront.
            Final pricing is determined after on-site diagnosis. Payment is due upon job completion.
          </p>
        </LegalSection>

        <LegalSection number="6" title="Cancellation & Refunds">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-foreground">Before dispatch:</strong> Free cancellation, full refund.</li>
            <li><strong className="text-foreground">After dispatch, before arrival:</strong> Up to LKR 500 cancellation fee may apply.</li>
            <li><strong className="text-foreground">After work begins:</strong> Payment due for work completed.</li>
            <li><strong className="text-foreground">Quality issues:</strong> Free revisit within warranty period, or refund via mediation.</li>
          </ul>
          <p className="mt-2">Refunds are processed within 5–10 business days.</p>
        </LegalSection>

        <LegalSection number="7" title="Warranties">
          <p>
            Service warranties vary by category and are clearly displayed at booking.
            Warranties do not cover damage from misuse, accidents, or unrelated issues.
          </p>
        </LegalSection>

        <LegalSection number="8" title="Dispute Resolution">
          <p>LankaFix provides a dedicated mediation process:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Report the issue within 48 hours of job completion</li>
            <li>LankaFix support reviews evidence (photos, quotes, timeline)</li>
            <li>Free revisit or corrective action if warranted</li>
            <li>Partial or full refund if unresolvable</li>
          </ol>
        </LegalSection>

        <LegalSection number="9" title="Limitation of Liability">
          <p>
            LankaFix acts as a technology platform. Our total liability is limited to the amount paid for the specific service in question.
          </p>
        </LegalSection>

        <LegalSection number="10" title="Account Termination">
          <p>
            You may delete your account at any time. Upon deletion, active bookings are cancelled and care plans are permanently terminated.
            See our <Link to="/support/account-deletion" className="text-primary hover:underline">Account Deletion</Link> page for details.
          </p>
        </LegalSection>

        <LegalSection number="11" title="Changes to These Terms">
          <p>
            Material changes will be communicated through the app. Continued use constitutes acceptance.
          </p>
        </LegalSection>

        <LegalSection number="12" title="Contact">
          <p>For questions about these Terms:</p>
          <div className="bg-card rounded-xl border border-border/60 p-4 space-y-1.5 text-sm">
            <p><strong className="text-foreground">Smart Office (Private) Limited</strong></p>
            <p>Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a></p>
            <p>Website: <a href="https://lankafix.lk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">lankafix.lk</a></p>
            <p>Location: Colombo, Sri Lanka</p>
          </div>
        </LegalSection>
      </div>
    </main>
    <Footer />
  </PageTransition>
);

export default TermsPage;
