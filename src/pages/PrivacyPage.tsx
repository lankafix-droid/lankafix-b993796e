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

const PrivacyPage = () => (
  <PageTransition className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 bg-background">
      <div className="container py-6 px-4 max-w-2xl space-y-6 pb-28">
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Last updated: <strong className="text-foreground">10 March 2026</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            This Privacy Policy explains how LankaFix, operated by Smart Office (Private) Limited ("we", "us", "our"),
            collects, uses, stores, and protects your personal information when you use our platform and services.
          </p>
        </div>

        <LegalSection number="1" title="Who We Are">
          <p>
            LankaFix is a technology platform operated by Smart Office (Private) Limited, registered in Sri Lanka.
            We connect customers with verified independent technicians for repairs, installations, and technical support services.
          </p>
          <div className="bg-card rounded-xl border border-border/60 p-4 space-y-1.5 text-sm">
            <p><strong className="text-foreground">Legal Entity:</strong> Smart Office (Private) Limited</p>
            <p><strong className="text-foreground">Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a></p>
            <p><strong className="text-foreground">Website:</strong> <a href="https://lankafix.lk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">lankafix.lk</a></p>
            <p><strong className="text-foreground">Location:</strong> Colombo, Sri Lanka</p>
          </div>
        </LegalSection>

        <LegalSection number="2" title="Information We Collect">
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-foreground">Account information:</strong> Name, email address, phone number, and profile photo (if provided).</li>
            <li><strong className="text-foreground">Location data:</strong> Your address and GPS coordinates when you grant location permission, used to dispatch the nearest available technician.</li>
            <li><strong className="text-foreground">Booking details:</strong> Service category, problem description, diagnostic answers, uploaded photos, scheduling preferences, and service history.</li>
            <li><strong className="text-foreground">Payment information:</strong> Transaction amounts, payment method type, and status. We do not store credit card numbers.</li>
            <li><strong className="text-foreground">Device information:</strong> Device passports you register, including brand, model, serial numbers, and service history.</li>
            <li><strong className="text-foreground">Usage data:</strong> App interaction patterns, pages visited, and feature usage for platform improvement.</li>
          </ul>
        </LegalSection>

        <LegalSection number="3" title="How We Use Your Information">
          <ul className="list-disc pl-5 space-y-2">
            <li>Process and fulfill service bookings</li>
            <li>Match you with the most suitable verified technician</li>
            <li>Send booking confirmations, technician updates, and payment receipts</li>
            <li>Provide customer support and resolve service disputes</li>
            <li>Generate invoices and process warranty claims</li>
            <li>Improve our platform, services, and user experience</li>
            <li>Maintain platform security and prevent fraud</li>
          </ul>
          <p className="font-medium text-foreground mt-2">We do not sell your personal data to third parties.</p>
        </LegalSection>

        <LegalSection number="4" title="Location Data">
          <p>
            We use your location to determine the service zone, calculate travel fees, and dispatch the nearest technician.
            Location permission is requested only when you initiate a booking. You can deny access and manually enter your address.
          </p>
        </LegalSection>

        <LegalSection number="5" title="Notifications">
          <p>
            With your permission, we send push notifications for booking confirmations, technician arrival updates,
            job completion notices, and payment receipts. You can disable notifications through your device settings.
          </p>
        </LegalSection>

        <LegalSection number="6" title="Information Sharing">
          <p>
            We share limited information with assigned technicians to fulfill your booking. Your phone number is never shared directly.
            Payment processing is handled by secure third-party providers.
          </p>
        </LegalSection>

        <LegalSection number="7" title="Data Security">
          <p>
            We implement industry-standard security measures including encrypted data transmission (TLS/SSL),
            secure database storage, OTP verification, and regular security reviews.
          </p>
        </LegalSection>

        <LegalSection number="8" title="Data Retention">
          <p>
            We retain your personal data for as long as your account is active. Upon account deletion,
            personal data is removed within 7 business days, with transaction records retained for up to 90 days for legal compliance.
          </p>
        </LegalSection>

        <LegalSection number="9" title="Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access your personal data stored on our platform</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and personal data</li>
            <li>Withdraw consent for notifications and location tracking</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, visit <Link to="/account/delete" className="text-primary hover:underline">Account Deletion</Link> or contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
          </p>
        </LegalSection>

        <LegalSection number="10" title="Third-Party Services">
          <p>
            We may use third-party services for payment processing, analytics, and mapping. We do not share more data than necessary.
          </p>
        </LegalSection>

        <LegalSection number="11" title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Significant changes will be communicated through the app or via email.
          </p>
        </LegalSection>

        <LegalSection number="12" title="Contact Us">
          <p>For privacy-related inquiries:</p>
          <div className="bg-card rounded-xl border border-border/60 p-4 space-y-1.5 text-sm">
            <p><strong className="text-foreground">Smart Office (Private) Limited</strong></p>
            <p>Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a></p>
            <p>Location: Colombo, Sri Lanka</p>
          </div>
        </LegalSection>
      </div>
    </main>
    <Footer />
  </PageTransition>
);

export default PrivacyPage;
