import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, Mail, MessageCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

const AccountDeletionPublicPage = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container max-w-2xl py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground font-heading">Account Deletion</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          LankaFix allows you to request full deletion of your account and personal data at any time. This page explains how the process works.
        </p>
      </div>

      {/* How to request */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">How to Request Account Deletion</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</span>
            <p>Open the LankaFix app and navigate to <strong className="text-foreground">Account → Delete My Account</strong>.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</span>
            <p>Review what data will be deleted and what may be retained for legal compliance.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</span>
            <p>Type <strong className="text-foreground">DELETE</strong> to confirm and submit your request.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">4</span>
            <p>Receive a reference number and confirmation email once the deletion is processed.</p>
          </div>
        </div>
        <Button asChild className="rounded-xl mt-2">
          <Link to="/account/delete">
            Go to Account Deletion
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* What happens */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-success" />
          What Happens After Deletion
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Your account information, saved addresses, and device data will be permanently removed.</li>
          <li>• Active bookings will be cancelled automatically.</li>
          <li>• Active subscriptions or care plans will be terminated.</li>
          <li>• Transaction records may be retained for up to 90 days for tax and legal compliance.</li>
          <li>• Active warranty claims will be processed before deletion is finalized.</li>
          <li>• You will not be able to recover any deleted data.</li>
        </ul>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl border p-6 space-y-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Processing Timeline
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Request reviewed within <strong className="text-foreground">3 business days</strong>.</li>
          <li>• Personal data permanently deleted within <strong className="text-foreground">7 business days</strong>.</li>
          <li>• Confirmation email sent upon completion.</li>
          <li>• You may cancel the request by contacting support before processing begins.</li>
        </ul>
      </div>

      {/* Contact */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Need Help?</h2>
        <p className="text-sm text-muted-foreground">
          If you're unable to access the in-app deletion flow, you can also request account deletion by contacting our support team directly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`}>
              <Mail className="w-4 h-4 mr-2" />
              {SUPPORT_EMAIL}
            </a>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <a href={whatsappLink(SUPPORT_WHATSAPP, "Hi, I need help deleting my LankaFix account.")} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Support
            </a>
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-4">
        LankaFix is operated by Smart Office (Pvt) Ltd. Read our{" "}
        <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        {" "}and{" "}
        <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
      </p>
    </main>
    <Footer />
  </div>
);

export default AccountDeletionPublicPage;
