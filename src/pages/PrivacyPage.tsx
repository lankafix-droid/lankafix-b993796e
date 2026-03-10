import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "@/config/contact";

const PrivacyPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 bg-background">
      <div className="container py-10 max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mt-2">Last updated: March 2026</p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            This Privacy Policy explains how LankaFix, operated by Smart Office (Private) Limited ("we", "us", "our"),
            collects, uses, stores, and protects your personal information when you use our platform and services.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Who We Are</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            LankaFix is a technology platform operated by Smart Office (Private) Limited, registered in Sri Lanka.
            We connect customers with verified independent technicians for repairs, installations, and technical support services.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Contact:</strong> {SUPPORT_EMAIL} · Colombo, Sri Lanka
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">We collect the following categories of information:</p>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1.5">
            <li><strong className="text-foreground">Account information:</strong> Name, email address, phone number, and profile photo (if provided).</li>
            <li><strong className="text-foreground">Location data:</strong> Your address and GPS coordinates when you grant location permission, used to dispatch the nearest available technician to your location.</li>
            <li><strong className="text-foreground">Booking details:</strong> Service category, problem description, diagnostic answers, uploaded photos of device issues, scheduling preferences, and service history.</li>
            <li><strong className="text-foreground">Payment information:</strong> Transaction amounts, payment method type, and payment status. We do not store credit card numbers — all card payments are processed through secure third-party payment partners.</li>
            <li><strong className="text-foreground">Device information:</strong> Device passports you register, including brand, model, serial numbers, and service history.</li>
            <li><strong className="text-foreground">Usage data:</strong> App interaction patterns, pages visited, and feature usage for platform improvement.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1.5">
            <li>Process and fulfill service bookings</li>
            <li>Match you with the most suitable verified technician based on location, availability, and expertise</li>
            <li>Send booking confirmations, technician updates, arrival notifications, and payment receipts via push notifications and SMS</li>
            <li>Provide customer support and resolve service disputes</li>
            <li>Generate invoices and process warranty claims</li>
            <li>Improve our platform, services, and user experience</li>
            <li>Maintain platform security and prevent fraud</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            <strong className="text-foreground">We do not sell your personal data to third parties.</strong>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Location Data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use your location to determine the service zone, calculate travel fees, and dispatch the nearest available technician.
            Location permission is requested only when you initiate a booking or use the "Find nearby technicians" feature.
            You can deny location access and manually enter your address instead.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Notifications</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            With your permission, we send push notifications for booking confirmations, technician arrival updates,
            job completion notices, payment receipts, and optional maintenance reminders. You can disable notifications
            at any time through your device settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">6. Information Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We share limited information with assigned technicians to fulfill your booking: your name, service location,
            and job details. Your direct phone number is never shared — all communication is facilitated through the
            LankaFix platform. Payment processing is handled by secure third-party providers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">7. Data Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We implement industry-standard security measures including encrypted data transmission (TLS/SSL),
            secure database storage, OTP verification for job start/completion, and regular security reviews.
            Access to personal data is restricted to authorised personnel only.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">8. Data Retention</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We retain your personal data for as long as your account is active. Booking and transaction records are
            retained for up to 2 years for warranty, support, and legal compliance purposes. Upon account deletion,
            personal data is removed within 7 business days, with transaction records retained for up to 90 additional
            days for tax and accounting compliance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">9. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">You have the right to:</p>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1.5">
            <li>Access your personal data stored on our platform</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and personal data</li>
            <li>Withdraw consent for notifications and location tracking</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            To exercise any of these rights, visit <Link to="/account/delete" className="text-primary hover:underline">Account Deletion</Link> in the app
            or contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">10. Third-Party Services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may use third-party services for payment processing, analytics, and mapping. These services have their
            own privacy policies and we encourage you to review them. We do not share more data than necessary with
            any third-party service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">11. Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of significant changes through
            the app or via email. Continued use of the platform after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-2 pb-4">
          <h2 className="text-lg font-semibold text-foreground">12. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For privacy-related inquiries, data access requests, or concerns, contact us at:
          </p>
          <div className="text-sm text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">Smart Office (Private) Limited</strong></p>
            <p>Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a></p>
            <p>Location: Colombo, Sri Lanka</p>
          </div>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default PrivacyPage;
