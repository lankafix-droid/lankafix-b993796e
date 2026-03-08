import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";

const PrivacyPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 bg-background">
      <div className="container py-12 max-w-3xl prose prose-sm">
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mt-2">Last updated: March 2026</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">1. Information We Collect</h2>
        <p className="text-sm text-muted-foreground">We collect information you provide when booking services: name, phone number, location, service details, and uploaded photos. We also collect device and usage data for platform improvement.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">2. How We Use Your Information</h2>
        <p className="text-sm text-muted-foreground">Your information is used to: process bookings, match you with technicians, communicate service updates, improve our platform, and provide customer support. We do not sell your personal data.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">3. Information Sharing</h2>
        <p className="text-sm text-muted-foreground">We share limited information with assigned technicians (your name, location, and service details) to fulfill bookings. We do not share your direct phone number — all communication is relayed through LankaFix.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">4. Data Security</h2>
        <p className="text-sm text-muted-foreground">We use industry-standard security measures to protect your data. OTP verification ensures secure service delivery. All payment data is processed through secure payment partners.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">5. Your Rights</h2>
        <p className="text-sm text-muted-foreground">You may request access to, correction of, or deletion of your personal data at any time by contacting us at hello@lankafix.lk.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">6. Contact</h2>
        <p className="text-sm text-muted-foreground">For privacy-related inquiries, contact us at hello@lankafix.lk or via WhatsApp support.</p>
      </div>
    </main>
    <Footer />
  </div>
);

export default PrivacyPage;