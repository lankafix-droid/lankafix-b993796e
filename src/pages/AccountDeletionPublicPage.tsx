import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Clock, Mail, MessageCircle, ArrowRight,
  Trash2, HeartPulse, CalendarX, FileText, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, SUPPORT_PHONE, whatsappLink } from "@/config/contact";

const AccountDeletionPublicPage = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container max-w-2xl py-8 px-4 space-y-8 pb-24">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground font-heading">Account Deletion</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          LankaFix allows you to request full deletion of your account and personal data at any time.
          This page explains how the process works and what to expect.
        </p>
      </div>

      {/* How to request */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">How to Request Account Deletion</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          {[
            "Open the LankaFix app and go to Account → Delete My Account.",
            "Review what data will be deleted and what may be retained for legal compliance.",
            "Verify your identity by re-entering your password (if applicable).",
            'Type "DELETE" to confirm and submit your request.',
            "Receive a reference number and confirmation email once processing is complete.",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">{i + 1}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <Button asChild className="rounded-xl mt-2">
          <Link to="/account/delete">
            Go to Account Deletion
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Data deleted */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Data That Will Be Deleted
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Account information (name, email, phone number)</li>
          <li>• Saved addresses and location data</li>
          <li>• Device passports, health scores, and service records</li>
          <li>• Booking history and preferences</li>
          <li>• Chat messages and uploaded photos</li>
        </ul>
      </div>

      {/* Data retained */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-warning" />
          Data That May Be Retained Temporarily
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <strong className="text-foreground">Transaction records</strong> — retained for up to 90 days for tax and legal compliance</li>
          <li>• <strong className="text-foreground">Warranty claims</strong> — retained until the warranty period expires</li>
          <li>• <strong className="text-foreground">Dispute records</strong> — retained until resolved</li>
        </ul>
      </div>

      {/* Active services impact */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-warning" />
          Impact on Active Services
        </h2>
        <div className="space-y-3">
          {[
            { icon: CalendarX, text: "Active bookings will be cancelled. In-progress jobs should be completed or cancelled before submitting a deletion request." },
            { icon: HeartPulse, text: "LankaFix Care plans and subscriptions will be permanently terminated. Unused service credits, prepaid maintenance visits, and scheduled reminders will be forfeited." },
            { icon: ShieldCheck, text: "Active warranty claims will be processed before deletion is finalized. After deletion, warranty-linked support will no longer be available." },
            { icon: FileText, text: "Access to past invoices, quotes, and service history will be permanently removed." },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <item.icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl border p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Processing Timeline
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Request reviewed within <strong className="text-foreground">3 business days</strong></li>
          <li>• Personal data permanently deleted within <strong className="text-foreground">7 business days</strong></li>
          <li>• Confirmation email sent upon completion</li>
          <li>• You may cancel the request by contacting support before processing begins</li>
        </ul>
      </div>

      {/* Can't access your account */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Can't Access Your Account?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you're unable to sign in or use the in-app deletion flow, you can request account deletion by contacting our support team.
          Please provide the email address associated with your LankaFix account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
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
        {SUPPORT_PHONE && (
          <p className="text-xs text-muted-foreground">
            You can also call us at <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="text-primary hover:underline">{SUPPORT_PHONE}</a>.
          </p>
        )}
      </div>

      <div className="text-center space-y-2 pb-4">
        <p className="text-xs text-muted-foreground">
          LankaFix is operated by Smart Office (Pvt) Ltd · Colombo, Sri Lanka
        </p>
        <p className="text-xs text-muted-foreground">
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          {" · "}
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
          {" · "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default AccountDeletionPublicPage;
